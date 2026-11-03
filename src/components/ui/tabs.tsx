'use client';

import { useId, useState } from 'react';
import { cn } from '@/lib/cn';

export interface TabDef {
  id: string;
  label: string;
  count?: number;
  content: React.ReactNode;
}

// A minimal accessible tab set: tablist/tab/tabpanel roles, arrow keys move between tabs.
export function Tabs({ tabs, label }: { tabs: TabDef[]; label: string }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const base = useId();
  const move = (index: number) => setActive(tabs[(index + tabs.length) % tabs.length]?.id);
  const current = tabs.findIndex((t) => t.id === active);

  return (
    <div>
      <div
        role="tablist"
        aria-label={label}
        className="flex gap-6 border-b border-outline-variant/30 px-1"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            type="button"
            id={`${base}-${tab.id}`}
            aria-selected={tab.id === active}
            aria-controls={`${base}-${tab.id}-panel`}
            tabIndex={tab.id === active ? 0 : -1}
            onClick={() => setActive(tab.id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') move(current + 1);
              if (e.key === 'ArrowLeft') move(current - 1);
            }}
            className={cn(
              '-mb-px flex items-center gap-2 border-b-2 py-3 text-body-default',
              tab.id === active
                ? 'border-primary text-primary'
                : 'border-transparent text-on-surface-variant hover:text-on-surface',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className="rounded bg-surface-container-high px-1.5 text-label-mono font-label-mono">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-${tab.id}-panel`}
          aria-labelledby={`${base}-${tab.id}`}
          hidden={tab.id !== active}
          className="pt-4"
        >
          {tab.id === active && tab.content}
        </div>
      ))}
    </div>
  );
}
