import { test, expect } from '@playwright/test';

const GITHUB_SERVER_NAME = process.env.GITHUB_SERVER_NAME;
const GITHUB_TOKEN = process.env.GITHUB_TEST_TOKEN;
test.describe('GitHub template', () => {
  test.beforeEach(async ({ request }) => {
    if (!GITHUB_SERVER_NAME) return;
    try {
      await request.delete(`/api/servers/${encodeURIComponent(GITHUB_SERVER_NAME)}`);
    } catch {
      // ignore if missing
    }
  });

  test.afterEach(async ({ request }) => {
    if (!GITHUB_SERVER_NAME) return;
    try {
      //await request.delete(`/api/servers/${encodeURIComponent(GITHUB_SERVER_NAME)}`);
    } catch {
      // ignore if cleanup fails
    }
  });

  test('generate GitHub server via UI', async ({ page }) => {

    if (!GITHUB_TOKEN || !GITHUB_SERVER_NAME) {
      throw new Error('Missing GITHUB_TEST_TOKEN/GITHUB_SERVER_NAME env var');
    }

    await page.goto('/');

    await page.locator('input[name="dataSourceType"][value="github"]').check({ force: true });

    await page.locator('#next-to-step-2:not([disabled])').click();
    await expect(page.locator('#wizard-step-2')).toBeVisible();
    await expect(page.locator('#github-section')).toBeVisible();

    await page.fill('#githubToken', GITHUB_TOKEN);

    await page.locator('#next-to-step-3:not([disabled])').click();
    await expect(page.locator('#wizard-step-3')).toBeVisible();

    await page.locator('#next-to-step-4:not([disabled])').click();

    await page.fill('#serverName', GITHUB_SERVER_NAME);
    await page.fill('#serverDescription', 'GitHub token test');

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
    await expect(page.locator('#success-message')).toContainText(GITHUB_SERVER_NAME);
  });
});
