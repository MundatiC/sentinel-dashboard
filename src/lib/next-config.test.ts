import { afterEach, describe, expect, it } from 'vitest';
import config from '../../next.config';

const original = process.env.API_PROXY_TARGET;
afterEach(() => {
  if (original === undefined) delete process.env.API_PROXY_TARGET;
  else process.env.API_PROXY_TARGET = original;
});

describe('same-origin API proxy (next.config)', () => {
  it('adds no rewrite by default, so local development is unchanged', async () => {
    delete process.env.API_PROXY_TARGET;
    expect(await config.rewrites!()).toEqual([]);
  });

  it('forwards /api/v1 to the API origin, ignoring any path or trailing slash on the setting', async () => {
    process.env.API_PROXY_TARGET = 'https://sentinel-api.onrender.com/some/path/';
    expect(await config.rewrites!()).toEqual([
      {
        source: '/api/v1/:path*',
        destination: 'https://sentinel-api.onrender.com/api/v1/:path*',
      },
    ]);
  });

  it('stops CDN caching of proxied responses, only when the proxy is on', async () => {
    delete process.env.API_PROXY_TARGET;
    const off = await config.headers!();
    expect(off.some((h) => h.source === '/api/v1/:path*')).toBe(false);

    process.env.API_PROXY_TARGET = 'https://api.example.com';
    const on = await config.headers!();
    const apiHeaders = on.find((h) => h.source === '/api/v1/:path*')!.headers;
    expect(apiHeaders).toContainEqual({ key: 'x-vercel-enable-rewrite-caching', value: '0' });
  });

  it('fails fast on a malformed target instead of building a broken dashboard', async () => {
    process.env.API_PROXY_TARGET = 'not a url';
    await expect(config.rewrites!()).rejects.toThrow();
  });
});
