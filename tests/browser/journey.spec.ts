import { test, expect, type Page } from '@playwright/test';
import type { GameSave } from '../../src/domain/save-schema';
import { WorldGenerator, SurfaceRules, PLAYER_TRAVERSAL } from '../../src/domain/world';
import { NavigationService } from '../../src/domain/navigation';

const body = (save: GameSave, id = 0) => save.entities.records.find((e) => e.id === id)!;

async function mockOllama(page: Page, valid = true): Promise<void> {
  await page.route('http://127.0.0.1:11434/**', async (route) => {
    const data = route.request().postDataJSON() as {
      format?: { properties?: { ready?: object } };
    } | null;
    const body = route.request().url().endsWith('/api/tags')
      ? { models: [{ name: 'qwen2.5:3b', size: 1900000000 }] }
      : {
          message: {
            content: JSON.stringify(
              data?.format?.properties?.ready
                ? { ready: valid }
                : {
                    dialogue:
                      'I can offer a few sunberries. I will leave them nearby when we finish talking.',
                    emotion: 'warm',
                    action: { type: 'DROP_GIFT', itemId: 'berries' },
                  },
            ),
          },
          eval_count: 32,
        };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: JSON.stringify(body),
    });
  });
}
async function inspection(page: Page): Promise<void> {
  if (!(await page.locator('#inspection-panel').isVisible()))
    await page.getByRole('button', { name: 'Inspect F', exact: true }).click();
}
async function inventory(page: Page): Promise<void> {
  if (!(await page.locator('#inventory-panel').isVisible()))
    await page.getByRole('button', { name: 'Inventory I', exact: true }).click();
}

async function enter(page: Page): Promise<void> {
  await page.goto('/?test=1');
  await page.getByRole('button', { name: 'Connect & begin journey' }).click();
  await expect(page.locator('#setup-dialog')).not.toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#location-title')).toContainText('Aqualia');
}
async function worldSession(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      (window as unknown as { __hearthwild: { frame(): { session: string } } }).__hearthwild.frame()
        .session,
  );
}

async function closeSettings(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect
    .poll(
      () =>
        page.evaluate(() =>
          (window as unknown as { __hearthwild: { frame(): { paused: string[] } } }).__hearthwild
            .frame()
            .paused.includes('menu'),
        ),
      { timeout: 15_000 },
    )
    .toBe(false);
}

async function checkpoint(page: Page): Promise<GameSave> {
  return page.evaluate(() =>
    (
      window as unknown as { __hearthwild: { checkpoint(): Promise<GameSave> } }
    ).__hearthwild.checkpoint(),
  );
}

test('full world, movement, grounded dialogue, save and resume', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await mockOllama(page);
  await enter(page);
  const initial = await checkpoint(page);
  expect(initial.npcs).toHaveLength(30);
  expect(initial.entities.records.filter((e) => e.species !== 8).length).toBe(1000);
  const terrain = new WorldGenerator().generate(initial.seed),
    guide = new NavigationService(terrain);
  await inspection(page);
  await page.getByRole('tab', { name: 'Villagers' }).click();
  // Follow reachable walk surfaces with real keyboard input. A straight-line chase
  // can hit houses as villagers move during startup, especially on software GPUs.
  await expect
    .poll(
      async () => {
        if (await page.locator('#conversation-dialog').isVisible()) return true;
        const snapshot = await checkpoint(page);
        const position = body(snapshot),
          nearest = snapshot.npcs
            .map((n) => body(snapshot, n.entityId))
            .sort(
              (a, b) =>
                Math.hypot(a.x - position.x, a.y - position.y) -
                Math.hypot(b.x - position.x, b.y - position.y),
            )[0]!;
        if (Math.hypot(nearest.x - position.x, nearest.y - position.y) < 2.5) {
          await page.keyboard.press('e');
          return page.locator('#conversation-dialog').isVisible();
        }
        guide.request({ id: 'browser-walk', start: position, goal: nearest });
        guide.advance(4096);
        const path = guide.take('browser-walk');
        expect(path.status).toBe('found');
        const next =
          path.points.find(
            (point) =>
              Math.floor(point.x) !== Math.floor(position.x) ||
              Math.floor(point.y) !== Math.floor(position.y),
          ) ?? nearest;
        const dx = next.x - position.x,
          dy = next.y - position.y;
        const key = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'd' : 'a') : dy > 0 ? 's' : 'w';
        // Never hold a movement key across an asynchronous checkpoint or poll.
        // A slow renderer must not turn a short route step into a long overshoot.
        await page.keyboard.down(key);
        await page.waitForTimeout(100);
        await page.keyboard.up(key);
        return false;
      },
      { timeout: 60_000, intervals: [100] },
    )
    .toBe(true);
  await expect(page.locator('#conversation-dialog')).toBeVisible();
  const before = await checkpoint(page);
  await page.waitForTimeout(350);
  expect((await checkpoint(page)).tick).toBe(before.tick);
  await page.getByLabel('Your message').fill('Could you offer a gift?');
  await page.getByRole('button', { name: 'Send ↗' }).click();
  await expect(page.locator('#staged-note')).toBeVisible();
  expect((await checkpoint(page)).drops).toHaveLength(0);
  await page.getByRole('button', { name: 'Finish conversation' }).click();
  await expect(page.locator('#conversation-dialog')).not.toBeVisible();
  await expect.poll(async () => (await checkpoint(page)).drops.length).toBe(1);
  await page.getByRole('button', { name: 'Save journey' }).click();
  await expect(page.locator('#toast')).toContainText('saved');
  const beforeMove = body(await checkpoint(page));
  const direction = [
    ['d', 1, 0],
    ['a', -1, 0],
    ['s', 0, 1],
    ['w', 0, -1],
  ] as const;
  const movement = direction.find(([, dx, dy]) =>
    SurfaceRules.canStep(
      terrain,
      beforeMove,
      { x: beforeMove.x + dx, y: beforeMove.y + dy },
      PLAYER_TRAVERSAL,
    ),
  )!;
  expect(movement).toBeDefined();
  await page.keyboard.down(movement[0]);
  await page.waitForTimeout(500);
  await page.keyboard.up(movement[0]);
  const afterMove = body(await checkpoint(page));
  expect(Math.hypot(afterMove.x - beforeMove.x, afterMove.y - beforeMove.y)).toBeGreaterThan(0.1);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Developer overlay').check();
  await expect(page.locator('#debug-stats')).toContainText('MEMORY PROVENANCE');
  await expect(page.locator('#debug-stats')).toContainText('Utility wander');
  await closeSettings(page);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as unknown as { __hearthwild: { frame(): { debugEnabled: boolean } } }
          ).__hearthwild.frame().debugEnabled,
      ),
    )
    .toBe(true);
  await page.screenshot({ path: 'artifacts/diagnostics.png', fullPage: true });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Developer overlay').uncheck();
  await closeSettings(page);
  await page.getByRole('tab', { name: 'Journey' }).click();
  await page.screenshot({ path: 'artifacts/hearthwild.png', fullPage: true });
  await page.keyboard.press('m');
  await expect(page.locator('#map-dialog')).toBeVisible();
  expect(await page.locator('.settlement-button').count()).toBe(9);
  await page.getByRole('button', { name: 'Close map' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Connect & resume saved journey' }).click();
  await expect(page.locator('#setup-dialog')).not.toBeVisible({ timeout: 30_000 });
  expect((await checkpoint(page)).drops).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('required AI handshake prevents entry when model validation fails', async ({ page }) => {
  await mockOllama(page, false);
  await page.goto('/');
  await page.getByRole('button', { name: 'Connect & begin journey' }).click();
  await expect(page.locator('#setup-status')).toContainText('did not pass');
  await expect(page.locator('#setup-dialog')).toBeVisible();
});

test('creature care, crafting, elemental combat and recovery through a validated saved scenario', async ({
  page,
}) => {
  await mockOllama(page);
  await enter(page);
  const save = await checkpoint(page);
  // Import is a public, schema-validated interface. Seed a compact encounter to test the UI without a lengthy walk.
  body(save).x = 264.5;
  body(save).y = 285.5;
  body(save).facingX = 1;
  body(save).facingY = 0;
  const candidate = save.entities.records.find((e) => e.species === 1 && e.owner === -1)!;
  const creature = candidate.id;
  Object.assign(candidate, {
    x: 265.5,
    y: 285.5,
    targetX: 265.5,
    targetY: 285.5,
    commitUntil: save.elapsedSeconds + 100,
  });
  save.inventory = [
    { id: 'reeds', instance: 'item:1' },
    { id: 'water', instance: 'item:2' },
  ];
  save.inventorySerial = 2;
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const beforeImportSession1 = await worldSession(page);
  await page.locator('#import-input').setInputFiles({
    name: 'encounter.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(save)),
  });

  await expect.poll(() => worldSession(page), { timeout: 30_000 }).not.toBe(beforeImportSession1);
  await expect(page.locator('#toast')).toContainText('imported');
  await closeSettings(page);
  const careResults = await page.evaluate(async (id) => {
    const api = (
      window as unknown as {
        __hearthwild: { command(command: unknown): Promise<{ ok: boolean; message: string }> };
      }
    ).__hearthwild;
    const results = [];
    for (const action of ['feed', 'water', 'pet'])
      results.push(await api.command({ type: 'care', creature: id, action }));
    results.push(await api.command({ type: 'tame', creature: id }));
    return results;
  }, creature);
  expect(
    careResults.map((result) => result.ok),
    JSON.stringify(careResults),
  ).toEqual([true, true, true, true]);
  await expect.poll(async () => body(await checkpoint(page), creature).owner).toBe(0);
  await inspection(page);
  await page.getByRole('tab', { name: 'Creatures' }).click();
  await expect(page.locator('.creature-title')).toContainText('Rivallie');
  await expect(page.locator('.creature-stats')).toBeVisible();
  const crafting = await checkpoint(page),
    enemy = crafting.entities.records.find(
      (e) => e.species === 1 && e.owner === -1 && e.id !== creature,
    )!.id;
  crafting.inventory = [
    { id: 'flint', instance: 'item:3' },
    { id: 'stick', instance: 'item:4' },
  ];
  crafting.inventorySerial = 4;
  crafting.drops.push({
    id: Math.max(0, ...crafting.drops.map((d) => d.id)) + 1,
    item: 'fiber',
    x: body(crafting).x,
    y: body(crafting).y,
  });
  body(crafting).facingX = 1;
  body(crafting).facingY = 0;
  body(crafting, enemy).x = body(crafting).x + 1;
  body(crafting, enemy).y = body(crafting).y;
  body(crafting, enemy).targetX = body(crafting).x + 1;
  body(crafting, enemy).targetY = body(crafting).y;
  body(crafting, enemy).hp = 1;
  // A healthy resting herbivore keeps this attack-timing fixture independent
  // of survival movement and unrelated hunts while crafting controls are used.
  Object.assign(body(crafting, enemy), {
    food: 1,
    water: 1,
    rest: 0.5,
    sleeping: 1,
    voluntaryRest: 1,
    forcedRest: 0,
    nature: { response: 'avoid', aggression: [] },
  });
  body(crafting, enemy).commitUntil = crafting.elapsedSeconds + 100;
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const beforeImportSession2 = await worldSession(page);
  await page.locator('#import-input').setInputFiles({
    name: 'craft-and-battle.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(crafting)),
  });

  await expect.poll(() => worldSession(page), { timeout: 30_000 }).not.toBe(beforeImportSession2);
  await expect(page.locator('#toast')).toContainText('imported');
  await closeSettings(page);
  await inventory(page);
  await page.getByRole('button', { name: 'Combine' }).click();
  await expect(page.locator('#inventory')).toContainText('Tool head');
  await page.keyboard.press('r');
  await expect.poll(async () => (await checkpoint(page)).inventory[1]?.id).toBe('fiber');
  await page.keyboard.press('c');
  await expect(page.locator('#inventory')).toContainText('Stone hatchet');
  await page.keyboard.press('j');
  await expect.poll(async () => body(await checkpoint(page)).experience).toBeGreaterThan(0);
  expect((await checkpoint(page)).entities.records.some((e) => e.id === enemy)).toBe(false);
  const defeat = await checkpoint(page);
  expect(body(defeat, creature).owner).toBe(0);
  expect(defeat.carrion.some((c) => c.sourceId === enemy)).toBe(true);
});

async function importScenario(page: Page, save: GameSave): Promise<void> {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const beforeImportSession3 = await worldSession(page);
  await page.locator('#import-input').setInputFiles({
    name: 'entity-scenario.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(save)),
  });

  await expect.poll(() => worldSession(page), { timeout: 30_000 }).not.toBe(beforeImportSession3);
  await expect(page.locator('#toast')).toContainText('imported');
  await closeSettings(page);
}

test('human food, accelerated sleep, emergency waking, retaliation and predation', async ({
  page,
}) => {
  // This journey performs five independently validated public save imports.
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await mockOllama(page);
  await enter(page);
  const initial = await checkpoint(page),
    p = body(initial);
  Object.assign(p, {
    x: 264.5,
    y: 284.5,
    food: 0.2,
    water: 0.5,
    rest: 0.3,
    facingX: 1,
    facingY: 0,
  });
  initial.inventory = [{ id: 'berries', instance: 'item:1' }, null];
  initial.inventorySerial = 1;
  await importScenario(page, initial);
  await inventory(page);
  await page.locator('#inventory').getByRole('button', { name: 'Use', exact: true }).click();
  await expect.poll(async () => body(await checkpoint(page)).food).toBeGreaterThan(0.5);
  const beforePantry = body(await checkpoint(page)).food;
  await page.getByRole('button', { name: 'Eat at pantry', exact: true }).click();
  await expect
    .poll(async () => body(await checkpoint(page)).food)
    .toBeGreaterThan(beforePantry + 0.2);
  await page.getByRole('button', { name: 'Rest', exact: true }).click();
  await expect(page.locator('#rest-status')).toContainText('Sleeping');
  const before = (await checkpoint(page)).tick;
  await page.getByRole('button', { name: 'Sleep at 8×', exact: true }).click();
  await expect(page.locator('#rest-status')).toContainText('8×');
  await expect
    .poll(async () => (await checkpoint(page)).tick - before, { timeout: 8_000 })
    .toBeGreaterThan(80);
  await page.getByRole('button', { name: 'Wake', exact: true }).click();
  await expect(page.locator('#rest-status')).not.toContainText('Sleeping');

  const assault = await checkpoint(page),
    victim = assault.npcs[0]!,
    victimBody = body(assault, victim.entityId);
  Object.assign(body(assault), { facingX: 1, facingY: 0, rest: 1, food: 1, water: 1 });
  Object.assign(victimBody, {
    x: body(assault).x + 1,
    y: body(assault).y,
    rest: 1,
    food: 1,
    water: 1,
    nature: { response: 'retaliate', aggression: [] },
  });
  await importScenario(page, assault);
  await page.keyboard.press('j');
  await expect
    .poll(async () =>
      (await checkpoint(page)).npcs[0]!.memory.records.some((m) => m.text.includes('assault')),
    )
    .toBe(true);
  await expect.poll(async () => body(await checkpoint(page)).hp).toBeLessThan(body(assault).hp);
  expect(body(await checkpoint(page)).experience).toBe(0);

  // A forced sleeper can wake to flee a real nearby territorial threat; the obligation remains.
  // Start this independent scenario from healthy actors, rather than carrying
  // over assault damage, invulnerability or nearby retaliation targets.
  const danger = structuredClone(initial),
    sleeper = body(danger),
    npc = danger.npcs[0]!,
    attacker = body(danger, npc.entityId);
  Object.assign(sleeper, { rest: 0.1, sleeping: 1, forcedRest: 1, food: 1, water: 1 });
  Object.assign(attacker, {
    x: sleeper.x + 0.25,
    y: sleeper.y,
    rest: 1,
    food: 1,
    water: 1,
    nature: { response: 'retaliate', aggression: [{ target: 'human', radius: 2 }] },
  });
  await importScenario(page, danger);
  await expect.poll(async () => body(await checkpoint(page)).sleeping).toBe(0);
  await expect.poll(async () => body(await checkpoint(page)).hp).toBeLessThan(sleeper.hp);
  expect(body(await checkpoint(page)).forcedRest).toBe(1);
  await inspection(page);
  await page.getByRole('tab', { name: 'Villagers', exact: true }).click();
  await expect(page.locator('.human-inspector')).toContainText('Rest');

  // Restore a safe scenario, then let the shared tactical system resolve a wildlife hunt.
  const hunt = structuredClone(initial),
    hunter = hunt.entities.records.find((e) => e.species === 6)!,
    prey = hunt.entities.records.find((e) => e.species === 2 && e.owner === -1)!;
  Object.assign(body(hunt), { food: 1, water: 1, rest: 1 });
  Object.assign(hunter, {
    x: 266.5,
    y: 285.5,
    targetX: 267,
    targetY: 285.5,
    food: 0.2,
    water: 1,
    rest: 1,
    commitUntil: hunt.elapsedSeconds + 100,
  });
  Object.assign(prey, {
    x: 267,
    y: 285.5,
    targetX: 267,
    targetY: 285.5,
    hp: 1,
    food: 1,
    water: 1,
    rest: 0.5,
    sleeping: 1,
    voluntaryRest: 1,
    commitUntil: hunt.elapsedSeconds + 100,
  });
  await importScenario(page, hunt);
  await expect
    .poll(async () => (await checkpoint(page)).carrion.some((c) => c.sourceId === prey.id))
    .toBe(true);
  const hunted = await checkpoint(page);
  expect(hunted.entities.records.some((e) => e.id === prey.id)).toBe(false);
  expect(body(hunted).experience).toBe(0);
  await page.screenshot({ path: 'artifacts/unified-entities.png', fullPage: true });
  expect(errors).toEqual([]);
});
