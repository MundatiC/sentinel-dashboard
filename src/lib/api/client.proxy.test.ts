import { afterEach, describe, expect, it, vi } from 'vitest';
import { json, mockApi } from '@/test/http';

// Same-origin proxy mode (NEXT_PUBLIC_API_URL="/"): the base is relative. This used to throw "Invalid URL".
vi.mock('@/lib/config', () => ({ API_BASE: '/api/v1' }));

afterEach(() => vi.unstubAllGlobals());

describe('apiFetch with a relative API base', () => {
  it('requests the path on the current origin, query string included', async () => {
    const { apiFetch } = await import('./client');
    const calls = mockApi(() => json({}));
    await apiFetch('/auth/login', { method: 'POST', body: { a: 1 }, query: { page: 2 } });
    expect(calls[0]!.url.pathname).toBe('/api/v1/auth/login');
    expect(calls[0]!.url.search).toBe('?page=2');
    expect(calls[0]!.url.origin).toBe(globalThis.location.origin);
  });
});
