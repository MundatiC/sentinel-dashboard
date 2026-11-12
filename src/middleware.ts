import { NextResponse, type NextRequest } from 'next/server';
import { connectSrc } from '@/lib/csp';

// Per-request Content-Security-Policy with a nonce, so only scripts Next.js itself emits can run.
// An injected <script> (XSS) has no nonce and is blocked by the browser.
export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const isDev = process.env.NODE_ENV === 'development';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

  const csp = [
    "default-src 'self'",
    // 'strict-dynamic' lets the nonced Next.js bootstrap load its own chunks. React refresh needs eval in dev only.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'", // Tailwind CSS is a file; React/Recharts set inline style attributes
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src ${connectSrc(apiUrl)}`, // the API, directly or through this app's /api/v1 proxy (REST + SSE)
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');

  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  // Everything except static assets.
  matcher: [{ source: '/((?!_next/static|_next/image|favicon.ico).*)' }],
};
