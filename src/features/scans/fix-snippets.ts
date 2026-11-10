// Copy-paste fixes for the findings people hit most. The values match what sentinel-scanner recommends
// in its own remediation text. Each header fix is defined once and the platform snippets are
// generated from it, so the platforms can never disagree with each other.

export const PLATFORMS = ['headers-file', 'nginx', 'express', 'cloudflare'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABEL: Record<Platform, string> = {
  'headers-file': 'Netlify / Cloudflare Pages',
  nginx: 'nginx',
  express: 'Express',
  cloudflare: 'Cloudflare',
};

type Header = { name: string; value: string };

const HEADER_FIXES: Record<string, Header> = {
  'headers.csp_missing': {
    name: 'Content-Security-Policy',
    // A strict starting point: test it, because it blocks inline scripts and third-party resources.
    value: "default-src 'self'",
  },
  'headers.clickjacking': { name: 'X-Frame-Options', value: 'DENY' },
  'headers.nosniff_missing': { name: 'X-Content-Type-Options', value: 'nosniff' },
  'headers.referrer_policy_missing': {
    name: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  'headers.permissions_policy_missing': {
    name: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  'headers.hsts_missing': {
    name: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  'headers.hsts_weak': {
    name: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
};

type Snippets = Partial<Record<Platform, string>>;

function forHeader({ name, value }: Header): Snippets {
  return {
    'headers-file': `/*\n  ${name}: ${value}`,
    nginx: `add_header ${name} "${value}" always;`,
    express: `app.use((req, res, next) => {\n  res.setHeader(${JSON.stringify(name)}, ${JSON.stringify(value)});\n  next();\n});`,
    cloudflare: `Rules > Transform Rules > Modify Response Header > Create rule\nWhen: all incoming requests\nThen: Set static\n  Header name:  ${name}\n  Value:        ${value}`,
  };
}

const COOKIE_FLAGS: Snippets = {
  express:
    "res.cookie('session', token, {\n  httpOnly: true, // not readable by JavaScript\n  secure: true, // only sent over HTTPS\n  sameSite: 'lax', // not sent on cross-site requests\n});",
  nginx:
    '# for cookies set by an app behind nginx\nproxy_cookie_flags ~ secure httponly samesite=lax;',
};

// Fixes that are not "send one header".
const OTHER_FIXES: Record<string, Snippets> = {
  'tls.no_https_redirect': {
    nginx:
      'server {\n  listen 80;\n  server_name example.com;\n  return 301 https://$host$request_uri;\n}',
    express:
      "app.use((req, res, next) => {\n  if (req.secure) return next();\n  res.redirect(301, 'https://' + req.headers.host + req.originalUrl);\n});\n// behind a proxy, also: app.set('trust proxy', 1)",
    cloudflare: 'SSL/TLS > Edge Certificates > turn on "Always Use HTTPS"',
    'headers-file':
      'GitHub Pages: repository Settings > Pages > tick "Enforce HTTPS".\nNetlify: Domain management > HTTPS > "Force HTTPS" (on by default).',
  },
  'cookies.no_httponly': COOKIE_FLAGS,
  'cookies.no_secure': COOKIE_FLAGS,
  'cookies.no_samesite': COOKIE_FLAGS,
  'headers.x_powered_by': {
    express: "app.disable('x-powered-by'); // or use helmet()",
    nginx: 'proxy_hide_header X-Powered-By;',
  },
  'headers.server_version': {
    nginx: 'server_tokens off;',
    cloudflare: 'Cloudflare already replaces the Server header; check the origin is not exposed.',
  },
};

/** Per-platform snippets for a finding, or null when there is nothing specific to offer. */
export function snippetsFor(checkId: string): Snippets | null {
  const header = HEADER_FIXES[checkId];
  if (header) return forHeader(header);
  return OTHER_FIXES[checkId] ?? null;
}

/** A platform-neutral one-liner, used in the PDF where there is no way to pick a platform. */
export function neutralFix(checkId: string): string | null {
  const header = HEADER_FIXES[checkId];
  return header ? `Add this response header: ${header.name}: ${header.value}` : null;
}
