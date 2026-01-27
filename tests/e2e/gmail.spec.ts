import { test, expect } from '@playwright/test';

const SERVER_NAME = process.env.GMAIL_SERVER_NAME;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PWD = process.env.GMAIL_PWD;

test.describe('Gmail template', () => {
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

  test('generate Gmail server via UI', async ({ page }) => {
    if (!SERVER_NAME || !GMAIL_USER || !GMAIL_PWD) {
      throw new Error('Missing GMAIL_SERVER_NAME/GMAIL_USER/GMAIL_PWD in .env.test');
    }

    await page.goto('/');

    await page.locator('input[name="dataSourceType"][value="gmail"]').check({ force: true });

    await page.locator('#next-to-step-2:not([disabled])').click();
    await expect(page.locator('#wizard-step-2')).toBeVisible();
    await expect(page.locator('#gmail-section')).toBeVisible();

    await page.fill('#gmailUsername', GMAIL_USER);
    await page.fill('#gmailPassword', GMAIL_PWD);

    await page.locator('#next-to-step-3:not([disabled])').click();
    await expect(page.locator('#wizard-step-3')).toBeVisible();

    await page.locator('#next-to-step-4:not([disabled])').click();

    await page.fill('#serverName', SERVER_NAME);
    await page.fill('#serverDescription', 'Gmail template test');

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
