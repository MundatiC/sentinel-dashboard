import { cn } from '@/lib/cn';

const STYLES: Record<string, string> = {
  OPEN: 'text-error ring-error/50',
  ACKNOWLEDGED: 'text-secondary ring-secondary/50',
  RESOLVED: 'text-tertiary ring-tertiary/50',
  ACTIVE: 'text-tertiary ring-tertiary/50',
  INVESTIGATING: 'text-secondary ring-secondary/50',
  CONTAINED: 'text-[#fde68a] ring-[#fde68a]/50',
};

// Outlined pill with a text label (like the design). Colour is never the only signal.
// Any other state (Revoked, Expired, Deactivated...) falls back to the muted style, and its label is the status itself.
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-label-default ring-1',
        STYLES[status] ?? 'text-on-surface-variant ring-outline',
        className,
      )}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
