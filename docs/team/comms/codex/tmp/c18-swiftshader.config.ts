import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import base from '../../../../../playwright.config';
export default defineConfig({
  ...base,
  testDir: resolve(process.cwd(), 'tests/browser'),
  outputDir: resolve(process.cwd(), 'test-results/c18-swiftshader'),
  use: {
    ...base.use,
    channel: undefined,
    launchOptions: { args: ['--enable-gpu', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  webServer: { ...base.webServer, cwd: process.cwd() },
});
