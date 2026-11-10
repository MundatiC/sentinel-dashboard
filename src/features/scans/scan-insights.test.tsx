import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GradeChip, ScanInsights } from './scan-insights';

describe('GradeChip', () => {
  it('shows the letter and the score', () => {
    render(<GradeChip summary={{ MEDIUM: 2, LOW: 2 }} />);
    expect(screen.getByText('C')).toBeInTheDocument(); // 100 - 16 - 6 = 78
    expect(screen.getByLabelText('score 78 out of 100')).toBeInTheDocument();
  });
});

describe('ScanInsights trend', () => {
  const scan = { summary: { MEDIUM: 2, LOW: 2 }, findings: [] };

  it('labels the trend with the first and latest score', () => {
    const history = [
      { id: 'b', finishedAt: '2026-11-10T12:00:00Z', summary: { MEDIUM: 2, LOW: 2 } },
      { id: 'a', finishedAt: '2026-11-10T10:00:00Z', summary: { MEDIUM: 3, LOW: 2 } },
    ];
    render(<ScanInsights scan={scan} history={history} />);
    expect(screen.getByText('Trend: 70 → 78 over 2 scans')).toBeInTheDocument();
  });

  it('shows no trend for a single scan, and says it is the first', () => {
    render(
      <ScanInsights
        scan={scan}
        history={[{ id: 'a', finishedAt: '2026-11-10T10:00:00Z', summary: scan.summary }]}
      />,
    );
    expect(screen.queryByText(/Trend:/)).not.toBeInTheDocument();
    expect(screen.getByText('First scan of this target.')).toBeInTheDocument();
  });
});
