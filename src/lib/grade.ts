import type { Severity } from '@/components/ui/severity';

// Points taken off a starting score of 100, per finding. INFO is advice, not a weakness.
export const PENALTY: Record<Severity, number> = {
  CRITICAL: 25,
  HIGH: 15,
  MEDIUM: 8,
  LOW: 3,
  INFO: 0,
};

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export function scoreOf(summary: Partial<Record<Severity, number>>): number {
  const penalty = (Object.keys(PENALTY) as Severity[]).reduce(
    (sum, severity) => sum + PENALTY[severity] * (summary[severity] ?? 0),
    0,
  );
  return Math.max(0, 100 - penalty);
}

export function gradeOf(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 65) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}
