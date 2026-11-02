import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';
import { migrateSave, type GameSave } from '../../src/domain/save-schema';
import type { RenderSnapshot } from '../../src/domain/contracts';

type Api = {
  frame(): RenderSnapshot;
  checkpoint(): Promise<GameSave>;
  command(c: unknown): Promise<{ ok: boolean; message: string }>;
};
async function enter(page: Page): Promise<void> {
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
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [
        'bar_hp',
        'bar_hp_fill',
        'bar_stamina_fill',
        'bar_xp_fill',
        'bar_need_fill',
        'slot_common',
        'minimap_ring',
      ].map(
        (name) =>
          new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(name));
            img.src = `/assets/generated/ui/${name}.png`;
          }),
      ),
    );
  });
}
async function checkpoint(page: Page): Promise<GameSave> {
  return page.evaluate(() =>
    (window as unknown as { __hearthwild: Api }).__hearthwild.checkpoint(),
  );
}
async function restore(page: Page, save: GameSave): Promise<void> {
  migrateSave(save);
  const session = await page.evaluate(
    () => (window as unknown as { __hearthwild: Api }).__hearthwild.frame().session,
  );
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('#import-input').setInputFiles({
    name: 'c8b.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(save)),
  });
  await expect(page.locator('#toast')).toContainText('imported', { timeout: 15000 });
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
async function bounded(page: Page, selectors: string[]): Promise<void> {
  for (const selector of selectors) {
    const box = await page.locator(selector).boundingBox();
    expect(box, selector).not.toBeNull();
    expect(box!.x, selector).toBeGreaterThanOrEqual(0);
    expect(box!.y, selector).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width, selector).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(box!.y + box!.height, selector).toBeLessThanOrEqual(page.viewportSize()!.height);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

test('kit meters are truthful at zero, partial and full; time and map remain distinct', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await enter(page);
  await expect(page.locator('#hud-day')).toHaveText('Day 1');
  await expect(page.locator('#hud-phase')).toHaveText('Dawn');
  await expect(page.locator('#clock')).toContainText('Mon');
  await expect(page.locator('#hud-weather')).not.toBeEmpty();
  for (const selector of ['#health-track', '#stamina-track', '#xp-track']) {
    const box = (await page.locator(selector).boundingBox())!;
    expect(box.width).toBe(168);
    expect(box.height).toBe(selector === '#xp-track' ? 12 : 18);
    expect(
      await page.locator(selector).evaluate((e) => getComputedStyle(e).borderImageSource),
    ).toContain('/bar_');
  }
  expect(await page.locator('.time-map').evaluate((e) => getComputedStyle(e).borderTopWidth)).toBe(
    '0px',
  );
  const day = (await page.locator('.time-panel').boundingBox())!,
    map = (await page.locator('.minimap-shell').boundingBox())!;
  expect(day.x + day.width).toBeLessThanOrEqual(map.x);
  expect(
    await page
      .getByRole('button', { name: 'Dash', exact: true })
      .evaluate((e) => getComputedStyle(e).color),
  ).toBe('rgba(0, 0, 0, 0)');
  await page.evaluate(async () => {
    const path = '/src/presentation/ui/meters.ts',
      { refreshMeters } = await import(/* @vite-ignore */ path);
    const proof = document.createElement('div');
    proof.id = 'meter-proof';
    proof.style.cssText = 'position:fixed;left:500px;top:500px;z-index:99';
    proof.innerHTML = [0, 0.5, 1]
      .map(
        (v) =>
          `<div class="kit-meter" data-kind="hp" data-value="${v}" id="proof-${v}"><i class="kit-fill"></i></div>`,
      )
      .join('');
    document.getElementById('app')!.append(proof);
    refreshMeters(proof);
  });
  for (const [value, width] of [
    [0, 0],
    [0.5, 80],
    [1, 160],
  ]) {
    const target = page.locator(`[id="proof-${value}"]`);
    expect(await target.locator('i').evaluate((e) => e.getBoundingClientRect().width)).toBe(width);
    const png = await target.screenshot({
      path: `docs/team/comms/codex/tmp/c8b-meter-${value}.png`,
    });
    const { data, info } = await sharp(png)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixel = (x: number) => [
      ...data.subarray((8 * info.width + x) * 4, (8 * info.width + x) * 4 + 3),
    ];
    if (value === 0) expect(pixel(8)).toEqual(pixel(100));
    if (value === 0.5) expect(pixel(8)).not.toEqual(pixel(100));
    if (value === 1) expect(pixel(8)).toEqual(pixel(104));
  }
  await page.locator('#meter-proof').evaluate((e) => e.remove());
  await expect(page.locator('#toast')).not.toBeVisible({ timeout: 12000 });
  await bounded(page, ['.player-hud', '.time-panel', '.minimap-shell', '.action-hud']);
  await page.screenshot({ path: 'docs/team/comms/codex/tmp/c8b-exploration-1080.png' });
  await page.setViewportSize({ width: 1024, height: 768 });
  const stackedDay = (await page.locator('.time-panel').boundingBox())!,
    stackedMap = (await page.locator('.minimap-shell').boundingBox())!;
  expect(stackedDay.y + stackedDay.height).toBeLessThanOrEqual(stackedMap.y);
  await bounded(page, ['.player-hud', '.time-panel', '.minimap-shell', '.action-hud']);
  await page.screenshot({ path: 'docs/team/comms/codex/tmp/c8b-exploration-1024.png' });
  expect(errors).toEqual([]);
});

test('occupied kit slots preserve focus; companion needs and battle HUD remain readable', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await enter(page);
  const save = await checkpoint(page),
    player = save.entities.records.find((e) => e.id === 0)!;
  Object.assign(player, {
    x: 264.5,
    y: 285.5,
    hp: 50,
    stamina: 62.5,
    food: 0.5,
    water: 0.75,
    rest: 0.75,
  });
  const partner = save.entities.records.find(
    (e) => e.species === 1 && e.owner === -1 && e.alive && !e.downed,
  )!;
  Object.assign(partner, {
    owner: 0,
    x: 265.5,
    y: 285.5,
    targetX: 265.5,
    targetY: 285.5,
    trust: 0.9,
    wildness: 0,
    food: 0.5,
    water: 0.75,
    rest: 0.75,
    commitUntil: save.elapsedSeconds + 100,
  });
  save.inventory = [
    { id: 'bow', instance: `item:${++save.inventorySerial}` },
    { id: 'arrow-bundle', instance: `item:${++save.inventorySerial}`, charges: 12 },
  ];
  const npc = save.npcs.find((n) => n.partner !== null)!;
  const opponent = save.entities.records.find((e) => e.id === npc.partner)!;
  const villager = save.entities.records.find((e) => e.id === npc.entityId)!;
  Object.assign(villager, { x: 263.5, y: 285.5 });
  Object.assign(opponent, {
    x: 263.5,
    y: 286.5,
    targetX: 263.5,
    targetY: 286.5,
    food: 1,
    water: 1,
    rest: 1,
  });
  await restore(page, save);
  await expect(page.locator('#companion-hud')).toBeVisible();
  await expect(page.locator('#quick-slots .quick-charges').nth(1)).toHaveText('12');
  await expect(page.locator('#quick-slots button').nth(1)).toHaveAccessibleName(/12 left/);
  const quick = page.locator('#quick-slots button').first();
  const face = (await quick.locator('.slot-face').boundingBox())!;
  expect([face.width, face.height]).toEqual([60, 60]);
  expect(face.x % 2).toBe(0);
  await quick.focus();
  await quick.evaluate((e) => {
    (window as unknown as { c8bFocused: Element }).c8bFocused = e;
  });
  await page.waitForTimeout(450);
  expect(
    await quick.evaluate(
      (e) =>
        e === document.activeElement &&
        e === (window as unknown as { c8bFocused: Element }).c8bFocused,
    ),
  ).toBe(true);
  await expect(page.locator('#toast')).not.toBeVisible({ timeout: 12000 });
  for (const size of [
    { width: 1920, height: 1080 },
    { width: 1024, height: 768 },
  ]) {
    await page.setViewportSize(size);
    await bounded(page, [
      '.player-hud',
      '.physiology-panel',
      '#companion-hud',
      '.time-panel',
      '.minimap-shell',
      '.action-hud',
    ]);
    const needs = (await page.locator('.physiology-panel').boundingBox())!,
      companion = (await page.locator('#companion-hud').boundingBox())!;
    expect(needs.y + needs.height).toBeLessThanOrEqual(companion.y);
    const hp = await page.locator('#health-track').getAttribute('aria-valuenow');
    expect(Number(hp)).toBeCloseTo(50, 0);
    await page.screenshot({ path: `docs/team/comms/codex/tmp/c8b-companion-${size.width}.png` });
    await page.keyboard.press('i');
    await expect(page.locator('#close-inventory')).toBeFocused();
    await expect(page.locator('[data-carry-slot]')).toHaveCount(2);
    await expect(page.locator('[data-gear-slot]')).toHaveCount(6);
    expect(
      await page
        .locator('[data-carry-slot="0"]')
        .evaluate((e) => getComputedStyle(e).borderImageSource),
    ).toContain('slot_common.png');
    const carried = page.locator('[data-carry-slot="0"]');
    await carried.focus();
    await page.waitForTimeout(350);
    await expect(carried).toBeFocused();
    await bounded(page, ['#inventory-panel']);
    await page.screenshot({ path: `docs/team/comms/codex/tmp/c8b-equipment-${size.width}.png` });
    await page.locator('[data-gear-slot="back"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `docs/team/comms/codex/tmp/c8b-worn-${size.width}.png` });
    await page.keyboard.press('Escape');
    await page.locator('.physiology-panel summary').click();
    await expect(page.locator('#companion-hud')).not.toBeVisible();
    await bounded(page, ['.physiology-panel']);
    await page.locator('.physiology-panel summary').click();
  }
  // Re-import the known nearby actors before the agreed duel, avoiding schedule drift.
  await page.setViewportSize({ width: 1920, height: 1080 });
  await restore(page, save);
  const result = await page.evaluate(
    async (npcId) =>
      (window as unknown as { __hearthwild: Api }).__hearthwild.command({ type: 'battle', npcId }),
    npc.profileId,
  );
  expect(result.ok, result.message).toBe(true);
  await expect(page.locator('#app')).toHaveAttribute('data-combat', 'true');
  expect(await page.locator('.minimap-shell').evaluate((e) => getComputedStyle(e).opacity)).toBe(
    '0.6',
  );
  expect(await page.locator('.time-panel').evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
  await page.screenshot({ path: 'docs/team/comms/codex/tmp/c8b-combat-1080.png' });
  expect(errors).toEqual([]);
});
