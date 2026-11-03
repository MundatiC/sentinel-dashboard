import { expect, test } from '@playwright/test';
import { signIn } from './helpers';
import { createIngestKey, ingest } from './seed';

const SOURCE = `e2e-${Date.now()}`;
const EVIL = '<img src=x onerror="window.__xss=1"><script>window.__xss=2</script>';
const severities = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

test.describe('events explorer', () => {
  test.beforeAll(async ({ request }) => {
    const key = await createIngestKey(request);
    const events = Array.from({ length: 30 }, (_, i) => ({
      type: i % 2 ? 'auth.login_failed' : 'http.request',
      severity: severities[i % 5],
      source: SOURCE,
      actor: `user${i}`,
      ip: `203.0.113.${(i % 4) + 1}`,
      message: i === 0 ? EVIL : `Event number ${i}`,
      metadata: { n: i },
    }));
    await ingest(request, key, events);
  });

  test('shows events with server-side pagination', async ({ page }) => {
    await signIn(page);
    await page.goto(`/events?source=${SOURCE}`);
    const rows = page.getByRole('table').getByRole('row');
    await expect(rows).toHaveCount(26); // header + 25
    await expect(page.getByText(/Showing 1–25 of 30/)).toBeVisible();
    await page.getByRole('button', { name: 'Next page' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(rows).toHaveCount(6); // header + remaining 5
    await expect(page.getByText(/Showing 26–30 of 30/)).toBeVisible();
  });

  test('filters live in the URL and survive a reload', async ({ page }) => {
    await signIn(page);
    await page.goto(`/events?source=${SOURCE}`);
    await page.getByRole('button', { name: 'CRITICAL' }).click();
    await expect(page).toHaveURL(/severity=CRITICAL/);
    await expect(page.getByText(/Showing 1–6 of 6/)).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'CRITICAL' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByText(/of 6 events/)).toBeVisible();
    await page.getByRole('button', { name: /clear filters/i }).click();
    await expect(page).toHaveURL(/\/events$/);
  });

  test('typing in a filter waits for a pause, then updates the URL', async ({ page }) => {
    await signIn(page);
    await page.goto(`/events?source=${SOURCE}`);
    await page.getByLabel('IP address').fill('203.0.113.2');
    await expect(page).toHaveURL(/ip=203\.0\.113\.2/);
    await expect(page.getByText(/Showing 1–\d+ of \d+ events/)).toBeVisible();
    await page.getByLabel('IP address').fill('not-an-ip');
    await expect(page.getByText(/valid IPv4 or IPv6/)).toBeVisible();
  });

  test('the detail panel opens from a row, shows the raw event, filters by IP and closes with Escape', async ({
    page,
  }) => {
    await signIn(page);
    await page.goto(`/events?source=${SOURCE}&severity=CRITICAL`);
    await page.getByRole('table').getByRole('button').first().click();
    const panel = page.getByRole('complementary', { name: 'Event details' });
    await expect(panel).toBeVisible();
    await expect(page).toHaveURL(/event=/);
    await expect(panel.getByLabel('Raw event JSON')).toContainText('"metadata"');
    await panel.getByRole('button', { name: /filter by this ip/i }).click();
    await expect(page).toHaveURL(/ip=203\.0\.113\./);
    await expect(panel).toBeHidden();
    await page.getByRole('table').getByRole('button').first().click();
    await expect(panel).toBeVisible(); // wait for it to open before pressing Escape
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
  });

  test('hostile event text is displayed as text and never runs', async ({ page }) => {
    const dialogs: string[] = [];
    page.on('dialog', (d) => {
      dialogs.push(d.message());
      void d.dismiss();
    });
    await signIn(page);
    await page.goto(`/events?source=${SOURCE}&q=img`);
    await expect(page.getByText(EVIL).first()).toBeVisible();
    await page.getByRole('table').getByRole('button').first().click();
    await expect(
      page.getByRole('complementary', { name: 'Event details' }).getByText(EVIL).first(),
    ).toBeVisible();
    expect(
      await page.evaluate(() => (window as unknown as { __xss?: number }).__xss),
    ).toBeUndefined();
    expect(await page.locator('img[src="x"]').count()).toBe(0);
    expect(dialogs).toEqual([]);
  });

  test('has no serious accessibility violations', async ({ page }) => {
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    await signIn(page);
    await page.goto(`/events?source=${SOURCE}`);
    await expect(page.getByRole('table')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`)).toEqual([]);
  });
});

test.describe('overview', () => {
  test('shows KPIs, the severity chart with a text summary, and active alerts', async ({
    page,
  }) => {
    await signIn(page);
    await expect(page.getByRole('heading', { name: 'Security Command Post' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Open alerts' })).toBeVisible();
    const chart = page.getByRole('img', { name: /Events per hour by severity/ });
    await expect(chart).toBeVisible();
    await expect(chart).toHaveAttribute('aria-label', /over the last 24 hours/);
    await expect(page.getByRole('heading', { name: 'Active alerts' })).toBeVisible();
  });
});
