import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Static shell for now: the live indicator, notifications and user menu are wired in later steps.
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
        <Button variant="primary" disabled title="Available to analysts">
          <Plus className="h-4 w-4" aria-hidden /> New Incident
        </Button>
      </div>
    </header>
  );
}
