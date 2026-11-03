import type { Metadata } from 'next';
import { AlertDetail } from '@/features/alerts/alert-detail';

export const metadata: Metadata = { title: 'Alert' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AlertDetail id={id} />;
}
