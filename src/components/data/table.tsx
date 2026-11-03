import { cn } from '@/lib/cn';

/** One header cell for every table: 12px grey sentence case, no band (numbers are right-aligned). */
export function Th({
  numeric,
  className,
  children,
}: {
  numeric?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <th
      scope="col"
      className={cn(
        'px-3 py-2 text-label-default font-medium text-on-surface-variant',
        numeric ? 'text-right' : 'text-left',
        className,
      )}
    >
      {children}
    </th>
  );
}

/** The header row: a hairline under it instead of a filled band. */
export const HEAD_ROW = 'border-b border-outline-variant/30';
