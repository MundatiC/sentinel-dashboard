import type { Metadata } from 'next';
import { IncidentDetailView } from '@/features/incidents/incident-detail';

export const metadata: Metadata = { title: 'Incident' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <IncidentDetailView id={id} />;
}
