import { expect, test, type Page } from '@playwright/test';
import { signIn } from './helpers';
import { createIngestKey, ingest, ingestScan, uniqueIp } from './seed';

async function raiseBruteForce(request: Parameters<typeof createIngestKey>[0], ip: string) {
  const key = await createIngestKey(request);
  await ingest(
    request,
    key,
    Array.from({ length: 6 }, (_, i) => ({
      type: 'auth.login_failed',
      severity: 'MEDIUM',
      source: 'e2e-sshd',
      actor: `root${i}`,
      ip,
      message: `Failed password for root from ${ip}`,
    })),
  );
}

async function openAlert(page: Page, ip: string, status = 'OPEN') {
  await page.goto(`/alerts?status=${status}`);
  await page
    .getByRole('link', { name: new RegExp(ip.replace(/\./g, '\\.')) })
    .first()
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(ip);
}

test.describe('live alerts', () => {
  test('a new alert appears on the overview without reloading the page', async ({
    page,
    request,
  }) => {
    await signIn(page);
    await expect(page.getByRole('status', { name: /Live alert feed: Live/ })).toBeVisible({
      timeout: 15_000,
    });
    const ip = uniqueIp();
    await raiseBruteForce(request, ip);
    // the toast announces it, and the "Active alerts" list shows it: no navigation or reload happened
    await expect(
      page.getByRole('status').getByText(new RegExp(ip.replace(/\./g, '\\.'))),
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page
        .getByRole('region')
        .or(page.locator('main'))
        .getByText(new RegExp(`Brute-force login attempts: ${ip.replace(/\./g, '\\.')}`))
        .first(),
    ).toBeVisible();
  });
});

test.describe('alert triage and incidents', () => {
  // These tests build on each other (the alert is acknowledged, then resolved), so they run in order in one worker.
  test.describe.configure({ mode: 'serial' });
  const ip = uniqueIp();
  test.beforeAll(async ({ request }) => raiseBruteForce(request, ip));

  test('acknowledge, assign, open an incident from the alert, add a note, move it along', async ({
    page,
  }) => {
    await signIn(page);
    await openAlert(page, ip);
    await expect(page.getByText('Rule: Brute-force login attempts')).toBeVisible();
    await expect(page.getByRole('tab', { name: /Triggering events/ })).toBeVisible();

    await page.getByRole('button', { name: /Acknowledge/ }).click();
    await expect(page.getByText('Acknowledged', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: /Assign to me/ }).click();
    await expect(page.getByRole('button', { name: /Unassign me/ })).toBeVisible();

    await page.getByRole('button', { name: 'Create incident' }).click();
    const dialog = page.getByRole('dialog', { name: 'New incident' });
    await expect(dialog.getByLabel('Title')).toHaveValue(new RegExp(ip.replace(/\./g, '\\.')));
    await dialog
      .getByLabel('Summary (optional)')
      .fill('Automated guessing against SSH.\nSecond line.');
    await dialog.getByRole('button', { name: 'Create incident' }).click();

    await expect(page).toHaveURL(/\/incidents\/[0-9a-f-]{36}/);
    const timeline = page.getByRole('list', { name: 'Incident timeline' });
    await expect(timeline.getByText('Incident opened')).toBeVisible();
    await expect(timeline.getByText(/Alert linked/).first()).toBeVisible();

    await page.getByLabel('Add a note').fill('Blocked the IP at the firewall. <b>not bold</b>');
    await page.getByRole('button', { name: 'Post note' }).click();
    await expect(
      timeline.getByText('Blocked the IP at the firewall. <b>not bold</b>'),
    ).toBeVisible(); // shown as text

    await page.getByRole('button', { name: /Investigating/ }).click();
    await expect(timeline.getByText('Status changed from OPEN to INVESTIGATING')).toBeVisible();
    await expect(page.getByRole('button', { name: /Investigating/ })).toHaveAttribute(
      'aria-current',
      'step',
    );
    await expect(page.getByText(/sentinel-scan postmortem --incident-id/)).toBeVisible();

    await page
      .getByRole('link', { name: /Brute-force login attempts/ })
      .first()
      .click();
    await expect(page.getByRole('link', { name: 'View incident' })).toBeVisible();
  });

  test('resolving an alert moves it to the Resolved tab', async ({ page }) => {
    await signIn(page);
    await openAlert(page, ip, 'ACKNOWLEDGED');
    await page.getByRole('button', { name: /Resolve/ }).click();
    await expect(page.getByRole('button', { name: /Resolve/ })).toBeDisabled();
    await page.goto('/alerts?status=RESOLVED');
    await expect(
      page.getByRole('link', { name: new RegExp(ip.replace(/\./g, '\\.')) }),
    ).toBeVisible();
  });

  test('alert and incident pages have no serious accessibility violations', async ({ page }) => {
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    await signIn(page);
    for (const path of ['/alerts', '/incidents']) {
      await page.goto(path);
      await expect(
        page
          .getByRole('table')
          .or(page.getByText(/No (open )?(alerts|incidents)/i))
          .first(),
      ).toBeVisible();
      const serious = (
        await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
      ).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(serious.map((v) => `${path} ${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`)).toEqual([]);
    }
  });
});

test.describe('scan reports', () => {
  test.describe.configure({ mode: 'serial' }); // share the scan created in beforeAll
  const target = `https://e2e-${Date.now()}.example`;
  let scanId = '';

  test.beforeAll(async ({ request }) => {
    const key = await createIngestKey(request);
    const now = Date.now();
    scanId = (
      await ingestScan(request, key, {
        target,
        scannerVersion: '0.1.0',
        startedAt: new Date(now - 30_000).toISOString(),
        finishedAt: new Date(now).toISOString(),
        findings: [
          {
            checkId: 'files.git_exposed',
            category: 'EXPOSED_FILES',
            severity: 'CRITICAL',
            title: '<script>window.__xss=1</script> .git exposed',
            description: 'The repository is readable.',
            remediation: 'Remove it.',
            evidence: { path: '/.git/HEAD', sha256OfFirst1KB: 'ab'.repeat(32) },
            references: ['https://owasp.org/www-project-secure-headers/'],
          },
          {
            checkId: 'headers.csp_missing',
            category: 'HEADERS',
            severity: 'MEDIUM',
            title: 'CSP missing',
            description: 'No policy.',
            remediation: 'Add one.',
            references: [],
          },
        ],
      })
    ).id;
  });

  test('lists the scan, groups findings by category and shows evidence and safe reference links', async ({
    page,
  }) => {
    await signIn(page);
    await page.goto('/scans');
    await page.getByRole('link', { name: target }).click();
    await expect(page).toHaveURL(new RegExp(scanId));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(target);
    await expect(page.getByRole('heading', { name: /Exposed files/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Security headers/ })).toBeVisible();

    await page.locator('summary', { hasText: '.git exposed' }).click(); // expands the <details>
    await expect(page.getByLabel('Evidence')).toContainText('/.git/HEAD');
    const ref = page.getByRole('link', { name: /owasp\.org/ });
    await expect(ref).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(ref).toHaveAttribute('target', '_blank');
    expect(
      await page.evaluate(() => (window as unknown as { __xss?: number }).__xss),
    ).toBeUndefined();
  });

  test('the report has no serious accessibility violations', async ({ page }) => {
    const { default: AxeBuilder } = await import('@axe-core/playwright');
    await signIn(page);
    await page.goto(`/scans/${scanId}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const serious = (
      await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    ).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 100)}`)).toEqual([]);
  });
});
