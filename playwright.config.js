import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';
const executablePath = process.env.CHROMIUM_PATH?.trim();
const specialSuites = /(?:browser-contract-workflows|staging-live-workflows)\.spec\.js/;
const sharedUse = {
  baseURL,
  trace: 'retain-on-failure',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  serviceWorkers: 'allow',
  locale: 'en-US',
};

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 2 : 1,
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/playwright', open: 'never' }],
    ['json', { outputFile: 'reports/playwright/results.json' }],
  ],
  outputDir: 'reports/playwright-artifacts',
  use: sharedUse,
  projects: [
    {
      name: 'desktop-chromium',
      testIgnore: specialSuites,
      use: {
        ...devices['Desktop Chrome'],
        ...(executablePath
          ? { launchOptions: { executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] } }
          : {}),
      },
    },
    { name: 'desktop-firefox', testIgnore: specialSuites, use: { ...devices['Desktop Firefox'] } },
    { name: 'desktop-webkit', testIgnore: specialSuites, use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chromium', testIgnore: specialSuites, use: { ...devices['Pixel 7'] } },
    { name: 'mobile-webkit', testIgnore: specialSuites, use: { ...devices['iPhone 14'] } },
    {
      name: 'reduced-motion',
      testIgnore: specialSuites,
      use: { ...devices['Desktop Chrome'], reducedMotion: 'reduce' },
    },
    {
      name: 'arabic-rtl',
      testIgnore: specialSuites,
      use: { ...devices['Desktop Chrome'], locale: 'ar-LY' },
    },
    {
      name: 'browser-contract-chromium',
      testMatch: /browser-contract-workflows\.spec\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'staging-live-chromium',
      testMatch: /staging-live-workflows\.spec\.js/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: undefined,
});
