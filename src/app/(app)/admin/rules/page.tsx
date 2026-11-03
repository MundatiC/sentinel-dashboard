import type { Metadata } from 'next';
import { RulesPage } from '@/features/admin/rules-page';

export const metadata: Metadata = { title: 'Rules' };

export default function Page() {
  return <RulesPage />;
}
