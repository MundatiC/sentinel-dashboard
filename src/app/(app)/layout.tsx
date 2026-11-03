'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { useAuth } from '@/features/auth/auth-provider';
import { RequireAuth } from '@/features/auth/guards';
import { LiveProvider } from '@/features/live/live-provider';

// The signed-in shell. Nothing inside renders until a session exists (see RequireAuth).
function Shell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setNavOpen(false), [pathname]); // close the drawer after navigating
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary-container focus:px-3 focus:py-2 focus:text-on-primary-container"
      >
        Skip to content
      </a>
      <Sidebar role={user?.role} open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="lg:pl-64">
        <Topbar onMenu={() => setNavOpen(true)} navOpen={navOpen} />
        <main id="main" className="px-4 pb-space-xl pt-space-md sm:px-space-xl">
          {children}
        </main>
      </div>
    </>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <LiveProvider>
        <Shell>{children}</Shell>
      </LiveProvider>
    </RequireAuth>
  );
}
