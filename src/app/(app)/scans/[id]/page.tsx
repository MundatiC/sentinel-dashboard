import type { Metadata } from 'next';
import { ScanDetail } from '@/features/scans/scan-detail';

export const metadata: Metadata = { title: 'Scan report' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ScanDetail id={id} />;
}
