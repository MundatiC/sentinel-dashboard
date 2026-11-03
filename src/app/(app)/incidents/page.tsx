import type { Metadata } from 'next';
import { Suspense } from 'react';
import { IncidentsPage } from '@/features/incidents/incidents-page';

export const metadata: Metadata = { title: 'Incidents' };

export default function Page() {
  return (
    <Suspense>
      <IncidentsPage />
    </Suspense>
  );
}
