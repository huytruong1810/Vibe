import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { migrateSave, type GameSave } from '../../src/domain/save-schema';
import { SceneRegistry } from '../../src/domain/scenes';
import { ResourceStore } from '../../src/domain/resources';
import { AuthoredWorldLoader } from '../../src/domain/authored-world';
import { readFileSync } from 'node:fs';

test('C20 paints, keeps, restores and hangs a palette painting on a hook', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const png = await readFile(new URL('../fixtures/painting-golden.png', import.meta.url));
  let generations = 0;
  await page.route('http://127.0.0.1:5899/**', async (route) => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const path = new URL(route.request().url()).pathname;
    if (path === '/sdapi/v1/sd-models')
      await route.fulfill({ json: [{ model_name: 'z_image_turbo-Q4_K' }], headers });
    else if (path === '/sdcpp/v1/img_gen') {
      generations++;
      expect(route.request().postDataJSON()).toMatchObject({
        width: 512,
        height: 352,
        batch_count: 1,
      });
      await route.fulfill({ json: { id: 'job_golden', status: 'queued' }, headers });
    } else if (path === '/sdcpp/v1/jobs/job_golden')
      await route.fulfill({
        json: { status: 'completed', result: { images: [{ b64_json: png.toString('base64') }] } },
        headers,
      });
    else throw Error(`Unexpected image route: ${path}`);
  });
  await page.addInitScript(() =>
    localStorage.setItem(
      'hearthwild-image-connection',
      JSON.stringify({ endpoint: 'http://127.0.0.1:5899', provider: 'sdcpp', unload: true }),
    ),
  );
  await page.goto('/?test=1');
  await page.getByRole('button', { name: 'Play without local AI', exact: true }).click();
  await expect(page.locator('#setup-dialog')).not.toBeVisible();
  const save: GameSave = await page.evaluate(() => (window as any).__hearthwild.checkpoint());
  save.inventory = [{ id: 'canvas', instance: `item:${++save.inventorySerial}` }, null];
  await page.locator('#settings-button').click();
  const before = await page.evaluate(() => (window as any).__hearthwild.frame().session);
  await page.locator('#import-input').setInputFiles({
    name: 'painting.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(save)),
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__hearthwild.frame().session))
    .not.toBe(before);
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await page.locator('#inventory-button').click();
  await page.locator('[data-carry-slot="0"] button[data-action="use"]').click();
  await expect(page.locator('#painting-dialog')).toBeVisible();
  await page.locator('#painting-prompt').fill('River reeds at dusk');
  await page.locator('input[name="painting-mood"][value="dusk"]').check();
  await page.locator('#painting-generate').click();
  await expect(page.locator('#painting-keep')).toBeVisible();
  await expect(page.locator('#painting-raw')).toBeVisible();
  await expect(page.locator('#painting-dialog')).toHaveAttribute('data-painted', 'true');
  const previewScale = await page.locator('#painting-palette').evaluate((canvas) => {
    const style = getComputedStyle(canvas),
      bounds = canvas.getBoundingClientRect();
    return {
      width: bounds.width - parseFloat(style.borderLeftWidth) - parseFloat(style.borderRightWidth),
      height:
        bounds.height - parseFloat(style.borderTopWidth) - parseFloat(style.borderBottomWidth),
    };
  });
  expect(previewScale).toEqual({ width: 48 * 4, height: 32 * 4 });
  expect(generations).toBe(1);
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/c20-painting-preview-1080p.png' });
  await page.locator('#painting-keep').click();
  await expect(page.locator('#painting-dialog')).not.toBeVisible();
  const kept: GameSave = await page.evaluate(() => (window as any).__hearthwild.checkpoint());
  const item = kept.inventory[0]!,
    painting = kept.artifacts.find((a) => a.id === item.artifact)!;
  expect(item.instance).toBe(save.inventory[0]!.instance);
  expect(item.id).toBe('painting');
  expect(painting).toMatchObject({
    kind: 'painting',
    status: 'ready',
    sealed: true,
    caption: 'River reeds at dusk',
    render: { model: 'z_image_turbo-Q4_K', provider: 'sdcpp', width: 512, height: 352, steps: 8 },
  });
  expect(painting.kind === 'painting' && painting.pixels).toHaveLength(1024);
  await page.locator('[data-carry-slot="0"] button[data-action="use"]').click();
  await expect(page.locator('#painting-dialog')).toBeVisible();
  await expect(page.locator('#painting-keep')).toBeHidden();
  await page.locator('#painting-close').click();
  const world = new AuthoredWorldLoader().load(
      JSON.parse(readFileSync('public/assets/generated/aqualia-region.json', 'utf8')),
    ).world,
    registry = new SceneRegistry(world, new ResourceStore(world));
  const home = registry.definitions.find(
      (scene) =>
        scene.village === 1 &&
        scene.props.some((prop) => prop.display?.accepts.includes('painting')),
    )!,
    hook = home.props.find((prop) => prop.display?.accepts.includes('painting'))!;
  registry.context(home.code);
  if (home.owner !== null && !kept.scenes.invitations.some((i) => i.owner === home.owner)) {
    kept.scenes.invitations.push({ owner: home.owner, untilDay: 7 });
  }
  if (!kept.scenes.states.some((state) => state.id === home.id))
    kept.scenes.states.push(
      JSON.parse(JSON.stringify(registry.snapshot().states.find((state) => state.id === home.id)!)),
    );
  Object.assign(
    kept.entities.records.find((body) => body.id === 0)!,
    { scene: home.code, x: hook.x, y: hook.y + 1 },
  );
  expect(() => migrateSave(kept)).not.toThrow();
  const previous = await page.evaluate(() => (window as any).__hearthwild.frame().session);
  await page.locator('#settings-button').click();
  await page.locator('#import-input').setInputFiles({
    name: 'kept-painting.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(kept)),
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__hearthwild.frame().session))
    .not.toBe(previous);
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  if (!(await page.locator('[data-carry-slot="0"] button[data-action="use"]').isVisible()))
    await page.locator('#inventory-button').click();
  await page.locator('[data-carry-slot="0"] button[data-action="use"]').click();
  await expect(page.locator('#painting-keep')).toBeHidden();
  await page.locator('#painting-hang').click();
  await expect(page.locator('#painting-dialog')).not.toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        (id) =>
          (window as any).__hearthwild.frame().placements.some((p: any) => p.artifactId === id),
        painting.id,
      ),
    )
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => (window as any).__hearthwild.stats().paintingTextures))
    .toBe(1);
  const hung: GameSave = await page.evaluate(() => (window as any).__hearthwild.checkpoint());
  expect(hung.inventory[0]).toBeNull();
  expect(hung.placements.find((placement) => placement.artifactId === painting.id)).toMatchObject({
    propId: hook.id,
    sceneId: home.id,
  });
  if (await page.locator('[data-carry-slot="0"]').isVisible())
    await page.locator('#inventory-button').click();
  await page.screenshot({ path: 'artifacts/c20-painting-hook-1080p.png' });
  expect(errors).toEqual([]);
});
test('C20 resumes a pending brief after reload only after cancelling the previous native job', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const png = await readFile(new URL('../fixtures/painting-golden.png', import.meta.url));
  const events: string[] = [];
  let submissions = 0,
    cancelled = false;
  await page.route('http://127.0.0.1:5899/**', async (route) => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    const path = new URL(route.request().url()).pathname;
    if (path === '/sdapi/v1/sd-models') {
      await route.fulfill({ headers, json: [{ model_name: 'z_image_turbo-Q4_K' }] });
      return;
    }
    events.push(path);
    if (path === '/sdcpp/v1/img_gen') {
      submissions++;
      if (submissions === 2) expect(cancelled).toBe(true);
      await route.fulfill({ headers, json: { id: `job_${submissions}`, status: 'queued' } });
    } else if (path === '/sdcpp/v1/jobs/job_1/cancel') {
      cancelled = true;
      await route.fulfill({ headers, json: { status: 'cancelled' } });
    } else if (path === '/sdcpp/v1/jobs/job_1')
      await route.fulfill({ headers, json: { status: cancelled ? 'cancelled' : 'generating' } });
    else if (path === '/sdcpp/v1/jobs/job_2')
      await route.fulfill({
        headers,
        json: { status: 'completed', result: { images: [{ b64_json: png.toString('base64') }] } },
      });
    else throw Error(`Unexpected painting recovery route: ${path}`);
  });
  await page.addInitScript(() =>
    localStorage.setItem(
      'hearthwild-image-connection',
      JSON.stringify({ endpoint: 'http://127.0.0.1:5899', provider: 'sdcpp', unload: true }),
    ),
  );
  await page.goto('/?test=1');
  await page.getByRole('button', { name: 'Play without local AI', exact: true }).click();
  await expect(page.locator('#setup-dialog')).not.toBeVisible();
  const save: GameSave = await page.evaluate(() => (window as any).__hearthwild.checkpoint());
  save.inventory = [{ id: 'canvas', instance: `item:${++save.inventorySerial}` }, null];
  await page.locator('#settings-button').click();
  const old = await page.evaluate(() => (window as any).__hearthwild.frame().session);
  await page.locator('#import-input').setInputFiles({
    name: 'pending.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(save)),
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__hearthwild.frame().session))
    .not.toBe(old);
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await page.locator('#inventory-button').click();
  await page.locator('[data-carry-slot="0"] button[data-action="use"]').click();
  await page.locator('#painting-prompt').fill('River reeds at dawn');
  await page.locator('#painting-generate').click();
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('hearthwild-image-flight') ?? 'null')?.id,
      ),
    )
    .toBe('job_1');
  const pending: GameSave = await page.evaluate(() => (window as any).__hearthwild.checkpoint());
  const id = pending.inventory[0]!.artifact!;
  await page.reload();
  await page.getByRole('button', { name: 'Resume without local AI', exact: true }).click();
  await expect(page.locator('#setup-dialog')).not.toBeVisible();
  await expect.poll(() => submissions).toBe(2);
  await page.locator('#inventory-button').click();
  await page.locator('[data-carry-slot="0"] button[data-action="use"]').click();
  await expect(page.locator('#painting-keep')).toBeVisible();
  await expect(page.locator('#painting-prompt')).toHaveValue('River reeds at dawn');
  await expect(page.locator('#painting-prompt')).toBeDisabled();
  expect(events.indexOf('/sdcpp/v1/jobs/job_1/cancel')).toBeLessThan(
    events.lastIndexOf('/sdcpp/v1/img_gen'),
  );
  const resumed: GameSave = await page.evaluate(() => (window as any).__hearthwild.checkpoint());
  expect(resumed.inventory[0]!.artifact).toBe(id);
  expect(resumed.artifacts.find((a) => a.id === id)).toMatchObject({
    status: 'pending',
    brief: { subject: 'River reeds at dawn' },
  });
  await page.screenshot({ path: 'artifacts/c20-pending-reloaded-1080p.png' });
  await page.locator('#painting-keep').click();
  await expect(page.locator('#painting-dialog')).not.toBeVisible();
  await expect(page.locator('.painting-thumbnail')).toBeVisible();
  await page.screenshot({ path: 'artifacts/c20-inventory-thumbnail-1080p.png' });
});
