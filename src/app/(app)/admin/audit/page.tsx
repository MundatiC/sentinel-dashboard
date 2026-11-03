import { RequireRole } from '@/features/auth/guards';
import { ComingSoon } from '@/components/ui/coming-soon';

export default function Page() {
  return (
    <RequireRole role="ADMIN">
      <ComingSoon title="Audit Log" description="Administration" />
    </RequireRole>
  );
}
