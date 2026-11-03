import type { Metadata } from 'next';
import { RequireRole } from '@/features/auth/guards';
import { UsersPage } from '@/features/admin/users-page';

export const metadata: Metadata = { title: 'Users' };

export default function Page() {
  return (
    <RequireRole role="ADMIN">
      <UsersPage />
    </RequireRole>
  );
}
