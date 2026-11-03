'use client';

import { useState } from 'react';
import { EmptyState, ErrorState, Skeleton } from '@/components/data/states';
import { Pagination } from '@/components/data/pagination';
import { PageHeader } from '@/components/ui/card';
import { formatTimestamp } from '@/lib/format';
import { useDebounced } from '@/lib/use-debounced';
import { useAudit } from './hooks';

export function AuditPage() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const debounced = useDebounced(action.trim());
  const { data, error, isLoading, refetch } = useAudit({
    action: debounced || undefined,
    page,
    pageSize,
  });
  const th =
    'px-3 py-2 text-left font-label-mono text-label-mono font-medium uppercase text-outline';

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Who did what. Append-only: entries can never be edited or deleted."
      />
      <div className="mb-4 rounded-xl bg-surface-container-low p-4">
        <label
          htmlFor="audit-action"
          className="mb-1 block font-label-mono text-label-mono uppercase text-outline"
        >
          Action starts with
        </label>
        <input
          id="audit-action"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          placeholder="auth.  user.  api_key.  alert_rule.  incident."
          maxLength={100}
          className="h-9 w-full max-w-md rounded-lg bg-surface-container-lowest px-3 font-code-default text-code-default"
        />
      </div>
      <section className="overflow-hidden rounded-xl bg-surface-container-low">
        {isLoading && (
          <div className="space-y-2 p-4" role="status" aria-label="Loading audit log">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}
        {error && !data && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && data.data.length === 0 && (
          <EmptyState title="No entries" hint="Nothing matches this filter." />
        )}
        {data && data.data.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-body-dense">
                <caption className="sr-only">Audit log, newest first</caption>
                <thead>
                  <tr className="bg-surface-container-lowest">
                    <th scope="col" className={th}>
                      Time (UTC)
                    </th>
                    <th scope="col" className={th}>
                      Action
                    </th>
                    <th scope="col" className={th}>
                      Actor
                    </th>
                    <th scope="col" className={th}>
                      Target
                    </th>
                    <th scope="col" className={th}>
                      IP
                    </th>
                    <th scope="col" className={th}>
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.data.map((e) => (
                    <tr key={e.id} className="border-t border-outline-variant/20 align-top">
                      <td className="whitespace-nowrap px-3 py-2.5 font-code-sm text-code-sm">
                        {formatTimestamp(e.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 font-code-sm text-code-sm text-primary">
                        {e.action}
                      </td>
                      <td
                        className="max-w-[10rem] truncate px-3 py-2.5 font-code-sm text-code-sm text-on-surface-variant"
                        title={e.actorId ?? e.actorType}
                      >
                        {e.actorId ? e.actorId.slice(0, 8) : e.actorType.toLowerCase()}
                      </td>
                      <td className="px-3 py-2.5 font-code-sm text-code-sm text-on-surface-variant">
                        {e.targetType ? `${e.targetType} ${e.targetId?.slice(0, 8) ?? ''}` : '–'}
                      </td>
                      <td className="px-3 py-2.5 font-code-sm text-code-sm">{e.ip ?? '–'}</td>
                      <td className="px-3 py-2.5">
                        <details>
                          <summary className="cursor-pointer text-primary">View</summary>
                          <pre
                            tabIndex={0}
                            aria-label="Entry details"
                            className="mt-2 max-h-48 max-w-xs overflow-auto rounded-lg bg-surface-container-lowest p-2 font-code-sm text-code-sm"
                          >
                            {JSON.stringify(e.metadata, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              {...data.pagination}
              pageSizes={[25, 50, 100]}
              noun="entries"
              onPage={setPage}
              onPageSize={(s) => {
                setPageSize(s);
                setPage(1);
              }}
            />
          </>
        )}
      </section>
    </>
  );
}
