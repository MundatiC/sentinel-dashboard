'use client';

import { HEAD_ROW, Th } from '@/components/data/table';
import { ArrowLeft, Check, CheckCircle2, Copy, Eye, UserCheck, UserMinus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ErrorState, Skeleton } from '@/components/data/states';
import { canSee } from '@/components/layout/nav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SeverityBadge } from '@/components/ui/severity';
import { StatusBadge } from '@/components/ui/status';
import { Tabs } from '@/components/ui/tabs';
import { useAuth } from '@/features/auth/auth-provider';
import { CreateIncidentDialog } from '@/features/incidents/create-incident-dialog';
import { ApiError } from '@/lib/api/client';
import { useAlert, useUpdateAlert } from '@/lib/api/hooks';
import type { ApiRule } from '@/lib/api/schemas';
import { formatNumber, formatTimestamp } from '@/lib/format';

/** The rule in plain English, e.g. "5+ auth.login_failed events from the same IP within 60 s". */
export function describeRule(rule: ApiRule): string {
  const per = { IP: 'IP address', ACTOR: 'actor', SOURCE: 'source' }[rule.groupBy];
  const cooldown = rule.cooldownSeconds
    ? ` After an alert is resolved, ${rule.cooldownSeconds} s must pass before the same ${per} can raise another.`
    : '';
  return `Raises an alert when ${rule.threshold} or more "${rule.eventType}" events come from the same ${per} within ${rule.windowSeconds} seconds.${cooldown}`;
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-label-default text-on-surface-variant">{label}</dt>
      <dd className="mt-1 text-body-default">{children}</dd>
    </div>
  );
}

export function AlertDetail({ id }: { id: string }) {
  const { user } = useAuth();
  const { data: alert, error, isLoading, refetch } = useAlert(id);
  const update = useUpdateAlert(id);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);
  const analyst = canSee(user?.role, 'ANALYST');
  const gate = analyst ? undefined : 'Requires the analyst role';

  if (isLoading)
    return (
      <div className="space-y-4" role="status" aria-label="Loading alert">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (error || !alert) return <ErrorState error={error} onRetry={() => refetch()} />;

  const mine = alert.assigneeId === user?.id;
  const failure =
    update.error instanceof ApiError
      ? update.error.message
      : update.error
        ? 'Could not update the alert.'
        : null;

  return (
    <>
      <Link
        href="/alerts"
        className="mb-4 inline-flex items-center gap-1 text-on-surface-variant hover:text-on-surface"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Alerts
      </Link>

      <Card className="mb-4">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SeverityBadge severity={alert.severity} />
          <StatusBadge status={alert.status} />
          <span className="rounded-lg bg-surface-container px-3 py-1 text-label-default text-on-surface-variant">
            Rule: {alert.rule.name}
          </span>
        </div>
        <h1 className="font-headline-xl text-headline-xl">{alert.title}</h1>
        <dl className="mt-5 grid gap-4 rounded-lg bg-surface-container-lowest p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Group key">
            <span className="flex items-center gap-2 font-code-default text-code-default text-primary">
              {alert.groupKey}
              <button
                type="button"
                aria-label="Copy group key"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(alert.groupKey);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  } catch {
                    /* ignore */
                  }
                }}
                className="text-on-surface-variant hover:text-on-surface"
              >
                {copied ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : (
                  <Copy className="h-4 w-4" aria-hidden />
                )}
              </button>
            </span>
          </Meta>
          <Meta label="First seen">{formatTimestamp(alert.firstEventAt)} UTC</Meta>
          <Meta label="Last seen">{formatTimestamp(alert.lastEventAt)} UTC</Meta>
          <Meta label="Triggering events">{formatNumber(alert.eventCount)}</Meta>
        </dl>

        {failure && (
          <p role="alert" className="mt-4 rounded-lg bg-error-container/40 p-3 text-error">
            {failure}
          </p>
        )}

        <div
          className="mt-5 flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Alert actions"
        >
          <Button
            disabled={!analyst || alert.status !== 'OPEN' || update.isPending}
            title={gate}
            onClick={() => update.mutate({ status: 'ACKNOWLEDGED' })}
          >
            <Eye className="h-4 w-4" aria-hidden /> Acknowledge
          </Button>
          <Button
            disabled={!analyst || alert.status === 'RESOLVED' || update.isPending}
            title={gate}
            onClick={() => update.mutate({ status: 'RESOLVED' })}
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden /> Resolve
          </Button>
          <Button
            disabled={!analyst || update.isPending}
            title={gate}
            onClick={() => update.mutate({ assigneeId: mine ? null : (user?.id ?? null) })}
          >
            {mine ? (
              <>
                <UserMinus className="h-4 w-4" aria-hidden /> Unassign me
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4" aria-hidden /> Assign to me
              </>
            )}
          </Button>
          {alert.incidentId ? (
            <Link
              href={`/incidents/${alert.incidentId}`}
              className="inline-flex min-h-9 items-center rounded-lg bg-surface-container-high px-3 text-label-default hover:bg-surface-container-highest"
            >
              View incident
            </Link>
          ) : (
            <Button
              variant="primary"
              disabled={!analyst}
              title={gate}
              onClick={() => setCreating(true)}
            >
              Create incident
            </Button>
          )}
        </div>
      </Card>

      <Card>
        <Tabs
          label="Alert details"
          tabs={[
            {
              id: 'events',
              label: 'Triggering events',
              count: alert.events.length,
              content: (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[40rem] text-body-dense">
                    <caption className="sr-only">
                      Events that triggered this alert (newest first, at most 100)
                    </caption>
                    <thead>
                      <tr className={HEAD_ROW}>
                        {['Time (UTC)', 'Type', 'Source', 'Actor', 'IP', 'Message'].map((h) => (
                          <Th key={h}>{h}</Th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {alert.events.map((e) => (
                        <tr key={e.id} className="border-t border-outline-variant/20">
                          <td className="whitespace-nowrap px-3 py-2.5 font-code-sm text-code-sm">
                            <Link
                              href={`/events?event=${e.id}&range=all`}
                              className="text-primary hover:underline"
                            >
                              {formatTimestamp(e.occurredAt, true)}
                            </Link>
                          </td>
                          <td className="px-3 py-2.5 font-code-sm text-code-sm">{e.type}</td>
                          <td className="max-w-[10rem] truncate px-3 py-2.5" title={e.source}>
                            {e.source}
                          </td>
                          <td className="max-w-[8rem] truncate px-3 py-2.5 text-on-surface-variant">
                            {e.actor ?? '–'}
                          </td>
                          <td className="px-3 py-2.5 font-code-sm text-code-sm">{e.ip ?? '–'}</td>
                          <td
                            className="max-w-md truncate px-3 py-2.5 text-on-surface-variant"
                            title={e.message}
                          >
                            {e.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ),
            },
            {
              id: 'rule',
              label: 'Rule definition',
              content: (
                <div className="space-y-3">
                  <p className="text-body-lg">{describeRule(alert.rule)}</p>
                  <dl className="grid gap-4 sm:grid-cols-4">
                    <Meta label="Rule">{alert.rule.name}</Meta>
                    <Meta label="Severity">
                      <SeverityBadge severity={alert.rule.severity} />
                    </Meta>
                    <Meta label="Threshold">
                      {alert.rule.threshold} in {alert.rule.windowSeconds}s
                    </Meta>
                    <Meta label="Enabled">{alert.rule.enabled ? 'Yes' : 'No (disabled)'}</Meta>
                  </dl>
                  {alert.rule.description && (
                    <p className="text-on-surface-variant">{alert.rule.description}</p>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Card>

      <CreateIncidentDialog
        open={creating}
        onClose={() => setCreating(false)}
        defaultTitle={alert.title}
        defaultSeverity={alert.severity}
        alertIds={[alert.id]}
      />
    </>
  );
}
