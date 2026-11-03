import { describe, expect, it } from 'vitest';
import { formatNumber, formatTimestamp, plural, relativeTime } from './format';

describe('format', () => {
  it('formats timestamps in UTC, optionally with milliseconds', () => {
    expect(formatTimestamp('2026-03-02T10:03:30.123Z')).toBe('2026-03-02 10:03:30');
    expect(formatTimestamp('2026-03-02T10:03:30.123Z', true)).toBe('2026-03-02 10:03:30.123');
    expect(formatTimestamp('2026-03-02T12:03:30+02:00')).toBe('2026-03-02 10:03:30');
  });

  it('shows invalid dates as they came instead of "NaN"', () => {
    expect(formatTimestamp('garbage')).toBe('garbage');
    expect(relativeTime('garbage')).toBe('garbage');
  });

  it.each([
    [2, 'just now'],
    [30, '30s ago'],
    [90, '1m ago'],
    [3 * 3600, '3h ago'],
    [3 * 86400, '3d ago'],
  ])('relative time for %is is %s', (seconds, expected) => {
    const now = Date.parse('2026-03-02T12:00:00Z');
    expect(relativeTime(new Date(now - seconds * 1000).toISOString(), now)).toBe(expected);
  });

  it('formats numbers with thousands separators', () =>
    expect(formatNumber(482910)).toBe('482,910'));

  it('pluralises counts', () => {
    expect(plural(1, 'event')).toBe('1 event');
    expect(plural(0, 'event')).toBe('0 events');
    expect(plural(1200, 'event')).toBe('1,200 events');
  });
});
