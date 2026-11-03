import { expect, test } from '@playwright/test';
import { ADMIN, signIn } from './helpers';
import { API, createViewer, uniqueIp } from './seed';

test.describe('admin: API keys', () => {
  test.describe.configure({ mode: 'serial' });
  const name = `e2e key ${Date.now()}`;
  let rawKey = '';

  test('creating a key shows the secret once, and it works until revoked', async ({
    page,
    request,
  }) => {
    await signIn(page);
    await page.goto('/admin/api-keys');
    await page.getByRole('button', { name: /Create API key/ }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name').fill(name);
    await dialog.getByLabel('scans:write').check();
    await dialog.getByRole('button', { name: 'Create key' }).click();

    const secret = dialog.getByLabel('API key');
    await expect(secret).toContainText(/^snt_[0-9a-f]{8}_/);
    await expect(dialog.getByRole('alert')).toContainText(/will not be able to see it again/i);
    rawKey = (await secret.textContent()) ?? '';
    // it must exist nowhere a script could later read it
    expect(
      await page.evaluate(
        () =>
          JSON.stringify({ ...localStorage }) +
          JSON.stringify({ ...sessionStorage }) +
          document.cookie,
      ),
    ).not.toContain(rawKey);

    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByText(rawKey)).toHaveCount(0); // gone from the page for good
    await page.reload();
    await expect(page.getByText(rawKey)).toHaveCount(0);
    await expect(page.getByRole('row', { name: new RegExp(name) })).toContainText('events:write');

    const ingest = (key: string) =>
      request.post(`${API}/api/v1/ingest/events`, {
        headers: { 'X-API-Key': key },
        data: {
          events: [{ type: 'auth.login_failed', source: 'e2e-key', message: 'x', ip: uniqueIp() }],
        },
      });
    expect((await ingest(rawKey)).status()).toBe(201);
    await page.getByRole('button', { name: `Revoke ${name}` }).click();
    await page.getByRole('button', { name: 'Confirm revoke' }).click();
    await expect(page.getByRole('row', { name: new RegExp(name) })).toContainText('Revoked');
    expect((await ingest(rawKey)).status()).toBe(401);
  });
});

test.describe('admin: alert rules', () => {
  test.describe.configure({ mode: 'serial' });
  const name = `e2e rule ${Date.now()}`;

  test('create, validate, toggle and delete a rule', async ({ page }) => {
    await signIn(page);
    await page.goto('/admin/rules');
    await page.getByRole('button', { name: /New rule/ }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Name').fill(name);
    await dialog.getByLabel('Event type').fill('Not Valid');
    await dialog.getByRole('button', { name: 'Create rule' }).click();
    await expect(dialog.getByRole('alert')).toContainText(/event type/i);
    await dialog.getByLabel('Event type').fill('e2e.thing_happened');
    await dialog.getByLabel('Threshold (events)').fill('3');
    await expect(
      dialog.getByText(/Raises an alert when 3 or more "e2e\.thing_happened"/),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Create rule' }).click();

    const row = page.getByRole('row', { name: new RegExp(name) });
    await expect(row).toContainText('≥ 3 e2e.thing_happened per ip in 60s');
    const toggle = page.getByRole('switch', { name: `${name} enabled` });
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');

    await page.getByRole('button', { name: `Delete ${name}` }).click();
    await page.getByRole('button', { name: 'Confirm delete' }).click();
    await expect(row).toHaveCount(0);
  });
});

test.describe('admin: users and audit log', () => {
  test('admins cannot change themselves, can promote another user, and the audit log records it', async ({
    page,
    request,
  }) => {
    const viewer = await createViewer(request);
    await signIn(page);
    await page.goto('/admin/users');
    await expect(page.getByLabel(`Role for ${ADMIN.email}`)).toBeDisabled();
    await page.getByLabel(`Role for ${viewer.email}`).selectOption('ANALYST');
    await expect(page.getByLabel(`Role for ${viewer.email}`)).toHaveValue('ANALYST');

    await page.goto('/admin/audit');
    await page.getByLabel('Action starts with').fill('user.role');
    await expect(page.getByRole('row', { name: /user\.role_changed/ }).first()).toBeVisible();
    await page
      .getByRole('row', { name: /user\.role_changed/ })
      .first()
      .locator('summary')
      .click();
    await expect(page.getByLabel('Entry details').first()).toContainText('"to"');
  });
});

test.describe('role limits (viewer)', () => {
  test('a viewer sees no admin navigation, is refused admin pages and cannot act on alerts', async ({
    page,
    request,
  }) => {
    const viewer = await createViewer(request);
    await signIn(page, viewer.email, viewer.password);
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Alert Rules' })).toBeVisible();
    for (const hidden of ['Users', 'API Keys', 'Audit Log'])
      await expect(nav.getByRole('link', { name: hidden })).toHaveCount(0);

    await page.goto('/admin/users');
    await expect(page.getByRole('alert').filter({ hasText: 'Access denied' })).toBeVisible();
    await page.goto('/admin/rules');
    await expect(page.getByRole('button', { name: /New rule/ })).toHaveCount(0);
    await expect(page.getByRole('switch').first()).toBeDisabled();
    await page.goto('/incidents');
    await expect(page.getByRole('button', { name: /New incident/ }).first()).toBeDisabled();
  });
});

test('admin pages have no serious accessibility violations', async ({ page }) => {
  const { default: AxeBuilder } = await import('@axe-core/playwright');
  await signIn(page);
  for (const path of [
    '/admin/users',
    '/admin/api-keys',
    '/admin/rules',
    '/admin/audit',
    '/scans',
    '/overview',
  ]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.waitForTimeout(600);
    const serious = (
      await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    ).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${path} ${v.id}: ${v.nodes[0]?.html.slice(0, 110)}`)).toEqual([]);
  }
});
