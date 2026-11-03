'use client';

import { HEAD_ROW, Th } from '@/components/data/table';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { EmptyState, ErrorState, Skeleton } from '@/components/data/states';
import { Pagination } from '@/components/data/pagination';
import { canSee } from '@/components/layout/nav';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/card';
import { SeverityBadge } from '@/components/ui/severity';
import { StatusBadge } from '@/components/ui/status';
import { useAuth } from '@/features/auth/auth-provider';
import { useIncidents } from '@/lib/api/hooks';
import { relativeTime } from '@/lib/format';
import { CreateIncidentDialog } from './create-incident-dialog';

const FILTERS = [
  { value: 'active', label: 'Active', api: 'OPEN,INVESTIGATING,CONTAINED' },
  { value: 'resolved', label: 'Resolved', api: 'RESOLVED' },
  { value: 'all', label: 'All', api: undefined },
] as const;

export function IncidentsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const filter = FILTERS.find((f) => f.value === params.get('show')) ?? FILTERS[0];
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const { data, error, isLoading, refetch } = useIncidents({
    status: filter.api,
    page,
    pageSize: 25,
  });
  const analyst = canSee(user?.role, 'ANALYST');

  const go = (show: string, p: number) => {
    const qs = new URLSearchParams();
    if (show !== 'active') qs.set('show', show);
    if (p > 1) qs.set('page', String(p));
    router.replace(qs.toString() ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <>
      <PageHeader
        title="Incidents"
        description="Coordinate the response to confirmed problems."
        actions={
          <Button
            variant="primary"
            disabled={!analyst}
            title={analyst ? undefined : 'Requires the analyst role'}
            onClick={() => setCreating(true)}
          >
            <Plus className="h-4 w-4" aria-hidden /> New incident
          </Button>
        }
      />
      <section className="overflow-hidden rounded-xl bg-surface-container-low">
        <div role="group" aria-label="Show incidents" className="flex gap-1 p-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter.value === f.value}
              onClick={() => go(f.value, 1)}
              className={`rounded-lg px-4 py-2 text-body-default ${filter.value === f.value ? 'bg-surface-container-high text-primary' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {isLoading && (
          <div className="space-y-2 p-4" role="status" aria-label="Loading incidents">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {error && !data && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && data.data.length === 0 && (
          <EmptyState
            title="No incidents"
            hint="Open an incident from an alert when something needs a coordinated response."
          />
        )}
        {data && data.data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-body-dense">
                <caption className="sr-only">Incidents, newest first</caption>
                <thead>
                  <tr className={HEAD_ROW}>
                    <Th>Severity</Th>
                    <Th>Incident</Th>
                    <Th>Status</Th>
                    <Th>Alerts</Th>
                    <Th>Opened</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((i) => (
                    <tr
                      key={i.id}
                      className="border-t border-outline-variant/20 hover:bg-surface-container"
                    >
                      <td className="px-3 py-3">
                        <SeverityBadge severity={i.severity} />
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/incidents/${i.id}`}
                          className="text-body-default text-primary hover:underline"
                        >
                          {i.title}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={i.status} />
                      </td>
                      <td className="px-3 py-3 text-right font-code-sm text-code-sm">
                        {i.alertCount}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-on-surface-variant">
                        {relativeTime(i.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              {...data.pagination}
              pageSizes={[25]}
              noun="incidents"
              onPage={(p) => go(filter.value, p)}
              onPageSize={() => undefined}
            />
          </>
        )}
      </section>
      <CreateIncidentDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
