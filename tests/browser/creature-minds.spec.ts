import { test, expect, type Page } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import type { GameSave } from '../../src/domain/save-schema';
import { WorldGenerator, SurfaceRules } from '../../src/domain/world';
import { SPECIES } from '../../src/content/definitions';

async function captureBeat(
  page: Page,
  ids: number[],
  name: string,
  beat: 'notice' | 'stalk' | 'commit',
) {
  const tick = await page.evaluate(
    async ({ ids, beat }) => {
      const api = (window as any).__hearthwild,
        deadline = performance.now() + 15000;
      while (performance.now() < deadline) {
        const f = api.frame(),
          actors = f.actors.filter((a: any) => ids.includes(a.id));
        const ready =
          beat === 'notice'
            ? actors.some((a: any) => a.pose === 'guard' && !a.action)
            : beat === 'stalk'
              ? actors.some(
                  (a: any) =>
                    ['approach', 'flankLeft', 'flankRight', 'strike', 'element'].includes(
                      a.intent,
                    ) &&
                    !a.action &&
                    ['walk', 'run'].includes(a.pose),
                )
              : actors.some((a: any) => a.action && f.tick < a.action.activeAt);
        if (ready) {
          await api.command({ type: 'pause', token: 'c13:capture' });
          return f.tick;
        }
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
      throw Error(`Missing ${beat} beat`);
    },
    { ids, beat },
  );
  await page.screenshot({ path: `artifacts/c13-${name}-${beat}-1080p.png` });
  await page.evaluate(() =>
    (window as any).__hearthwild.command({ type: 'resume', token: 'c13:capture' }),
  );
  return tick;
}

for (const [name, species, count] of [
  ['pack', 6, 6],
  ['zephyrit', 2, 1],
] as const) {
  test(`C13 ${name}: notice, movement, staggered commitment and break`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/?test=1');
    await page.getByRole('button', { name: 'Play without local AI', exact: true }).click();
    await expect(page.locator('#setup-dialog')).not.toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const save: GameSave = await page.evaluate(() => (window as any).__hearthwild.checkpoint());
    const p = save.entities.records.find((r) => r.id === 0)!,
      world = new WorldGenerator().generate(save.seed);
    const sites: { x: number; y: number }[] = [];
    for (let y = -2; y <= 2; y++)
      for (let x = 3; x <= 5; x++)
        if (SurfaceRules.walkable(world, p.x + x, p.y + y)) sites.push({ x: p.x + x, y: p.y + y });
    expect(sites.length).toBeGreaterThanOrEqual(count);
    const actors = save.entities.records
      .filter((r) => r.species < 8 && r.owner === -1)
      .slice(0, count);
    save.combat.pursuits = [];
    save.combat.attacks = [];
    save.combat.nextAttack = [];
    save.combat.minds.records = [];
    save.combat.director.holds = [];
    save.combat.director.waiting = [];
    save.combat.director.grants = [];
    save.player.invulnerableUntil = save.tick + 10000;
    for (let n = 0; n < count; n++) {
      const a = actors[n]!,
        q = sites[n]!;
      Object.assign(a, {
        species,
        hp: SPECIES[species]!.hp,
        x: q.x,
        y: q.y,
        targetX: q.x,
        targetY: q.y,
        facingX: -1,
        facingY: 0,
        herd: 500,
        scene: 0,
        sleeping: 0,
        downed: 0,
        food: 0.9,
        water: 0.9,
        rest: 0.9,
        cleanliness: 0.9,
        recreation: 0.9,
        nature: { response: 'retaliate', aggression: [] },
      });
      save.combat.pursuits.push([
        a.id,
        { target: 0, cause: 'territory', until: save.tick + 10000 },
      ]);
    }
    const previous = await page.evaluate(() => (window as any).__hearthwild.frame().session);
    await page.locator('#import-input').setInputFiles({
      name: `c13-${name}.json`,
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(save)),
    });
    await expect
      .poll(() => page.evaluate(() => (window as any).__hearthwild.frame().session))
      .not.toBe(previous);
    await page.getByRole('button', { name: 'Close settings' }).click();
    await mkdir('artifacts', { recursive: true });
    const ids = actors.map((a) => a.id);
    const beats = {
      notice: await captureBeat(page, ids, name, 'notice'),
      stalk: await captureBeat(page, ids, name, 'stalk'),
      commit: await captureBeat(page, ids, name, 'commit'),
    };
    const proof = await page.evaluate(async (ids) => {
      const api = (window as any).__hearthwild,
        rows: any[] = [],
        starts = new Set<number>();
      let previous = -1;
      const end = api.frame().tick + 420;
      while (api.frame().tick < end) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
        const f = api.frame();
        if (f.tick === previous) continue;
        previous = f.tick;
        const actors = f.actors.filter((a: any) => ids.includes(a.id));
        for (const a of actors) if (a.action) starts.add(a.action.startedAt);
        rows.push({
          tick: f.tick,
          actors: actors.map((a: any) => ({
            id: a.id,
            x: a.x,
            y: a.y,
            intent: a.intent,
            pose: a.pose,
            action: a.action,
          })),
          debug: f.creatureDebug?.filter((a: any) => ids.includes(a.id)),
        });
      }
      return { rows, starts: [...starts].sort((a, b) => a - b) };
    }, ids);
    expect(proof.starts.length).toBeGreaterThan(1);
    for (let n = 1; n < proof.starts.length; n++)
      expect(proof.starts[n]! - proof.starts[n - 1]!).toBeGreaterThanOrEqual(8);
    expect(beats.notice).toBeLessThan(beats.commit);
    expect(
      proof.rows.some((r) => r.actors.some((a: any) => a.pose === 'walk' || a.pose === 'run')),
    ).toBe(true);
    if (name === 'pack')
      expect(
        proof.rows.some((r) =>
          r.actors.some((a: any) => a.intent === 'flankLeft' || a.intent === 'flankRight'),
        ),
      ).toBe(true);
    else
      expect(proof.rows.some((r) => r.actors.some((a: any) => a.intent === 'retreat'))).toBe(true);
    await page.screenshot({ path: `artifacts/c13-${name}-1080p.png` });
    // Public save import supplies a reproducible leader loss or injury, then the same brain breaks.
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const broken: GameSave = await page.evaluate(() => (window as any).__hearthwild.checkpoint());
    const leader = broken.entities.records.find((r) => r.id === ids[0])!;
    leader.hp = name === 'pack' ? 0 : SPECIES[species]!.hp * 0.2;
    broken.combat.attacks = [];
    broken.combat.director.holds = [];
    broken.combat.director.waiting = [];
    const beforeBreak = await page.evaluate(() => (window as any).__hearthwild.frame().session);
    await page.locator('#import-input').setInputFiles({
      name: `c13-${name}-break.json`,
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(broken)),
    });
    await expect
      .poll(() => page.evaluate(() => (window as any).__hearthwild.frame().session))
      .not.toBe(beforeBreak);

    await page.getByRole('button', { name: 'Close settings' }).click();
    await expect
      .poll(() =>
        page.evaluate(
          (ids) =>
            (window as any).__hearthwild
              .frame()
              .actors.some(
                (a: any) => ids.includes(a.id) && ['retreat', 'flee'].includes(a.intent),
              ),
          ids,
        ),
      )
      .toBe(true);
    await page.screenshot({ path: `artifacts/c13-${name}-break-1080p.png` });
    await writeFile(
      `artifacts/c13-${name}-browser.json`,
      JSON.stringify({ ...proof, beats }, null, 2),
    );
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.locator('#debug').check();
    await page.locator('#creature-inspector').fill(String(ids[name === 'pack' ? 1 : 0]));
    await page.locator('#creature-inspector').dispatchEvent('change');
    await expect(page.locator('#creature-debug')).toContainText('crm-obs-1');
    await page.getByRole('button', { name: 'Close settings' }).click();
    await expect(page.locator('#creature-debug-overlay')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
