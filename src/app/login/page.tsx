import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/features/auth/login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      {/* useSearchParams() (the ?next= value) needs a Suspense boundary */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
