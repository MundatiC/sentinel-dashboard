import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SESSION, USER, apiError, json, mockApi } from '@/test/http';
import { tokenStore } from '@/lib/api/client';
import { AuthProvider, useAuth } from './auth-provider';
import { RequireRole } from './guards';
import { LoginForm, loginErrorMessage } from './login-form';
import { ApiError } from '@/lib/api/client';

const replace = vi.fn();
let search = '';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/alerts',
  useSearchParams: () => new URLSearchParams(search),
}));

beforeEach(() => {
  tokenStore.set(null);
  replace.mockReset();
  search = '';
});
afterEach(() => vi.unstubAllGlobals());

function Probe() {
  const { status, user } = useAuth();
  return (
    <div>
      {status}:{user?.email ?? 'nobody'}
    </div>
  );
}

describe('AuthProvider', () => {
  it('silently signs in with the refresh cookie on first load', async () => {
    mockApi(() => json(SESSION));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(screen.getByText('loading:nobody')).toBeInTheDocument();
    expect(await screen.findByText('authenticated:admin@example.com')).toBeInTheDocument();
    expect(tokenStore.get()).toBe('tok-1');
  });

  it('is anonymous when there is no valid session', async () => {
    mockApi(() => apiError(401, 'UNAUTHORIZED'));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    expect(await screen.findByText('anonymous:nobody')).toBeInTheDocument();
  });
});

describe('LoginForm', () => {
  function setup() {
    // first call = the provider's silent refresh (fails), afterwards the real login
    const calls = mockApi((url) => {
      if (url.pathname.endsWith('/auth/refresh')) return apiError(401, 'UNAUTHORIZED');
      return loginResponse();
    });
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>,
    );
    return calls;
  }
  let loginResponse = () => json(SESSION);

  it('keeps the button disabled until both fields are filled', async () => {
    setup();
    const button = screen.getByRole('button', { name: /sign in/i });
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
    expect(button).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Password'), 'x');
    expect(button).toBeEnabled();
  });

  it('signs in and goes to the page the user wanted (?next=)', async () => {
    search = 'next=/alerts/123';
    loginResponse = () => json(SESSION);
    const calls = setup();
    await userEvent.type(screen.getByLabelText('Email'), '  admin@example.com ');
    await userEvent.type(screen.getByLabelText('Password'), 'correct-horse');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/alerts/123'));
    const login = calls.find((c) => c.path === '/auth/login')!;
    expect(JSON.parse(String(login.init.body))).toEqual({
      email: 'admin@example.com',
      password: 'correct-horse',
    });
    expect(tokenStore.get()).toBe('tok-1');
  });

  it('ignores a malicious ?next= and falls back to the overview', async () => {
    search = 'next=https://evil.example';
    loginResponse = () => json(SESSION);
    setup();
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('Password'), 'pw');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/overview'));
  });

  it('shows an announced error, clears the password, and does not navigate', async () => {
    loginResponse = () => apiError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    setup();
    await userEvent.type(screen.getByLabelText('Email'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid credentials');
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(replace).not.toHaveBeenCalled();
    expect(tokenStore.get()).toBeNull();
  });

  it('can reveal and hide the password', async () => {
    setup();
    const field = screen.getByLabelText('Password');
    expect(field).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(field).toHaveAttribute('type', 'text');
    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(field).toHaveAttribute('type', 'password');
  });

  it('skips the form when a session already exists', async () => {
    mockApi(() => json(SESSION));
    render(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>,
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/overview'));
  });
});

describe('loginErrorMessage', () => {
  it('never reveals which credential was wrong and explains rate limits and outages', () => {
    expect(loginErrorMessage(new ApiError(401, 'INVALID_CREDENTIALS', 'x'))).toBe(
      'Invalid credentials',
    );
    expect(loginErrorMessage(new ApiError(429, 'RATE_LIMITED', 'x'))).toMatch(/too many attempts/i);
    expect(loginErrorMessage(new ApiError(400, 'VALIDATION_ERROR', 'x'))).toMatch(/valid email/i);
    expect(loginErrorMessage(new ApiError(500, 'INTERNAL_ERROR', 'x'))).toMatch(/failed/i);
    expect(loginErrorMessage(new TypeError('fetch failed'))).toMatch(/cannot reach/i);
  });
});

describe('RequireRole', () => {
  it('shows the page to users with enough role and a clear message otherwise', async () => {
    mockApi(() => json({ ...SESSION, user: { ...USER, role: 'VIEWER' } }));
    render(
      <AuthProvider>
        <RequireRole role="ADMIN">
          <p>secret admin page</p>
        </RequireRole>
      </AuthProvider>,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');
    expect(screen.queryByText('secret admin page')).not.toBeInTheDocument();
  });

  it('renders for an admin', async () => {
    mockApi(() => json(SESSION));
    render(
      <AuthProvider>
        <RequireRole role="ADMIN">
          <p>secret admin page</p>
        </RequireRole>
      </AuthProvider>,
    );
    expect(await screen.findByText('secret admin page')).toBeInTheDocument();
  });
});
