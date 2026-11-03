import { fetchEventSource, type EventSourceMessage } from '@microsoft/fetch-event-source';
import { z } from 'zod';
import { API_BASE } from '@/lib/config';
import { refreshSession, tokenStore } from '@/lib/api/client';
import { severitySchema } from '@/lib/api/schemas';

// The payload the API publishes for every alert change.
export const liveAlertSchema = z.object({
  id: z.string(),
  ruleName: z.string(),
  status: z.string(),
  severity: severitySchema,
  title: z.string(),
  groupKey: z.string(),
  eventCount: z.number(),
  createdAt: z.string(),
});
export type LiveAlert = z.infer<typeof liveAlertSchema>;
export type LiveStatus = 'connecting' | 'live' | 'reconnecting';
export type LiveMessage = { type: 'alert.created' | 'alert.updated'; alert: LiveAlert };

export class StreamError extends Error {
  constructor(public readonly status: number) {
    super(`Live stream refused (${status})`);
  }
}

/** Milliseconds until a JWT expires, read from its (unverified) payload. Only used to schedule a refresh. */
export function tokenExpiresInMs(token: string, now = Date.now()): number | null {
  try {
    const payload = JSON.parse(
      atob((token.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/')),
    );
    return typeof payload.exp === 'number' ? payload.exp * 1000 - now : null;
  } catch {
    return null;
  }
}

/** Wait before reconnecting: 1s, 2s, 4s ... capped at 15s. A busy server (429) gets a longer pause. */
export function reconnectDelay(attempt: number, status?: number): number {
  if (status === 429) return 30_000;
  return Math.min(1000 * 2 ** attempt, 15_000);
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });

export interface StreamOptions {
  signal: AbortSignal;
  onStatus: (status: LiveStatus) => void;
  onMessage: (message: LiveMessage) => void;
  connect?: typeof fetchEventSource; // injectable for tests
  wait?: (ms: number, signal: AbortSignal) => Promise<void>;
}

/** An access token with enough life left to open a stream, refreshing the session if needed. */
async function freshToken(): Promise<string> {
  const current = tokenStore.get();
  const left = current ? tokenExpiresInMs(current) : null;
  if (!current || (left !== null && left < 30_000)) await refreshSession();
  const token = tokenStore.get();
  if (!token) throw new StreamError(401);
  return token;
}

/**
 * Keeps ONE live connection to GET /alerts/stream open until `signal` aborts.
 *
 * Why a custom loop? The browser's EventSource cannot send an Authorization header, so we use fetch.
 * The API deliberately ends the stream when the access token expires, so "the stream closed" is normal:
 * we get a fresh token and reconnect. On errors we back off instead of hammering the server.
 */
export async function runAlertStream({
  signal,
  onStatus,
  onMessage,
  connect = fetchEventSource,
  wait = sleep,
}: StreamOptions) {
  let attempt = 0;
  onStatus('connecting');

  while (!signal.aborted) {
    let failure: number | undefined;
    try {
      const token = await freshToken();
      await connect(`${API_BASE}/alerts/stream`, {
        signal,
        headers: { Authorization: `Bearer ${token}` },
        openWhenHidden: true, // keep receiving alerts while the tab is in the background
        async onopen(res) {
          if (res.ok && res.headers.get('content-type')?.includes('text/event-stream')) {
            attempt = 0;
            onStatus('live');
            return;
          }
          throw new StreamError(res.status);
        },
        onmessage(msg: EventSourceMessage) {
          if (msg.event !== 'alert.created' && msg.event !== 'alert.updated') return; // heartbeats and unknown events
          try {
            const alert = liveAlertSchema.safeParse(JSON.parse(msg.data));
            if (alert.success) onMessage({ type: msg.event, alert: alert.data });
          } catch {
            /* ignore a malformed message rather than breaking the stream */
          }
        },
        onerror(err) {
          throw err; // stop the library's own retrying: this loop decides what to do
        },
      });
    } catch (err) {
      if (signal.aborted) return;
      if (err instanceof StreamError) failure = err.status;
    }
    if (signal.aborted) return;
    onStatus('reconnecting');
    await wait(
      failure === undefined && attempt === 0 ? 500 : reconnectDelay(attempt, failure),
      signal,
    );
    attempt += 1;
  }
}
