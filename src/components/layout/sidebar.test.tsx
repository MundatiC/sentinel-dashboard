import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from './sidebar';

let pathname = '/overview';
vi.mock('next/navigation', () => ({ usePathname: () => pathname }));

describe('Sidebar', () => {
  it('shows every section to an admin, in the order of the design', () => {
    render(<Sidebar role="ADMIN" />);
    const links = screen.getAllByRole('link').map((a) => a.textContent);
    expect(links).toEqual([
      'Overview', 'Alerts', 'Events', 'Incidents', 'Scans',
      'Alert Rules', 'Users', 'API Keys', 'Audit Log',
    ]); // prettier-ignore
  });

  it('hides admin-only pages from analysts and viewers', () => {
    render(<Sidebar role="VIEWER" />);
    expect(screen.queryByText('Users')).not.toBeInTheDocument();
    expect(screen.queryByText('API Keys')).not.toBeInTheDocument();
    expect(screen.queryByText('Audit Log')).not.toBeInTheDocument();
    expect(screen.getByText('Alert Rules')).toBeInTheDocument();
  });

  it('shows nothing before the role is known', () => {
    render(<Sidebar />);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('marks the current page for screen readers, including nested routes', () => {
    pathname = '/alerts/123';
    render(<Sidebar role="VIEWER" />);
    expect(screen.getByRole('link', { name: 'Alerts' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });
});
