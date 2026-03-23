import { test, expect } from '@playwright/test';
import { deleteServerByName } from './helpers/server-cleanup';

const SERVER_NAME = process.env.REDIS_SERVER_NAME || 'e2e-redis-template';
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT || '6379';
const REDIS_DB = process.env.REDIS_DB || '0';
const REDIS_USER = process.env.REDIS_USER || '';
const REDIS_PASSWORD = process.env.REDIS_PWD || '';

test.describe('Redis template', () => {
  test.beforeEach(async ({ request }) => {
    try {
      await deleteServerByName(request, SERVER_NAME);
    } catch {
      // ignore if missing
    }
  });

  test.afterEach(async ({ request }) => {
    try {
      // await deleteServerByName(request, SERVER_NAME);
    } catch {
      // ignore if cleanup fails
    }
  });

  test('generate Redis server via UI with grouped tool selection', async ({ page }) => {
    await page.goto('/');

    await page.locator('input[name="dataSourceType"][value="redis"]').check({ force: true });

    await page.locator('#next-to-step-2:not([disabled])').click();
    await expect(page.locator('#wizard-step-2')).toBeVisible();
    await expect(page.locator('#database-section')).toBeVisible();

    await page.fill('#dbHost', REDIS_HOST);
    await page.fill('#dbPort', REDIS_PORT);
    await page.fill('#dbName', REDIS_DB);
    await page.fill('#dbUser', REDIS_USER);
    await page.fill('#dbPassword', REDIS_PASSWORD);

    await page.locator('#next-to-step-3:not([disabled])').click();
    await page.waitForResponse((resp) => resp.url().includes('/api/parse') && resp.ok());

    await expect(page.locator('#wizard-step-3')).toBeVisible();
    await expect(page.locator('h3:has-text("Configure Redis Tool Groups")')).toBeVisible();
    await expect(page.locator('#redis-group-tools-1')).toBeHidden(); // MAPS panel default collapsed

    await page.locator('button:has(#redis-group-icon-1)').click();
    await expect(page.locator('#redis-group-tools-1')).toBeVisible();

    await page.locator('#redis-tool-1-0').uncheck({ force: true }); // list_maps
    await page.locator('#redis-group-select-2').uncheck({ force: true }); // disable QUEUES group
    await expect(page.locator('#redis-group-tools-2 input[data-tool-name]').first()).toBeDisabled();

    await page.locator('#next-to-step-4:not([disabled])').click();

    await page.fill('#serverName', SERVER_NAME);
    await page.fill('#serverDescription', 'Redis grouped tool selection e2e test');

    const generateRequest = page.waitForRequest((req) => req.url().includes('/api/generate') && req.method() === 'POST');
    const generateResponse = page.waitForResponse((resp) => resp.url().includes('/api/generate'));

    const generateBtn = page.locator('#generateBtn');
    await expect(generateBtn).toBeEnabled();
    await generateBtn.click();

    const genReq = await generateRequest;
    const reqPayload = genReq.postDataJSON() as any;
    const selectedTables = Array.isArray(reqPayload?.selectedTables) ? reqPayload.selectedTables : [];
    const mapsEntry = selectedTables.find((entry: any) => entry?.tableName === 'MAPS');
    const queuesEntry = selectedTables.find((entry: any) => entry?.tableName === 'QUEUES');

    expect(mapsEntry).toBeTruthy();
    expect(Array.isArray(mapsEntry?.selectedToolNames)).toBeTruthy();
    expect(mapsEntry?.selectedToolNames).not.toContain('list_maps');
    expect(queuesEntry).toBeFalsy();

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
