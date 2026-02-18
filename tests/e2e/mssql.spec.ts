import { test, expect } from '@playwright/test';

const SERVER_NAME = process.env.MSSQL_SERVER_NAME;
const DB_HOST = process.env.MSSQL_HOST;
const DB_PORT = process.env.MSSQL_PORT;
const DB_NAME = process.env.MSSQL_DB;
const DB_USER = process.env.MSSQL_USER;
const DB_PASSWORD = process.env.MSSQL_PWD;

test.describe('MSSQL template', () => {
  test.beforeEach(async ({ request }) => {
    if (!SERVER_NAME) return;
    try {
      await request.delete(`/api/servers/${encodeURIComponent(SERVER_NAME)}`);
    } catch {
      // ignore if missing
    }
  });

  test.afterEach(async ({ request }) => {
    if (!SERVER_NAME) return;
    try {
      //await request.delete(`/api/servers/${encodeURIComponent(SERVER_NAME)}`);
    } catch {
      // ignore if cleanup fails
    }
  });

  test('generate MSSQL server via UI', async ({ page }) => {
    if (!SERVER_NAME || !DB_HOST || !DB_PORT || !DB_NAME || !DB_USER || !DB_PASSWORD) {
      throw new Error('Missing MSSQL_* env vars in .env.test');
    }

    await page.goto('/');

    await page.locator('input[name="dataSourceType"][value="mssql"]').check({ force: true });

    await page.locator('#next-to-step-2:not([disabled])').click();
    await expect(page.locator('#wizard-step-2')).toBeVisible();
    await expect(page.locator('#database-section')).toBeVisible();

    await page.fill('#dbHost', DB_HOST);
    await page.fill('#dbPort', DB_PORT);
    await page.fill('#dbName', DB_NAME);
    await page.fill('#dbUser', DB_USER);
    await page.fill('#dbPassword', DB_PASSWORD);

    await page.locator('#next-to-step-3:not([disabled])').click();
    await page.waitForResponse((resp) => resp.url().includes('/api/parse') && resp.ok());

    await expect(page.locator('#wizard-step-3')).toBeVisible();

    await page.locator('#next-to-step-4:not([disabled])').click();

    await page.fill('#serverName', SERVER_NAME);
    await page.fill('#serverDescription', 'MSSQL OrderTransmissionDB test');

    const generateBtn = page.locator('#generateBtn');
    await expect(generateBtn).toBeEnabled();
    const generateResponse = page.waitForResponse((resp) => resp.url().includes('/api/generate'));
    await generateBtn.click();
    const genResp = await generateResponse;
    const genJson = await genResp.json();
    if (!genResp.ok() || !genJson?.success) {
      throw new Error(genJson?.error || `Generate failed with status ${genResp.status()}`);
    }

    const successModal = page.locator('#success-modal');
    await expect(successModal).toBeVisible();
    await expect(page.locator('#success-message')).toContainText(SERVER_NAME);
  });
});
