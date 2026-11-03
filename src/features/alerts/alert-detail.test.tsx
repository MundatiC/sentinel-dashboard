import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/auth-provider';
import { tokenStore } from '@/lib/api/client';
import { apiError, json, mockApi, SESSION, USER } from '@/test/http';
import { AlertDetail } from './alert-detail';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/alerts/a1',
  useSearchParams: () => new URLSearchParams(),
}));

const RULE = {
  id: 'r',
  name: 'Brute-force login attempts',
  description: '5 failed logins',
  enabled: true,
  eventType: 'auth.login_failed',
  groupBy: 'IP',
  threshold: 5,
  windowSeconds: 60,
  severity: 'HIGH',
  cooldownSeconds: 300,
};
const EVENT = {
  id: 'e1',
  type: 'auth.login_failed',
  severity: 'MEDIUM',
  source: 's',
  actor: 'root',
  ip: '1.2.3.4',
  message: 'Failed login',
  metadata: {},
  occurredAt: '2026-03-02T10:00:00Z',
  receivedAt: '2026-03-02T10:00:01Z',
};
const alert = (over = {}) => ({
  id: 'a1',
  ruleId: 'r',
  status: 'OPEN',
  severity: 'HIGH',
  title: 'Brute-force: 1.2.3.4',
  groupKey: '1.2.3.4',
  eventCount: 5,
  firstEventAt: '2026-03-02T10:00:00Z',
  lastEventAt: '2026-03-02T10:00:30Z',
  assigneeId: null,
  incidentId: null,
  acknowledgedAt: null,
  resolvedAt: null,
  createdAt: '2026-03-02T10:00:31Z',
  rule: RULE,
  events: [EVENT],
  ...over,
});

function setup(role: 'VIEWER' | 'ANALYST' | 'ADMIN', current = alert()) {
  const calls = mockApi((url, init) => {
    if (url.pathname.endsWith('/auth/refresh'))
      return json({ ...SESSION, user: { ...USER, role } });
    if (init.method === 'PATCH') return json({ alert: { ...current, status: 'ACKNOWLEDGED' } });
    return json({ alert: current });
  });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AuthProvider>
        <AlertDetail id="a1" />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return calls;
}

beforeEach(() => tokenStore.set('tok'));
afterEach(() => vi.unstubAllGlobals());

describe('AlertDetail', () => {
  it('shows the alert, its rule and the triggering events', async () => {
    setup('ANALYST');
    expect(
      await screen.findByRole('heading', { name: 'Brute-force: 1.2.3.4' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Rule: Brute-force login attempts')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Triggering events/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(within(screen.getByRole('tabpanel')).getByText('Failed login')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('tab', { name: 'Rule definition' }));
    expect(screen.getByText(/Raises an alert when 5 or more/)).toBeInTheDocument();
  });

  it('lets an analyst acknowledge, sending PATCH with the new status', async () => {
    const calls = setup('ANALYST');
    await userEvent.click(await screen.findByRole('button', { name: /Acknowledge/ }));
    await waitFor(() => expect(calls.some((c) => c.init.method === 'PATCH')).toBe(true));
    expect(JSON.parse(String(calls.find((c) => c.init.method === 'PATCH')!.init.body))).toEqual({
      status: 'ACKNOWLEDGED',
    });
  });

  it('assigns the alert to the current user', async () => {
    const calls = setup('ANALYST');
    await userEvent.click(await screen.findByRole('button', { name: /Assign to me/ }));
    await waitFor(() =>
      expect(JSON.parse(String(calls.find((c) => c.init.method === 'PATCH')!.init.body))).toEqual({
        assigneeId: USER.id,
      }),
    );
  });

  it('disables every action for a viewer and explains why', async () => {
    setup('VIEWER');
    const ack = await screen.findByRole('button', { name: /Acknowledge/ });
    for (const name of [/Acknowledge/, /Resolve/, /Assign to me/, /Create incident/]) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
    expect(ack).toHaveAttribute('title', 'Requires the analyst role');
  });

  it('only offers moves that make sense for the current status', async () => {
    setup('ANALYST', alert({ status: 'RESOLVED' }));
    await screen.findByRole('heading', { name: 'Brute-force: 1.2.3.4' });
    expect(screen.getByRole('button', { name: /Acknowledge/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Resolve/ })).toBeDisabled();
  });

  it('links to the incident when one exists', async () => {
    setup('ANALYST', alert({ incidentId: 'i9' }));
    expect(await screen.findByRole('link', { name: 'View incident' })).toHaveAttribute(
      'href',
      '/incidents/i9',
    );
    expect(screen.queryByRole('button', { name: /Create incident/ })).toBeNull();
  });

  it('shows the API error when a transition is refused', async () => {
    mockApi((url, init) => {
      if (url.pathname.endsWith('/auth/refresh'))
        return json({ ...SESSION, user: { ...USER, role: 'ANALYST' } });
      return init.method === 'PATCH'
        ? apiError(
            409,
            'INVALID_TRANSITION',
            'Cannot change an alert from RESOLVED to ACKNOWLEDGED',
          )
        : json({ alert: alert() });
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <AuthProvider>
          <AlertDetail id="a1" />
        </AuthProvider>
      </QueryClientProvider>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /Acknowledge/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot change an alert');
  });
});
