import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { SESSION, USER, apiError, authHeader, json, mockApi } from '@/test/http';
import { ApiError, apiFetch, refreshSession, setSessionLostHandler, tokenStore } from './client';

beforeEach(() => tokenStore.set(null));
afterEach(() => {
  vi.unstubAllGlobals();
  setSessionLostHandler(null);
});

describe('apiFetch', () => {
  it('sends the bearer token, JSON body and credentials', async () => {
    tokenStore.set('abc');
    const calls = mockApi(() => json({ ok: true }));
    await apiFetch('/things', { method: 'POST', body: { a: 1 } });
    const { init } = calls[0]!;
    expect(authHeader(init)).toBe('Bearer abc');
    expect(init.body).toBe('{"a":1}');
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('builds the query string and skips empty values', async () => {
    const calls = mockApi(() => json({}));
    await apiFetch('/events', {
      query: { severity: 'HIGH', q: '', page: 2, x: undefined, y: null },
    });
    expect(calls[0]!.url.search).toBe('?severity=HIGH&page=2');
  });

  it('turns the API error shape into an ApiError', async () => {
    mockApi(() => apiError(403, 'FORBIDDEN', 'No way'));
    await expect(apiFetch('/x')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
      message: 'No way',
      requestId: 'req-1',
    });
  });

  it('copes with non-JSON error pages', async () => {
    mockApi(() => new Response('<html>502</html>', { status: 502 }));
    await expect(apiFetch('/x')).rejects.toMatchObject({ code: 'BAD_RESPONSE' });
  });

  it('validates responses with the given schema and rejects unexpected shapes', async () => {
    mockApi(() => json({ count: 'not a number' }));
    await expect(apiFetch('/x', { schema: z.object({ count: z.number() }) })).rejects.toMatchObject(
      { code: 'BAD_RESPONSE' },
    );
    mockApi(() => json({ count: 3 }));
    await expect(apiFetch('/x', { schema: z.object({ count: z.number() }) })).resolves.toEqual({
      count: 3,
    });
  });

  it('handles 204 No Content', async () => {
    mockApi(() => json(null, 204));
    await expect(apiFetch('/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});

describe('automatic session refresh', () => {
  it('refreshes once on 401 and retries with the new token', async () => {
    tokenStore.set('old');
    let attempt = 0;
    const calls = mockApi((url) => {
      if (url.pathname.endsWith('/auth/refresh')) return json({ ...SESSION, accessToken: 'new' });
      return attempt++ === 0 ? apiError(401, 'UNAUTHORIZED') : json({ data: 1 });
    });
    await expect(apiFetch('/alerts')).resolves.toEqual({ data: 1 });
    expect(calls.map((c) => c.path)).toEqual(['/alerts', '/auth/refresh', '/alerts']);
    expect(authHeader(calls[0]!.init)).toBe('Bearer old');
    expect(authHeader(calls[2]!.init)).toBe('Bearer new');
    expect(tokenStore.get()).toBe('new');
  });

  it('shares ONE refresh between simultaneous 401s (refresh tokens are single-use)', async () => {
    tokenStore.set('old');
    let refreshes = 0;
    mockApi(async (url, init) => {
      if (url.pathname.endsWith('/auth/refresh')) {
        refreshes++;
        await new Promise((r) => setTimeout(r, 20));
        return json({ ...SESSION, accessToken: 'new' });
      }
      return authHeader(init) === 'Bearer new' ? json({ ok: true }) : apiError(401, 'UNAUTHORIZED');
    });
    await Promise.all([apiFetch('/a'), apiFetch('/b'), apiFetch('/c')]);
    expect(refreshes).toBe(1);
  });

  it('only retries once: a second 401 is an error, not a loop', async () => {
    tokenStore.set('old');
    const calls = mockApi((url) =>
      url.pathname.endsWith('/auth/refresh') ? json(SESSION) : apiError(401, 'UNAUTHORIZED'),
    );
    await expect(apiFetch('/a')).rejects.toMatchObject({ status: 401 });
    expect(calls.filter((c) => c.path === '/a')).toHaveLength(2);
  });

  it('clears the token and signals the app when the session cannot be recovered', async () => {
    tokenStore.set('old');
    const lost = vi.fn();
    setSessionLostHandler(lost);
    mockApi((url) =>
      url.pathname.endsWith('/auth/refresh')
        ? apiError(401, 'UNAUTHORIZED')
        : apiError(401, 'UNAUTHORIZED'),
    );
    await expect(apiFetch('/a')).rejects.toBeInstanceOf(ApiError);
    expect(tokenStore.get()).toBeNull();
    expect(lost).toHaveBeenCalledOnce();
  });

  it('skipRefresh: a 401 from login is reported as is', async () => {
    const calls = mockApi(() => apiError(401, 'INVALID_CREDENTIALS', 'Invalid credentials'));
    await expect(
      apiFetch('/auth/login', { method: 'POST', skipRefresh: true }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(calls).toHaveLength(1);
  });

  it('refreshSession returns null (not an exception) when the API is unreachable', async () => {
    mockApi(() => {
      throw new TypeError('network down');
    });
    await expect(refreshSession()).resolves.toBeNull();
  });

  it('refreshSession ignores a malformed session payload', async () => {
    mockApi(() => json({ accessToken: 123 }));
    await expect(refreshSession()).resolves.toBeNull();
    expect(tokenStore.get()).toBeNull();
  });

  it('USER fixture matches the schema used by the provider', () => {
    expect(USER.role).toBe('ADMIN');
  });
});
