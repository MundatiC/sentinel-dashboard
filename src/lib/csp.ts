/**
 * The `connect-src` directive for the browser's requests. NEXT_PUBLIC_API_URL is either an absolute
 * URL (the browser calls the API directly) or "/" (same-origin mode: the browser calls this app,
 * which proxies /api/v1 to the API, see docs/DEPLOY.md). In the second case 'self' is all we need.
 */
export function connectSrc(apiUrl: string): string {
  const trimmed = apiUrl.trim();
  return trimmed === '' || trimmed.startsWith('/') ? "'self'" : `'self' ${trimmed}`;
}
