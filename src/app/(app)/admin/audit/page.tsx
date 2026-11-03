import type { Metadata } from 'next';
import { RequireRole } from '@/features/auth/guards';
import { AuditPage } from '@/features/admin/audit-page';

export const metadata: Metadata = { title: 'Audit' };

export default function Page() {
  return (
    <RequireRole role="ADMIN">
      <AuditPage />
    </RequireRole>
  );
}
