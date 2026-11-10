import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ApiFinding } from '@/lib/api/schemas';
import { ScanPrint } from './scan-print';

const finding = (
  checkId: string,
  severity: ApiFinding['severity'],
  title = checkId,
): ApiFinding => ({
  id: `id-${checkId}`,
  checkId,
  category: 'HEADERS',
  severity,
  title,
  description: `${title} description`,
  evidence: {},
  remediation: `Fix for ${checkId}`,
  references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers'],
});

const scan = {
  target: 'https://example.com/app/',
  scannerVersion: '0.1.0',
  finishedAt: '2026-11-10T10:13:18.000Z',
  summary: { MEDIUM: 1, LOW: 1, INFO: 1 },
  findings: [
    finding('headers.hsts_missing', 'MEDIUM', 'HSTS missing'),
    finding('headers.nosniff_missing', 'LOW', 'nosniff missing'),
    finding('headers.permissions_policy_missing', 'INFO', 'Permissions-Policy missing'),
  ],
};

describe('ScanPrint', () => {
  it('shows the target, grade and score, with every finding expanded with its fix', () => {
    render(<ScanPrint scan={scan} />);
    expect(screen.getByRole('heading', { name: 'https://example.com/app/' })).toBeInTheDocument();
    expect(screen.getByText('89/100')).toBeInTheDocument(); // 100 - 8 - 3
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('Fix for headers.hsts_missing')).toBeInTheDocument();
    expect(screen.getByText(/not a penetration test/)).toBeInTheDocument();
  });

  it('lists the worst non-info findings under "Fix first"', () => {
    render(<ScanPrint scan={scan} />);
    const list = screen.getByRole('heading', { name: 'Fix first' }).nextElementSibling;
    expect(list?.textContent).toContain('HSTS missing');
    expect(list?.textContent).not.toContain('Permissions-Policy');
  });

  it('summarises what changed since the previous scan', () => {
    const previous = {
      finishedAt: '2026-11-01T10:00:00.000Z',
      findings: [finding('headers.hsts_missing', 'MEDIUM'), finding('cookies.no_httponly', 'LOW')],
    };
    render(<ScanPrint scan={scan} previous={previous} />);
    expect(screen.getByText(/1 fixed, 2 new, 1 unchanged/)).toBeInTheDocument();
  });

  it('says so when there is nothing to fix', () => {
    render(<ScanPrint scan={{ ...scan, summary: {}, findings: [] }} />);
    expect(screen.getByText('No findings.')).toBeInTheDocument();
    expect(screen.getByText('100/100')).toBeInTheDocument();
  });
});
