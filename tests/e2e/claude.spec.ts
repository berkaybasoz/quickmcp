import { test, expect } from '@playwright/test';

const CLAUDE_SERVER_NAME = process.env.CLAUDE_SERVER_NAME;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

test.describe('Claude template', () => {
  test.beforeEach(async ({ request }) => {
    if (!CLAUDE_SERVER_NAME) return;
    try {
      await request.delete(`/api/servers/${encodeURIComponent(CLAUDE_SERVER_NAME)}`);
    } catch {
      // ignore if missing
    }
  });

  test.afterEach(async ({ request }) => {
    if (!CLAUDE_SERVER_NAME) return;
    try {
      //await request.delete(`/api/servers/${encodeURIComponent(CLAUDE_SERVER_NAME)}`);
    } catch {
      // ignore if cleanup fails
    }
  });

  test('generate Claude server via UI', async ({ page }) => {
    if (!CLAUDE_SERVER_NAME || !CLAUDE_API_KEY) {
      throw new Error('Missing CLAUDE_SERVER_NAME/CLAUDE_API_KEY in .env.test');
    }

    await page.goto('/');

    await page.locator('input[name="dataSourceType"][value="claude"]').check({ force: true });

    await page.locator('#next-to-step-2:not([disabled])').click();
    await expect(page.locator('#wizard-step-2')).toBeVisible();
    await expect(page.locator('#claude-section')).toBeVisible();

    await page.fill('#claudeApiKey', CLAUDE_API_KEY);

    await page.locator('#next-to-step-3:not([disabled])').click();
    await expect(page.locator('#wizard-step-3')).toBeVisible();

    await page.locator('#next-to-step-4:not([disabled])').click();

    await page.fill('#serverName', CLAUDE_SERVER_NAME);
    await page.fill('#serverDescription', 'Claude API test');

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
    await expect(page.locator('#success-message')).toContainText(CLAUDE_SERVER_NAME);
  });
});
