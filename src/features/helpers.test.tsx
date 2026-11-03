import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { isSafeHttpUrl, SafeLink } from '@/components/ui/safe-link';
import type { ApiFinding, ApiRule } from '@/lib/api/schemas';
import { parseAlertStatus } from './alerts/alerts-page';
import { describeRule } from './alerts/alert-detail';
import { incidentDuration } from './incidents/incident-detail';
import { groupFindings } from './scans/scan-detail';

describe('SafeLink (links in scan data are untrusted)', () => {
  it.each(['https://nvd.nist.gov/vuln/detail/CVE-2024-1', 'http://example.com/x'])(
    'links %s safely',
    (url) => {
      render(<SafeLink href={url} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', url);
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(link).toHaveAttribute('target', '_blank');
    },
  );

  it.each([
    'javascript:alert(1)',
    'data:text/html,<script>1</script>',
    'vbscript:x',
    '/relative',
    'ftp://x.example',
    '',
  ])('never makes %j clickable', (url) => {
    expect(isSafeHttpUrl(url)).toBe(false);
    render(<SafeLink href={url} />);
    expect(screen.queryByRole('link')).toBeNull();
  });
});

describe('parseAlertStatus', () => {
  it('defaults to OPEN for anything unknown (the URL is editable)', () => {
    expect(parseAlertStatus('RESOLVED')).toBe('RESOLVED');
    expect(parseAlertStatus('nope')).toBe('OPEN');
    expect(parseAlertStatus(null)).toBe('OPEN');
  });
});

describe('describeRule', () => {
  const rule: ApiRule = {
    id: 'r',
    name: 'Brute force',
    description: '',
    enabled: true,
    eventType: 'auth.login_failed',
    groupBy: 'IP',
    threshold: 5,
    windowSeconds: 60,
    severity: 'HIGH',
    cooldownSeconds: 300,
  };
  it('explains the rule in plain English', () => {
    expect(describeRule(rule)).toBe(
      'Raises an alert when 5 or more "auth.login_failed" events come from the same IP address within 60 seconds. After an alert is resolved, 300 s must pass before the same IP address can raise another.',
    );
  });
  it('omits the cooldown sentence when there is none', () =>
    expect(describeRule({ ...rule, cooldownSeconds: 0, groupBy: 'SOURCE' })).not.toContain(
      'After an alert',
    ));
});

describe('incidentDuration', () => {
  const created = '2026-03-02T10:00:00Z';
  it.each([
    [created, '2026-03-02T10:00:20Z', 'under a minute'],
    [created, '2026-03-02T12:45:00Z', '2h 45m'],
    [created, '2026-03-04T10:30:00Z', '2d 30m'],
  ])('counts up to the resolution time (%s to %s)', (start, end, expected) =>
    expect(incidentDuration({ createdAt: start, resolvedAt: end })).toBe(expected),
  );
  it('counts up to now while open', () =>
    expect(
      incidentDuration(
        { createdAt: created, resolvedAt: null },
        Date.parse('2026-03-02T11:05:00Z'),
      ),
    ).toBe('1h 5m'));
});

describe('groupFindings', () => {
  const f = (over: Partial<ApiFinding>): ApiFinding => ({
    id: Math.random().toString(),
    checkId: 'x',
    category: 'HEADERS',
    severity: 'LOW',
    title: 'T',
    description: '',
    evidence: {},
    remediation: '',
    references: [],
    ...over,
  });
  it('groups by category in a fixed order, worst first, and drops empty categories', () => {
    const groups = groupFindings([
      f({ category: 'TLS', severity: 'MEDIUM' }),
      f({ category: 'HEADERS', severity: 'LOW', title: 'b' }),
      f({ category: 'HEADERS', severity: 'CRITICAL', title: 'a' }),
      f({ category: 'DEPENDENCIES', severity: 'HIGH' }),
    ]);
    expect(groups.map((g) => g.category)).toEqual(['DEPENDENCIES', 'HEADERS', 'TLS']);
    expect(groups[1]!.findings.map((x) => x.severity)).toEqual(['CRITICAL', 'LOW']);
  });
});
