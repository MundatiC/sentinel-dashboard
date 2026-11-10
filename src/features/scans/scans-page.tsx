'use client';

import { HEAD_ROW, Th } from '@/components/data/table';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { EmptyState, ErrorState, Skeleton } from '@/components/data/states';
import { Pagination } from '@/components/data/pagination';
import { PageHeader } from '@/components/ui/card';
import { SEVERITIES, SeverityBadge } from '@/components/ui/severity';
import { useScans } from '@/lib/api/hooks';
import { formatTimestamp } from '@/lib/format';
import { GradeChip } from './scan-insights';

export function SeverityCounts({
  summary,
}: {
  summary: Partial<Record<(typeof SEVERITIES)[number], number>>;
}) {
  const present = SEVERITIES.filter((s) => (summary[s] ?? 0) > 0);
  if (present.length === 0) return <span className="text-tertiary">Clean</span>;
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Findings by severity">
      {present.map((s) => (
        <li key={s} className="flex items-center gap-1">
          <SeverityBadge severity={s} />
          <span className="font-code-sm text-code-sm">{summary[s]}</span>
        </li>
      ))}
    </ul>
  );
}

export function ScansPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const { data, error, isLoading, refetch } = useScans(page, 25);

  return (
    <>
      <PageHeader
        title="Scans"
        description="Reports from sentinel-scanner: website checks and dependency audits."
      />
      <section className="overflow-hidden rounded-xl bg-surface-container-low">
        {isLoading && (
          <div className="space-y-2 p-4" role="status" aria-label="Loading scans">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {error && !data && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && data.data.length === 0 && (
          <EmptyState
            title="No scans yet"
            hint="Run `sentinel-scan web <url> --i-own-this --send` to upload one."
          />
        )}
        {data && data.data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-body-dense">
                <caption className="sr-only">Scan reports, newest first</caption>
                <thead>
                  <tr className={HEAD_ROW}>
                    <Th>Target</Th>
                    <Th>Grade</Th>
                    <Th>Scanned (UTC)</Th>
                    <Th>Scanner</Th>
                    <Th>Findings</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((scan) => (
                    <tr
                      key={scan.id}
                      className="border-t border-outline-variant/20 hover:bg-surface-container"
                    >
                      <td className="max-w-xs truncate px-3 py-3">
                        <Link
                          href={`/scans/${scan.id}`}
                          className="font-code-default text-code-default text-primary hover:underline"
                          title={scan.target}
                        >
                          {scan.target}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <GradeChip summary={scan.summary} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-on-surface-variant">
                        {formatTimestamp(scan.finishedAt)}
                      </td>
                      <td className="px-3 py-3 font-code-sm text-code-sm text-on-surface-variant">
                        v{scan.scannerVersion}
                      </td>
                      <td className="px-3 py-3">
                        <SeverityCounts summary={scan.summary} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              {...data.pagination}
              pageSizes={[25]}
              noun="scans"
              onPage={(p) =>
                router.replace(p > 1 ? `${pathname}?page=${p}` : pathname, { scroll: false })
              }
              onPageSize={() => undefined}
            />
          </>
        )}
      </section>
    </>
  );
}
