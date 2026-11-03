'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { EmptyState, ErrorState, Skeleton } from '@/components/data/states';
import { Card, PageHeader } from '@/components/ui/card';
import { SeverityBadge } from '@/components/ui/severity';
import { useAlertCount, useEventStats, useIncidentCount, useRecentAlerts } from '@/lib/api/hooks';
import { formatNumber, relativeTime } from '@/lib/format';
import { fillHourlyBuckets } from './chart-data';
import { EventsBySeverityChart, StatusDonut } from './charts';

function Kpi({
  label,
  value,
  hint,
  loading,
  error,
}: {
  label: string;
  value: number | undefined;
  hint: string;
  loading: boolean;
  error: boolean;
}) {
  return (
    <Card className="p-space-xl">
      <h2 className="font-label-mono text-label-mono uppercase text-outline">{label}</h2>
      <p className="mt-3 font-headline-xl text-[2.25rem] leading-none">
        {loading ? (
          <Skeleton className="h-9 w-24" />
        ) : error ? (
          <span className="text-error" title="Could not load">
            –
          </span>
        ) : (
          formatNumber(value ?? 0)
        )}
      </p>
      <p className="mt-2 text-label-default text-on-surface-variant">{hint}</p>
    </Card>
  );
}

export function OverviewPage() {
  const openAlerts = useAlertCount({ status: 'OPEN' });
  const ackAlerts = useAlertCount({ status: 'ACKNOWLEDGED' });
  const resolvedAlerts = useAlertCount({ status: 'RESOLVED' });
  const criticalAlerts = useAlertCount({ status: 'OPEN,ACKNOWLEDGED', severity: 'CRITICAL' });
  const incidents = useIncidentCount('OPEN,INVESTIGATING,CONTAINED');
  const stats = useEventStats(24);
  const recent = useRecentAlerts(5);

  const points = useMemo(
    () => (stats.data ? fillHourlyBuckets(stats.data.data, 24) : []),
    [stats.data],
  );
  const eventsToday = points.reduce((sum, p) => sum + p.total, 0);
  const statusTotal = (openAlerts.data ?? 0) + (ackAlerts.data ?? 0) + (resolvedAlerts.data ?? 0);

  const slices = [
    { name: 'Open', value: openAlerts.data ?? 0, color: '#ffb4ab' },
    { name: 'Acknowledged', value: ackAlerts.data ?? 0, color: '#adc6ff' },
    { name: 'Resolved', value: resolvedAlerts.data ?? 0, color: '#4edea3' },
  ];

  return (
    <>
      <PageHeader
        title="Security Command Post"
        description="Real-time attack surface telemetry and rule evaluations."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Open alerts"
          value={openAlerts.data}
          loading={openAlerts.isLoading}
          error={openAlerts.isError}
          hint="Waiting for triage"
        />
        <Kpi
          label="Events (24h)"
          value={eventsToday}
          loading={stats.isLoading}
          error={stats.isError}
          hint="All sources, last 24 hours"
        />
        <Kpi
          label="Critical alerts"
          value={criticalAlerts.data}
          loading={criticalAlerts.isLoading}
          error={criticalAlerts.isError}
          hint="Open or acknowledged"
        />
        <Kpi
          label="Active incidents"
          value={incidents.data}
          loading={incidents.isLoading}
          error={incidents.isError}
          hint="Open, investigating or contained"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          <Card>
            <h2 className="font-headline-md text-headline-md">Events by severity, last 24 hours</h2>
            <p className="mb-4 text-label-default text-on-surface-variant">Hourly counts, UTC</p>
            {stats.isLoading && <Skeleton className="h-72 w-full" />}
            {stats.error && <ErrorState error={stats.error} onRetry={() => stats.refetch()} />}
            {stats.data && <EventsBySeverityChart points={points} />}
            <ul
              className="mt-3 flex flex-wrap gap-4 text-label-default text-on-surface-variant"
              aria-label="Legend"
            >
              {[
                ['Critical', '#ef4444'],
                ['High', '#f97316'],
                ['Medium', '#eab308'],
                ['Low', '#3b82f6'],
                ['Info', '#6b7280'],
              ].map(([name, color]) => (
                <li key={name} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ background: color }}
                  />
                  {name}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="flex flex-wrap items-center gap-6">
            <StatusDonut slices={slices} total={statusTotal} />
            <div className="min-w-48 flex-1">
              <h2 className="font-headline-md text-headline-md">Alerts by status</h2>
              <ul className="mt-3 space-y-2">
                {slices.map((s) => (
                  <li
                    key={s.name}
                    className="flex items-center justify-between gap-3 rounded-lg bg-surface-container px-3 py-2"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        aria-hidden
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ background: s.color }}
                      />
                      {s.name}
                    </span>
                    <span className="font-code-default text-code-default">
                      {formatNumber(s.value)}
                      {statusTotal ? (
                        <span className="ml-2 text-on-surface-variant">
                          {Math.round((s.value / statusTotal) * 100)}%
                        </span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>

        <Card>
          <h2 className="font-headline-md text-headline-md">Active alerts</h2>
          <p className="mb-3 text-label-default text-on-surface-variant">
            Newest open and acknowledged
          </p>
          {recent.isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          )}
          {recent.error && <ErrorState error={recent.error} onRetry={() => recent.refetch()} />}
          {recent.data && recent.data.data.length === 0 && (
            <EmptyState title="No active alerts" hint="Nothing needs attention right now." />
          )}
          {recent.data && recent.data.data.length > 0 && (
            <ul className="space-y-2">
              {recent.data.data.map((alert) => (
                <li key={alert.id}>
                  <Link
                    href={`/alerts/${alert.id}`}
                    className="block rounded-lg bg-surface-container p-3 hover:bg-surface-container-high"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <SeverityBadge severity={alert.severity} />
                      <span className="text-label-default text-on-surface-variant">
                        {relativeTime(alert.createdAt)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-body-default">{alert.title}</p>
                    <p className="mt-1 text-label-default text-on-surface-variant">
                      {alert.eventCount} events · {alert.status.toLowerCase()}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/alerts" className="mt-4 inline-block text-primary hover:underline">
            View all alerts →
          </Link>
        </Card>
      </div>
    </>
  );
}
