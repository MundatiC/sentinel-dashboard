import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('rounded-xl bg-surface-container-low p-space-xl', className)} {...props} />
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-space-xl flex flex-wrap items-start justify-between gap-gutter">
      <div>
        <h1 className="font-headline-xl text-headline-xl">{title}</h1>
        {description && (
          <p className="mt-1 text-body-default text-on-surface-variant">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
