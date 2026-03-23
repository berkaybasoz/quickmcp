import { test, expect } from '@playwright/test';
import { deleteServerByName } from './helpers/server-cleanup';

const SERVER_NAME = process.env.HAZELCAST_SERVER_NAME || 'e2e-hazelcast-template';
const HAZELCAST_HOST = process.env.HAZELCAST_HOST || '127.0.0.1';
const HAZELCAST_PORT = process.env.HAZELCAST_PORT || '5701';
const HAZELCAST_CLUSTER = process.env.HAZELCAST_CLUSTER || 'dev';
const HAZELCAST_USER = process.env.HAZELCAST_USER || '';
const HAZELCAST_PASSWORD = process.env.HAZELCAST_PWD || '';

test.describe('Hazelcast template', () => {
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

  test('generate Hazelcast server via UI with grouped tool selection', async ({ page }) => {
    await page.goto('/');

    await page.locator('input[name="dataSourceType"][value="hazelcast"]').check({ force: true });

    await page.locator('#next-to-step-2:not([disabled])').click();
    await expect(page.locator('#wizard-step-2')).toBeVisible();
    await expect(page.locator('#database-section')).toBeVisible();

    await page.fill('#dbHost', HAZELCAST_HOST);
    await page.fill('#dbPort', HAZELCAST_PORT);
    await page.fill('#dbName', HAZELCAST_CLUSTER);
    await page.fill('#dbUser', HAZELCAST_USER);
    await page.fill('#dbPassword', HAZELCAST_PASSWORD);

    await page.locator('#next-to-step-3:not([disabled])').click();
    await page.waitForResponse((resp) => resp.url().includes('/api/parse') && resp.ok());

    await expect(page.locator('#wizard-step-3')).toBeVisible();
    await expect(page.locator('h3:has-text("Configure Hazelcast Tool Groups")')).toBeVisible();
    await expect(page.locator('#hazelcast-group-tools-1')).toBeHidden(); // MAPS panel default collapsed

    await page.locator('button:has(#hazelcast-group-icon-1)').click();
    await expect(page.locator('#hazelcast-group-tools-1')).toBeVisible();

    await page.locator('#hazelcast-tool-1-0').uncheck({ force: true }); // list_maps
    await page.locator('#hazelcast-group-select-5').uncheck({ force: true }); // disable TOPICS group
    await expect(page.locator('#hazelcast-group-tools-5 input[data-tool-name]').first()).toBeDisabled();

    await page.locator('#next-to-step-4:not([disabled])').click();

    await page.fill('#serverName', SERVER_NAME);
    await page.fill('#serverDescription', 'Hazelcast grouped tool selection e2e test');

    const generateRequest = page.waitForRequest((req) => req.url().includes('/api/generate') && req.method() === 'POST');
    const generateResponse = page.waitForResponse((resp) => resp.url().includes('/api/generate'));

    const generateBtn = page.locator('#generateBtn');
    await expect(generateBtn).toBeEnabled();
    await generateBtn.click();

    const genReq = await generateRequest;
    const reqPayload = genReq.postDataJSON() as any;
    const selectedTables = Array.isArray(reqPayload?.selectedTables) ? reqPayload.selectedTables : [];
    const mapsEntry = selectedTables.find((entry: any) => entry?.tableName === 'MAPS');
    const topicsEntry = selectedTables.find((entry: any) => entry?.tableName === 'TOPICS');

    expect(mapsEntry).toBeTruthy();
    expect(Array.isArray(mapsEntry?.selectedToolNames)).toBeTruthy();
    expect(mapsEntry?.selectedToolNames).not.toContain('list_maps');
    expect(topicsEntry).toBeFalsy();

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
