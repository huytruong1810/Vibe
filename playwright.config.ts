import { defineConfig } from '@playwright/test';
const beta = process.argv.includes('--project=beta');
const base = process.env.PLAYWRIGHT_BASE_PATH ?? process.env.VITE_BASE_PATH ?? '/';
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid Playwright port');

export default defineConfig({
  testDir: './tests/browser',
  projects: [
    { name: 'journeys', testIgnore: 'beta.spec.ts' },
    { name: 'beta', testMatch: 'beta.spec.ts' },
  ],
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: `http://127.0.0.1:${port}${base}`,
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    channel:
      process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === 'win32' ? 'chrome' : undefined),
    launchOptions: process.env.CI ? { args: ['--enable-unsafe-swiftshader'] } : {},
  },
  webServer: {
    command: `npm run ${beta ? 'preview' : 'dev'} -- --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}${base}`,
    reuseExistingServer: !beta && !process.env.CI,
  },
  reporter: process.env.CI ? [['list'], ['github']] : [['list']],
});
