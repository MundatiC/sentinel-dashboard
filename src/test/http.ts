import { vi } from 'vitest';

export const USER = {
  id: 'u1',
  email: 'admin@example.com',
  role: 'ADMIN',
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
} as const;
export const SESSION = { accessToken: 'tok-1', user: USER };

export function json(body: unknown, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function apiError(status: number, code: string, message = code) {
  return json({ error: { code, message, requestId: 'req-1' } }, status);
}

type Handler = (url: URL, init: RequestInit) => Response | Promise<Response>;

/** Replace fetch with a fake API. Returns the list of calls so tests can inspect them. */
export function mockApi(handler: Handler) {
  const calls: { url: URL; init: RequestInit; path: string }[] = [];
  const fn = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const path = url.pathname.replace('/api/v1', '');
    calls.push({ url, init, path });
    return handler(url, init);
  });
  vi.stubGlobal('fetch', fn);
  return calls;
}

export const authHeader = (init: RequestInit) =>
  (init.headers as Record<string, string> | undefined)?.Authorization;
