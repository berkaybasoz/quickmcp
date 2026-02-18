import { test, expect } from '@playwright/test';

const SERVER_NAME = process.env.FTP_SERVER_NAME;
const FTP_HOST = process.env.FTP_HOST;
const FTP_PORT = process.env.FTP_PORT;
const FTP_USER = process.env.FTP_USER;
const FTP_PWD = process.env.FTP_PWD;

test.describe('FTP template', () => {
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

  test('generate FTP server via UI', async ({ page }) => {
    if (!SERVER_NAME || !FTP_HOST || !FTP_PORT || !FTP_USER || !FTP_PWD) {
      throw new Error('Missing FTP_* env vars in .env.test');
    }

    await page.goto('/');

    await page.locator('input[name="dataSourceType"][value="ftp"]').check({ force: true });

    await page.locator('#next-to-step-2:not([disabled])').click();
    await expect(page.locator('#wizard-step-2')).toBeVisible();
    await expect(page.locator('#ftp-section')).toBeVisible();

    await page.fill('#ftpHost', FTP_HOST);
    await page.fill('#ftpPort', FTP_PORT);
    await page.fill('#ftpUsername', FTP_USER);
    await page.fill('#ftpPassword', FTP_PWD);

    await page.locator('#next-to-step-3:not([disabled])').click();
    await expect(page.locator('#wizard-step-3')).toBeVisible();

    await page.locator('#next-to-step-4:not([disabled])').click();

    await page.fill('#serverName', SERVER_NAME);
    await page.fill('#serverDescription', 'SFTP test');

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
