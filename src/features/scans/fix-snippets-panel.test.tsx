import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FixSnippetsPanel } from './fix-snippets-panel';

describe('FixSnippetsPanel', () => {
  it('renders nothing for findings with no snippet', () => {
    const { container } = render(<FixSnippetsPanel checkId="tls.cert_expiring" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the first platform, and switches when another is chosen', async () => {
    const user = userEvent.setup();
    render(<FixSnippetsPanel checkId="headers.nosniff_missing" />);
    expect(screen.getByLabelText('Netlify / Cloudflare Pages snippet')).toHaveTextContent(
      'X-Content-Type-Options: nosniff',
    );

    await user.click(screen.getByRole('button', { name: 'nginx' }));
    expect(screen.getByRole('button', { name: 'nginx' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('nginx snippet')).toHaveTextContent(
      'add_header X-Content-Type-Options "nosniff" always;',
    );
  });

  it('copies the visible snippet and says so', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<FixSnippetsPanel checkId="headers.nosniff_missing" />);

    await user.click(screen.getByRole('button', { name: 'nginx' }));
    await user.click(screen.getByRole('button', { name: 'Copy' }));
    expect(writeText).toHaveBeenCalledWith('add_header X-Content-Type-Options "nosniff" always;');
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('only offers the platforms that have a fix for that finding', () => {
    render(<FixSnippetsPanel checkId="headers.server_version" />);
    expect(screen.getByRole('button', { name: 'nginx' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Express' })).not.toBeInTheDocument();
  });
});
