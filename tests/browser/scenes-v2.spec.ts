import { test, expect, type Page } from '@playwright/test';
import type { GameSave } from '../../src/domain/save-schema';
import type { RenderSnapshot } from '../../src/domain/contracts';
import { SceneRegistry } from '../../src/domain/scenes';
import { ResourceStore } from '../../src/domain/resources';
import { WorldGenerator } from '../../src/domain/world';

type Api = { checkpoint(): Promise<GameSave>; frame(): RenderSnapshot };
async function snapshot(page: Page): Promise<GameSave> {
  return page.evaluate(() =>
    (window as unknown as { __hearthwild: Api }).__hearthwild.checkpoint(),
  );
}
async function scene(page: Page): Promise<string> {
  return page.evaluate(
    () => (window as unknown as { __hearthwild: Api }).__hearthwild.frame().scene.id,
  );
}
async function restore(page: Page, save: GameSave): Promise<void> {
  const session = await page.evaluate(
    () => (window as unknown as { __hearthwild: Api }).__hearthwild.frame().session,
  );
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('#import-input').setInputFiles({
    name: 'scene.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(save)),
  });
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __hearthwild: Api }).__hearthwild.frame().session,
      ),
    )
    .not.toBe(session);
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as unknown as { __hearthwild: Api }).__hearthwild.frame().paused.includes('menu'),
      ),
    )
    .toBe(false);
}

test('an interior preserves identity, physique, local map and an accessible exit through save/load', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.route('http://127.0.0.1:11434/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(
        route.request().url().endsWith('/api/tags')
          ? { models: [{ name: 'qwen2.5:3b', size: 1 }] }
          : { message: { content: JSON.stringify({ ready: true }) }, eval_count: 1 },
      ),
    }),
  );
  await page.goto('/?test=1');
  await page.getByRole('button', { name: 'Connect & begin journey' }).click();
  await expect(page.locator('#setup-dialog')).not.toBeVisible({ timeout: 30000 });
  const save = await snapshot(page),
    world = new WorldGenerator().generate(save.seed),
    registry = new SceneRegistry(world, new ResourceStore(world));
  const portal = registry.portals.find(
    (p) => p.source === 0 && p.owner === null && p.id.includes('aqualia:home:0'),
  )!;
  const body = save.entities.records.find((r) => r.id === 0)!;
  Object.assign(body, { x: portal.x, y: portal.y, heightMeters: Math.fround(1.85), massKg: 95 });
  await restore(page, save);
  await page.keyboard.press('e');
  await expect.poll(() => scene(page)).toBe(registry.id(portal.target));
  await page.keyboard.press('m');
  await expect(page.locator('#map-dialog')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Map breadcrumb' })).toContainText(portal.name);
  await page.getByRole('button', { name: 'Close map' }).click();
  const inside = await snapshot(page),
    savedBody = inside.entities.records.find((r) => r.id === 0)!;
  expect(savedBody.scene).toBe(portal.target);
  expect(savedBody.massKg).toBe(95);
  await restore(page, inside);
  expect(await scene(page)).toBe(registry.id(portal.target));
  const exit = registry.portals.find((p) => p.source === portal.target)!;
  const atExit = await snapshot(page);
  Object.assign(
    atExit.entities.records.find((r) => r.id === 0)!,
    { x: exit.x, y: exit.y },
  );
  await restore(page, atExit);
  await page.keyboard.press('e');
  await expect.poll(() => scene(page)).toBe('overworld');
  const final = await snapshot(page);
  expect(final.entities.records.filter((r) => r.id === 0)).toHaveLength(1);
  expect(final.entities.records.find((r) => r.id === 0)!.massKg).toBe(95);
  expect(errors).toEqual([]);
});
