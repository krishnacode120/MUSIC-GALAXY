import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: 'galaxy.spec.ts',
  timeout: 60000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173',
    ...devices['Desktop Chrome'],
    channel: 'chrome',
    viewport: { width: 1440, height: 1000 },
    launchOptions: { args: ['--enable-unsafe-swiftshader'] },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: process.env.PLAYWRIGHT_BASE_URL
      ? 'npm run preview -- --port 4173 --strictPort'
      : 'npm run dev -- --port 5173 --strictPort',
    url: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
