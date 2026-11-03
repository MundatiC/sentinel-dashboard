'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { SEVERITIES, type Severity } from '@/components/ui/severity';
import { useIncidentMutations } from '@/lib/api/hooks';
import { ApiError } from '@/lib/api/client';

// Uses the browser's native <dialog>: showModal() traps keyboard focus, closes on Escape and marks the
// rest of the page inert, all without custom code (and so without custom accessibility bugs).
export function CreateIncidentDialog({
  open,
  onClose,
  defaultTitle = '',
  defaultSeverity = 'MEDIUM',
  alertIds = [],
}: {
  open: boolean;
  onClose: () => void;
  defaultTitle?: string;
  defaultSeverity?: Severity;
  alertIds?: string[];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Unique ids: more than one of these dialogs can exist on a page (top bar + alert page), and duplicate ids
  // would bind a <label> to the wrong dialog's input.
  const uid = useId();
  const router = useRouter();
  const { create } = useIncidentMutations();
  const [title, setTitle] = useState(defaultTitle);
  const [severity, setSeverity] = useState<Severity>(defaultSeverity);
  const [summary, setSummary] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const incident = await create.mutateAsync({
        title: title.trim(),
        severity,
        summary,
        alertIds,
      });
      onClose();
      router.push(`/incidents/${incident.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the incident.');
    }
  }

  const field = 'w-full rounded-lg bg-surface-container-lowest px-3 text-body-default';
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={`${uid}-title`}
      className="w-full max-w-lg rounded-xl bg-surface-container p-6 text-on-surface backdrop:bg-black/60"
    >
      <form onSubmit={submit} className="space-y-4">
        <h2 id={`${uid}-title`} className="font-headline-lg text-headline-lg">
          New incident
        </h2>
        {error && (
          <p role="alert" className="rounded-lg bg-error-container/40 p-3 text-error">
            {error}
          </p>
        )}
        <div>
          <label
            htmlFor={`${uid}-inc-title`}
            className="mb-1 block font-label-default text-label-default"
          >
            Title
          </label>
          <input
            id={`${uid}-inc-title`}
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`${field} h-10`}
          />
        </div>
        <div>
          <label
            htmlFor={`${uid}-inc-sev`}
            className="mb-1 block font-label-default text-label-default"
          >
            Severity
          </label>
          <select
            id={`${uid}-inc-sev`}
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Severity)}
            className={`${field} h-10`}
          >
            {SEVERITIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor={`${uid}-inc-sum`}
            className="mb-1 block font-label-default text-label-default"
          >
            Summary (optional)
          </label>
          <textarea
            id={`${uid}-inc-sum`}
            maxLength={5000}
            rows={4}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className={`${field} py-2`}
          />
        </div>
        {alertIds.length > 0 && (
          <p className="text-label-default text-on-surface-variant">
            This alert will be linked to the incident.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!title.trim() || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create incident'}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
