import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ScansPage } from '@/features/scans/scans-page';

export const metadata: Metadata = { title: 'Scans' };

export default function Page() {
  return (
    <Suspense>
      <ScansPage />
    </Suspense>
  );
}
