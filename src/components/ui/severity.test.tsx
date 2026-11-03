import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SEVERITIES, SEVERITY_COLORS, SeverityBadge } from './severity';

describe('SeverityBadge', () => {
  it.each(SEVERITIES)('always shows the %s label as text (never colour alone)', (severity) => {
    render(<SeverityBadge severity={severity} />);
    expect(screen.getByText(severity)).toBeInTheDocument();
  });

  it('has a chart colour for every severity', () => {
    expect(Object.keys(SEVERITY_COLORS).sort()).toEqual([...SEVERITIES].sort());
  });
});
