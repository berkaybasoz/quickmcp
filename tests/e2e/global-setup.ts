import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import { chromium, FullConfig } from '@playwright/test';

dotenv.config({ path: '.env.test' });

function resolveLiteAdminFromEnv(): { username: string; password: string } | null {
  const raw = process.env.AUTH_ADMIN_USERS;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const first = parsed.find((item) => typeof item?.username === 'string' && typeof item?.password === 'string');
    if (!first) return null;
    return { username: String(first.username), password: String(first.password) };
  } catch {
    return null;
  }
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL =
    (config.projects[0]?.use as { baseURL?: string } | undefined)?.baseURL ||
    process.env.PLAYWRIGHT_BASE_URL ||
    'http://localhost:3000';

  const liteAdmin = resolveLiteAdminFromEnv();
  const username =
    process.env.E2E_AUTH_USERNAME ||
    process.env.AUTH_E2E_USERNAME ||
    liteAdmin?.username ||
    'admin';
  const password =
    process.env.E2E_AUTH_PASSWORD ||
    process.env.AUTH_E2E_PASSWORD ||
    liteAdmin?.password ||
    'admin123';

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });

  const meResponse = await context.request.get(`${baseURL.replace(/\/+$/, '')}/api/auth/me`);
  if (!meResponse.ok()) {
    await page.goto(`${baseURL.replace(/\/+$/, '')}/login`, { waitUntil: 'domcontentloaded' });

    const loginForm = page.locator('#loginForm');
    const oauthLogin = page.locator('#supabaseLogin');

    if (await oauthLogin.isVisible().catch(() => false)) {
      throw new Error(
        'E2E global setup detected SUPABASE_GOOGLE auth mode. Configure a LITE test environment or provide a non-interactive auth flow for tests.'
      );
    }

    if (!(await loginForm.isVisible().catch(() => false))) {
      throw new Error('E2E global setup could not find a visible login form at /login.');
    }

    await page.locator('#username').fill(username);
    await page.locator('#password').fill(password);
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
  }

  const authDir = path.join(process.cwd(), 'playwright', '.auth');
  await fs.mkdir(authDir, { recursive: true });
  await context.storageState({ path: path.join(authDir, 'user.json') });

  await context.close();
  await browser.close();
}
