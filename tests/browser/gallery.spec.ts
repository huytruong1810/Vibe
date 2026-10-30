import { expect, test } from '@playwright/test';

test('art review is independent of Ollama and preserves missing identities and facings', async ({
  page,
}) => {
  const errors: string[] = [];
  let inferenceRequests = 0;
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().includes(':11434')) inferenceRequests++;
  });
  await page.goto('/?gallery=1');
  await expect(page.getByRole('heading', { name: 'Aqualia, in the making.' })).toBeVisible();
  await expect(page.locator('#setup-dialog')).toHaveCount(0);
  await page.getByLabel('Entity group').selectOption('species');
  await page.getByLabel('Identity', { exact: true }).selectOption('species:rivallie');
  await page.getByLabel('Animation', { exact: true }).selectOption('walk');
  await page.getByLabel('Facing', { exact: true }).selectOption('s');
  await expect(page.locator('#art-frame-label')).toContainText('Frame 1 /');
  await page.getByRole('button', { name: 'Next frame', exact: true }).click();
  await expect(page.locator('#art-frame-label')).toContainText('Frame 2 /');
  await expect(page.locator('#art-frame')).toHaveAttribute('aria-busy', 'false');
  await page.screenshot({ path: 'artifacts/hd-gallery-rivallie.png', fullPage: true });
  await expect(page.getByLabel('Eight-direction comparison').locator('figure')).toHaveCount(8);
  await page.getByLabel('Facing', { exact: true }).selectOption('ne');
  await expect(page.locator('#art-status')).toContainText('missing');
  await expect(page.locator('#art-frame-label')).toHaveText('No frames for this selection');
  await page.getByLabel('Entity group').selectOption('npc');
  await page.getByLabel('Identity', { exact: true }).selectOption('npc:npc:neris');
  await expect(page.locator('#art-status')).toContainText('missing identity artwork');
  await expect(page.locator('#art-metadata')).toContainText('npc:neris');
  await page.screenshot({ path: 'artifacts/hd-gallery-missing-neris.png', fullPage: true });
  expect(inferenceRequests).toBe(0);
  expect(errors).toEqual([]);
});

test('art review reports catalog loading failures accessibly', async ({ page }) => {
  await page.route('**/assets/generated/catalog.json', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  );
  await page.goto('/?gallery=1');
  await expect(page.getByRole('alert')).toContainText('Catalog request failed (503)');
  await expect(page.getByRole('link', { name: 'Return to the game' })).toBeVisible();
});

test('art review reports an unreadable atlas page without substituting artwork', async ({
  page,
}) => {
  await page.route('**/assets/generated/*.png', (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  );
  await page.goto('/?gallery=1');
  await expect(page.getByRole('alert')).toContainText('Could not decode atlas image');
  await expect(page.locator('#art-metadata')).toContainText('aqualia');
});

test('review controls and native board fit a smaller desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/?gallery=1');
  await expect(page.getByRole('heading', { name: 'Native 1080p review board' })).toBeVisible();
  await page.getByLabel('Entity group').focus();
  await expect(page.getByLabel('Entity group')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Identity', { exact: true })).toBeFocused();
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
    native: [
      document.querySelector<HTMLCanvasElement>('#art-scene')!.width,
      document.querySelector<HTMLCanvasElement>('#art-scene')!.height,
    ],
  }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.client);
  expect(dimensions.native).toEqual([1920, 1080]);
});
