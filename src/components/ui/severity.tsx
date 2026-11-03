import { cn } from '@/lib/cn';

export const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
export type Severity = (typeof SEVERITIES)[number];

// Colour AND a text label: colour alone is not accessible (colour-blind users, screen readers).
const STYLES: Record<Severity, string> = {
  CRITICAL: 'bg-[#ef4444]/15 text-[#fca5a5]',
  HIGH: 'bg-[#f97316]/15 text-[#fdba74]',
  MEDIUM: 'bg-[#eab308]/15 text-[#fde047]',
  LOW: 'bg-[#60a5fa]/15 text-[#93c5fd]',
  INFO: 'bg-surface-container-highest text-on-surface-variant',
};

// Hex values used by charts, which cannot use Tailwind classes.
export const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  // Low and info are muted neutrals on purpose: colour is for what needs attention, and five loud hues in one chart
  // read as a rainbow.
  LOW: '#6b7280',
  INFO: '#4b5563',
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 font-label-mono text-label-mono uppercase tracking-normal',
        STYLES[severity],
        className,
      )}
    >
      {severity}
    </span>
  );
}
