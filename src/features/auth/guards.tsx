'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { canSee, type Role } from '@/components/layout/nav';
import { useAuth } from './auth-provider';

function FullPageStatus({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen items-center justify-center text-on-surface-variant"
    >
      {label}
    </div>
  );
}

// Wraps every signed-in page. While we check for a session we show a neutral loading state, and
// anonymous visitors are sent to /login (remembering where they wanted to go).
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'anonymous') router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  if (status !== 'authenticated') {
    return <FullPageStatus label={status === 'loading' ? 'Loading…' : 'Redirecting to sign in…'} />;
  }
  return <>{children}</>;
}

// Hides a page from users below `role`. Remember: this is only a courtesy. The API refuses the
// requests anyway; this just avoids showing a page that would be full of "Forbidden" errors.
export function RequireRole({ role, children }: { role: Role; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!canSee(user?.role, role)) {
    return (
      <div role="alert" className="rounded-xl bg-surface-container-low p-space-xl">
        <h1 className="font-headline-lg text-headline-lg">Access denied</h1>
        <p className="mt-2 text-on-surface-variant">
          You need the {role.toLowerCase()} role to view this page.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
