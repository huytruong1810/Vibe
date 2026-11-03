import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { EntityStore, bindBody } from '../src/domain/entities';
import { CombatSystem } from '../src/domain/combat';
import { Engagement, PerceptionGrid, OBSERVATION_SCHEMA } from '../src/domain/creature-minds';
import { SpatialIndex, NavigationService } from '../src/domain/navigation';
import { flatWorld, player } from './helpers';
import { Biome, Fluid, TileFlag, SurfaceRules } from '../src/domain/world';
import { creatureTraversal, CreatureMode } from '../src/domain/creatures';
import { SimulationHost } from '../src/domain/simulation';
import { migrateSave } from '../src/domain/save-schema';
import { send } from './helpers';

function fixture(species = 6, count = 1) {
  const world = flatWorld(64),
    store = new EntityStore(12),
    p = player();
  store.spawnHuman(0, 1, 20, 20);
  bindBody(p, store, 0);
  const slot = store.spawn(species, 24, 20);
  for (let n = 1; n < count; n++) {
    const j = store.spawn(species, 24 + (n % 2) * 0.5, 20 + (n - 2) * 0.6);
    store.facingX[j] = -1;
    store.facingY[j] = 0;
  }
  store.facingX[slot] = -1;
  store.facingY[slot] = 0;
  const combat = new CombatSystem(store, p, [], world);
  combat.pursuits.set(store.id(slot), { target: 0, cause: 'territory', until: 4000 });
  for (let i = 1; i < count; i++)
    combat.pursuits.set(store.id(i), { target: 0, cause: 'territory', until: 4000 });
  return { world, store, p, slot, combat, spatial: new SpatialIndex() };
}

describe('creature minds golden slice', () => {
  it('ranks independent threat, ally and prey groups identically in a crowded mixed-species scene', () => {
    const s = new EntityStore(100),
      world = flatWorld(64);
    s.spawnHuman(0, 1, 20, 20);
    for (let n = 0; n < 80; n++) {
      const j = s.spawn(n % 8, 18 + (n % 10) * 0.5, 18 + Math.floor(n / 10) * 0.5);
      s.scene[j] = n % 9 === 0 ? 1 : 0;
      s.herd[j] = n % 3;
      s.facingX[j] = -1;
      s.facingY[j] = 0;
    }
    world.flags[world.index(20, 20)] = TileFlag.Reeds;
    const grid = new PerceptionGrid(s),
      threats = new Int32Array(3),
      allies = new Int32Array(2),
      prey = new Int32Array(1);
    grid.rebuild();
    for (let i = 0; i < 80; i++) {
      grid.observationNeighbors(i, 8, threats, allies, prey, world, 0);
      for (const [out, filter] of [
        [threats, 1],
        [allies, 2],
        [prey, 3],
      ] as const) {
        const expected = new Int32Array(out.length);
        grid.nearest(i, 8, expected, world, filter, 0);
        expect(out).toEqual(expected);
      }
    }
  });
  it('notices, observes, moves once per tick and commits the actual attack category', () => {
    const f = fixture(),
      a = f.combat.minds.state;
    let starts = 0;
    for (let tick = 1; tick <= 180; tick++) {
      f.p.invulnerableUntil = 5000;
      const x = f.store.x[f.slot]!,
        y = f.store.y[f.slot]!;
      f.combat.advance(tick, f.spatial);
      const after = [f.store.x[f.slot], f.store.y[f.slot]];
      f.combat.minds.execute(tick);
      expect([f.store.x[f.slot], f.store.y[f.slot]]).toEqual(after);
      if (tick <= 8) {
        expect(a.engage[f.slot]).toBe(Engagement.Alert);
        expect(after).toEqual([x, y]);
      }
      const o = f.combat.minds.fillObservation(f.slot, tick);
      expect(o.length).toBe(64);
      expect(o[19]).toBe(1); // nearest threat is the visible player
      for (const [id, action] of f.combat.snapshot().attacks) {
        if (action.startedAt !== tick) continue;
        starts++;
        expect(f.combat.snapshot().director!.holds).toContainEqual([
          id,
          0,
          action.kind === 'strike' ? 'melee' : 'ranged',
        ]);
        expect(tick).toBeGreaterThan(8);
      }
    }
    expect(starts).toBeGreaterThan(0);
    expect(f.combat.minds.snapshot().observation).toBe(OBSERVATION_SCHEMA);
  });

  it('restores mid-fight to identical intent, RNG, director and motion streams for 3000 ticks', () => {
    const f = fixture();
    for (let tick = 1; tick <= 47; tick++) {
      f.p.invulnerableUntil = 5000;
      f.combat.advance(tick, f.spatial);
    }
    const body = structuredClone(f.store.snapshot()),
      state = structuredClone(f.combat.snapshot());
    const resumed = fixture();
    resumed.store.restore(body);
    resumed.combat.restore(state);
    const uninterruptedHash = createHash('sha256'),
      restoredHash = createHash('sha256');
    for (let tick = 48; tick <= 3047; tick++) {
      f.p.invulnerableUntil = resumed.p.invulnerableUntil = 5000;
      f.combat.advance(tick, f.spatial);
      resumed.combat.advance(tick, resumed.spatial);
      uninterruptedHash.update(
        JSON.stringify([f.combat.minds.intent(f.slot), f.store.x[f.slot], f.store.y[f.slot]]),
      );
      restoredHash.update(
        JSON.stringify([
          resumed.combat.minds.intent(resumed.slot),
          resumed.store.x[resumed.slot],
          resumed.store.y[resumed.slot],
        ]),
      );
      expect(resumed.combat.minds.snapshot()).toEqual(f.combat.minds.snapshot());
      expect(resumed.store.snapshot()).toEqual(f.store.snapshot());
      expect(resumed.combat.snapshot()).toEqual(f.combat.snapshot());
    }
    const hash = uninterruptedHash.digest('hex');
    expect(restoredHash.digest('hex')).toBe(hash);
    console.log(`C13 3000-tick intent/motion SHA256: ${hash}`);
  });

  it('keeps calm brains asleep and honors scene, radius and cone boundaries', () => {
    const f = fixture();
    f.combat.pursuits.clear();
    f.combat.advance(1, f.spatial);
    expect(f.combat.minds.state.engage[f.slot]).toBe(Engagement.Calm);
    expect(f.combat.minds.state.nextDecision[f.slot]).toBe(0);
    const grid = new PerceptionGrid(f.store),
      out = new Int32Array(8);
    grid.rebuild();
    expect(grid.nearest(f.slot, 10, out)).toBe(1);
    f.store.scene[f.store.require(0)] = 1;
    grid.rebuild();
    expect(grid.nearest(f.slot, 10, out)).toBe(0);
    f.store.scene[f.store.require(0)] = 0;
    f.store.facingX[f.slot] = 1;
    grid.rebuild();
    expect(grid.nearest(f.slot, 10, out)).toBe(0);
    f.store.x[f.slot] = 21;
    grid.rebuild();
    expect(grid.nearest(f.slot, 10, out)).toBe(1);
    f.store.x[f.slot] = 35;
    grid.rebuild();
    expect(grid.nearest(f.slot, 10, out)).toBe(0);
  });
});

function run(f: ReturnType<typeof fixture>, ticks: number, start = 1) {
  const log: {
    tick: number;
    intent: string;
    x: number;
    y: number;
    started: boolean;
    intents: string[];
  }[] = [];
  for (let tick = start; tick < start + ticks; tick++) {
    f.p.invulnerableUntil = 50000;
    f.combat.advance(tick, f.spatial);
    log.push({
      tick,
      intents: Array.from({ length: f.store.count }, (_, i) => f.combat.minds.intent(i)),
      intent: f.combat.minds.intent(f.slot),
      x: f.store.x[f.slot]!,
      y: f.store.y[f.slot]!,
      started: f.combat.presentation(f.store.id(f.slot), tick)?.startedAt === tick,
    });
  }
  return log;
}

describe('CRM-6.4 species identities', () => {
  it('Rivallie below 30 percent retreats toward water and fights near it', () => {
    const f = fixture(1);
    f.store.hp[f.slot] = f.store.maxHp(f.slot) * 0.29;
    for (let y = 15; y < 26; y++)
      for (let x = 26; x < 30; x++) f.world.fluid[f.world.index(x, y)] = Fluid.Freshwater;
    const log = run(f, 90);
    expect(log.some((r) => r.intent === 'flee')).toBe(true);
    expect(f.store.x[f.slot]).toBeGreaterThan(25);
    expect(log.some((r) => r.started)).toBe(false);
  });
  it('Bramblefang calls, gathers and flanks before striking, then breaks after leader loss', () => {
    const f = fixture(6, 6),
      a = f.combat.minds.state;
    const log = run(f, 360);
    const first = log.find((r) => r.started);
    expect(log.some((r) => r.intents.includes('callPack'))).toBe(true);
    expect(log.some((r) => r.intent === 'flankLeft' || r.intent === 'flankRight')).toBe(true);
    expect(first).toBeDefined();
    for (let i = 0; i < 6; i++) expect(a.flanked[i]).toBe(1);
    f.store.hp[0] = 0;
    run(f, 1, 361);
    for (let i = 1; i < 6; i++) {
      expect(a.packBroken[i]).toBe(1);
      expect(a.engage[i]).toBe(Engagement.Disengaging);
    }
  });
  it('Marshstalker waits in reeds at dusk, lunges, and abandons a chase leaving its marsh', () => {
    const f = fixture(7);
    f.world.biome.fill(Biome.Swamp);
    f.world.flags[f.world.index(24, 20)] = TileFlag.Reeds;
    for (let tick = 1; tick <= 30; tick++) f.combat.advance(tick, f.spatial, 18 * 60 + tick / 30);
    expect(f.combat.minds.intent(f.slot)).toBe('hold');
    f.p.x = 22;
    const log = run(f, 120, 31);
    expect(log.some((r) => r.started)).toBe(true);
    f.p.x = 18;
    f.world.biome[f.world.index(18, 20)] = Biome.Meadows;
    run(f, 1, 151);
    expect(f.combat.minds.state.engage[f.slot]).toBe(Engagement.Disengaging);
  });
  it('Mireling guards more often than it strikes and seldom flees', () => {
    const f = fixture(3),
      log = run(f, 180);
    expect(log.filter((r) => r.intent === 'guard').length).toBeGreaterThan(
      log.filter((r) => r.intent === 'strike').length,
    );
    expect(log.filter((r) => r.intent === 'flee')).toHaveLength(0);
  });
  it('Steamshell guards a heavy hit then vents at the nearest threat', () => {
    const f = fixture(5);
    run(f, 15);
    f.store.hp[f.slot]! -= 20;
    const log = run(f, 120, 16);
    const guard = log.find((r) => r.intent === 'guard'),
      vent = log.find((r) => r.intent === 'element' && r.started);
    expect(guard).toBeDefined();
    expect(vent).toBeDefined();
    expect(vent!.tick).toBeGreaterThan(guard!.tick);
  });
  it('Zephyrit strikes, flies beyond the readiness ring, and returns', () => {
    const f = fixture(2),
      log = run(f, 300);
    const strike = log.find((r) => r.started);
    expect(strike).toBeDefined();
    const retreat = log.filter((r) => r.tick > strike!.tick && r.intent === 'retreat');
    expect(retreat.length).toBeGreaterThan(0);
    expect(Math.max(...retreat.map((r) => Math.hypot(r.x - f.p.x, r.y - f.p.y)))).toBeGreaterThan(
      3.3,
    );
    expect(log.filter((r) => r.started).length).toBeGreaterThan(1);
  });
  it('Cindermoth is drawn toward nearby fire at night while waiting for permission', () => {
    const f = fixture(4);
    f.world.flags[f.world.index(28, 20)] = TileFlag.Burning;
    f.combat.configure({ ...f.combat.director.settings, player: { melee: 0, ranged: 0 } });
    for (let tick = 1; tick <= 90; tick++) f.combat.advance(tick, f.spatial, 20 * 60 + tick / 30);
    expect(f.store.x[f.slot]).toBeGreaterThan(25);
  });
  it('Cindermoth flutters and prefers element over strike', () => {
    const f = fixture(4),
      log = run(f, 300);
    expect(log.filter((r) => r.intent === 'element').length).toBeGreaterThan(
      log.filter((r) => r.intent === 'strike').length,
    );
    expect(log.some((r) => r.started)).toBe(true);
    expect(new Set(log.map((r) => r.y.toFixed(2))).size).toBeGreaterThan(5);
  });
  it('Ignicap retaliates once, retreats to warmth, and bursts when cornered', () => {
    const f = fixture(0);
    f.p.x = 23;
    f.combat.pursuits.set(f.store.id(f.slot), { target: 0, cause: 'retaliate', until: 4000 });
    f.world.fluid[f.world.index(28, 20)] = Fluid.Lava;
    const log = run(f, 150);
    expect(log.filter((r) => r.started)).toHaveLength(1);
    expect(log.some((r) => r.intent === 'flee')).toBe(true);
    const g = fixture(0);
    g.p.x = 23;
    for (const [x, y] of [
      [23, 20],
      [25, 20],
      [24, 19],
      [24, 21],
    ])
      g.world.flags[g.world.index(x!, y!)] = TileFlag.Solid;
    const corner = run(g, 120);
    expect(corner.some((r) => r.intent === 'element' && r.started)).toBe(true);
  });
});

describe('flight and reaction constraints', () => {
  it('does not change observations or utility scores when an unseen target moves', () => {
    const a = fixture(),
      b = fixture();
    for (const f of [a, b]) {
      f.combat.minds.alert(f.slot, 0, 1);
      const state = f.combat.minds.state;
      state.engage[f.slot] = Engagement.Engaged;
      state.until[f.slot] = 0;
      state.nextDecision[f.slot] = 0;
      f.store.facingX[f.slot] = 1;
      f.store.facingY[f.slot] = 0;
    }
    b.p.x = 18;
    for (const f of [a, b]) {
      f.combat.minds.grid.rebuild();
      f.combat.minds.fullRate[f.slot] = 1;
      f.combat.minds.decide(10);
    }
    expect(b.combat.minds.observations).toEqual(a.combat.minds.observations);
    expect(b.combat.minds.scores).toEqual(a.combat.minds.scores);
    expect(b.combat.minds.intent(b.slot)).toBe(a.combat.minds.intent(a.slot));
  });
  it('keeps a nearby herd mate in flocking when unrelated actors are closer', () => {
    const f = fixture(),
      mate = f.store.spawn(6, 23, 20);
    f.store.herd[mate] = f.store.herd[f.slot]!;
    f.store.vx[mate] = 2;
    f.store.vy[mate] = 3;
    for (let n = 0; n < 9; n++) {
      const other = f.store.spawn(1, 23.9, 20 + n * 0.01);
      f.store.herd[other] = 99;
    }
    f.combat.minds.grid.rebuild();
    const out = new Float64Array(7);
    f.combat.minds.grid.flock(f.slot, out, f.world);
    expect(Array.from(out)).toEqual([1, 0, 2, 3, -1, 0, 1]);
  });
  it.each([2, 4])(
    'species %i crosses water and two levels, lands for needs, and never passes solids',
    (species) => {
      const f = fixture(species),
        from = { x: 24.5, y: 20.5 },
        to = { x: 25.5, y: 20.5 },
        tile = f.world.index(to.x, to.y);
      f.world.fluid[tile] = Fluid.Freshwater;
      f.world.elevation[tile] = 2;
      expect(SurfaceRules.canStep(f.world, from, to, creatureTraversal(f.store, f.slot))).toBe(
        true,
      );
      f.store.mode[f.slot] = CreatureMode.Feed;
      expect(SurfaceRules.canStep(f.world, from, to, creatureTraversal(f.store, f.slot))).toBe(
        false,
      );
      f.store.mode[f.slot] = CreatureMode.Combat;
      f.world.flags[tile] = TileFlag.Solid;
      expect(SurfaceRules.canStep(f.world, from, to, creatureTraversal(f.store, f.slot))).toBe(
        false,
      );
    },
  );
  it('a reaction never decides in the first two ticks and preserves commitment', () => {
    const f = fixture();
    run(f, 20);
    const a = f.combat.minds.state;
    f.combat.minds.reaction(f.slot, 21);
    expect(a.reactionAt[f.slot]).toBeGreaterThanOrEqual(23);
    const intent = a.intent[f.slot];
    run(f, 2, 21);
    expect(a.intent[f.slot]).toBe(intent);
  });
});

describe('brain persistence and lifecycle', () => {
  it('keeps flying paths out of the walking cache', () => {
    const world = flatWorld(),
      nav = new NavigationService(world),
      start = { x: 4.5, y: 4.5 },
      goal = { x: 8.5, y: 4.5 };
    world.elevation.fill(2);
    world.elevation[world.index(start.x, start.y)] = 0;
    nav.request({ id: 'fly', start, goal, traversal: { water: true, lava: false, air: true } });
    nav.advance(1000);
    expect(nav.result('fly').status).toBe('found');
    nav.request({ id: 'walk', start, goal, traversal: { water: true, lava: false } });
    expect(nav.result('walk').status).toBe('pending');
    nav.advance(1000);
    expect(nav.result('walk').status).toBe('unreachable');
  });
  it('reduces visibility in reeds and flagged deep water', () => {
    const f = fixture();
    f.store.x[f.slot] = 26;
    const p = f.store.require(0),
      tile = f.world.index(f.store.x[p]!, f.store.y[p]!);
    f.combat.minds.grid.rebuild();
    expect(f.combat.minds.sees(f.slot, p)).toBe(true);
    f.world.flags[tile] = TileFlag.Reeds;
    expect(f.combat.minds.sees(f.slot, p)).toBe(false);
    f.world.flags[tile] = TileFlag.DeepWater;
    expect(f.combat.minds.sees(f.slot, p)).toBe(false);
  });
  it('masks attacks without permission or stamina and masks solo pack/follow/flank intents', () => {
    const f = fixture(0);
    f.combat.configure({ ...f.combat.director.settings, player: { melee: 0, ranged: 0 } });
    f.store.stamina[f.slot] = 0;
    const log = run(f, 90);
    expect(log.some((r) => r.started)).toBe(false);
    expect(
      log.some((r) => ['callPack', 'follow', 'flankLeft', 'flankRight'].includes(r.intent)),
    ).toBe(false);
  });
  it('rejects corrupted brain enums, duplicate identities and stale rules hashes in v8', () => {
    const h = new SimulationHost(42, 1, 0),
      save = h.snapshot(),
      invalid = structuredClone(save);
    invalid.combat.minds.records[0]!.values[0] = 9;
    expect(() => migrateSave(invalid)).toThrow(/mind engage/);
    const duplicate = structuredClone(save);
    duplicate.combat.minds.records.push(duplicate.combat.minds.records[0]!);
    expect(() => migrateSave(duplicate)).toThrow(/duplicate creature mind/);
    expect(() =>
      migrateSave({
        ...save,
        combat: { ...save.combat, minds: { ...save.combat.minds, rulesHash: 'stale' } },
      }),
    ).toThrow();
    h.dispose();
  });
  it('preserves full-host intent and motion through a validated mid-fight v8 save', () => {
    const h = new SimulationHost(42, 1, 30, 'c13:replay'),
      s = h.entities;
    const i = [...s.slots()].find((i) => !s.protected(i))!,
      id = s.id(i);
    s.species[i] = 6;
    s.hp[i] = s.maxHp(i);
    s.scene[i] = s.scene[s.require(0)]!;
    s.x[i] = h.player.x + 1;
    s.y[i] = h.player.y;
    s.facingX[i] = -1;
    s.facingY[i] = 0;
    h.combat.minds.reset();
    h.combat.pursuits.set(id, { target: 0, cause: 'territory', until: 4000 });
    h.player.invulnerableUntil = 5000;
    h.advance(47);
    const saved = migrateSave(h.snapshot()),
      resumed = new SimulationHost(42, 1, 30, 'c13:resumed');
    resumed.restore(saved);
    for (let n = 0; n < 150; n++) {
      h.step();
      resumed.step();
      const j = resumed.entities.require(id);
      expect([
        resumed.combat.minds.intent(j),
        resumed.entities.x[j],
        resumed.entities.y[j],
      ]).toEqual([h.combat.minds.intent(i), s.x[i], s.y[i]]);
    }
    h.dispose();
    resumed.dispose();
  });
  it('runs identical physiology and brain ordering through standalone and host-style preparation', () => {
    const a = fixture(4),
      b = fixture(4);
    for (const f of [a, b]) {
      f.combat.minds.alert(f.slot, 0, 0);
      const state = f.combat.minds.state;
      state.engage[f.slot] = Engagement.Engaged;
      state.until[f.slot] = 0;
      state.nextDecision[f.slot] = 0;
      f.store.stamina[f.slot] = 15.9;
      f.p.invulnerableUntil = 5000;
    }
    for (let tick = 1; tick <= 90; tick++) {
      a.combat.advance(tick, a.spatial);
      b.combat.prepareTick(tick, b.spatial);
      b.combat.advance(tick, b.spatial);
      expect(b.combat.snapshot()).toEqual(a.combat.snapshot());
      expect(b.store.snapshot()).toEqual(a.store.snapshot());
    }
  });
  it('migrates v7 bond hearts separately from trust and preserves a genuine in-flight legacy move', () => {
    const h = new SimulationHost(42, 1, 0),
      save = h.snapshot();
    const { minds: _minds, failedHunts: _failed, ...combat } = save.combat;
    const { reactionDelay: _delay, ...settings } = combat.director.settings;
    const old = {
      ...save,
      version: 7,
      entities: {
        ...save.entities,
        records: save.entities.records.map(({ bondHearts: _bond, ...r }) => r),
      },
      combat: { ...combat, director: { ...combat.director, settings } },
    };
    const migrated = migrateSave(old);
    expect(migrated.version).toBe(8);
    expect(migrated.entities.records.every((r) => r.bondHearts === 0)).toBe(true);
    expect(migrated.entities.records.map((r) => r.trust)).toEqual(
      save.entities.records.map((r) => r.trust),
    );
    h.restore(migrated);
    expect(h.snapshot()).toEqual(migrated);
    h.dispose();
    const f = fixture(),
      snapshot = f.combat.snapshot(),
      id = f.store.id(f.slot);
    snapshot.attacks = [[id, { kind: 'element', moveId: 'element', startedAt: 1, hit: [] }]];
    snapshot.director!.holds = [[id, 0, 'melee']];
    f.combat.restore(snapshot);
    f.combat.advance(2, f.spatial);
    expect(f.combat.presentation(id, 2)).toMatchObject({
      startedAt: 1,
      activeAt: 8,
      recoveryAt: 11,
      endsAt: 27,
    });
    expect(f.combat.snapshot().director!.holds).toContainEqual([id, 0, 'melee']);
  });
  it('prioritizes the inspected actor when more than 48 creatures are active', () => {
    const s = new EntityStore(70),
      p = player();
    s.spawnHuman(0, 1, 20, 20);
    bindBody(p, s, 0);
    for (let n = 0; n < 60; n++) s.spawn(6, 21 + n * 0.01, 20);
    const combat = new CombatSystem(s, p, [], flatWorld(64));
    combat.minds.grid.rebuild();
    for (let n = 0; n < 60; n++) combat.minds.state.engage[n] = Engagement.Engaged;
    const before = combat.snapshot(),
      debug = combat.minds.debug(s.id(59), 0);
    expect(debug).toHaveLength(48);
    expect(debug[0]!.id).toBe(s.id(59));
    expect(debug[0]!.observation).toHaveLength(64);
    expect(combat.snapshot()).toEqual(before);
  });
  it('does not let debug observation inspection change saved state', () => {
    const f = fixture();
    run(f, 30);
    const before = f.combat.snapshot();
    const observations = new Float32Array(f.combat.minds.observations);
    for (let n = 0; n < 30; n++) {
      const debug = f.combat.minds.debug(f.store.id(f.slot), 10000);
      expect(debug[0]!.observation![0]).toBeCloseTo(f.store.hp[f.slot]! / f.store.maxHp(f.slot));
    }
    expect(f.combat.minds.observations).toEqual(observations);
    expect(f.combat.snapshot()).toEqual(before);
  });
  it('validates focus/regroup and uses the same saved brain with a separate bond scale', () => {
    const f = fixture(),
      target = f.store.spawn(0, 23, 20);
    f.store.setNature(target, { response: 'avoid', aggression: [] });
    f.store.owner[f.slot] = 0;
    f.combat.pursuits.clear();
    f.combat.minds.grid.rebuild();
    expect(f.combat.minds.command('focus', 0, 1)).toBe(false);
    f.store.scene[target] = 1;
    expect(f.combat.minds.command('focus', f.store.id(target), 1)).toBe(false);
    f.store.scene[target] = 0;
    expect(f.combat.minds.command('focus', f.store.id(target), 1)).toBe(true);
    expect(f.combat.pursuits.get(f.store.id(f.slot))?.target).toBe(f.store.id(target));
    run(f, 20);
    expect(f.combat.minds.state.command[f.slot]).toBe(1);
    expect(f.combat.minds.command('regroup', undefined, 21)).toBe(true);
    run(f, 20, 21);
    expect(f.combat.minds.intent(f.slot)).toBe('follow');
    expect(f.combat.snapshot().director!.holds.some(([id]) => id === f.store.id(f.slot))).toBe(
      false,
    );
  });
  it('clears recycled slots, retired targets and scene-specific commands', () => {
    const f = fixture();
    run(f, 20);
    const old = f.store.id(f.slot);
    f.store.retire(f.slot);
    f.combat.pruneRetired();
    const replacement = f.store.spawn(6, 25, 25);
    f.combat.minds.sync();
    expect(f.store.id(replacement)).not.toBe(old);
    expect(f.combat.minds.state.engage[replacement]).toBe(Engagement.Calm);
    expect(f.combat.minds.state.target[replacement]).toBe(-1);
    expect(f.combat.minds.state.homeX[replacement]).toBe(25);
    f.store.owner[replacement] = 0;
    f.combat.minds.command('regroup', undefined, 21);
    f.store.scene[replacement] = 1;
    f.combat.minds.sync();
    expect(f.combat.minds.state.command[replacement]).toBe(0);
    expect(f.combat.minds.state.target[replacement]).toBe(-1);
  });
  it('validates reaction settings through the current command path', () => {
    const h = new SimulationHost(42, 1, 0);
    const settings = h.combat.director.settings;
    expect(
      send(h, {
        type: 'configureCombat',
        settings: { ...settings, reactionDelay: { min: 1, max: 4 } },
      }).ok,
    ).toBe(false);
    expect(
      send(h, {
        type: 'configureCombat',
        settings: { ...settings, reactionDelay: { min: 4, max: 2 } },
      }).ok,
    ).toBe(false);
    expect(
      send(h, {
        type: 'configureCombat',
        settings: { ...settings, reactionDelay: { min: 3, max: 5 } },
      }).ok,
    ).toBe(true);
    h.dispose();
  });
});
