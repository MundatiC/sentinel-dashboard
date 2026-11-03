import type { EventSourceMessage } from '@microsoft/fetch-event-source';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { json, mockApi, SESSION } from '@/test/http';
import { tokenStore } from '@/lib/api/client';
import {
  reconnectDelay,
  runAlertStream,
  StreamError,
  tokenExpiresInMs,
  type LiveMessage,
  type LiveStatus,
} from './stream';

const jwt = (exp: number) => `h.${btoa(JSON.stringify({ exp }))}.s`;
const ALERT = {
  id: 'a1',
  ruleName: 'Brute force',
  status: 'OPEN',
  severity: 'HIGH',
  title: 'Brute force: 1.2.3.4',
  groupKey: '1.2.3.4',
  eventCount: 5,
  createdAt: '2026-03-02T10:00:00Z',
};

describe('tokenExpiresInMs', () => {
  it('reads the expiry from the JWT payload', () =>
    expect(tokenExpiresInMs(jwt(2000), 1_000_000)).toBe(1_000_000));
  it.each(['', 'garbage', 'a.b.c', 'a..c'])('returns null for %j', (token) =>
    expect(tokenExpiresInMs(token)).toBeNull(),
  );
});

describe('reconnectDelay', () => {
  it('backs off exponentially up to 15 seconds', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map((n) => reconnectDelay(n))).toEqual([
      1000, 2000, 4000, 8000, 15000, 15000, 15000,
    ]);
  });
  it('waits longer when the server says there are too many streams', () =>
    expect(reconnectDelay(0, 429)).toBe(30_000));
});

type Handlers = {
  onopen: (r: Response) => Promise<void>;
  onmessage: (m: EventSourceMessage) => void;
  onerror: (e: unknown) => void;
  headers: Record<string, string>;
};

/** A fake fetchEventSource: each call runs `script`, which can open the stream and emit messages. */
function fakeConnect(script: (h: Handlers, call: number) => Promise<void>) {
  let calls = 0;
  const connect = vi.fn(async (_url: unknown, opts: unknown) => script(opts as Handlers, ++calls));
  return { connect: connect as never, calls: () => calls };
}
const sse = () =>
  new Response('', { status: 200, headers: { 'content-type': 'text/event-stream' } });
const msg = (event: string, data: string): EventSourceMessage => ({
  id: '',
  event,
  data,
  retry: undefined,
});

beforeEach(() => tokenStore.set(jwt(Math.floor(Date.now() / 1000) + 600)));
afterEach(() => vi.unstubAllGlobals());

async function run(script: Parameters<typeof fakeConnect>[0], stopAfterCalls: number) {
  const controller = new AbortController();
  const statuses: LiveStatus[] = [];
  const messages: LiveMessage[] = [];
  const fake = fakeConnect(async (h, n) => {
    try {
      await script(h, n);
    } finally {
      if (n >= stopAfterCalls) controller.abort(); // also when the scripted connection throws
    }
  });
  await runAlertStream({
    signal: controller.signal,
    onStatus: (s) => statuses.push(s),
    onMessage: (m) => messages.push(m),
    connect: fake.connect,
    wait: async () => undefined,
  });
  return { statuses, messages, calls: fake.calls() };
}

describe('runAlertStream', () => {
  it('connects with the bearer token, reports live, and forwards valid alert messages', async () => {
    let auth = '';
    const { statuses, messages } = await run(async (h) => {
      auth = h.headers.Authorization!;
      await h.onopen(sse());
      h.onmessage(msg('alert.created', JSON.stringify(ALERT)));
      h.onmessage(msg('alert.updated', JSON.stringify({ ...ALERT, eventCount: 6 })));
    }, 1);
    expect(auth).toMatch(/^Bearer h\./);
    expect(statuses).toContain('live');
    expect(messages.map((m) => [m.type, m.alert.eventCount])).toEqual([
      ['alert.created', 5],
      ['alert.updated', 6],
    ]);
  });

  it('ignores heartbeats, unknown events and malformed or unexpected payloads', async () => {
    const { messages } = await run(async (h) => {
      await h.onopen(sse());
      h.onmessage(msg('', ''));
      h.onmessage(msg('something.else', JSON.stringify(ALERT)));
      h.onmessage(msg('alert.created', '{not json'));
      h.onmessage(msg('alert.created', JSON.stringify({ id: 1 })));
    }, 1);
    expect(messages).toEqual([]);
  });

  it('reconnects when the server closes the stream (it does that when the token expires)', async () => {
    const { calls, statuses } = await run(async (h) => {
      await h.onopen(sse());
    }, 3);
    expect(calls).toBe(3);
    expect(statuses.filter((s) => s === 'reconnecting').length).toBeGreaterThanOrEqual(2);
  });

  it('refuses a response that is not an event stream', async () => {
    const { statuses } = await run(async (h) => {
      await expect(
        h.onopen(new Response('<html>', { status: 200, headers: { 'content-type': 'text/html' } })),
      ).rejects.toBeInstanceOf(StreamError);
      throw new StreamError(502);
    }, 1);
    expect(statuses).not.toContain('live');
  });

  it('refreshes the session before connecting when the token is about to expire', async () => {
    tokenStore.set(jwt(Math.floor(Date.now() / 1000) + 5));
    const calls = mockApi(() =>
      json({ ...SESSION, accessToken: jwt(Math.floor(Date.now() / 1000) + 900) }),
    );
    let auth = '';
    await run(async (h) => {
      auth = h.headers.Authorization!;
      await h.onopen(sse());
    }, 1);
    expect(calls.map((c) => c.path)).toEqual(['/auth/refresh']);
    expect(auth).toContain(tokenStore.get()!);
  });

  it('stops quietly when aborted and never throws', async () => {
    const controller = new AbortController();
    controller.abort();
    const connect = vi.fn();
    await runAlertStream({
      signal: controller.signal,
      onStatus: () => undefined,
      onMessage: () => undefined,
      connect: connect as never,
    });
    expect(connect).not.toHaveBeenCalled();
  });
});
