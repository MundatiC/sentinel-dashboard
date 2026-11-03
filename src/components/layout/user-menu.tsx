'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/auth-provider';

export function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="text-right leading-tight" title={user.email}>
        <div className="max-w-40 truncate text-body-dense max-md:sr-only">{user.email}</div>
        <div className="text-label-default text-primary">{user.role}</div>
      </div>
      <button
        type="button"
        onClick={async () => {
          await logout();
          router.replace('/login');
        }}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
        aria-label="Sign out"
        title="Sign out"
      >
        <LogOut className="h-5 w-5" aria-hidden />
      </button>
    </div>
  );
}
