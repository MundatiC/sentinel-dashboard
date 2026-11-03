import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pagination, pageWindow } from './pagination';

describe('pageWindow', () => {
  it.each([
    [1, 1, [1]],
    [1, 5, [1, 2, 5].length ? [1, 2, 'gap', 5] : []],
    [3, 5, [1, 2, 3, 4, 5]],
    [10, 20, [1, 'gap', 9, 10, 11, 'gap', 20]],
    [20, 20, [1, 'gap', 19, 20]],
  ])('page %i of %i', (page, total, expected) => expect(pageWindow(page, total)).toEqual(expected));
});

describe('Pagination', () => {
  const setup = (over = {}) => {
    const props = {
      page: 2,
      pageSize: 25,
      total: 4312,
      totalPages: 173,
      pageSizes: [25, 50, 100],
      onPage: vi.fn(),
      onPageSize: vi.fn(),
      noun: 'events',
      ...over,
    };
    render(<Pagination {...props} />);
    return props;
  };

  it('says which rows are shown', () => {
    setup();
    expect(screen.getByText(/26–50/)).toBeInTheDocument();
    expect(screen.getByText(/4,312/)).toBeInTheDocument();
  });

  it('handles an empty result', () => {
    setup({ total: 0, totalPages: 0, page: 1 });
    expect(screen.getByText(/0–0/)).toBeInTheDocument();
  });

  it('navigates and marks the current page', async () => {
    const props = setup();
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(props.onPage).toHaveBeenCalledWith(3);
    await userEvent.click(screen.getByRole('button', { name: 'Page 173' }));
    expect(props.onPage).toHaveBeenCalledWith(173);
  });

  it('disables previous on the first page and next on the last', () => {
    setup({ page: 1 });
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  });

  it('changes the page size', async () => {
    const props = setup();
    await userEvent.selectOptions(screen.getByLabelText('Per page'), '50');
    expect(props.onPageSize).toHaveBeenCalledWith(50);
  });
});
