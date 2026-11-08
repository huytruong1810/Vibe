import { expect, test } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

test('atlas review renders every catalog page and reports catalog and resident bytes separately', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const catalog = await (await page.request.get('/assets/generated/catalog.json')).json();
  const full = catalog.pages.reduce((sum: number, p: any) => sum + p.width * p.height * 4, 0);
  // Measure actual unique PNGs, independently of the catalog's per-page aliases.
  const halfImages = new Set<string>(
    catalog.pages.flatMap((p: any) =>
      p.variants.filter((v: any) => v.resolution === 0.5).map((v: any) => v.imageUrl),
    ),
  );
  let half = 0;
  for (const image of halfImages) {
    const png = await (await page.request.get(image)).body();
    half += png.readUInt32BE(16) * png.readUInt32BE(20) * 4;
  }
  await page.goto('/?gallery=1');
  await page.locator('#tab-atlas').click();
  await expect(page.locator('#atlas-page option')).toHaveCount(catalog.pages.length);
  await expect(page.locator('#art-stat-pages')).toHaveText(`${catalog.pages.length} pages`);
  await expect(page.locator('#art-stat-frames')).toHaveText(String(catalog.frames.length));
  await expect(page.locator('#art-stat-decoded-ram')).toHaveText(
    `Catalog page RGBA: ${(full / 1048576).toFixed(2)} MiB`,
  );
  await expect(page.locator('#art-stat-half')).toHaveText(`${(half / 1048576).toFixed(2)} MiB`);
  const hashes: string[] = [];
  for (const entry of catalog.pages) {
    await page.locator('#atlas-page').selectOption(entry.id);
    await expect(page.locator('#art-atlas-canvas')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('#art-atlas-canvas')).toHaveAttribute('width', String(entry.width));
    await expect(page.locator('#art-atlas-canvas')).toHaveAttribute('height', String(entry.height));
    await expect(page.locator('#atlas-status')).toHaveText(
      `${entry.id}: ${entry.width} × ${entry.height}`,
    );
    hashes.push(
      await page.locator('#art-atlas-canvas').evaluate(async (node) => {
        const canvas = node as HTMLCanvasElement,
          bytes = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
        if (!bytes.some((v, n) => n % 4 === 3 && v > 0))
          throw Error('Atlas page has no rendered pixels');
        return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      }),
    );
  }
  expect(new Set(hashes).size).toBe(catalog.pages.length);
  const residentMiB = Number(
    (await page.locator('#art-stat-resident').innerText()).match(/: ([\d.]+) \//)![1],
  );
  expect(residentMiB).toBeGreaterThan(0);
  expect(residentMiB).toBeLessThanOrEqual(128);
  await writeFile(
    'artifacts/c3g-atlas.json',
    JSON.stringify(
      {
        pages: catalog.pages.map((p: any, n: number) => ({
          id: p.id,
          width: p.width,
          height: p.height,
          canvasSha256: hashes[n],
        })),
        frames: catalog.frames.length,
        fullBytes: full,
        halfBytes: half,
        residentMiB,
        pageCacheLimitMiB: 128,
      },
      null,
      2,
    ),
  );
  await page.locator('#atlas-zoom').selectOption('0.5');
  await page.locator('#view-atlas').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'artifacts/c3g-atlas-budget-1080p.png' });
  await page.locator('#art-atlas-canvas').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'artifacts/c3g-atlas-last-page-1080p.png' });
});

test('atlas page failures clear stale pixels and report the selected page accessibly', async ({
  page,
}) => {
  const catalog = await (await page.request.get('/assets/generated/catalog.json')).json(),
    last = catalog.pages.at(-1);
  await page.route(`**/${last.imageUrl.split('/').at(-1)}`, (route) =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  );
  await page.goto('/?gallery=1');
  await page.locator('#tab-atlas').click();
  await page.locator('#atlas-page').selectOption(last.id);
  await expect(page.locator('#atlas-status')).toHaveAttribute('role', 'alert');
  await expect(page.locator('#atlas-status')).toContainText('Could not decode atlas image');
  expect(
    await page.locator('#art-atlas-canvas').evaluate((node) => {
      const c = node as HTMLCanvasElement;
      return c
        .getContext('2d')!
        .getImageData(0, 0, c.width, c.height)
        .data.some((v, n) => n % 4 === 3 && v > 0);
    }),
  ).toBe(false);
});

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
  await page.getByLabel('Asset group').selectOption('species');
  await page.getByLabel('Identity', { exact: true }).selectOption('species:rivallie');
  await page.getByLabel('Animation', { exact: true }).selectOption('walk');
  await page.getByLabel('Facing', { exact: true }).selectOption('s');
  await expect(page.locator('#art-frame-label')).toContainText('Frame 1 /');
  await page.getByRole('button', { name: 'Next frame', exact: true }).click();
  await expect(page.locator('#art-frame-label')).toContainText('Frame 2 /');
  await expect(page.locator('#art-frame')).toHaveAttribute('aria-busy', 'false');
  await page.screenshot({ path: 'artifacts/hd-gallery-rivallie.png', fullPage: true });
  await expect(page.getByLabel('Eight-direction comparison').locator('figure')).toHaveCount(8);
  // Rivallie walks in all eight facings now; eat is a cardinal-only clip, so ne stays missing.
  await page.getByLabel('Animation', { exact: true }).selectOption('eat');
  await page.getByLabel('Facing', { exact: true }).selectOption('ne');
  await expect(page.locator('#art-status')).toContainText('missing');
  await expect(page.locator('#art-frame-label')).toHaveText('No frames for this selection');
  await page.getByLabel('Asset group').selectOption('npc');
  await page.getByLabel('Identity', { exact: true }).selectOption('npc:npc:vulkan');
  await expect(page.locator('#art-status')).toContainText('missing identity artwork');
  await expect(page.locator('#art-metadata')).toContainText('npc:vulkan');
  await page.screenshot({ path: 'artifacts/hd-gallery-missing-vulkan.png', fullPage: true });
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
  await page.locator('#tab-staging').click();
  await expect(page.getByLabel('Native 1920 by 1080 scene staging board')).toBeVisible();
  await page.locator('#tab-inspector').click();
  await page.getByLabel('Asset group').focus();
  await expect(page.getByLabel('Asset group')).toBeFocused();
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

test('environment and item frames retain static bounds without inventing directional clips', async ({
  page,
}) => {
  let inferenceRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes(':11434')) inferenceRequests++;
  });
  await page.goto('/?gallery=1');
  await page.getByLabel('Asset group').selectOption('environment');
  await page.getByLabel('Identity', { exact: true }).selectOption('environment:tree_oak');
  await expect(page.locator('#art-frame-label')).toContainText('Static frame');
  await expect(page.locator('#art-frame')).toHaveAttribute('aria-busy', 'false');
  await expect(page.locator('#art-status')).toContainText('native HD source');
  await expect(page.locator('#art-metadata')).toContainText('256 × 284 pixels');
  await expect(page.locator('#art-metadata')).toContainText('0.5, 0.9718 (normalized)');
  await expect(page.getByRole('heading', { name: 'Static asset registration' })).toBeVisible();
  await expect(page.getByLabel('Static asset comparison').locator('figure:visible')).toHaveCount(1);
  await expect(page.getByLabel('Facing', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Next frame', exact: true })).toBeDisabled();
  await page.screenshot({ path: 'artifacts/hd-gallery-environment.png', fullPage: true });
  await page.getByLabel('Asset group').selectOption('item');
  await page.getByLabel('Identity', { exact: true }).selectOption('item:berries');
  await expect(page.locator('#art-metadata')).toContainText('item · berries');
  await expect(page.locator('#art-frame-label')).toContainText('Static frame');
  await page.getByLabel('Asset group').selectOption('species');
  await page.getByLabel('Identity', { exact: true }).selectOption('species:rivallie');
  await expect(page.getByLabel('Facing', { exact: true })).toBeEnabled();
  await expect(page.getByLabel('Eight-direction comparison').locator('figure:visible')).toHaveCount(
    8,
  );
  expect(inferenceRequests).toBe(0);
});
