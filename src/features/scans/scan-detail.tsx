'use client';

import { ArrowLeft, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { ErrorState, Skeleton } from '@/components/data/states';
import { Card } from '@/components/ui/card';
import { SafeLink } from '@/components/ui/safe-link';
import { SEVERITIES, SeverityBadge } from '@/components/ui/severity';
import { useScan } from '@/lib/api/hooks';
import type { ApiFinding, ScanCategory } from '@/lib/api/schemas';
import { formatTimestamp } from '@/lib/format';
import { SeverityCounts } from './scans-page';

export const CATEGORY_LABEL: Record<ScanCategory, string> = {
  DEPENDENCIES: 'Dependencies (OSV)',
  HEADERS: 'Security headers',
  COOKIES: 'Cookies & session',
  TLS: 'TLS & transport',
  EXPOSED_FILES: 'Exposed files',
};
const CATEGORY_ORDER: ScanCategory[] = [
  'DEPENDENCIES',
  'HEADERS',
  'COOKIES',
  'TLS',
  'EXPOSED_FILES',
];

/** Group findings by category (stable order) and sort each group worst-first. */
export function groupFindings(findings: ApiFinding[]) {
  const rank = (f: ApiFinding) => SEVERITIES.indexOf(f.severity);
  return CATEGORY_ORDER.map((category) => ({
    category,
    findings: findings
      .filter((f) => f.category === category)
      .sort((a, b) => rank(a) - rank(b) || a.title.localeCompare(b.title)),
  })).filter((g) => g.findings.length > 0);
}

function Finding({ finding }: { finding: ApiFinding }) {
  const evidence = Object.keys(finding.evidence).length
    ? JSON.stringify(finding.evidence, null, 2)
    : null;
  return (
    <details className="group rounded-lg bg-surface-container">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
        <SeverityBadge severity={finding.severity} />
        <span className="min-w-0 flex-1 text-body-default">{finding.title}</span>
        <span className="hidden font-code-sm text-code-sm text-on-surface-variant sm:inline">
          {finding.checkId}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className="space-y-4 px-4 pb-4">
        <p className="whitespace-pre-wrap break-words text-body-default text-on-surface-variant">
          {finding.description}
        </p>
        {evidence && (
          <div>
            <p className="mb-1 text-label-default text-on-surface-variant">Evidence</p>
            <pre
              tabIndex={0}
              aria-label="Evidence"
              className="max-h-60 overflow-auto rounded-lg bg-surface-container-lowest p-3 font-code-sm text-code-sm text-primary"
            >
              {evidence}
            </pre>
          </div>
        )}
        <div className="rounded-lg bg-surface-container-lowest p-3">
          <p className="mb-1 text-label-default text-primary">Recommended remediation</p>
          <p className="whitespace-pre-wrap break-words text-body-default">{finding.remediation}</p>
        </div>
        {finding.references.length > 0 && (
          <div>
            <p className="mb-1 text-label-default text-on-surface-variant">References</p>
            <ul className="space-y-1">
              {finding.references.map((r) => (
                <li key={r}>
                  <SafeLink href={r} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

export function ScanDetail({ id }: { id: string }) {
  const { data: scan, error, isLoading, refetch } = useScan(id);
  if (isLoading)
    return (
      <div className="space-y-4" role="status" aria-label="Loading scan">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (error || !scan) return <ErrorState error={error} onRetry={() => refetch()} />;

  const groups = groupFindings(scan.findings);
  const seconds = Math.max(
    0,
    Math.round((new Date(scan.finishedAt).getTime() - new Date(scan.startedAt).getTime()) / 1000),
  );

  return (
    <>
      <Link
        href="/scans"
        className="mb-4 inline-flex items-center gap-1 text-on-surface-variant hover:text-on-surface"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Scans
      </Link>
      <Card className="mb-4">
        <h1 className="break-all font-headline-xl text-headline-xl">{scan.target}</h1>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-label-default text-on-surface-variant">Scanned</dt>
            <dd className="mt-1">{formatTimestamp(scan.finishedAt)} UTC</dd>
          </div>
          <div>
            <dt className="text-label-default text-on-surface-variant">Duration</dt>
            <dd className="mt-1">{seconds}s</dd>
          </div>
          <div>
            <dt className="text-label-default text-on-surface-variant">Scanner</dt>
            <dd className="mt-1 font-code-default text-code-default">
              sentinel-scanner v{scan.scannerVersion}
            </dd>
          </div>
        </dl>
        <div className="mt-4">
          <SeverityCounts summary={scan.summary} />
        </div>
      </Card>

      {groups.length === 0 && (
        <Card className="text-tertiary">No findings: nothing to fix in this scan.</Card>
      )}
      <div className="space-y-4">
        {groups.map(({ category, findings }) => (
          <section
            key={category}
            aria-labelledby={`cat-${category}`}
            className="rounded-xl bg-surface-container-low p-space-xl"
          >
            <h2 id={`cat-${category}`} className="mb-3 font-headline-md text-headline-md">
              {CATEGORY_LABEL[category]}{' '}
              <span className="ml-2 font-body-default text-on-surface-variant">
                {findings.length} {findings.length === 1 ? 'finding' : 'findings'}
              </span>
            </h2>
            <div className="space-y-2">
              {findings.map((f) => (
                <Finding key={f.id} finding={f} />
              ))}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-4 text-label-default text-on-surface-variant">
        Categories without findings are not listed: they were either clean or not part of this scan.
      </p>
    </>
  );
}
