import dotenv from 'dotenv';
import { defineConfig } from '@playwright/test';

dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120000,
  globalSetup: './tests/e2e/global-setup.ts',
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    headless: true,
    storageState: 'playwright/.auth/user.json',
  },
  projects: [
    {
      name: 'e2e',
      testMatch: '**/*.spec.ts',
      testIgnore: ['**/mssql.spec.ts'],
      workers: 10,
    },
    {
      name: 'mssql',
      testMatch: ['**/mssql.spec.ts'],
      workers: 1,
    },
  ],
});
