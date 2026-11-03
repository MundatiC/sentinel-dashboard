import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/auth-provider';
import { tokenStore } from '@/lib/api/client';
import { apiError, json, mockApi, SESSION, USER } from '@/test/http';
import { ApiKeysPage, keyState } from './api-keys-page';
import { RulesPage, validateRule } from './rules-page';
import { UsersPage } from './users-page';

const HTMLDialog = HTMLDialogElement.prototype as unknown as Record<string, unknown>;
beforeEach(() => {
  tokenStore.set('tok');
  // jsdom does not implement <dialog>.showModal(); emulate just enough of it
  HTMLDialog.showModal = function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialog.close = function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});
afterEach(() => vi.unstubAllGlobals());

function renderWith(
  ui: React.ReactElement,
  role: 'VIEWER' | 'ANALYST' | 'ADMIN',
  handler: (url: URL, init: RequestInit) => Response,
) {
  const calls = mockApi((url, init) =>
    url.pathname.endsWith('/auth/refresh')
      ? json({ ...SESSION, user: { ...USER, role } })
      : handler(url, init),
  );
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryClientProvider>,
  );
  return calls;
}

const KEY = {
  id: 'k1',
  name: 'scanner',
  prefix: 'deadbeef',
  scopes: ['events:write'],
  lastUsedAt: null,
  expiresAt: null,
  revokedAt: null,
  createdAt: '2026-03-02T10:00:00Z',
};
const RULE = {
  id: 'r1',
  name: 'Brute force',
  description: 'five fails',
  enabled: true,
  eventType: 'auth.login_failed',
  groupBy: 'IP',
  threshold: 5,
  windowSeconds: 60,
  severity: 'HIGH',
  cooldownSeconds: 300,
};

describe('keyState', () => {
  const now = Date.parse('2026-03-02T12:00:00Z');
  it('classifies keys', () => {
    expect(keyState({ revokedAt: null, expiresAt: null }, now)).toBe('Active');
    expect(keyState({ revokedAt: '2026-01-01T00:00:00Z', expiresAt: null }, now)).toBe('Revoked');
    expect(keyState({ revokedAt: null, expiresAt: '2026-03-01T00:00:00Z' }, now)).toBe('Expired');
    expect(keyState({ revokedAt: null, expiresAt: '2026-04-01T00:00:00Z' }, now)).toBe('Active');
  });
});

describe('validateRule', () => {
  const ok = {
    name: 'r',
    description: '',
    enabled: true,
    eventType: 'auth.login_failed',
    groupBy: 'IP' as const,
    threshold: 5,
    windowSeconds: 60,
    severity: 'HIGH',
    cooldownSeconds: 0,
  };
  it('accepts a valid rule', () => expect(validateRule(ok)).toBeNull());
  it.each([
    [{ name: '  ' }, /name/i],
    [{ eventType: 'Not Valid' }, /event type/i],
    [{ eventType: 'nodot' }, /event type/i],
    [{ threshold: 0 }, /threshold/i],
    [{ threshold: 1.5 }, /threshold/i],
    [{ threshold: NaN }, /threshold/i],
    [{ windowSeconds: 0 }, /window/i],
    [{ windowSeconds: 100_000 }, /window/i],
    [{ cooldownSeconds: -1 }, /cooldown/i],
  ])('rejects %j', (patch, message) => expect(validateRule({ ...ok, ...patch })).toMatch(message));
});

describe('ApiKeysPage', () => {
  it('shows the new key exactly once and drops it when the dialog is closed', async () => {
    const SECRET = 'snt_deadbeef_' + 'A'.repeat(43);
    renderWith(<ApiKeysPage />, 'ADMIN', (_url, init) =>
      init.method === 'POST' ? json({ apiKey: KEY, key: SECRET }, 201) : json({ data: [KEY] }),
    );
    await userEvent.click(await screen.findByRole('button', { name: /Create API key/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Name'), 'scanner');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create key' }));

    expect(await screen.findByLabelText('API key')).toHaveTextContent(SECRET);
    expect(screen.getByRole('alert')).toHaveTextContent(/will not be able to see it again/i);
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    await waitFor(() => expect(screen.queryByText(SECRET)).toBeNull());
    expect(document.body.textContent).not.toContain(SECRET); // gone from the page entirely
    expect(JSON.stringify({ ...localStorage })).not.toContain(SECRET);
    expect(screen.getByText('snt_deadbeef…')).toBeInTheDocument(); // the table only ever shows the prefix
  });

  it('revokes in two steps (an accidental click cannot destroy a key)', async () => {
    const calls = renderWith(<ApiKeysPage />, 'ADMIN', (_url, init) =>
      init.method === 'DELETE' ? json(null, 204) : json({ data: [KEY] }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Revoke scanner' }));
    expect(calls.some((c) => c.init.method === 'DELETE')).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm revoke' }));
    await waitFor(() =>
      expect(calls.some((c) => c.init.method === 'DELETE' && c.path === '/api-keys/k1')).toBe(true),
    );
  });

  it('does not allow creating a key without a name or any permission', async () => {
    renderWith(<ApiKeysPage />, 'ADMIN', () => json({ data: [] }));
    await userEvent.click(await screen.findByRole('button', { name: /Create API key/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Create key' })).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText('Name'), 'x');
    await userEvent.click(within(dialog).getByLabelText('events:write'));
    expect(within(dialog).getByRole('button', { name: 'Create key' })).toBeDisabled();
  });
});

describe('RulesPage', () => {
  it('is read-only for non-admins', async () => {
    renderWith(<RulesPage />, 'ANALYST', () => json({ data: [RULE] }));
    expect(await screen.findByText('Brute force')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New rule/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Edit/ })).toBeNull();
    expect(screen.getByRole('switch', { name: 'Brute force enabled' })).toBeDisabled();
  });

  it('lets an admin toggle a rule and explains a refusal to delete', async () => {
    const calls = renderWith(<RulesPage />, 'ADMIN', (_url, init) => {
      if (init.method === 'DELETE')
        return apiError(
          409,
          'RULE_IN_USE',
          'This rule has alerts. Disable it instead of deleting it.',
        );
      if (init.method === 'PATCH') return json({ rule: { ...RULE, enabled: false } });
      return json({ data: [RULE] });
    });
    await userEvent.click(await screen.findByRole('switch', { name: 'Brute force enabled' }));
    await waitFor(() =>
      expect(JSON.parse(String(calls.find((c) => c.init.method === 'PATCH')!.init.body))).toEqual({
        enabled: false,
      }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Delete Brute force' }));
    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Disable it instead');
  });

  it('validates a new rule before sending it', async () => {
    const calls = renderWith(<RulesPage />, 'ADMIN', () => json({ data: [] }));
    await userEvent.click(await screen.findByRole('button', { name: /New rule/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Too many 404s');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create rule' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(/event type/i);
    expect(calls.some((c) => c.init.method === 'POST' && c.path === '/alert-rules')).toBe(false);
  });
});

describe('UsersPage', () => {
  const rows = [
    { ...USER, lastLoginAt: '2026-03-02T09:00:00Z' },
    { ...USER, id: 'u2', email: 'bob@example.com', role: 'VIEWER', lastLoginAt: null },
  ];
  const page = { data: rows, pagination: { page: 1, pageSize: 25, total: 2, totalPages: 1 } };

  it('stops admins from changing or deactivating themselves', async () => {
    renderWith(<UsersPage />, 'ADMIN', () => json(page));
    await screen.findByText('bob@example.com');
    expect(screen.getByLabelText('Role for admin@example.com')).toBeDisabled();
    const [selfRow, bobRow] = screen.getAllByRole('row').slice(1);
    expect(within(selfRow!).getByRole('button', { name: 'Deactivate' })).toBeDisabled();
    expect(within(bobRow!).getByRole('button', { name: 'Deactivate' })).toBeEnabled();
  });

  it("changes another user's role and surfaces API errors", async () => {
    const calls = renderWith(<UsersPage />, 'ADMIN', (_url, init) =>
      init.method === 'PATCH'
        ? apiError(400, 'BAD_REQUEST', 'You cannot change your own role or active status')
        : json(page),
    );
    await userEvent.selectOptions(
      await screen.findByLabelText('Role for bob@example.com'),
      'ANALYST',
    );
    expect(JSON.parse(String(calls.find((c) => c.init.method === 'PATCH')!.init.body))).toEqual({
      role: 'ANALYST',
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('cannot change your own role');
  });
});
