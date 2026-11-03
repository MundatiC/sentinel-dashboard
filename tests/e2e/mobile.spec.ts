import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test.describe('on a phone (390px)', () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test('the page uses the full width and the navigation is a drawer', async ({ page }) => {
    await signIn(page);
    // no sideways scrolling, and the content starts at the left edge instead of behind a 256px column
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      await page.evaluate(() =>
        Math.round(document.querySelector('main')!.getBoundingClientRect().left),
      ),
    ).toBeLessThan(24);

    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav).toBeHidden(); // closed: also unreachable for keyboard and screen readers
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(nav).toBeVisible();
    await nav.getByRole('link', { name: 'Events' }).click();
    await expect(page).toHaveURL(/\/events/);
    await expect(nav).toBeHidden(); // closes after choosing a page
  });

  test('Escape closes the drawer and the menu button reports its state', async ({ page }) => {
    await signIn(page);
    const menu = page.getByRole('button', { name: 'Open navigation' });
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
  });

  test('data tables scroll inside their own box instead of widening the page', async ({ page }) => {
    await signIn(page);
    await page.goto('/events');
    await expect(page.getByRole('table')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
});
