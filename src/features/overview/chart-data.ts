import { SEVERITIES } from '@/components/ui/severity';
import type { StatsBucket } from '@/lib/api/schemas';

export interface ChartPoint {
  label: string;
  bucket: string;
  INFO: number;
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  CRITICAL: number;
  total: number;
}

/**
 * The API only returns hours that HAD events. A chart needs every hour, so we fill the gaps with zeros
 * (otherwise a quiet hour would simply vanish and the bars would look evenly spaced but wrong).
 * Buckets are whole UTC hours ending at the hour that contains `now`.
 */
export function fillHourlyBuckets(
  data: StatsBucket[],
  hours: number,
  now = Date.now(),
): ChartPoint[] {
  const byHour = new Map(data.map((row) => [new Date(row.bucket).getTime(), row]));
  const currentHour = Math.floor(now / 3_600_000) * 3_600_000;
  const points: ChartPoint[] = [];
  for (let i = hours - 1; i >= 0; i--) {
    const start = currentHour - i * 3_600_000;
    const row = byHour.get(start);
    const d = new Date(start);
    points.push({
      bucket: d.toISOString(),
      label: `${String(d.getUTCHours()).padStart(2, '0')}:00`,
      INFO: row?.INFO ?? 0,
      LOW: row?.LOW ?? 0,
      MEDIUM: row?.MEDIUM ?? 0,
      HIGH: row?.HIGH ?? 0,
      CRITICAL: row?.CRITICAL ?? 0,
      total: row?.total ?? 0,
    });
  }
  return points;
}

export function describeChart(points: ChartPoint[]): string {
  const total = points.reduce((sum, p) => sum + p.total, 0);
  const peak = points.reduce(
    (best, p) => (p.total > best.total ? p : best),
    points[0] ?? { total: 0, label: '' },
  );
  const critical = points.reduce((sum, p) => sum + p.CRITICAL, 0);
  return `Events per hour by severity over the last ${points.length} hours. ${total} events in total, ${critical} critical. ${peak.total > 0 ? `Busiest hour ${peak.label} UTC with ${peak.total} events.` : 'No events in this period.'}`;
}

export const STACK_ORDER = [...SEVERITIES].reverse(); // INFO at the bottom, CRITICAL on top
