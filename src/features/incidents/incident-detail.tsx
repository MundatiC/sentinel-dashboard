'use client';

import { ArrowLeft, Check, Download } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { ErrorState, Skeleton } from '@/components/data/states';
import { canSee } from '@/components/layout/nav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SeverityBadge } from '@/components/ui/severity';
import { StatusBadge } from '@/components/ui/status';
import { useAuth } from '@/features/auth/auth-provider';
import { ApiError } from '@/lib/api/client';
import { useAlerts, useIncident, useIncidentMutations } from '@/lib/api/hooks';
import type { IncidentDetail, TimelineEntry } from '@/lib/api/schemas';
import { cn } from '@/lib/cn';
import { formatTimestamp, relativeTime } from '@/lib/format';

export const STEPS = ['OPEN', 'INVESTIGATING', 'CONTAINED', 'RESOLVED'] as const;
const STEP_LABEL = {
  OPEN: 'Open',
  INVESTIGATING: 'Investigating',
  CONTAINED: 'Contained',
  RESOLVED: 'Resolved',
} as const;

/** "2h 45m", or "just opened". Open incidents count up to now, resolved ones stop at the resolution time. */
export function incidentDuration(
  incident: Pick<IncidentDetail, 'createdAt' | 'resolvedAt'>,
  now = Date.now(),
): string {
  const end = incident.resolvedAt ? new Date(incident.resolvedAt).getTime() : now;
  const minutes = Math.max(0, Math.floor((end - new Date(incident.createdAt).getTime()) / 60_000));
  if (minutes < 1) return 'under a minute';
  const days = Math.floor(minutes / 1440),
    hours = Math.floor((minutes % 1440) / 60),
    mins = minutes % 60;
  return [days && `${days}d`, hours && `${hours}h`, mins && `${mins}m`].filter(Boolean).join(' ');
}

function TimelineItem({ entry }: { entry: TimelineEntry }) {
  const label = { NOTE: 'Note', ALERT_LINKED: 'Alert linked', STATUS_CHANGE: 'Status' }[entry.kind];
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      <span
        aria-hidden
        className="z-10 mt-5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary ring-4 ring-surface-container-low"
      />
      <div className="min-w-0 flex-1 rounded-lg bg-surface-container p-4">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-label-default text-on-surface-variant">
          <span>
            <span className="text-label-default text-primary">{label}</span>
            {entry.author && <> · {entry.author.email}</>}
          </span>
          <time dateTime={entry.occurredAt} title={formatTimestamp(entry.occurredAt) + ' UTC'}>
            {formatTimestamp(entry.occurredAt)} UTC · {relativeTime(entry.occurredAt)}
          </time>
        </div>
        {/* Notes are written by people and alert titles come from logs: always rendered as text. */}
        <p className="whitespace-pre-wrap break-words text-body-default">{entry.body}</p>
      </div>
    </li>
  );
}

function LinkAlert({ incidentId, linked }: { incidentId: string; linked: Set<string> }) {
  const { data } = useAlerts({ status: 'OPEN,ACKNOWLEDGED', page: 1, pageSize: 100 });
  const { linkAlert } = useIncidentMutations(incidentId);
  const [choice, setChoice] = useState('');
  const candidates = (data?.data ?? []).filter((a) => !a.incidentId && !linked.has(a.id));
  if (candidates.length === 0)
    return <p className="text-label-default text-on-surface-variant">No unlinked active alerts.</p>;
  return (
    <div className="flex gap-2">
      <label className="sr-only" htmlFor="link-alert">
        Alert to link
      </label>
      <select
        id="link-alert"
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
        className="h-9 min-w-0 flex-1 rounded-lg bg-surface-container-lowest px-2 text-body-dense"
      >
        <option value="">Link an alert…</option>
        {candidates.map((a) => (
          <option key={a.id} value={a.id}>
            {a.severity}: {a.title}
          </option>
        ))}
      </select>
      <Button
        disabled={!choice || linkAlert.isPending}
        onClick={() => linkAlert.mutate(choice, { onSuccess: () => setChoice('') })}
      >
        Link
      </Button>
    </div>
  );
}

export function IncidentDetailView({ id }: { id: string }) {
  const { user } = useAuth();
  const { data: incident, error, isLoading, refetch } = useIncident(id);
  const { setStatus, addNote } = useIncidentMutations(id);
  const [note, setNote] = useState('');
  const analyst = canSee(user?.role, 'ANALYST');

  if (isLoading)
    return (
      <div className="space-y-4" role="status" aria-label="Loading incident">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (error || !incident) return <ErrorState error={error} onRetry={() => refetch()} />;

  const step = STEPS.indexOf(incident.status);
  const failure = [setStatus.error, addNote.error].find(Boolean);
  const failureText =
    failure instanceof ApiError
      ? failure.message
      : failure
        ? 'That did not work. Please try again.'
        : null;

  async function post(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    await addNote.mutateAsync(note.trim());
    setNote('');
  }
  function exportJson() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(incident, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `incident-${id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Link
        href="/incidents"
        className="mb-4 inline-flex items-center gap-1 text-on-surface-variant hover:text-on-surface"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Incidents
      </Link>

      <Card className="mb-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <SeverityBadge severity={incident.severity} />
          <StatusBadge status={incident.status} />
          <span className="font-code-sm text-code-sm text-on-surface-variant">{incident.id}</span>
        </div>
        <h1 className="font-headline-xl text-headline-xl">{incident.title}</h1>
        <p className="mt-2 text-on-surface-variant">
          Opened {formatTimestamp(incident.createdAt)} UTC ·{' '}
          {incident.resolvedAt ? 'was open for' : 'open for'} {incidentDuration(incident)}
        </p>
        {incident.summary && (
          <p className="mt-3 whitespace-pre-wrap break-words text-body-default">
            {incident.summary}
          </p>
        )}

        {failureText && (
          <p role="alert" className="mt-4 rounded-lg bg-error-container/40 p-3 text-error">
            {failureText}
          </p>
        )}
        <ol aria-label="Incident status" className="mt-5 grid gap-2 sm:grid-cols-4">
          {STEPS.map((s, i) => {
            const done = i < step,
              current = i === step;
            return (
              <li key={s}>
                <button
                  type="button"
                  aria-current={current ? 'step' : undefined}
                  disabled={!analyst || current || setStatus.isPending}
                  title={analyst ? undefined : 'Requires the analyst role'}
                  onClick={() => setStatus.mutate(s)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg p-3 text-left disabled:cursor-default',
                    current
                      ? 'bg-primary-container/20 ring-1 ring-primary'
                      : 'bg-surface-container-lowest hover:bg-surface-container',
                    !analyst && !current && 'opacity-60',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-label-default',
                      done || current
                        ? 'bg-primary-container text-on-primary-container'
                        : 'bg-surface-container-high text-on-surface-variant',
                    )}
                  >
                    {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
                  </span>
                  <span>
                    <span className="block text-label-default text-on-surface-variant">
                      Step {i + 1}
                    </span>
                    <span className="text-body-default">{STEP_LABEL[s]}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <h2 className="mb-4 font-headline-md text-headline-md">Timeline</h2>
          <ol
            aria-label="Incident timeline"
            className="relative before:absolute before:bottom-2 before:left-[0.28rem] before:top-2 before:w-px before:bg-outline-variant/40"
          >
            {incident.timeline.map((entry) => (
              <TimelineItem key={entry.id} entry={entry} />
            ))}
          </ol>
          <form onSubmit={post} className="mt-6 space-y-2 border-t border-outline-variant/30 pt-4">
            <label htmlFor="note" className="font-headline-md text-headline-md">
              Add a note
            </label>
            <textarea
              id="note"
              rows={3}
              maxLength={5000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={!analyst}
              placeholder={
                analyst
                  ? 'Investigation findings, mitigation steps, who you contacted…'
                  : 'Only analysts can add notes'
              }
              className="w-full rounded-lg bg-surface-container-lowest p-3 text-body-default placeholder:text-outline disabled:opacity-60"
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                disabled={!analyst || !note.trim() || addNote.isPending}
              >
                {addNote.isPending ? 'Posting…' : 'Post note'}
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 font-headline-md text-headline-md">
              Linked alerts ({incident.alerts.length})
            </h2>
            {incident.alerts.length === 0 && (
              <p className="mb-3 text-label-default text-on-surface-variant">
                No alerts linked yet.
              </p>
            )}
            <ul className="mb-4 space-y-2">
              {incident.alerts.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/alerts/${a.id}`}
                    className="block rounded-lg bg-surface-container p-3 hover:bg-surface-container-high"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <SeverityBadge severity={a.severity} />
                      <StatusBadge status={a.status} />
                    </div>
                    <p className="line-clamp-2 text-body-dense">{a.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
            {analyst && (
              <LinkAlert incidentId={id} linked={new Set(incident.alerts.map((a) => a.id))} />
            )}
          </Card>

          <Card>
            <h2 className="mb-2 font-headline-md text-headline-md">Post-mortem</h2>
            <p className="mb-3 text-label-default text-on-surface-variant">
              Generate the report with the scanner CLI from this incident:
            </p>
            <code className="mb-3 block break-all rounded-lg bg-surface-container-lowest p-3 font-code-sm text-code-sm text-primary">
              sentinel-scan postmortem --incident-id {incident.id} --out report.md --pdf
            </code>
            <Button onClick={exportJson}>
              <Download className="h-4 w-4" aria-hidden /> Export timeline (JSON)
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}
