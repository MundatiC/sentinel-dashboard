'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { EmptyState, ErrorState, Skeleton } from '@/components/data/states';
import { Pagination } from '@/components/data/pagination';
import { PageHeader } from '@/components/ui/card';
import { useEvents } from '@/lib/api/hooks';
import { EventDrawer } from './event-drawer';
import { EventsTable } from './events-table';
import { FilterBar } from './filter-bar';
import {
  DEFAULT_FILTERS,
  PAGE_SIZES,
  hasActiveFilters,
  parseEventFilters,
  toSearchParams,
  type EventFilters,
} from './filters';

export function EventsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filters = useMemo(() => parseEventFilters(params), [params]);
  const selectedId = params.get('event');

  // One function updates the URL; everything else (query, table, pagination) is derived from it.
  const update = useCallback(
    (patch: Partial<EventFilters>, event: string | null | undefined = selectedId) => {
      // changing any filter (except the page itself) goes back to page 1
      const next = { ...filters, ...patch, page: 'page' in patch ? (patch.page as number) : 1 };
      const qs = toSearchParams(next, event ? { event } : {}).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [filters, pathname, router, selectedId],
  );

  const { data, error, isLoading, isFetching, refetch } = useEvents(filters);

  return (
    <>
      <PageHeader
        title="Events Explorer"
        description="Search every security event Sentinel has received."
      />
      <FilterBar
        filters={filters}
        onChange={(patch) => update(patch)}
        onClear={() => update({ ...DEFAULT_FILTERS }, null)}
      />

      <div className={selectedId ? 'grid gap-4 xl:grid-cols-[minmax(0,1fr)_28rem]' : ''}>
        <section
          aria-label="Events"
          className="overflow-hidden rounded-xl bg-surface-container-low"
        >
          {isLoading && (
            <div className="space-y-2 p-4" role="status" aria-label="Loading events">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          )}
          {error && !data && <ErrorState error={error} onRetry={() => refetch()} />}
          {data && data.data.length === 0 && (
            <EmptyState
              title="No events match"
              hint={
                hasActiveFilters(filters)
                  ? 'Try widening the time range or clearing a filter.'
                  : 'Events appear here as soon as a scanner or log shipper sends them.'
              }
            />
          )}
          {data && data.data.length > 0 && (
            <>
              <EventsTable
                events={data.data}
                selectedId={selectedId}
                busy={isFetching}
                onSelect={(id) => update({ page: filters.page }, id)}
              />
              <Pagination
                {...data.pagination}
                pageSizes={PAGE_SIZES}
                noun="events"
                onPage={(page) => update({ page })}
                onPageSize={(pageSize) => update({ pageSize })}
              />
            </>
          )}
        </section>

        {selectedId && (
          <EventDrawer
            id={selectedId}
            onClose={() => update({ page: filters.page }, null)}
            onFilterIp={(ip) => update({ ip }, null)}
          />
        )}
      </div>
    </>
  );
}
