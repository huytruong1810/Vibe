import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFile, copyFile, rm, mkdir } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { TileFlag, Fluid } from '../../src/domain/world';
import { SimulationHost } from '../../src/domain/simulation';
import type { GameSave } from '../../src/domain/save-schema';

let folder: string;
test.beforeAll(async () => {
  execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'scripts/terrain-proof.ts'], {
    timeout: 120000,
  });
  folder = JSON.parse(await readFile('.cache/c11b-proof.json', 'utf8')).folder;
  if (!resolve(folder).startsWith(resolve('.cache/c11b-proof-')))
    throw Error('Invalid fixture root');
});
test.afterAll(async () => {
  if (folder && resolve(folder).startsWith(resolve('.cache/c11b-proof-')))
    await rm(folder, { recursive: true, force: true });
});
test('golden terrain variants and water masks load in the live renderer without production activation', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  const catalog = await readFile(join(folder, 'catalog.json'));
  await page.route('**/assets/generated/catalog.json', (route) =>
    route.fulfill({ contentType: 'application/json', body: catalog }),
  );
  const loaded = new Set<string>();
  await page.route('**/assets/c11b/*', async (route) => {
    const name = basename(new URL(route.request().url()).pathname);
    loaded.add(name);
    await route.fulfill({
      contentType: name.endsWith('.png') ? 'image/png' : 'application/json',
      body: await readFile(join(folder, name)),
    });
  });
  await page.route('http://127.0.0.1:11434/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        route.request().url().endsWith('/api/tags')
          ? { models: [{ name: 'qwen2.5:3b', size: 1 }] }
          : { message: { content: JSON.stringify({ ready: true }) } },
      ),
    }),
  );
  await page.goto('/?test=1');
  await page.getByRole('button', { name: 'Connect & begin journey' }).click();
  await expect(page.locator('#setup-dialog')).not.toBeVisible({ timeout: 30000 });
  const save = await page.evaluate(() =>
    (
      window as unknown as { __hearthwild: { checkpoint(): Promise<GameSave> } }
    ).__hearthwild.checkpoint(),
  );
  const fixtureHost = new SimulationHost(save.seed, save.player.origin, 0);
  const world = fixtureHost.world;
  const player = save.entities.records.find((e) => e.id === 0)!;
  let best: { x: number; y: number; distance: number } | undefined;
  for (let y = 264; y <= 300; y++)
    for (let x = 246; x <= 282; x++) {
      const i = world.index(x, y);
      if (world.fluid[i] !== Fluid.Freshwater || world.flags[i]! & (TileFlag.Road | TileFlag.Ice))
        continue;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const lx = x + dx!,
          ly = y + dy!,
          li = world.index(lx, ly),
          distance = (lx - 264) ** 2 + (ly - 282) ** 2;
        if (
          !world.fluid[li] &&
          !(world.flags[li]! & TileFlag.Solid) &&
          (!best || distance < best.distance)
        )
          best = { x: lx, y: ly, distance };
      }
    }
  expect(best).toBeDefined();
  player.x = best!.x + 0.5;
  player.y = best!.y + 0.5;
  fixtureHost.dispose();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('#import-input').setInputFiles({
    name: 'terrain-proof.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(save)),
  });
  await expect(page.locator('#toast')).toContainText('imported', { timeout: 15000 });
  await page.keyboard.press('Escape');
  await expect.poll(() => [...loaded].some((n) => n.endsWith('.png'))).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          (
            window as unknown as { __hearthwild: { frame(): { player: { x: number; y: number } } } }
          ).__hearthwild.frame().player.x,
      ),
    )
    .toBeCloseTo(player.x, 0);
  await expect(page.locator('#toast')).not.toBeVisible({ timeout: 10000 });
  await mkdir('docs/team/comms/codex/tmp', { recursive: true });
  await page.screenshot({ path: 'docs/team/comms/codex/tmp/c11b-live-terrain-1080.png' });
  await copyFile(
    join(folder, 'village.png'),
    'docs/team/comms/codex/tmp/c11b-authored-village.png',
  );
  await copyFile(
    join(folder, 'village-screen.png'),
    'docs/team/comms/codex/tmp/c11b-authored-screen.png',
  );
  expect(errors).toEqual([]);
  // The real catalog has not gained fixture pages or appearances.
  expect((await readFile('public/assets/generated/catalog.json', 'utf8')).includes('c11b_')).toBe(
    false,
  );
});
