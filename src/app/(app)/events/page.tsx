import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EventsPage } from '@/features/events/events-page';

export const metadata: Metadata = { title: 'Events' };

export default function Page() {
  // useSearchParams() (the filters in the URL) needs a Suspense boundary
  return (
    <Suspense>
      <EventsPage />
    </Suspense>
  );
}
