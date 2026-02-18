import { test, expect } from '@playwright/test';

const JIRA_SERVER_NAME = process.env.JIRA_SERVER_NAME;
const JIRA_URL = process.env.JIRA_URL;
const JIRA_USER = process.env.JIRA_USER;
const JIRA_TOKEN = process.env.JIRA_TEST_TOKEN;
test.describe('Jira template', () => {
  test.beforeEach(async ({ request }) => {
    if (!JIRA_SERVER_NAME) return;
    try {
      await request.delete(`/api/servers/${encodeURIComponent(JIRA_SERVER_NAME)}`);
    } catch {
      // ignore if missing
    }
  });

  test.afterEach(async ({ request }) => {
    if (!JIRA_SERVER_NAME) return;
    try {
      //await request.delete(`/api/servers/${encodeURIComponent(JIRA_SERVER_NAME)}`);
    } catch {
      // ignore if cleanup fails
    }
  });

  test('generate Jira server via UI', async ({ page }) => {
    if (!JIRA_TOKEN || !JIRA_SERVER_NAME || !JIRA_URL || !JIRA_USER) {
      throw new Error('Missing JIRA_TEST_TOKEN/JIRA_SERVER_NAME/JIRA_URL/JIRA_USER in .env.test');
    }

    await page.goto('/');

    await page.locator('input[name="dataSourceType"][value="jira"]').check({ force: true });

    await page.locator('#next-to-step-2:not([disabled])').click();
    await expect(page.locator('#wizard-step-2')).toBeVisible();
    await expect(page.locator('#jira-section')).toBeVisible();

    await page.fill('#jiraHost', JIRA_URL);
    await page.fill('#jiraEmail', JIRA_USER);
    await page.fill('#jiraApiToken', JIRA_TOKEN);

    await page.locator('#next-to-step-3:not([disabled])').click();
    await expect(page.locator('#wizard-step-3')).toBeVisible();

    await page.locator('#next-to-step-4:not([disabled])').click();

    await page.fill('#serverName', JIRA_SERVER_NAME);
    await page.fill('#serverDescription', 'Jira softtech test');

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
    await expect(page.locator('#success-message')).toContainText(JIRA_SERVER_NAME);
  });
});
