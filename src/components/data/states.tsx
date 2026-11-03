import { AlertCircle, Inbox } from 'lucide-react';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div aria-hidden className={`animate-pulse rounded bg-surface-container-high ${className}`} />
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <Inbox className="h-8 w-8 text-outline" aria-hidden />
      <p className="font-headline-md text-headline-md">{title}</p>
      {hint && <p className="max-w-sm text-on-surface-variant">{hint}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message =
    error instanceof ApiError
      ? error.status === 403
        ? 'You do not have permission to see this.'
        : error.message
      : 'Could not reach the Sentinel API.';
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <AlertCircle className="h-8 w-8 text-error" aria-hidden />
      <p className="font-headline-md text-headline-md">Something went wrong</p>
      <p className="text-on-surface-variant">{message}</p>
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
    </div>
  );
}
