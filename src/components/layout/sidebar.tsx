'use client';

import { ShieldCheck, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { cn } from '@/lib/cn';
import { NAV_SECTIONS, canSee, type Role } from './nav';

/**
 * Side navigation. From the `lg` breakpoint up it is always visible; on smaller screens it is a drawer opened by the
 * menu button in the top bar (a fixed 256px column would leave a phone almost no room for the page).
 * The active page is shown quietly (a neutral pill and an accent icon): colour is kept for the data.
 */
export function Sidebar({
  role,
  open = false,
  onClose,
}: {
  role?: Role;
  open?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div aria-hidden className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={onClose} />
      )}
      <aside
        id="main-nav"
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-outline-variant/30 bg-background transition-transform lg:translate-x-0',
          // closed on a phone: off-screen AND invisible, so keyboard and screen-reader users cannot reach it
          !open && 'max-lg:invisible max-lg:-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center justify-between gap-space-sm px-4">
          <span className="flex items-center gap-space-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-container text-primary">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </span>
            <span className="font-headline-md text-headline-md tracking-tight">Sentinel</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <nav aria-label="Main" className="flex-1 overflow-y-auto px-2 py-2">
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter((item) => canSee(role, item.minRole));
            if (items.length === 0) return null;
            return (
              <div key={section.title} className="mb-4">
                <h2 className="px-3 pb-1 pt-2 text-label-default text-on-surface-variant">
                  {section.title}
                </h2>
                <ul className="space-y-0.5">
                  {items.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href || pathname.startsWith(href + '/');
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          onClick={onClose}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex min-h-10 items-center gap-3 rounded-lg px-3 text-body-default transition',
                            active
                              ? 'bg-surface-container-high text-on-surface'
                              : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
                          )}
                        >
                          <Icon className={cn('h-5 w-5', active && 'text-primary')} aria-hidden />
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
    </>
  );
}
