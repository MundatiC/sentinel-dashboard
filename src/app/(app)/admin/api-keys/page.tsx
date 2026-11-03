import type { Metadata } from 'next';
import { RequireRole } from '@/features/auth/guards';
import { ApiKeysPage } from '@/features/admin/api-keys-page';

export const metadata: Metadata = { title: 'API Keys' };

export default function Page() {
  return (
    <RequireRole role="ADMIN">
      <ApiKeysPage />
    </RequireRole>
  );
}
