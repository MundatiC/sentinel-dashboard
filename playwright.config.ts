import { defineConfig, devices } from '@playwright/test';

// End-to-end tests drive a real browser against a RUNNING dashboard and API.
// Configure with environment variables (see tests/e2e/README in docs): E2E_BASE_URL, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // the tests share one API/database
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    // Sandboxes that ship their own Chromium set this; normally Playwright finds its own browser.
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
