import { Search } from 'lucide-react';
import { LiveIndicator } from './live-indicator';
import { NewIncidentButton } from './new-incident-button';
import { UserMenu } from './user-menu';

export function Topbar({ children }: { children?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-gutter bg-background/90 px-space-xl backdrop-blur">
      <form action="/events" role="search" className="relative w-full max-w-md">
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
      <div className="ml-auto flex items-center gap-3">
        {children}
        <LiveIndicator />
        <UserMenu />
        <NewIncidentButton />
      </div>
    </header>
  );
}
