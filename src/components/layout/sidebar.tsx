'use client';

import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { NAV_SECTIONS, canSee, type Role } from './nav';

export function Sidebar({ role }: { role?: Role }) {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-surface-container-lowest">
      <div className="flex h-14 items-center gap-space-sm px-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-container/15 text-primary">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </span>
        <span className="font-headline-md text-headline-md tracking-tight">Sentinel</span>
      </div>

      <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 py-2">
        {NAV_SECTIONS.map((section) => {
          const items = section.items.filter((item) => canSee(role, item.minRole));
          if (items.length === 0) return null;
          return (
            <div key={section.title} className="mb-4">
              <h2 className="px-3 pb-1 pt-2 font-label-mono text-label-mono uppercase text-outline">
                {section.title}
              </h2>
              <ul className="space-y-0.5">
                {items.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(href + '/');
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex min-h-10 items-center gap-3 rounded-lg px-3 text-body-default transition',
                          active
                            ? 'bg-primary-container text-on-primary-container'
                            : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface',
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                        {label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
