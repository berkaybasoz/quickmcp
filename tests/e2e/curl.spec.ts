import { test, expect } from '@playwright/test';

const CURL_SERVER_NAME = process.env.CURL_SERVER_NAME;
const CURL_COMMAND = process.env.CURL_COMMAND;

test.describe('cURL template', () => {
  test.beforeEach(async ({ request }) => {
    if (!CURL_SERVER_NAME) return;
    try {
      await request.delete(`/api/servers/${encodeURIComponent(CURL_SERVER_NAME)}`);
    } catch {
      // ignore if missing
    }
  });

  test.afterEach(async ({ request }) => {
    if (!CURL_SERVER_NAME) return;
    try {
      //await request.delete(`/api/servers/${encodeURIComponent(CURL_SERVER_NAME)}`);
    } catch {
      // ignore if cleanup fails
    }
  });

  test('generate cURL server via UI', async ({ page }) => {
    if (!CURL_SERVER_NAME || !CURL_COMMAND) {
      throw new Error('Missing CURL_SERVER_NAME/CURL_COMMAND in .env.test');
    }

    await page.goto('/');

    await page.locator('input[name="dataSourceType"][value="curl"]').check({ force: true });

    await page.locator('#next-to-step-2:not([disabled])').click();
    await expect(page.locator('#wizard-step-2')).toBeVisible();
    await expect(page.locator('#curl-section')).toBeVisible();

    await page.fill('#curlToolAlias', 'binance');
    await page.locator('#curlCommand').fill(CURL_COMMAND);

    await page.locator('#next-to-step-3:not([disabled])').click();
    await expect(page.locator('#wizard-step-3')).toBeVisible();

    await page.locator('#next-to-step-4:not([disabled])').click();

    await page.fill('#serverName', CURL_SERVER_NAME);
    await page.fill('#serverDescription', 'cURL binance test');

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
    await expect(page.locator('#success-message')).toContainText(CURL_SERVER_NAME);
  });
});
