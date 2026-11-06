import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('production beta loads assets and supports fallback play, export, resume and import', async ({
  page,
}, testInfo) => {
  test.slow();
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors: string[] = [],
    missing: string[] = [],
    assetUrls: string[] = [];
  let ollamaRequests = 0;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().includes('/assets/')) {
      assetUrls.push(response.url());
      if (response.status() >= 400) missing.push(response.url());
    }
  });
  await page.route('http://127.0.0.1:11434/**', (route) => {
    ollamaRequests++;
    return route.abort();
  });
  await page.goto('./');
  await expect(page.locator('#setup-dialog')).toBeVisible();
  await page.locator('#beta-notes summary').click();
  await expect(page.locator('#beta-notes-status')).toContainText('Development build');
  await page.locator('#setup-dialog').evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.screenshot({ path: 'artifacts/beta-title.png' });
  await page.getByRole('button', { name: 'Play without local AI', exact: true }).click();
  await expect(page.locator('#setup-dialog')).not.toBeVisible({ timeout: 60_000 });
  await expect(page.locator('#location-title')).toContainText('Aqualia');
  await expect(page.locator('#connection-label')).toContainText('FALLBACK');
  await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.locator('#build-stamp')).toContainText(/[a-f0-9]{40}/);
  await page.screenshot({ path: 'artifacts/beta-settings.png' });
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export save', exact: true }).click();
  const download = await downloadPromise;
  const contents = await readFile((await download.path())!, 'utf8');
  const exported = JSON.parse(contents);
  expect(exported.version).toBe(9);
  expect(exported.build.sha).toMatch(/^[a-f0-9]{40}$/);
  expect(await page.locator('#build-stamp').textContent()).toContain(exported.build.sha);
  await page.locator('#import-input').setInputFiles({
    name: 'journey.json',
    mimeType: 'application/json',
    buffer: Buffer.from(contents),
  });
  await expect(page.locator('#toast')).toContainText(/import/i);
  await page.reload();
  await page.getByRole('button', { name: 'Resume without local AI', exact: true }).click();
  await expect(page.locator('#setup-dialog')).not.toBeVisible({ timeout: 60_000 });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Load checkpoint', exact: true }).click();
  await expect(page.locator('#toast')).toContainText(/restored|loaded/i);
  expect(ollamaRequests).toBe(0);
  expect(errors).toEqual([]);
  expect(missing).toEqual([]);
  const base = new URL(testInfo.project.use.baseURL!).pathname;
  expect(assetUrls.some((url) => url.endsWith('/catalog.json'))).toBe(true);
  expect(assetUrls.some((url) => /\.png$/.test(url))).toBe(true);
  expect(assetUrls.some((url) => /\.(?:woff2|ttf)$/.test(url))).toBe(true);
  expect(assetUrls.every((url) => new URL(url).pathname.startsWith(`${base}assets/`))).toBe(true);
});

test('failed connection keeps setup guidance and fallback entry available', async ({ page }) => {
  await page.route('http://127.0.0.1:11434/**', (route) => route.abort());
  await page.goto('./');
  await page.getByRole('button', { name: 'Connect & begin journey' }).click();
  await expect(page.locator('#setup-status')).toContainText('OLLAMA_ORIGINS=');
  await expect(page.locator('#setup-status')).toContainText('local-network access');
  await expect(
    page.getByRole('button', { name: 'Play without local AI', exact: true }),
  ).toBeEnabled();
});
