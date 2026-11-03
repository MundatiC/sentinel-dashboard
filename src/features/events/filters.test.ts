import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  hasActiveFilters,
  isValidIp,
  parseEventFilters,
  toApiQuery,
  toSearchParams,
} from './filters';

const parse = (qs: string) => parseEventFilters(new URLSearchParams(qs));

describe('parseEventFilters', () => {
  it('returns the defaults for an empty URL', () => {
    expect(parse('')).toEqual(DEFAULT_FILTERS);
  });

  it('reads every filter', () => {
    expect(
      parse(
        'severity=high,critical&type=auth.login_failed&source=web-1&ip=203.0.113.7&q=failed+login&range=7d&sort=asc&page=3&pageSize=50',
      ),
    ).toEqual({
      severity: ['HIGH', 'CRITICAL'],
      type: 'auth.login_failed',
      source: 'web-1',
      ip: '203.0.113.7',
      q: 'failed login',
      range: '7d',
      sort: 'asc',
      page: 3,
      pageSize: 50,
    });
  });

  it('quietly ignores garbage in the (user-editable) URL', () => {
    const f = parse('severity=BOGUS,high,high&range=forever&page=-4&pageSize=100000&sort=password');
    expect(f.severity).toEqual(['HIGH']);
    expect(f.range).toBe('24h');
    expect(f.page).toBe(1);
    expect(f.pageSize).toBe(25);
    expect(f.sort).toBe('desc');
  });

  it('caps the length of text filters', () => {
    expect(parse(`q=${'x'.repeat(5000)}`).q).toHaveLength(200);
    expect(parse(`type=${'x'.repeat(5000)}`).type).toHaveLength(100);
  });
});

describe('toSearchParams', () => {
  it('produces a clean URL for the default view', () => {
    expect(toSearchParams(DEFAULT_FILTERS).toString()).toBe('');
  });

  it('round-trips non-default filters', () => {
    const filters = parse('severity=HIGH&ip=1.2.3.4&range=all&page=2&pageSize=100&sort=asc');
    expect(parse(toSearchParams(filters).toString())).toEqual(filters);
  });

  it('can carry the selected event id', () => {
    expect(toSearchParams(DEFAULT_FILTERS, { event: 'abc' }).toString()).toBe('event=abc');
  });
});

describe('toApiQuery', () => {
  const now = Date.parse('2026-03-02T12:00:00Z');

  it('turns a range into a "from" timestamp', () => {
    expect(toApiQuery({ ...DEFAULT_FILTERS, range: '1h' }, now).from).toBe(
      '2026-03-02T11:00:00.000Z',
    );
    expect(toApiQuery({ ...DEFAULT_FILTERS, range: 'all' }, now).from).toBeUndefined();
  });

  it('maps filters to the API names and omits empty ones', () => {
    const q = toApiQuery(
      { ...DEFAULT_FILTERS, severity: ['HIGH', 'CRITICAL'], sort: 'asc', page: 2 },
      now,
    );
    expect(q).toMatchObject({
      severity: 'HIGH,CRITICAL',
      sort: 'occurredAt:asc',
      page: 2,
      pageSize: 25,
    });
    expect(q.type).toBeUndefined();
    expect(q.ip).toBeUndefined();
  });

  it('never sends an invalid IP to the API (it would answer 400)', () => {
    expect(toApiQuery({ ...DEFAULT_FILTERS, ip: '999.1.1.1' }, now).ip).toBeUndefined();
    expect(toApiQuery({ ...DEFAULT_FILTERS, ip: '203.0.113.7' }, now).ip).toBe('203.0.113.7');
  });
});

describe('isValidIp', () => {
  it.each([
    '203.0.113.7',
    '0.0.0.0',
    '255.255.255.255',
    '::1',
    '2001:db8::1',
    'fe80::1ff:fe23:4567:890a',
  ])('accepts %s', (ip) => expect(isValidIp(ip)).toBe(true));
  it.each([
    '',
    'abc',
    '256.1.1.1',
    '1.2.3',
    '1.2.3.4.5',
    '2001:::1',
    '<script>',
    '1.2.3.4/24',
    'localhost',
  ])('rejects %j', (ip) => expect(isValidIp(ip)).toBe(false));
});

describe('hasActiveFilters', () => {
  it('is false for defaults and true when anything differs', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, q: 'x' })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, range: 'all' })).toBe(true);
  });
});
