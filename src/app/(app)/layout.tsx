'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { useAuth } from '@/features/auth/auth-provider';
import { RequireAuth } from '@/features/auth/guards';
import { LiveProvider } from '@/features/live/live-provider';

// The signed-in shell. Nothing inside renders until a session exists (see RequireAuth).
function Shell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-primary-container focus:px-3 focus:py-2 focus:text-on-primary-container"
      >
        Skip to content
      </a>
      <Sidebar role={user?.role} />
      <div className="pl-64">
        <Topbar />
        <main id="main" className="px-space-xl pb-space-xl pt-space-md">
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
