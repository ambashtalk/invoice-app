import { defineConfig, devices } from '@playwright/test';
import { join } from 'path';

/**
 * Playwright configuration for Electron E2E testing
 * This config launches the Electron app and runs tests against the UI.
 * Requirement: The app must be built (npm run build) before running tests.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Electron tests should run sequentially to avoid DB lock issues
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
