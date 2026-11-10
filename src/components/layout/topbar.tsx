'use client';

import { Menu, Search } from 'lucide-react';
import { LiveIndicator } from './live-indicator';
import { NewIncidentButton } from './new-incident-button';
import { UserMenu } from './user-menu';

export function Topbar({ onMenu, navOpen }: { onMenu?: () => void; navOpen?: boolean }) {
  return (
    <header className="sticky top-0 z-20 print:hidden flex h-14 items-center gap-3 bg-background/95 px-4 sm:px-space-xl">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        aria-controls="main-nav"
        aria-expanded={navOpen ?? false}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>
      <form action="/events" role="search" className="relative min-w-0 max-w-md flex-1">
        <label htmlFor="global-search" className="sr-only">
          Search events
        </label>
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-outline" aria-hidden />
        <input
          id="global-search"
          name="q"
          type="search"
          placeholder="Search events…"
          className="h-9 w-full rounded-lg bg-surface-container-low pl-9 pr-3 text-body-dense placeholder:text-outline"
        />
      </form>
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <LiveIndicator />
        <NewIncidentButton />
        <UserMenu />
      </div>
    </header>
  );
}
