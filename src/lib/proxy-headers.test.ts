import { describe, expect, it } from 'vitest';
import { CLIENT_IP_HEADER, PROXY_SECRET_HEADER, vouchClientIp } from './proxy-headers';

const ON = { PROXY_SHARED_SECRET: 's'.repeat(32), VERCEL: '1' };

function run(
  init: Record<string, string>,
  path = '/api/v1/auth/login',
  env: Record<string, string | undefined> = ON,
) {
  const headers = new Headers(init);
  vouchClientIp(headers, path, env);
  return headers;
}

describe('vouchClientIp', () => {
  it("adds the secret and Vercel's visitor IP to API requests", () => {
    const h = run({ 'x-vercel-forwarded-for': '203.0.113.5' });
    expect(h.get(PROXY_SECRET_HEADER)).toBe(ON.PROXY_SHARED_SECRET);
    expect(h.get(CLIENT_IP_HEADER)).toBe('203.0.113.5');
  });

  it('falls back to x-real-ip and takes the first of a list', () => {
    expect(run({ 'x-real-ip': '203.0.113.6, 10.0.0.1' }).get(CLIENT_IP_HEADER)).toBe('203.0.113.6');
  });

  it('replaces anything the visitor sent in those headers', () => {
    const h = run({
      [PROXY_SECRET_HEADER]: 'guess',
      [CLIENT_IP_HEADER]: '198.51.100.77',
      'x-vercel-forwarded-for': '203.0.113.5',
    });
    expect(h.get(CLIENT_IP_HEADER)).toBe('203.0.113.5');
    expect(h.get(PROXY_SECRET_HEADER)).toBe(ON.PROXY_SHARED_SECRET);
  });

  it.each([
    ['not an API path', '/overview', ON],
    ['no secret configured', '/api/v1/x', { VERCEL: '1' }],
    ['not running on Vercel', '/api/v1/x', { PROXY_SHARED_SECRET: ON.PROXY_SHARED_SECRET }],
  ])('sends nothing when %s, and still strips visitor-supplied values', (_n, path, env) => {
    const h = run(
      {
        [PROXY_SECRET_HEADER]: 'guess',
        [CLIENT_IP_HEADER]: '198.51.100.77',
        'x-real-ip': '203.0.113.5',
      },
      path,
      env,
    );
    expect(h.has(PROXY_SECRET_HEADER)).toBe(false);
    expect(h.has(CLIENT_IP_HEADER)).toBe(false);
  });

  it('sends nothing when Vercel gave no visitor IP', () => {
    expect(run({}).has(PROXY_SECRET_HEADER)).toBe(false);
  });
});
