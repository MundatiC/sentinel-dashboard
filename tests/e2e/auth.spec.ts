import { expect, test } from '@playwright/test';
import { ADMIN, signIn } from './helpers';

test.describe('authentication', () => {
  test('anonymous visitors are sent to the login page and brought back afterwards', async ({
    page,
  }) => {
    await page.goto('/alerts');
    await expect(page).toHaveURL(/\/login\?next=%2Falerts/);
    await page.getByLabel('Email', { exact: true }).fill(ADMIN.email);
    await page.getByLabel('Password', { exact: true }).fill(ADMIN.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/alerts$/);
    await expect(page.getByRole('heading', { name: 'Alerts' })).toBeVisible();
  });

  test('wrong password shows a generic error and stays on the page', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(ADMIN.email);
    await page.getByLabel('Password', { exact: true }).fill('definitely-wrong-password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Invalid credentials' })).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  });

  test('a malicious ?next= is ignored', async ({ page }) => {
    await page.goto('/login?next=https://evil.example/phish');
    await page.getByLabel('Email', { exact: true }).fill(ADMIN.email);
    await page.getByLabel('Password', { exact: true }).fill(ADMIN.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/localhost.*\/overview/);
  });

  test('signed-in users see their identity and role, and the admin navigation', async ({
    page,
  }) => {
    await signIn(page);
    await expect(page.getByText(ADMIN.email)).toBeVisible();
    await expect(page.getByText('ADMIN', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'API Keys' })).toBeVisible();
  });

  test('the session survives a page reload (silent refresh with the httpOnly cookie)', async ({
    page,
  }) => {
    await signIn(page);
    await page.reload();
    await expect(page).toHaveURL(/\/overview/);
    await expect(page.getByText(ADMIN.email)).toBeVisible();
  });

  test('the access token is never stored where JavaScript can read it', async ({ page }) => {
    await signIn(page);
    const stored = await page.evaluate(
      () =>
        JSON.stringify({ ...localStorage }) +
        JSON.stringify({ ...sessionStorage }) +
        document.cookie,
    );
    expect(stored).not.toMatch(/eyJ/); // a JWT always starts with "eyJ"
    expect(stored).not.toContain('sentinel_refresh');
  });

  test('signing out ends the session for good', async ({ page }) => {
    await signIn(page);
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/overview');
    await expect(page).toHaveURL(/\/login/); // the refresh cookie no longer works
  });

  test('the page sends a strict CSP and no script is blocked', async ({ page }) => {
    const violations: string[] = [];
    page.on(
      'console',
      (m) => m.text().includes('Content Security Policy') && violations.push(m.text()),
    );
    const response = await page.goto('/login');
    expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(response?.headers()['x-frame-options']).toBe('DENY');
    await signIn(page);
    expect(violations).toEqual([]);
  });
});
