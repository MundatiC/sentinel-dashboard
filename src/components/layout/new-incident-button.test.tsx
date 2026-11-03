import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '@/features/auth/auth-provider';
import { tokenStore } from '@/lib/api/client';
import { json, mockApi, SESSION, USER } from '@/test/http';
import { NewIncidentButton } from './new-incident-button';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeEach(() => tokenStore.set('tok'));
afterEach(() => vi.unstubAllGlobals());

function show(role: 'VIEWER' | 'ANALYST' | 'ADMIN') {
  mockApi(() => json({ ...SESSION, user: { ...USER, role } }));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <NewIncidentButton />
      </AuthProvider>
    </QueryClientProvider>,
  );
}

describe('NewIncidentButton', () => {
  it.each(['ANALYST', 'ADMIN'] as const)('is enabled for %s', async (role) => {
    show(role);
    expect(await screen.findByRole('button', { name: /New Incident/ })).toBeEnabled();
  });

  it('is disabled for viewers, with the reason', async () => {
    show('VIEWER');
    const button = await screen.findByRole('button', { name: /New Incident/ });
    await vi.waitFor(() => expect(button).toBeDisabled());
    expect(button).toHaveAttribute('title', 'Requires the analyst role');
  });
});
