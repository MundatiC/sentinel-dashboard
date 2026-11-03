'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { EmptyState, ErrorState, Skeleton } from '@/components/data/states';
import { Pagination } from '@/components/data/pagination';
import { PageHeader } from '@/components/ui/card';
import { SeverityBadge } from '@/components/ui/severity';
import { StatusBadge } from '@/components/ui/status';
import { cn } from '@/lib/cn';
import { useAlertCount, useAlerts } from '@/lib/api/hooks';
import { formatNumber, relativeTime } from '@/lib/format';

const TABS = [
  { value: 'OPEN', label: 'Open' },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged' },
  { value: 'RESOLVED', label: 'Resolved' },
] as const;

export function parseAlertStatus(value: string | null): (typeof TABS)[number]['value'] {
  return TABS.find((t) => t.value === value)?.value ?? 'OPEN';
}

function TabCount({ status }: { status: string }) {
  const { data } = useAlertCount({ status });
  return (
    <span className="rounded bg-surface-container-high px-1.5 font-label-mono text-label-mono">
      {data === undefined ? '–' : formatNumber(data)}
    </span>
  );
}

export function AlertsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = parseAlertStatus(params.get('status'));
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const pageSize = [25, 50, 100].includes(Number(params.get('pageSize')))
    ? Number(params.get('pageSize'))
    : 25;

  const go = (next: Record<string, string | number>) => {
    const qs = new URLSearchParams({
      status,
      page: String(page),
      pageSize: String(pageSize),
      ...Object.fromEntries(Object.entries(next).map(([k, v]) => [k, String(v)])),
    });
    if (qs.get('status') === 'OPEN') qs.delete('status');
    if (qs.get('page') === '1') qs.delete('page');
    if (qs.get('pageSize') === '25') qs.delete('pageSize');
    router.replace(qs.toString() ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const { data, error, isLoading, refetch } = useAlerts({ status, page, pageSize });
  const th =
    'px-3 py-2 text-left font-label-mono text-label-mono font-medium uppercase text-outline';

  return (
    <>
      <PageHeader title="Alerts" description="Triage what the detection rules found." />
      <section className="overflow-hidden rounded-xl bg-surface-container-low">
        <div role="tablist" aria-label="Alert status" className="flex gap-1 p-2">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              role="tab"
              aria-selected={status === tab.value}
              onClick={() => go({ status: tab.value, page: 1 })}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-body-default',
                status === tab.value
                  ? 'bg-surface-container-high text-primary'
                  : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {tab.label} <TabCount status={tab.value} />
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2 p-4" role="status" aria-label="Loading alerts">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {error && !data && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && data.data.length === 0 && (
          <EmptyState
            title={`No ${status.toLowerCase()} alerts`}
            hint="New alerts appear here as soon as a rule fires."
          />
        )}
        {data && data.data.length > 0 && (
          <>
            <div className="overflow-x-auto" role="tabpanel">
              <table className="w-full min-w-[48rem] text-body-dense">
                <caption className="sr-only">{status.toLowerCase()} alerts, newest first</caption>
                <thead>
                  <tr className="bg-surface-container-lowest">
                    <th scope="col" className={th}>
                      Severity
                    </th>
                    <th scope="col" className={th}>
                      Alert
                    </th>
                    <th scope="col" className={th}>
                      Group
                    </th>
                    <th scope="col" className={th}>
                      Events
                    </th>
                    <th scope="col" className={th}>
                      Status
                    </th>
                    <th scope="col" className={th}>
                      Age
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((alert) => (
                    <tr
                      key={alert.id}
                      className="border-t border-outline-variant/20 hover:bg-surface-container"
                    >
                      <td className="px-3 py-3">
                        <SeverityBadge severity={alert.severity} />
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/alerts/${alert.id}`}
                          className="text-body-default text-primary hover:underline"
                        >
                          {alert.title}
                        </Link>
                        {alert.rule && (
                          <p className="text-label-default text-on-surface-variant">
                            {alert.rule.name}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-3 font-code-sm text-code-sm">{alert.groupKey}</td>
                      <td className="px-3 py-3 font-code-sm text-code-sm">
                        {formatNumber(alert.eventCount)}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={alert.status} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-on-surface-variant">
                        {relativeTime(alert.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              {...data.pagination}
              pageSizes={[25, 50, 100]}
              noun="alerts"
              onPage={(p) => go({ page: p })}
              onPageSize={(s) => go({ pageSize: s, page: 1 })}
            />
          </>
        )}
      </section>
    </>
  );
}
