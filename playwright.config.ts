import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 45000,
  expect: { timeout: 15000 },
  workers: 1,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1440, height: 1000 },
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
});
