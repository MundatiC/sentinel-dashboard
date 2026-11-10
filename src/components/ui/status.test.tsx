import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './status';

describe('StatusBadge', () => {
  it('shows the state itself as the label, so an active key never reads "Resolved"', () => {
    render(
      <>
        <StatusBadge status="ACTIVE" />
        <StatusBadge status="REVOKED" />
        <StatusBadge status="DEACTIVATED" />
        <StatusBadge status="RESOLVED" />
      </>,
    );
    for (const label of ['Active', 'Revoked', 'Deactivated', 'Resolved']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('gives an active state the positive style and other states the muted one', () => {
    render(
      <>
        <StatusBadge status="ACTIVE" />
        <StatusBadge status="REVOKED" />
      </>,
    );
    expect(screen.getByText('Active').className).toContain('text-tertiary');
    expect(screen.getByText('Revoked').className).toContain('text-on-surface-variant');
  });
});
