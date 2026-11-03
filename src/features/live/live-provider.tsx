'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SeverityBadge } from '@/components/ui/severity';
import { refreshAlertViews } from '@/lib/api/hooks';
import { coalesce, runAlertStream, type LiveAlert, type LiveStatus } from './stream';

const LiveContext = createContext<LiveStatus>('connecting');
export const useLiveStatus = () => useContext(LiveContext);

interface Toast {
  key: number;
  alert: LiveAlert;
}
const TOAST_MS = 8000;

/** Opens the live alert stream while a user is signed in, and refreshes alert views when something changes. */
export function LiveProvider({ children }: { children: React.ReactNode }) {
  const client = useQueryClient();
  const [status, setStatus] = useState<LiveStatus>('connecting');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback(
    (key: number) => setToasts((t) => t.filter((x) => x.key !== key)),
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    let counter = 0;
    const refresh = coalesce(() => refreshAlertViews(client), 400);
    void runAlertStream({
      signal: controller.signal,
      onStatus: setStatus,
      onMessage: ({ type, alert }) => {
        refresh.call(); // counts, lists, charts: everything showing alerts updates by itself (bursts coalesce)
        if (type === 'alert.created') {
          const key = ++counter;
          setToasts((t) => [...t.slice(-2), { key, alert }]);
          setTimeout(() => dismiss(key), TOAST_MS);
        }
      },
    });
    return () => {
      controller.abort();
      refresh.cancel();
    };
  }, [client, dismiss]);

  const value = useMemo(() => status, [status]);
  return (
    <LiveContext.Provider value={value}>
      {children}
      {/* A polite live region: screen readers announce new alerts without stealing focus. */}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2"
      >
        {toasts.map(({ key, alert }) => (
          <Link
            key={key}
            href={`/alerts/${alert.id}`}
            onClick={() => dismiss(key)}
            className="rounded-xl bg-surface-container-high p-3 shadow-xl ring-1 ring-outline-variant/40 hover:bg-surface-container-highest"
          >
            <div className="mb-1 flex items-center gap-2">
              <SeverityBadge severity={alert.severity} />
              <span className="text-label-default text-on-surface-variant">New alert</span>
            </div>
            <p className="line-clamp-2 text-body-default">{alert.title}</p>
          </Link>
        ))}
      </div>
    </LiveContext.Provider>
  );
}
