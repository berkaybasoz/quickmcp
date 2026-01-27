import { test, expect } from '@playwright/test';

const X_SERVER_NAME = process.env.X_SERVER_NAME;
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN;
const X_USERNAME = process.env.X_USERNAME;

test.describe('X template', () => {
  test.beforeEach(async ({ request }) => {
    if (!X_SERVER_NAME) return;
    try {
      await request.delete(`/api/servers/${encodeURIComponent(X_SERVER_NAME)}`);
    } catch {
      // ignore if missing
    }
  });

  test.afterEach(async ({ request }) => {
    if (!X_SERVER_NAME) return;
    try {
      //await request.delete(`/api/servers/${encodeURIComponent(X_SERVER_NAME)}`);
    } catch {
      // ignore if cleanup fails
    }
  });

  test('generate X server via UI', async ({ page }) => {
    if (!X_SERVER_NAME || !X_BEARER_TOKEN) {
      throw new Error('Missing X_SERVER_NAME/X_BEARER_TOKEN in .env.test');
    }

    await page.goto('/');

    await page.locator('input[name="dataSourceType"][value="x"]').check({ force: true });

    await page.locator('#next-to-step-2:not([disabled])').click();
    await expect(page.locator('#wizard-step-2')).toBeVisible();
    await expect(page.locator('#x-section')).toBeVisible();

    await page.fill('#xToken', X_BEARER_TOKEN);
    if (X_USERNAME) {
      await page.fill('#xUsername', X_USERNAME);
    }

    await page.locator('#next-to-step-3:not([disabled])').click();
    await expect(page.locator('#wizard-step-3')).toBeVisible();

    await page.locator('#next-to-step-4:not([disabled])').click();

    await page.fill('#serverName', X_SERVER_NAME);
    await page.fill('#serverDescription', 'X API test');

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
    await expect(page.locator('#success-message')).toContainText(X_SERVER_NAME);
  });
});
