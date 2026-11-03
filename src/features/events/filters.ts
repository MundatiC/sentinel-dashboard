import { SEVERITIES, type Severity } from '@/components/ui/severity';

// All filters live in the URL (?severity=HIGH,CRITICAL&ip=1.2.3.4&page=2). That makes every filtered view
// shareable and bookmarkable, makes the back button work, and means a refresh keeps your place.
// The URL is editable by anyone, so parsing is lenient: invalid values quietly fall back to the defaults.

export const RANGES = {
  '1h': 3_600_000,
  '24h': 86_400_000,
  '7d': 7 * 86_400_000,
  '30d': 30 * 86_400_000,
} as const;
export type Range = keyof typeof RANGES | 'all';
export const RANGE_LABELS: Record<Range, string> = {
  '1h': 'Last hour',
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  all: 'All time',
};
export const PAGE_SIZES = [25, 50, 100] as const;

export interface EventFilters {
  severity: Severity[];
  type: string;
  source: string;
  ip: string;
  q: string;
  range: Range;
  sort: 'desc' | 'asc';
  page: number;
  pageSize: number;
}

export const DEFAULT_FILTERS: EventFilters = {
  severity: [],
  type: '',
  source: '',
  ip: '',
  q: '',
  range: '24h',
  sort: 'desc',
  page: 1,
  pageSize: 25,
};

export function isValidIp(value: string): boolean {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(value))
    return value.split('.').every((part) => Number(part) <= 255);
  if (!value.includes(':') || !/^[0-9a-fA-F:.]+$/.test(value)) return false;
  try {
    new URL(`http://[${value}]`); // the URL parser knows what a valid IPv6 address looks like
    return true;
  } catch {
    return false;
  }
}

const text = (value: string | null, max = 200) => (value ?? '').slice(0, max).trim();

export function parseEventFilters(params: URLSearchParams): EventFilters {
  const severity = (params.get('severity') ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is Severity => (SEVERITIES as readonly string[]).includes(s));
  const range = params.get('range') as Range | null;
  const page = Number.parseInt(params.get('page') ?? '', 10);
  const pageSize = Number.parseInt(params.get('pageSize') ?? '', 10);

  return {
    severity: [...new Set(severity)],
    type: text(params.get('type'), 100),
    source: text(params.get('source'), 100),
    ip: text(params.get('ip'), 45),
    q: text(params.get('q')),
    range: range && (range === 'all' || range in RANGES) ? range : DEFAULT_FILTERS.range,
    sort: params.get('sort') === 'asc' ? 'asc' : 'desc',
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    pageSize: (PAGE_SIZES as readonly number[]).includes(pageSize)
      ? pageSize
      : DEFAULT_FILTERS.pageSize,
  };
}

/** Only non-default values go into the URL, so the default view has a clean URL. */
export function toSearchParams(
  filters: EventFilters,
  extra: Record<string, string> = {},
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.severity.length) params.set('severity', filters.severity.join(','));
  for (const key of ['type', 'source', 'ip', 'q'] as const)
    if (filters[key]) params.set(key, filters[key]);
  if (filters.range !== DEFAULT_FILTERS.range) params.set('range', filters.range);
  if (filters.sort !== 'desc') params.set('sort', filters.sort);
  if (filters.page > 1) params.set('page', String(filters.page));
  if (filters.pageSize !== DEFAULT_FILTERS.pageSize)
    params.set('pageSize', String(filters.pageSize));
  for (const [key, value] of Object.entries(extra)) if (value) params.set(key, value);
  return params;
}

/** Translate UI filters into the API's query parameters. `now` is injectable so tests are deterministic. */
export function toApiQuery(filters: EventFilters, now = Date.now()) {
  return {
    severity: filters.severity.join(',') || undefined,
    type: filters.type || undefined,
    source: filters.source || undefined,
    ip: filters.ip && isValidIp(filters.ip) ? filters.ip : undefined,
    q: filters.q || undefined,
    from: filters.range === 'all' ? undefined : new Date(now - RANGES[filters.range]).toISOString(),
    sort: filters.sort === 'asc' ? 'occurredAt:asc' : 'occurredAt:desc',
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export function hasActiveFilters(filters: EventFilters): boolean {
  return Boolean(
    filters.severity.length ||
    filters.type ||
    filters.source ||
    filters.ip ||
    filters.q ||
    filters.range !== DEFAULT_FILTERS.range,
  );
}
