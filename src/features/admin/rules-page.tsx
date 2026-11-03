'use client';

import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { EmptyState, ErrorState, Skeleton } from '@/components/data/states';
import { canSee } from '@/components/layout/nav';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { SEVERITIES, SeverityBadge, type Severity } from '@/components/ui/severity';
import { describeRule } from '@/features/alerts/alert-detail';
import { useAuth } from '@/features/auth/auth-provider';
import { ApiError } from '@/lib/api/client';
import type { ApiRule } from '@/lib/api/schemas';
import { cn } from '@/lib/cn';
import { useDeleteRule, useRules, useSaveRule, type RuleInput } from './hooks';

const EMPTY: RuleInput = {
  name: '',
  description: '',
  enabled: true,
  eventType: '',
  groupBy: 'IP',
  threshold: 5,
  windowSeconds: 60,
  severity: 'HIGH',
  cooldownSeconds: 300,
};
const EVENT_TYPE = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/; // same shape the API accepts, e.g. "auth.login_failed"

/** Client-side hints only: the API validates everything again. Returns an error message or null. */
export function validateRule(r: RuleInput): string | null {
  if (!r.name.trim()) return 'Give the rule a name.';
  if (!EVENT_TYPE.test(r.eventType))
    return 'Event type must look like "auth.login_failed" (lowercase words separated by dots).';
  if (!Number.isInteger(r.threshold) || r.threshold < 1 || r.threshold > 10_000)
    return 'Threshold must be a whole number between 1 and 10,000.';
  if (!Number.isInteger(r.windowSeconds) || r.windowSeconds < 1 || r.windowSeconds > 86_400)
    return 'Window must be between 1 and 86,400 seconds.';
  if (!Number.isInteger(r.cooldownSeconds) || r.cooldownSeconds < 0 || r.cooldownSeconds > 86_400)
    return 'Cooldown must be between 0 and 86,400 seconds.';
  return null;
}

function RuleForm({ rule, onDone }: { rule: ApiRule | null; onDone: () => void }) {
  const save = useSaveRule();
  const [form, setForm] = useState<RuleInput>(
    rule
      ? {
          name: rule.name,
          description: rule.description,
          enabled: rule.enabled,
          eventType: rule.eventType,
          groupBy: rule.groupBy,
          threshold: rule.threshold,
          windowSeconds: rule.windowSeconds,
          severity: rule.severity,
          cooldownSeconds: rule.cooldownSeconds,
        }
      : EMPTY,
  );
  const [problem, setProblem] = useState<string | null>(null);
  const set = <K extends keyof RuleInput>(k: K, v: RuleInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const apiError =
    save.error instanceof ApiError
      ? save.error.message
      : save.error
        ? 'Could not save the rule.'
        : null;
  const input = 'h-10 w-full rounded-lg bg-surface-container-lowest px-3';
  const num = (v: string) => (v === '' ? NaN : Number(v));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const invalid = validateRule(form);
    setProblem(invalid);
    if (invalid) return;
    await save.mutateAsync({ id: rule?.id, ...form, name: form.name.trim() });
    onDone();
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      {(problem || apiError) && (
        <p role="alert" className="rounded-lg bg-error-container/40 p-3 text-error">
          {problem ?? apiError}
        </p>
      )}
      <div>
        <label htmlFor="r-name" className="mb-1 block font-label-default text-label-default">
          Name
        </label>
        <input
          id="r-name"
          className={input}
          maxLength={100}
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="r-desc" className="mb-1 block font-label-default text-label-default">
          Description
        </label>
        <input
          id="r-desc"
          className={input}
          maxLength={500}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="r-type" className="mb-1 block font-label-default text-label-default">
            Event type
          </label>
          <input
            id="r-type"
            className={`${input} font-code-default`}
            placeholder="auth.login_failed"
            value={form.eventType}
            onChange={(e) => set('eventType', e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="r-group" className="mb-1 block font-label-default text-label-default">
            Count events per
          </label>
          <select
            id="r-group"
            className={input}
            value={form.groupBy}
            onChange={(e) => set('groupBy', e.target.value as RuleInput['groupBy'])}
          >
            <option value="IP">IP address</option>
            <option value="ACTOR">Actor</option>
            <option value="SOURCE">Source</option>
          </select>
        </div>
        <div>
          <label htmlFor="r-th" className="mb-1 block font-label-default text-label-default">
            Threshold (events)
          </label>
          <input
            id="r-th"
            type="number"
            min={1}
            className={input}
            value={Number.isNaN(form.threshold) ? '' : form.threshold}
            onChange={(e) => set('threshold', num(e.target.value))}
          />
        </div>
        <div>
          <label htmlFor="r-win" className="mb-1 block font-label-default text-label-default">
            Window (seconds)
          </label>
          <input
            id="r-win"
            type="number"
            min={1}
            className={input}
            value={Number.isNaN(form.windowSeconds) ? '' : form.windowSeconds}
            onChange={(e) => set('windowSeconds', num(e.target.value))}
          />
        </div>
        <div>
          <label htmlFor="r-sev" className="mb-1 block font-label-default text-label-default">
            Alert severity
          </label>
          <select
            id="r-sev"
            className={input}
            value={form.severity}
            onChange={(e) => set('severity', e.target.value as Severity)}
          >
            {SEVERITIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="r-cool" className="mb-1 block font-label-default text-label-default">
            Cooldown after resolve (s)
          </label>
          <input
            id="r-cool"
            type="number"
            min={0}
            className={input}
            value={Number.isNaN(form.cooldownSeconds) ? '' : form.cooldownSeconds}
            onChange={(e) => set('cooldownSeconds', num(e.target.value))}
          />
        </div>
      </div>
      <p className="rounded-lg bg-surface-container-lowest p-3 text-on-surface-variant">
        {validateRule(form) === null
          ? describeRule({ ...(rule ?? ({} as ApiRule)), ...form, id: rule?.id ?? '' } as ApiRule)
          : 'Fill in the fields to see what this rule does.'}
      </p>
      <div className="flex justify-end gap-2">
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : rule ? 'Save changes' : 'Create rule'}
        </Button>
      </div>
    </form>
  );
}

export function RulesPage() {
  const { user } = useAuth();
  const admin = canSee(user?.role, 'ADMIN');
  const { data, error, isLoading, refetch } = useRules();
  const save = useSaveRule();
  const del = useDeleteRule();
  const [editing, setEditing] = useState<ApiRule | 'new' | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const failure = [save.error, del.error].find(Boolean);
  const failureText =
    failure instanceof ApiError ? failure.message : failure ? 'That did not work.' : null;
  const th =
    'px-3 py-2 text-left font-label-mono text-label-mono font-medium uppercase text-outline';

  return (
    <>
      <PageHeader
        title="Alert Rules"
        description="When to raise an alert. Anyone can read the rules; admins change them."
        actions={
          admin ? (
            <Button variant="primary" onClick={() => setEditing('new')}>
              <Plus className="h-4 w-4" aria-hidden /> New rule
            </Button>
          ) : undefined
        }
      />
      {failureText && (
        <p role="alert" className="mb-4 rounded-lg bg-error-container/40 p-3 text-error">
          {failureText}
        </p>
      )}
      <section className="overflow-hidden rounded-xl bg-surface-container-low">
        {isLoading && (
          <div className="space-y-2 p-4" role="status" aria-label="Loading rules">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        )}
        {error && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && data.length === 0 && (
          <EmptyState title="No rules" hint="Without rules no alerts are raised." />
        )}
        {data && data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[50rem] text-body-dense">
              <caption className="sr-only">Alert rules</caption>
              <thead>
                <tr className="bg-surface-container-lowest">
                  <th scope="col" className={th}>
                    Rule
                  </th>
                  <th scope="col" className={th}>
                    Condition
                  </th>
                  <th scope="col" className={th}>
                    Severity
                  </th>
                  <th scope="col" className={th}>
                    Enabled
                  </th>
                  {admin && (
                    <th scope="col" className={th}>
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className="border-t border-outline-variant/20 align-top">
                    <td className="px-3 py-3">
                      <p>{r.name}</p>
                      {r.description && (
                        <p className="text-label-default text-on-surface-variant">
                          {r.description}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-on-surface-variant">
                      <code className="font-code-sm text-code-sm">
                        ≥ {r.threshold} {r.eventType} per {r.groupBy.toLowerCase()} in{' '}
                        {r.windowSeconds}s
                      </code>
                    </td>
                    <td className="px-3 py-3">
                      <SeverityBadge severity={r.severity} />
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={r.enabled}
                        aria-label={`${r.name} enabled`}
                        disabled={!admin || save.isPending}
                        title={admin ? undefined : 'Requires the admin role'}
                        onClick={() => save.mutate({ id: r.id, enabled: !r.enabled })}
                        className={cn(
                          'relative h-6 w-11 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60',
                          r.enabled ? 'bg-primary-container' : 'bg-surface-container-highest',
                        )}
                      >
                        <span
                          className={cn(
                            'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
                            r.enabled ? 'left-[1.4rem]' : 'left-0.5',
                          )}
                        />
                      </button>
                    </td>
                    {admin && (
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-2">
                          <Button onClick={() => setEditing(r)} aria-label={`Edit ${r.name}`}>
                            <Pencil className="h-4 w-4" aria-hidden />
                          </Button>
                          {confirming === r.id ? (
                            <>
                              <Button
                                variant="danger"
                                disabled={del.isPending}
                                onClick={() =>
                                  del.mutate(r.id, { onSettled: () => setConfirming(null) })
                                }
                              >
                                Confirm delete
                              </Button>
                              <Button onClick={() => setConfirming(null)}>Cancel</Button>
                            </>
                          ) : (
                            <Button
                              onClick={() => setConfirming(r.id)}
                              aria-label={`Delete ${r.name}`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? 'New alert rule' : 'Edit alert rule'}
        wide
      >
        {editing && (
          <RuleForm rule={editing === 'new' ? null : editing} onDone={() => setEditing(null)} />
        )}
      </Modal>
    </>
  );
}
