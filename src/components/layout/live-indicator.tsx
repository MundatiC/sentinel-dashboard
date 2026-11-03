'use client';

import { cn } from '@/lib/cn';
import { useLiveStatus } from '@/features/live/live-provider';

const LABEL = { live: 'Live', connecting: 'Connecting…', reconnecting: 'Reconnecting…' } as const;

export function LiveIndicator() {
  const status = useLiveStatus();
  return (
    <span
      role="status"
      aria-label={`Live alert feed: ${LABEL[status]}`}
      className="flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-1.5 text-label-default"
    >
      <span
        aria-hidden
        className={cn(
          'h-2 w-2 rounded-full',
          status === 'live' ? 'bg-tertiary' : 'animate-pulse bg-[#eab308]',
        )}
      />
      {LABEL[status]}
    </span>
  );
}
