import { defineConfig, devices } from '@playwright/test';

const iphone15 = devices['iPhone 15'];
const pixel7 = devices['Pixel 7'];

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'iphone-15-webkit',
      use: {
        ...iphone15,
        viewport: {
          width: iphone15.viewport.height,
          height: iphone15.viewport.width,
        },
      },
    },
    {
      name: 'pixel-7-chromium',
      use: {
        ...pixel7,
        viewport: {
          width: pixel7.viewport.height,
          height: pixel7.viewport.width,
        },
      },
    },
  ],
});
