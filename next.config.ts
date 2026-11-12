import type { NextConfig } from 'next';

// Security headers that do not depend on the request. The Content-Security-Policy needs a fresh
// nonce per request, so it is set in src/middleware.ts.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

// Optional same-origin mode (docs/DEPLOY.md): set API_PROXY_TARGET to the API's base URL and
// NEXT_PUBLIC_API_URL to "/". The browser then only talks to this app, which forwards /api/v1 to the API,
// so the SameSite=Strict refresh cookie stays first-party even when the API is hosted elsewhere.
// Both are read at BUILD time (the rewrite is compiled into the routes manifest).
function apiProxyTarget(): string | null {
  const raw = process.env.API_PROXY_TARGET?.trim();
  if (!raw) return null;
  // Fails the build on a typo instead of shipping a dashboard that cannot reach its API.
  return new URL(raw).origin;
}

const config: NextConfig = {
  output: 'standalone', // small self-contained server for the Docker image
  poweredByHeader: false, // do not advertise "Next.js"
  reactStrictMode: true,
  async rewrites() {
    const target = apiProxyTarget();
    return target ? [{ source: '/api/v1/:path*', destination: `${target}/api/v1/:path*` }] : [];
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Never let a CDN cache proxied API responses: they are private. (Vercel honours upstream cache
      // headers on external rewrites by default; the API already sends no-store, this is belt and braces.)
      ...(apiProxyTarget()
        ? [
            {
              source: '/api/v1/:path*',
              headers: [{ key: 'x-vercel-enable-rewrite-caching', value: '0' }],
            },
          ]
        : []),
    ];
  },
};

export default config;
