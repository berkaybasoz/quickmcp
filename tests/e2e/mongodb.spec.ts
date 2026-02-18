import { test, expect } from '@playwright/test';

const SERVER_NAME = process.env.MONGODB_SERVER_NAME;
const MONGO_HOST = process.env.MONGODB_HOST;
const MONGO_PORT = process.env.MONGODB_PORT;
const MONGO_DB = process.env.MONGODB_DB;
const MONGO_USER = process.env.MONGODB_USER;
const MONGO_PWD = process.env.MONGODB_PWD;

test.describe('MongoDB template', () => {
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

  test('generate MongoDB server via UI', async ({ page }) => {
    if (!SERVER_NAME || !MONGO_HOST || !MONGO_PORT || !MONGO_DB || !MONGO_USER || !MONGO_PWD) {
      throw new Error('Missing MONGODB_* env vars in .env.test');
    }

    await page.goto('/');

    await page.locator('input[name="dataSourceType"][value="mongodb"]').check({ force: true });

    await page.locator('#next-to-step-2:not([disabled])').click();
    await expect(page.locator('#wizard-step-2')).toBeVisible();
    await expect(page.locator('#mongodb-section')).toBeVisible();

    await page.fill('#mongoHost', MONGO_HOST);
    await page.fill('#mongoPort', MONGO_PORT);
    await page.fill('#mongoDatabase', MONGO_DB);
    await page.fill('#mongoUsername', MONGO_USER);
    await page.fill('#mongoPassword', MONGO_PWD);

    await page.locator('#next-to-step-3:not([disabled])').click();
    await expect(page.locator('#wizard-step-3')).toBeVisible();

    await page.locator('#next-to-step-4:not([disabled])').click();

    await page.fill('#serverName', SERVER_NAME);
    await page.fill('#serverDescription', 'MongoDB test');

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
