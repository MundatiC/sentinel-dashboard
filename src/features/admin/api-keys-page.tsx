'use client';

import { HEAD_ROW, Th } from '@/components/data/table';
import { AlertTriangle, Copy, KeyRound, Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { EmptyState, ErrorState, Skeleton } from '@/components/data/states';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { StatusBadge } from '@/components/ui/status';
import { ApiError } from '@/lib/api/client';
import { API_KEY_SCOPES, type ApiKeyRow } from '@/lib/api/schemas';
import { relativeTime } from '@/lib/format';
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from './hooks';

export function keyState(
  k: Pick<ApiKeyRow, 'revokedAt' | 'expiresAt'>,
  now = Date.now(),
): 'Revoked' | 'Expired' | 'Active' {
  if (k.revokedAt) return 'Revoked';
  if (k.expiresAt && new Date(k.expiresAt).getTime() <= now) return 'Expired';
  return 'Active';
}

function CreateForm({
  onCreated,
  onCancel,
}: {
  onCreated: (key: string, name: string) => void;
  onCancel: () => void;
}) {
  const create = useCreateApiKey();
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['events:write']);
  const [expires, setExpires] = useState('');
  const error =
    create.error instanceof ApiError
      ? create.error.message
      : create.error
        ? 'Could not create the key.'
        : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    const res = await create.mutateAsync({
      name: name.trim(),
      scopes,
      ...(expires ? { expiresAt: new Date(`${expires}T23:59:59Z`).toISOString() } : {}),
    });
    onCreated(res.key, res.apiKey.name);
  }
  const toggle = (s: string) =>
    setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <p role="alert" className="rounded-lg bg-error-container/40 p-3 text-error">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="key-name" className="mb-1 block font-label-default text-label-default">
          Name
        </label>
        <input
          id="key-name"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. scanner on web-1"
          className="h-10 w-full rounded-lg bg-surface-container-lowest px-3"
        />
      </div>
      <fieldset>
        <legend className="mb-1 font-label-default text-label-default">Permissions</legend>
        <div className="space-y-1">
          {API_KEY_SCOPES.map((s) => (
            <label key={s} className="flex items-center gap-2 text-body-default">
              <input
                type="checkbox"
                checked={scopes.includes(s)}
                onChange={() => toggle(s)}
                className="h-4 w-4 accent-primary"
              />
              <code className="font-code-default text-code-default">{s}</code>
            </label>
          ))}
        </div>
        <p className="mt-1 text-label-default text-on-surface-variant">
          Give a key only what it needs. Keys can write data in; they can never read it back (except
          `incidents:read`).
        </p>
      </fieldset>
      <div>
        <label htmlFor="key-exp" className="mb-1 block font-label-default text-label-default">
          Expires (optional)
        </label>
        <input
          id="key-exp"
          type="date"
          min={new Date().toISOString().slice(0, 10)}
          value={expires}
          onChange={(e) => setExpires(e.target.value)}
          className="h-10 rounded-lg bg-surface-container-lowest px-3"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!name.trim() || scopes.length === 0 || create.isPending}
        >
          {create.isPending ? 'Creating…' : 'Create key'}
        </Button>
      </div>
    </form>
  );
}

// The secret exists ONLY in this component's state. It is never put in the URL, storage or the query cache,
// and it disappears when the dialog closes: the API cannot show it again either (it keeps just a hash).
function Secret({ value, name, onDone }: { value: string; name: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-4">
      <div role="alert" className="flex gap-3 rounded-lg bg-surface-container-lowest p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#eab308]" aria-hidden />
        <p>
          <strong>Store this key in your secret manager now.</strong> You will not be able to see it
          again. If you lose it, revoke it and create a new one.
        </p>
      </div>
      <p className="text-on-surface-variant">
        Key for <strong className="text-on-surface">{name}</strong>
      </p>
      <div className="flex items-center gap-2 rounded-lg bg-surface-container-lowest p-3">
        <code
          aria-label="API key"
          className="min-w-0 flex-1 select-all break-all font-code-default text-code-default text-primary"
        >
          {value}
        </code>
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
            } catch {
              /* ignore */
            }
          }}
        >
          <Copy className="h-4 w-4" aria-hidden /> {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <p className="text-label-default text-on-surface-variant">
        Use it as <code>SENTINEL_API_KEY</code> for the scanner. Never paste it into a command line.
      </p>
      <div className="flex justify-end">
        <Button variant="primary" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}

export function ApiKeysPage() {
  const { data, error, isLoading, refetch } = useApiKeys();
  const revoke = useRevokeApiKey();
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<{ key: string; name: string } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const closeAll = () => {
    setCreating(false);
    setCreated(null);
  }; // clearing `created` drops the secret from memory

  return (
    <>
      <PageHeader
        title="API Keys"
        description="Machine access for the scanner and log shippers."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" aria-hidden /> Create API key
          </Button>
        }
      />
      <section className="overflow-hidden rounded-xl bg-surface-container-low">
        {isLoading && (
          <div className="space-y-2 p-4" role="status" aria-label="Loading API keys">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}
        {error && <ErrorState error={error} onRetry={() => refetch()} />}
        {data && data.length === 0 && (
          <EmptyState title="No API keys" hint="Create one to let the scanner send results." />
        )}
        {data && data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] text-body-dense">
              <caption className="sr-only">
                API keys. The secret part is never shown again after creation.
              </caption>
              <thead>
                <tr className={HEAD_ROW}>
                  <Th>Name</Th>
                  <Th>Key</Th>
                  <Th>Permissions</Th>
                  <Th>Last used</Th>
                  <Th>Status</Th>
                  <Th>
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {data.map((k) => {
                  const state = keyState(k);
                  return (
                    <tr key={k.id} className="border-t border-outline-variant/20">
                      <td className="px-3 py-3">
                        <span className="flex items-center gap-2">
                          <KeyRound className="h-4 w-4 text-primary" aria-hidden />
                          {k.name}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-code-sm text-code-sm">snt_{k.prefix}…</td>
                      <td className="px-3 py-3">
                        <ul className="flex flex-wrap gap-1">
                          {k.scopes.map((s) => (
                            <li
                              key={s}
                              className="rounded bg-surface-container-high px-1.5 py-0.5 font-code-sm text-code-sm"
                            >
                              {s}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-on-surface-variant">
                        {k.lastUsedAt ? relativeTime(k.lastUsedAt) : 'never'}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          status={state === 'Active' ? 'RESOLVED' : 'OPEN'}
                          className="[&]:normal-case"
                        />
                        <span className="sr-only"> {state}</span>
                        {state !== 'Active' && (
                          <span className="ml-2 text-on-surface-variant">{state}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {state === 'Active' &&
                          (confirming === k.id ? (
                            <span className="flex justify-end gap-2">
                              <Button
                                variant="danger"
                                disabled={revoke.isPending}
                                onClick={() =>
                                  revoke.mutate(k.id, { onSettled: () => setConfirming(null) })
                                }
                              >
                                Confirm revoke
                              </Button>
                              <Button onClick={() => setConfirming(null)}>Cancel</Button>
                            </span>
                          ) : (
                            <Button
                              onClick={() => setConfirming(k.id)}
                              aria-label={`Revoke ${k.name}`}
                            >
                              Revoke
                            </Button>
                          ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <Modal
        open={creating || created !== null}
        onClose={closeAll}
        title={created ? 'New API key created' : 'Create API key'}
      >
        {created ? (
          <Secret value={created.key} name={created.name} onDone={closeAll} />
        ) : (
          <CreateForm onCancel={closeAll} onCreated={(key, name) => setCreated({ key, name })} />
        )}
      </Modal>
    </>
  );
}
