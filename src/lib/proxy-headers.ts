// Same-origin proxy mode (docs/DEPLOY.md): the API sees this app's server, not the visitor. This adds the
// visitor's IP and a shared secret to API-bound requests so the API can trust the IP (it ignores both
// headers without the right secret). Vercel overwrites x-forwarded-for / x-vercel-forwarded-for with the real
// visitor IP at its edge, so that is the only place the IP is read from; elsewhere a visitor could forge it,
// which is why this only runs on Vercel.
export const PROXY_SECRET_HEADER = 'x-sentinel-proxy-secret';
export const CLIENT_IP_HEADER = 'x-sentinel-client-ip';

export function vouchClientIp(
  headers: Headers,
  pathname: string,
  env: Record<string, string | undefined>,
): void {
  // A visitor must never be able to supply these themselves.
  headers.delete(PROXY_SECRET_HEADER);
  headers.delete(CLIENT_IP_HEADER);
  if (!env.PROXY_SHARED_SECRET || env.VERCEL !== '1' || !pathname.startsWith('/api/v1/')) return;
  const ip = (headers.get('x-vercel-forwarded-for') ?? headers.get('x-real-ip'))
    ?.split(',')[0]
    ?.trim();
  if (!ip) return;
  headers.set(PROXY_SECRET_HEADER, env.PROXY_SHARED_SECRET);
  headers.set(CLIENT_IP_HEADER, ip);
}
