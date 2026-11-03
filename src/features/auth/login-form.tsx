'use client';

import { AlertCircle, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api/client';
import { safeNextPath } from '@/lib/safe-redirect';
import { useAuth } from './auth-provider';

// Turn technical failures into messages a person can act on. Note that we never say WHICH of the
// two fields was wrong: the API deliberately does not reveal that, and neither should the UI.
export function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'RATE_LIMITED') return 'Too many attempts. Wait a few minutes and try again.';
    if (err.status === 401) return 'Invalid credentials';
    if (err.code === 'VALIDATION_ERROR') return 'Enter a valid email and your password.';
    return 'Sign-in failed. Please try again.';
  }
  return 'Cannot reach the Sentinel API. Check your connection and try again.';
}

export function LoginForm() {
  const { login, status } = useAuth();
  const router = useRouter();
  const next = safeNextPath(useSearchParams().get('next'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (for example the refresh cookie was still valid): skip the form.
  useEffect(() => {
    if (status === 'authenticated') router.replace(next);
  }, [status, router, next]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace(next);
    } catch (err) {
      setError(loginErrorMessage(err));
      setPassword(''); // do not leave a rejected password sitting in the field
      setSubmitting(false);
    }
  }

  const inputClass =
    'h-12 w-full rounded-lg bg-surface-container-lowest px-4 text-body-default text-on-surface placeholder:text-outline';

  return (
    <div className="w-full max-w-md rounded-xl bg-surface-container-low p-8 shadow-2xl">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-container-lowest text-primary">
          <ShieldCheck className="h-6 w-6" aria-hidden />
        </span>
        <span className="font-headline-md text-headline-md">Sentinel</span>
      </div>

      <h1 className="font-headline-lg text-headline-lg">Sign in to Sentinel</h1>
      <p className="mb-6 mt-1 text-on-surface-variant">
        Self-hosted security monitoring for engineering teams
      </p>

      {/* role="alert" makes screen readers announce the error as soon as it appears */}
      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-lg bg-error-container/40 p-4 text-error"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <p className="font-body-default">{error}</p>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-1.5 block font-label-default text-label-default">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block font-label-default text-label-default">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClass} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-on-surface-variant hover:text-on-surface"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" aria-hidden />
              ) : (
                <Eye className="h-5 w-5" aria-hidden />
              )}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="h-12 w-full text-body-lg"
          disabled={submitting || !email || !password}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
          {!submitting && <ArrowRight className="h-5 w-5" aria-hidden />}
        </Button>
      </form>
    </div>
  );
}
