import { test, expect } from '@playwright/test';
import type { GameSave } from '../../src/domain/save-schema';
import type { RenderSnapshot } from '../../src/domain/contracts';
import { WorldGenerator, SurfaceRules } from '../../src/domain/world';
import { SPECIES } from '../../src/content/definitions';
import { mkdir, writeFile } from 'node:fs/promises';

test('20 hostile Bramblefang have staggered tokens, readable windups and saved settings', async ({
  page,
}) => {
  test.slow();
  await page.setViewportSize({ width: 1920, height: 1080 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?test=1');
  await page.getByRole('button', { name: 'Play without local AI', exact: true }).click();
  await expect(page.locator('#setup-dialog')).not.toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const save: GameSave = await page.evaluate(async () => (window as any).__hearthwild.checkpoint());
  const world = new WorldGenerator().generate(save.seed);
  const p = save.entities.records.find((r) => r.id === 0)!;
  const hostiles = save.entities.records
    .filter((r) => r.species < 8 && r.owner === -1)
    .slice(0, 20);
  const sites: { x: number; y: number }[] = [];
  for (let y = -3; y <= 3; y++)
    for (let x = -3; x <= 3; x++) {
      const q = { x: p.x + x, y: p.y + y };
      if (Math.hypot(x, y) >= 1 && SurfaceRules.walkable(world, q.x, q.y)) sites.push(q);
    }
  expect(sites.length).toBeGreaterThanOrEqual(20);
  save.combat.minds.records = [];
  save.combat.attacks = [];
  save.combat.pursuits = [];
  save.combat.nextAttack = [];
  save.combat.director.holds = [];
  save.combat.director.waiting = [];
  save.combat.director.grants = [];
  save.player.invulnerableUntil = save.tick + 3000;
  for (let n = 0; n < hostiles.length; n++) {
    const a = hostiles[n]!,
      q = sites[n]!;
    Object.assign(a, {
      species: 6,
      hp: SPECIES[6]!.hp,
      x: q.x,
      y: q.y,
      targetX: q.x,
      targetY: q.y,
      food: 0.9,
      water: 0.9,
      rest: 0.9,
      cleanliness: 0.9,
      recreation: 0.9,
      sleeping: 0,
      scene: 0,
      nature: { response: 'retaliate', aggression: [] },
    });
    save.combat.pursuits.push([a.id, { target: 0, cause: 'territory', until: save.tick + 3000 }]);
  }
  const partner = save.entities.records.find(
    (r) => r.species < 8 && r.owner === -1 && !hostiles.includes(r),
  )!;
  partner.owner = 0;
  partner.x = p.x - 1;
  partner.y = p.y;
  partner.hp = Math.min(partner.hp, SPECIES[partner.species]!.hp);
  const previous = await page.evaluate(() => (window as any).__hearthwild.frame().session);
  await page.locator('#import-input').setInputFiles({
    name: 'c14-combat.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(save)),
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__hearthwild.frame().session))
    .not.toBe(previous);
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect(page.locator('[aria-label="Companion intent: follow"]')).toBeVisible();
  // Sample the worker's actual attack timing, retaining unique observed starts.
  const proof = await page.evaluate(
    async (ids) => {
      const api = (window as any).__hearthwild as {
        frame(): RenderSnapshot;
        checkpoint(): Promise<GameSave>;
      };
      const samples: { tick: number; active: number; starts: number[] }[] = [];
      const starts = new Set<number>();
      // Pack preparation can outlast a fixed window in the crowded 20-actor fixture.
      // Always observe at least 420 ticks; allow up to 900 to collect four starts.
      const minimumEnd = api.frame().tick + 420,
        end = minimumEnd + 480;
      let previous = -1;
      while (api.frame().tick < end && (api.frame().tick < minimumEnd || starts.size < 4)) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const frame = api.frame();
        if (frame.tick === previous) continue;
        previous = frame.tick;
        const actions = frame.actors.filter((a) => ids.includes(a.id) && a.action);
        for (const a of actions) starts.add(a.action!.startedAt);
        samples.push({
          tick: frame.tick,
          active: actions.filter((a) => frame.tick < a.action!.recoveryAt).length,
          starts: actions.map((a) => a.action!.startedAt),
        });
      }
      return {
        samples,
        starts: [...starts].sort((a, b) => a - b),
        checkpoint: await api.checkpoint(),
      };
    },
    hostiles.map((a) => a.id),
  );
  expect(proof.samples.length).toBeGreaterThan(20);
  expect(Math.max(...proof.samples.map((s) => s.active))).toBeLessThanOrEqual(2);
  expect(proof.starts.length).toBeGreaterThan(3);
  for (let n = 1; n < proof.starts.length; n++)
    expect(proof.starts[n]! - proof.starts[n - 1]!).toBeGreaterThanOrEqual(8);
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__hearthwild
          .frame()
          .actors.some((a: any) => a.telegraph?.predator && a.telegraph.phase === 'windup'),
      ),
    )
    .toBe(true);
  await page.screenshot({ path: 'artifacts/c14-pack-1080p.png' });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('#combat-spacing').fill('12');
  await page.getByRole('button', { name: 'Apply combat settings', exact: true }).click();
  await expect(page.locator('#combat-settings-status')).toHaveText('Combat settings applied.');
  const configured: GameSave = await page.evaluate(async () =>
    (window as any).__hearthwild.checkpoint(),
  );
  expect(configured.combat.director.settings.grantSpacing).toBe(12);
  expect(configured.version).toBe(8);
  // A second validated scenario proves an element glint also survives reduced motion.
  const ranged = configured.entities.records.find((r) => r.id === hostiles[0]!.id)!;
  const playerBody = configured.entities.records.find((r) => r.id === 0)!;
  Object.assign(ranged, {
    species: 4,
    level: 40,
    hp: SPECIES[4]!.hp + 39 * 5,
    stamina: 100,
    x: playerBody.x + 1,
    y: playerBody.y,
  });
  configured.combat.minds.records = [];
  configured.combat.attacks = [];
  configured.combat.nextAttack = [];
  configured.combat.pursuits = [
    [ranged.id, { target: 0, cause: 'territory', until: configured.tick + 3000 }],
  ];
  configured.combat.director.holds = [];
  configured.combat.director.waiting = [];
  configured.combat.director.grants = [];
  const beforeGlint = await page.evaluate(() => (window as any).__hearthwild.frame().session);
  await page.locator('#import-input').setInputFiles({
    name: 'c14-glint.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(configured)),
  });
  await expect
    .poll(() => page.evaluate(() => (window as any).__hearthwild.frame().session))
    .not.toBe(beforeGlint);
  await page.locator('#reduced-motion').check();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).__hearthwild.frame().actors.some((a: any) => a.telegraph?.kind === 'glint'),
      ),
    )
    .toBe(true);
  await page.screenshot({ path: 'artifacts/c14-glint-1080p.png' });
  expect(errors).toEqual([]);
  await mkdir('artifacts', { recursive: true });
  await writeFile(
    'artifacts/c14-browser.json',
    JSON.stringify(
      {
        samples: proof.samples,
        starts: proof.starts,
        viewport: { width: 1920, height: 1080 },
        hostileCount: hostiles.length,
        configuredSpacing: 12,
        reducedMotionGlint: true,
        pageErrors: errors,
      },
      null,
      2,
    ) + '\n',
  );
  await test.info().attach('token-proof', {
    body: JSON.stringify({ samples: proof.samples, starts: proof.starts }),
    contentType: 'application/json',
  });
});
