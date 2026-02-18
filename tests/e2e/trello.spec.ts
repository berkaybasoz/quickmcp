import { test, expect } from '@playwright/test';

const SERVER_NAME = process.env.TRELLO_SERVER_NAME;
const BASE_URL = process.env.TRELLO_BASE_URL;
const API_KEY = process.env.TRELLO_API_KEY;
const API_TOKEN = process.env.TRELLO_API_TOKEN;
const MEMBER_ID = process.env.TRELLO_MEMBER_ID;

test.describe('Trello template', () => {
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

  test('generate Trello server via UI', async ({ page }) => {
    if (!SERVER_NAME || !BASE_URL || !API_KEY || !API_TOKEN || !MEMBER_ID) {
      throw new Error('Missing TRELLO_* env vars in .env.test');
    }

    await page.goto('/');

    await page.locator('input[name="dataSourceType"][value="trello"]').check({ force: true });

    await page.locator('#next-to-step-2:not([disabled])').click();
    await expect(page.locator('#wizard-step-2')).toBeVisible();
    await expect(page.locator('#trello-section')).toBeVisible();

    await page.fill('#trelloBaseUrl', BASE_URL);
    await page.fill('#trelloApiKey', API_KEY);
    await page.fill('#trelloApiToken', API_TOKEN);
    await page.fill('#trelloMemberId', MEMBER_ID);

    await page.locator('#next-to-step-3:not([disabled])').click();
    await expect(page.locator('#wizard-step-3')).toBeVisible();

    await page.locator('#next-to-step-4:not([disabled])').click();

    await page.fill('#serverName', SERVER_NAME);
    await page.fill('#serverDescription', 'Trello test');

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
