import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/iphone',
  timeout: 60000,
  expect: { timeout: 15000 },
  workers: 1,
  use: {
    ...devices['iPhone 13'],
    baseURL: 'http://localhost:4175',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'iphone-webkit', use: { browserName: 'webkit' } }],
  webServer: {
    command: 'npm run preview:web -- --port 4175 --strictPort',
    url: 'http://localhost:4175',
    reuseExistingServer: !process.env.CI,
  },
});
