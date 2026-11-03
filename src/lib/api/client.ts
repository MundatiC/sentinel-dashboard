import type { ZodType } from 'zod';
import { API_BASE } from '@/lib/config';
import { apiErrorBodySchema, sessionSchema, type Session } from './schemas';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---- the access token lives in memory ONLY ----
// Not in localStorage / sessionStorage / a cookie JavaScript can read: any XSS bug could steal those.
// A page reload loses it on purpose; the httpOnly refresh cookie (which JavaScript cannot read)
// is used to get a new one.
let accessToken: string | null = null;
export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => {
    accessToken = token;
  },
};

// Called when the session cannot be recovered (refresh failed): the auth provider logs the user out.
let onSessionLost: (() => void) | null = null;
export function setSessionLostHandler(handler: (() => void) | null) {
  onSessionLost = handler;
}

// ---- refresh: one request at a time ----
// Several requests can get a 401 at the same moment (token just expired), and React dev mode mounts
// components twice. Refresh tokens are single-use, so two simultaneous refreshes would make the second
// one look like a stolen token. All callers therefore share ONE in-flight refresh.
let refreshing: Promise<Session | null> | null = null;

export function refreshSession(): Promise<Session | null> {
  refreshing ??= (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) return null;
      const session = sessionSchema.parse(await res.json());
      tokenStore.set(session.accessToken);
      return session;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export interface RequestOptions<T> {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  schema?: ZodType<T>;
  /** Do not try to refresh the session on 401 (used by login/refresh themselves). */
  skipRefresh?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: RequestOptions<unknown>['query']) {
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '')
      url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function send(path: string, options: RequestOptions<unknown>): Promise<Response> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'include', // lets the browser send the httpOnly refresh cookie to /auth/*
    signal: options.signal,
  });
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions<T> = {},
): Promise<T> {
  let res = await send(path, options);

  if (res.status === 401 && !options.skipRefresh) {
    const session = await refreshSession();
    if (!session) {
      tokenStore.set(null);
      onSessionLost?.();
      throw new ApiError(401, 'UNAUTHORIZED', 'Your session has expired. Please sign in again.');
    }
    res = await send(path, options); // retry exactly once with the new token
  }

  if (res.status === 204) return undefined as T;

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(res.status, 'BAD_RESPONSE', 'The server returned an unreadable response');
  }

  if (!res.ok) {
    const parsed = apiErrorBodySchema.safeParse(json);
    if (parsed.success) {
      const { code, message, requestId } = parsed.data.error;
      throw new ApiError(res.status, code, message, requestId);
    }
    throw new ApiError(res.status, 'HTTP_ERROR', `Request failed (${res.status})`);
  }

  if (!options.schema) return json as T;
  const checked = options.schema.safeParse(json);
  if (!checked.success) {
    throw new ApiError(
      res.status,
      'BAD_RESPONSE',
      'The server returned data in an unexpected format',
    );
  }
  return checked.data;
}
