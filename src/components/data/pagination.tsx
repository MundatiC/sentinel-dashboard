import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

/** Page numbers to show: always first and last, the current page and its neighbours, "…" for gaps. */
export function pageWindow(page: number, totalPages: number): (number | 'gap')[] {
  const wanted = new Set(
    [1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages),
  );
  const sorted = [...wanted].sort((a, b) => a - b);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

interface Props {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  pageSizes: readonly number[];
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
  noun?: string;
}

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  pageSizes,
  onPage,
  onPageSize,
  noun = 'results',
}: Props) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const btn =
    'flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-body-dense disabled:opacity-40';

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-body-dense"
    >
      <p aria-live="polite" className="text-on-surface-variant">
        Showing{' '}
        <span className="text-on-surface">
          {formatNumber(first)}–{formatNumber(last)}
        </span>{' '}
        of <span className="text-on-surface">{formatNumber(total)}</span> {noun}
      </p>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-on-surface-variant">
          Per page
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="h-8 rounded-lg bg-surface-container-high px-2 text-on-surface"
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <ul className="flex items-center gap-1">
          <li>
            <button
              className={cn(btn, 'bg-surface-container-high')}
              disabled={page <= 1}
              onClick={() => onPage(page - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
          </li>
          {pageWindow(page, totalPages).map((p, i) =>
            p === 'gap' ? (
              <li key={`gap-${i}`} aria-hidden className="px-1 text-outline">
                …
              </li>
            ) : (
              <li key={p}>
                <button
                  className={cn(
                    btn,
                    p === page
                      ? 'bg-primary-container text-on-primary-container'
                      : 'bg-surface-container-high',
                  )}
                  aria-current={p === page ? 'page' : undefined}
                  aria-label={`Page ${p}`}
                  onClick={() => onPage(p)}
                >
                  {p}
                </button>
              </li>
            ),
          )}
          <li>
            <button
              className={cn(btn, 'bg-surface-container-high')}
              disabled={page >= totalPages}
              onClick={() => onPage(page + 1)}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}
