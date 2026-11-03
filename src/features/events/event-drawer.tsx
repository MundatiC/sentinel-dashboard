'use client';

import { Copy, Filter, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { SeverityBadge } from '@/components/ui/severity';
import { ErrorState, Skeleton } from '@/components/data/states';
import { useEvent } from '@/lib/api/hooks';
import { formatTimestamp } from '@/lib/format';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5">
      <dt className="font-label-mono text-label-mono uppercase text-outline">{label}</dt>
      <dd className="text-right font-code-sm text-code-sm break-all">{children}</dd>
    </div>
  );
}

export function EventDrawer({
  id,
  onClose,
  onFilterIp,
}: {
  id: string;
  onClose: () => void;
  onFilterIp: (ip: string) => void;
}) {
  const { data: event, error, isLoading, refetch } = useEvent(id);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => closeRef.current?.focus(), [id]); // move keyboard focus into the panel when it opens
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Metadata is shown with JSON.stringify inside <pre>: as text, never as HTML.
  const json = event
    ? JSON.stringify(
        {
          id: event.id,
          type: event.type,
          severity: event.severity,
          source: event.source,
          actor: event.actor,
          ip: event.ip,
          message: event.message,
          occurredAt: event.occurredAt,
          metadata: event.metadata,
        },
        null,
        2,
      )
    : '';

  return (
    <aside aria-label="Event details" className="rounded-xl bg-surface-container-low">
      <div className="flex items-center justify-between gap-2 p-4">
        <h2 className="font-headline-md text-headline-md">Event details</h2>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close event details"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3 p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      )}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}

      {event && (
        <>
          <dl className="mx-4 divide-y divide-outline-variant/20">
            <Row label="Event ID">{event.id}</Row>
            <Row label="Severity">
              <SeverityBadge severity={event.severity} />
            </Row>
            <Row label="Type">{event.type}</Row>
            <Row label="Occurred">{formatTimestamp(event.occurredAt, true)} UTC</Row>
            <Row label="Received">{formatTimestamp(event.receivedAt, true)} UTC</Row>
            <Row label="Source">{event.source}</Row>
            {event.actor && <Row label="Actor">{event.actor}</Row>}
            {event.ip && <Row label="IP">{event.ip}</Row>}
          </dl>
          <div className="flex flex-wrap gap-2 p-4">
            {event.ip && (
              <Button onClick={() => onFilterIp(event.ip as string)}>
                <Filter className="h-4 w-4" aria-hidden /> Filter by this IP
              </Button>
            )}
            <Button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(json);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  /* clipboard unavailable: ignore */
                }
              }}
            >
              <Copy className="h-4 w-4" aria-hidden /> {copied ? 'Copied' : 'Copy JSON'}
            </Button>
          </div>
          <div className="px-4 pb-4">
            <p className="mb-2 font-label-mono text-label-mono uppercase text-outline">Message</p>
            <p className="mb-4 whitespace-pre-wrap break-words text-body-default">
              {event.message}
            </p>
            <p className="mb-2 font-label-mono text-label-mono uppercase text-outline">Raw event</p>
            <pre
              tabIndex={0}
              aria-label="Raw event JSON"
              className="max-h-96 overflow-auto rounded-lg bg-surface-container-lowest p-4 font-code-sm text-code-sm text-primary"
            >
              {json}
            </pre>
          </div>
        </>
      )}
    </aside>
  );
}
