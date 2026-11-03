import { describe, expect, it } from 'vitest';
import type { StatsBucket } from '@/lib/api/schemas';
import { describeChart, fillHourlyBuckets } from './chart-data';

const bucket = (iso: string, over: Partial<StatsBucket> = {}): StatsBucket => ({
  bucket: iso,
  INFO: 0,
  LOW: 0,
  MEDIUM: 0,
  HIGH: 0,
  CRITICAL: 0,
  total: 0,
  ...over,
});
const NOW = Date.parse('2026-03-02T12:34:00Z');

describe('fillHourlyBuckets', () => {
  it('returns one point per hour, oldest first, ending at the current hour', () => {
    const points = fillHourlyBuckets([], 24, NOW);
    expect(points).toHaveLength(24);
    expect(points[0]?.bucket).toBe('2026-03-01T13:00:00.000Z');
    expect(points[23]?.bucket).toBe('2026-03-02T12:00:00.000Z');
    expect(points[23]?.label).toBe('12:00');
  });

  it('fills hours without events with zeros and keeps real counts', () => {
    const points = fillHourlyBuckets(
      [bucket('2026-03-02T10:00:00.000Z', { HIGH: 4, CRITICAL: 1, total: 5 })],
      24,
      NOW,
    );
    const ten = points.find((p) => p.label === '10:00' && p.bucket.startsWith('2026-03-02'));
    expect(ten).toMatchObject({ HIGH: 4, CRITICAL: 1, total: 5 });
    expect(points.filter((p) => p.total === 0)).toHaveLength(23);
  });

  it('ignores buckets outside the window', () => {
    const points = fillHourlyBuckets([bucket('2025-01-01T00:00:00.000Z', { total: 99 })], 24, NOW);
    expect(points.reduce((s, p) => s + p.total, 0)).toBe(0);
  });
});

describe('describeChart (screen-reader summary)', () => {
  it('summarises totals, critical count and the busiest hour', () => {
    const text = describeChart(
      fillHourlyBuckets([bucket('2026-03-02T10:00:00.000Z', { CRITICAL: 2, total: 7 })], 24, NOW),
    );
    expect(text).toContain('7 events in total, 2 critical');
    expect(text).toContain('Busiest hour 10:00 UTC with 7 events');
  });

  it('says so when there is nothing to show', () => {
    expect(describeChart(fillHourlyBuckets([], 24, NOW))).toContain('No events in this period');
  });
});
