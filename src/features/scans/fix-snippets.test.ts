import { describe, expect, it } from 'vitest';
import { PLATFORMS, neutralFix, snippetsFor } from './fix-snippets';

describe('snippetsFor', () => {
  it('generates every platform from one header definition, so they agree', () => {
    const s = snippetsFor('headers.nosniff_missing')!;
    expect(Object.keys(s)).toEqual([...PLATFORMS]);
    expect(s['headers-file']).toBe('/*\n  X-Content-Type-Options: nosniff');
    expect(s.nginx).toBe('add_header X-Content-Type-Options "nosniff" always;');
    expect(s.express).toContain('res.setHeader("X-Content-Type-Options", "nosniff")');
    expect(s.cloudflare).toContain('X-Content-Type-Options');
  });

  it('quotes values safely in generated code (the CSP contains single quotes)', () => {
    const s = snippetsFor('headers.csp_missing')!;
    expect(s.nginx).toBe(`add_header Content-Security-Policy "default-src 'self'" always;`);
    expect(s.express).toContain(`"default-src 'self'"`);
  });

  it('offers cookie, redirect and header-leak fixes that are not simple headers', () => {
    expect(snippetsFor('cookies.no_httponly')?.express).toContain('httpOnly: true');
    expect(snippetsFor('tls.no_https_redirect')?.nginx).toContain('return 301');
    expect(snippetsFor('headers.x_powered_by')?.express).toContain("disable('x-powered-by')");
  });

  it('returns null for findings with no specific snippet', () => {
    expect(snippetsFor('tls.cert_expiring')).toBeNull();
    expect(snippetsFor('deps.GHSA-xxxx')).toBeNull();
  });
});

describe('neutralFix', () => {
  it('states the header for header findings and nothing otherwise', () => {
    expect(neutralFix('headers.hsts_missing')).toContain(
      'Strict-Transport-Security: max-age=31536000; includeSubDomains',
    );
    expect(neutralFix('tls.no_https_redirect')).toBeNull();
  });
});
