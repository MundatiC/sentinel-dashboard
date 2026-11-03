import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { json, mockApi } from '@/test/http';
import { tokenStore } from '@/lib/api/client';
import { EventsPage } from './events-page';

const replace = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/events',
  useSearchParams: () => new URLSearchParams(search),
}));

const event = (over = {}) => ({
  id: 'e1',
  type: 'auth.login_failed',
  severity: 'HIGH',
  source: 'web-1',
  actor: 'alice',
  ip: '203.0.113.7',
  message: 'Failed login for alice',
  metadata: { port: 22 },
  occurredAt: '2026-03-02T10:00:00.123Z',
  receivedAt: '2026-03-02T10:00:01.000Z',
  ...over,
});
const page = (events: unknown[], total = events.length) => ({
  data: events,
  pagination: { page: 1, pageSize: 25, total, totalPages: Math.max(1, Math.ceil(total / 25)) },
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EventsPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  tokenStore.set('tok');
  replace.mockReset();
  search = '';
});
afterEach(() => vi.unstubAllGlobals());

describe('EventsPage', () => {
  it('lists events from the API using the filters in the URL', async () => {
    search = 'severity=HIGH&ip=203.0.113.7&page=2';
    const calls = mockApi(() => json(page([event()], 60)));
    renderPage();
    expect(await screen.findByText('Failed login for alice')).toBeInTheDocument();
    const q = calls[0]!.url.searchParams;
    expect(q.get('severity')).toBe('HIGH');
    expect(q.get('ip')).toBe('203.0.113.7');
    expect(q.get('page')).toBe('2');
    expect(q.get('from')).toBeTruthy(); // default range: last 24 hours
  });

  it('shows hostile event text as plain text, never as HTML', async () => {
    const evil = '<img src=x onerror=alert(1)><script>alert(2)</script>';
    mockApi(() => json(page([event({ message: evil, actor: evil, source: evil })])));
    const { container } = renderPage();
    expect(await screen.findAllByText(evil)).not.toHaveLength(0);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });

  it('shows a helpful empty state', async () => {
    search = 'q=nothing';
    mockApi(() => json(page([])));
    renderPage();
    expect(await screen.findByText('No events match')).toBeInTheDocument();
    expect(screen.getByText(/widening the time range/i)).toBeInTheDocument();
  });

  it('shows an error with a retry button when the API fails', async () => {
    mockApi(() =>
      json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } }, 500),
    );
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('clicking a severity updates the URL and resets to page 1', async () => {
    search = 'page=3';
    mockApi(() => json(page([event()], 200)));
    renderPage();
    await screen.findByText('Failed login for alice');
    await userEvent.click(screen.getByRole('button', { name: 'CRITICAL' }));
    expect(replace).toHaveBeenLastCalledWith('/events?severity=CRITICAL', { scroll: false });
  });

  it('paging keeps the filters and changes only the page', async () => {
    search = 'severity=HIGH';
    mockApi(() => json(page([event()], 200)));
    renderPage();
    await screen.findByText('Failed login for alice');
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(replace).toHaveBeenLastCalledWith('/events?severity=HIGH&page=2', { scroll: false });
  });

  it('flags an invalid IP and does not send it to the API', async () => {
    search = 'ip=999.9.9.9';
    const calls = mockApi(() => json(page([])));
    renderPage();
    expect(await screen.findByText(/valid IPv4 or IPv6/i)).toBeInTheDocument();
    await waitFor(() => expect(calls.length).toBeGreaterThan(0));
    expect(calls[0]!.url.searchParams.has('ip')).toBe(false);
  });

  it('opens the detail panel for a row and offers to filter by its IP', async () => {
    search = 'event=e1';
    mockApi((url) =>
      url.pathname.endsWith('/events/e1') ? json({ event: event() }) : json(page([event()])),
    );
    renderPage();
    const panel = await screen.findByRole('complementary', { name: 'Event details' });
    expect(await within(panel).findByText(/"port": 22/)).toBeInTheDocument();
    await userEvent.click(within(panel).getByRole('button', { name: /filter by this ip/i }));
    expect(replace).toHaveBeenLastCalledWith('/events?ip=203.0.113.7', { scroll: false });
  });

  it('Escape closes the detail panel', async () => {
    search = 'event=e1';
    mockApi((url) =>
      url.pathname.endsWith('/events/e1') ? json({ event: event() }) : json(page([event()])),
    );
    renderPage();
    await screen.findByRole('complementary', { name: 'Event details' });
    await userEvent.keyboard('{Escape}');
    expect(replace).toHaveBeenLastCalledWith('/events', { scroll: false });
  });
});
