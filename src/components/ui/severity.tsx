import { cn } from '@/lib/cn';

export const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;
export type Severity = (typeof SEVERITIES)[number];

// Colour AND a text label: colour alone is not accessible (colour-blind users, screen readers).
const STYLES: Record<Severity, string> = {
  CRITICAL: 'bg-error-container text-on-error-container',
  HIGH: 'bg-[#7c2d12] text-[#fed7aa]',
  MEDIUM: 'bg-[#713f12] text-[#fde68a]',
  LOW: 'bg-secondary-container/40 text-secondary',
  INFO: 'bg-surface-container-highest text-on-surface-variant',
};

// Hex values used by charts, which cannot use Tailwind classes.
export const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#3b82f6',
  INFO: '#6b7280',
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 font-label-mono text-label-mono uppercase',
        STYLES[severity],
        className,
      )}
    >
      {severity}
    </span>
  );
}
