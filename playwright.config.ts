import dotenv from 'dotenv';
import { defineConfig } from '@playwright/test';

dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    headless: true,
  },
});
