'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  apiFetch,
  refreshSession,
  setSessionLostHandler,
  tokenStore,
} from '@/lib/api/client';
import { sessionSchema, type User } from '@/lib/api/schemas';

type Status = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: Status;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<User | null>(null);

  // On first load there is no access token in memory, but the browser may still hold the httpOnly
  // refresh cookie from an earlier visit. Try it: success = silently signed in.
  useEffect(() => {
    let cancelled = false;
    void refreshSession().then((session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setStatus(session ? 'authenticated' : 'anonymous');
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // If a later API call discovers the session is gone, drop to the anonymous state (-> login page).
  useEffect(() => {
    setSessionLostHandler(() => {
      setUser(null);
      setStatus('anonymous');
    });
    return () => setSessionLostHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await apiFetch('/auth/login', {
      method: 'POST',
      body: { email, password },
      schema: sessionSchema,
      skipRefresh: true, // a 401 here means "wrong password", not "expired token"
    });
    tokenStore.set(session.accessToken);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST', skipRefresh: true });
    } catch (err) {
      // Even if the server cannot be reached, the local session must end.
      if (!(err instanceof ApiError)) throw err;
    } finally {
      tokenStore.set(null);
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const value = useMemo(() => ({ status, user, login, logout }), [status, user, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
