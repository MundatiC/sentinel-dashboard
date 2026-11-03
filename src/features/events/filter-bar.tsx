'use client';

import { RotateCcw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SEVERITIES, type Severity } from '@/components/ui/severity';
import { cn } from '@/lib/cn';
import { useDebounced } from '@/lib/use-debounced';
import {
  RANGE_LABELS,
  hasActiveFilters,
  isValidIp,
  type EventFilters,
  type Range,
} from './filters';

// A text box that updates the URL only after the user pauses typing, but still follows the URL when it
// changes from elsewhere (the "Filter by this IP" button, the back button).
function useTextFilter(value: string, onCommit: (v: string) => void) {
  const [local, setLocal] = useState(value);
  const debounced = useDebounced(local);
  useEffect(() => setLocal(value), [value]);
  useEffect(() => {
    if (debounced !== value) onCommit(debounced.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);
  return [local, setLocal] as const;
}

function TextField({
  id,
  label,
  value,
  onCommit,
  placeholder,
  mono,
  invalid,
  hint,
  className,
}: {
  id: string;
  label: string;
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  invalid?: boolean;
  hint?: string;
  className?: string;
}) {
  const [local, setLocal] = useTextFilter(value, onCommit);
  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1 block font-label-mono text-label-mono uppercase text-outline"
      >
        {label}
      </label>
      <input
        id={id}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? `${id}-hint` : undefined}
        maxLength={200}
        className={cn(
          'h-9 w-full rounded-lg bg-surface-container-lowest px-3 text-body-dense placeholder:text-outline',
          mono && 'font-code-default',
          invalid && 'outline outline-1 outline-error',
        )}
      />
      {invalid && (
        <p id={`${id}-hint`} className="mt-1 text-label-default text-error">
          {hint}
        </p>
      )}
    </div>
  );
}

export function FilterBar({
  filters,
  onChange,
  onClear,
}: {
  filters: EventFilters;
  onChange: (patch: Partial<EventFilters>) => void;
  onClear: () => void;
}) {
  const toggleSeverity = (s: Severity) =>
    onChange({
      severity: filters.severity.includes(s)
        ? filters.severity.filter((x) => x !== s)
        : [...filters.severity, s],
    });

  return (
    <section aria-label="Filters" className="mb-4 rounded-xl bg-surface-container-low p-4">
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="relative min-w-60 flex-1">
          <label
            htmlFor="ev-q"
            className="mb-1 block font-label-mono text-label-mono uppercase text-outline"
          >
            Search messages
          </label>
          <SearchBox value={filters.q} onCommit={(q) => onChange({ q })} />
        </div>
        <TextField
          id="ev-type"
          label="Type"
          value={filters.type}
          onCommit={(type) => onChange({ type })}
          placeholder="auth.login_failed"
          mono
          className="w-52"
        />
        <TextField
          id="ev-source"
          label="Source"
          value={filters.source}
          onCommit={(source) => onChange({ source })}
          placeholder="sshd-bastion-01"
          className="w-44"
        />
        <TextField
          id="ev-ip"
          label="IP address"
          value={filters.ip}
          onCommit={(ip) => onChange({ ip })}
          placeholder="203.0.113.42"
          mono
          className="w-44"
          invalid={Boolean(filters.ip) && !isValidIp(filters.ip)}
          hint="Enter a valid IPv4 or IPv6 address"
        />
        <div>
          <label
            htmlFor="ev-range"
            className="mb-1 block font-label-mono text-label-mono uppercase text-outline"
          >
            Time range
          </label>
          <select
            id="ev-range"
            value={filters.range}
            onChange={(e) => onChange({ range: e.target.value as Range })}
            className="h-9 rounded-lg bg-surface-container-lowest px-3 text-body-dense"
          >
            {(Object.keys(RANGE_LABELS) as Range[]).map((r) => (
              <option key={r} value={r}>
                {RANGE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          id="sev-label"
          className="mr-1 font-label-mono text-label-mono uppercase text-outline"
        >
          Severity
        </span>
        <div role="group" aria-labelledby="sev-label" className="flex flex-wrap gap-1.5">
          {SEVERITIES.map((s) => {
            const on = filters.severity.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => toggleSeverity(s)}
                className={cn(
                  'h-8 rounded-lg px-3 font-label-mono text-label-mono uppercase transition',
                  on
                    ? 'bg-primary-container text-on-primary-container'
                    : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface',
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
        {hasActiveFilters(filters) && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto flex h-8 items-center gap-1.5 rounded-lg px-3 text-body-dense text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          >
            <RotateCcw className="h-4 w-4" aria-hidden /> Clear filters
          </button>
        )}
      </div>
    </section>
  );
}

function SearchBox({ value, onCommit }: { value: string; onCommit: (v: string) => void }) {
  const [local, setLocal] = useTextFilter(value, onCommit);
  return (
    <>
      <Search className="absolute bottom-2.5 left-3 h-4 w-4 text-outline" aria-hidden />
      <input
        id="ev-q"
        type="search"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        maxLength={200}
        placeholder="Words in the event message…"
        className="h-9 w-full rounded-lg bg-surface-container-lowest pl-9 pr-3 text-body-dense placeholder:text-outline"
      />
    </>
  );
}
