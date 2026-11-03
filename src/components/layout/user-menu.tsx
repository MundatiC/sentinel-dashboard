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
      <div className="text-right leading-tight">
        <div className="text-body-dense">{user.email}</div>
        <div className="font-label-mono text-label-mono uppercase text-primary">{user.role}</div>
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
