import { defineConfig, devices } from '@playwright/test';

const iphone15Landscape = devices['iPhone 15 landscape'];
const pixel7Landscape = devices['Pixel 7 landscape'];

export default defineConfig({
  testDir: './tests/e2e',
  // GitHub-hosted Linux runners use software WebGL for Chromium. A full
  // production boot plus reload can legitimately take well over 90 seconds.
  timeout: 240_000,
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['list'], ['html', { open: 'never' }]]
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
        ...iphone15Landscape,
      },
    },
    {
      name: 'pixel-7-chromium',
      use: {
        ...pixel7Landscape,
      },
    },
  ],
});
