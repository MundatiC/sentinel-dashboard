import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './globals.css';
import { Providers } from './providers';

// Render every page per request. The CSP nonce (src/middleware.ts) is unique to each request, and Next.js
// can only add it to its own scripts when the HTML is generated at request time. A prerendered (static)
// page would have no nonce, and the browser would block all of its scripts.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { default: 'Sentinel', template: '%s · Sentinel' },
  description: 'Self-hosted security monitoring',
  robots: { index: false, follow: false }, // an internal tool: keep it out of search engines
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
