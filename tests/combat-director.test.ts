import { describe, expect, it } from 'vitest';
import {
  CombatDirector,
  CombatSettingsSchema,
  DEFAULT_COMBAT_SETTINGS,
} from '../src/domain/combat-director';
import { CombatSystem, attackDefinition } from '../src/domain/combat';
import { EntityStore, bindBody } from '../src/domain/entities';
import { SpatialIndex } from '../src/domain/navigation';
import { SimulationHost } from '../src/domain/simulation';
import { migrateSave } from '../src/domain/save-schema';
import { CREATURE_MOVES } from '../src/content/definitions';
import { CameraController, WorldProjection } from '../src/presentation/projection';
import { telegraphBounds } from '../src/presentation/telegraphs';
import { flatWorld, player, send } from './helpers';

function pack(count = 20, world = false) {
  const store = new EntityStore(count + 4),
    p = player();
  store.spawnHuman(0, 1, 20, 20);
  bindBody(p, store, 0);
  const combat = new CombatSystem(store, p, [], world ? flatWorld(64) : undefined);
  const ids: number[] = [];
  for (let n = 0; n < count; n++) {
    const a = store.spawn(6, 21, 20),
      id = store.id(a);
    ids.push(id);
    combat.pursuits.set(id, { target: 0, cause: 'territory', until: 3000 });
  }
  return { store, p, combat, ids, spatial: new SpatialIndex() };
}

describe('combat director', () => {
  it('retains full unsigned entity IDs and lets accumulated waiting outrank new arrivals', () => {
    const d = new CombatDirector(4);
    d.touch(0, 0xfffffffe);
    d.touch(1, 100);
    d.touch(2, 0xfffffffd);
    d.begin();
    d.consider(0, 0xfffffffd, 2, 'melee', 0, 0.1, 2, 2);
    d.begin();
    d.consider(1, 0xfffffffd, 2, 'melee', 90, 1, 1, 2);
    d.consider(0, 0xfffffffd, 2, 'melee', 90, 0.1, 2, 2);
    expect(d.next(90)).toBe(0);
    d.commit(0, 2, 'melee', 90);
    expect(d.snapshot().holds).toEqual([[0xfffffffe, 0xfffffffd, 'melee']]);
  });
  it('holds the token for all 7 windup, 3 active and 16 recovery ticks', () => {
    const { combat, ids, spatial, p } = pack(1);
    p.invulnerableUntil = 100;
    for (let tick = 1; tick <= 26; tick++) {
      combat.advance(tick, spatial);
      expect(combat.snapshot().director!.holds).toHaveLength(1);
      const timing = combat.presentation(ids[0]!, tick)!;
      expect(timing).toMatchObject({ startedAt: 1, activeAt: 8, recoveryAt: 11, endsAt: 27 });
      expect(combat.telegraph(ids[0]!, tick)?.phase).toBe(
        tick < 8 ? 'windup' : tick < 11 ? 'active' : undefined,
      );
    }
    combat.advance(27, spatial);
    expect(combat.snapshot().director!.holds).toHaveLength(0);
  });
  it('limits actual attack phases and staggers a 20-creature pack through recovery', () => {
    const { combat, p, spatial } = pack();
    const starts = new Set<number>();
    let previous = -100;
    for (let tick = 1; tick < 200; tick++) {
      p.hp = p.maxHp;
      combat.advance(tick, spatial);
      const state = combat.snapshot();
      expect(state.attacks.length).toBeLessThanOrEqual(2);
      expect(state.director!.holds).toHaveLength(state.attacks.length);
      for (const [, action] of state.attacks) {
        const def = attackDefinition(action);
        expect(tick - action.startedAt).toBeLessThan(def.windup + def.active + def.recovery);
        if (!starts.has(action.startedAt)) {
          expect(action.startedAt - previous).toBeGreaterThanOrEqual(8);
          previous = action.startedAt;
          starts.add(previous);
        }
      }
    }
    expect(starts.size).toBeGreaterThan(10);
  });
  it('ranks independently of insertion order and breaks ties by entity ID', () => {
    const d = new CombatDirector(10);
    d.touch(0, 100);
    d.touch(1, 101);
    d.touch(2, 0);
    d.begin();
    d.consider(1, 0, 2, 'melee', 10, 0.8, 1, 2);
    d.consider(0, 0, 2, 'melee', 10, 0.8, 1, 2);
    expect(d.next(10)).toBe(0);
    expect(d.next(10)).toBe(-1);
    d.commit(0, 2, 'melee', 10);
    d.begin();
    d.occupied(2, 1);
    d.consider(1, 0, 2, 'melee', 17, 0.8, 1, 2);
    expect(d.next(17)).toBe(-1);
    d.begin();
    d.occupied(2, 1);
    d.consider(1, 0, 2, 'melee', 18, 0.8, 1, 2);
    expect(d.next(18)).toBe(1);
  });
  it('uses independent melee/ranged categories and per-target limits', () => {
    const d = new CombatDirector(12);
    for (let n = 0; n < 12; n++) d.touch(n, n + 100);
    d.begin();
    d.occupied(8, 1);
    d.occupied(8, 1);
    d.consider(0, 108, 8, 'melee', 10, 1, 1, 2);
    d.consider(1, 108, 8, 'ranged', 10, 1, 1, 1);
    d.consider(2, 109, 9, 'melee', 10, 1, 1, 1);
    expect(d.next(10)).toBe(1);
    expect(d.next(10)).toBe(2);
    expect(d.next(10)).toBe(-1);
  });
  it.each(['player', 'partner', 'villager', 'wild'] as const)(
    'applies the %s target pool through actual attacks',
    (kind) => {
      const { combat, store, ids, spatial, p } = pack(5);
      const b =
        kind === 'player'
          ? store.require(0)
          : kind === 'villager'
            ? store.spawnHuman(1, 1, 20, 20)
            : store.spawn(1, 20, 20, kind === 'partner' ? 0 : -1);
      const target = store.id(b),
        limits = DEFAULT_COMBAT_SETTINGS[kind];
      for (let n = 0; n < ids.length; n++) {
        if (n >= 3) store.species[store.require(ids[n]!)] = 1;
        combat.pursuits.set(ids[n]!, { target, cause: 'territory', until: 3000 });
      }
      const granted = new Set<string>();
      for (let tick = 1; tick < 120; tick++) {
        p.hp = p.maxHp;
        store.hp[b] = store.maxHp(b);
        combat.advance(tick, spatial);
        const holds = combat.snapshot().director!.holds.filter(([, id]) => id === target);
        for (const category of ['melee', 'ranged'] as const) {
          expect(holds.filter(([, , cat]) => cat === category).length).toBeLessThanOrEqual(
            limits[category],
          );
          if (holds.some(([, , cat]) => cat === category)) granted.add(category);
        }
      }
      expect([...granted].sort()).toEqual(['melee', 'ranged']);
    },
  );
  it('clears holds on cancel, changed targets, scene changes and retirement', () => {
    const { combat, store, ids, spatial } = pack(2);
    combat.advance(1, spatial);
    expect(combat.snapshot().director!.holds).toHaveLength(1);
    combat.cancelAction(ids[0]!);
    expect(combat.snapshot().director!.holds).toHaveLength(0);
    combat.advance(9, spatial);
    for (const [id] of combat.snapshot().attacks) store.scene[store.require(id)] = 1;
    combat.advance(10, spatial);
    expect(combat.snapshot().director!.holds).toHaveLength(0);
    const a = store.require(ids[0]!);
    store.retire(a);
    combat.pruneRetired();
    const replacement = store.spawn(6, 21, 20);
    expect(store.id(replacement)).not.toBe(ids[0]);
    expect(combat.snapshot().director!.holds.some(([id]) => id === ids[0])).toBe(false);
  });
  it('rejects off-screen and cross-scene selections at the content-space boundary', () => {
    const { combat, store, ids, spatial } = pack(1);
    const a = store.require(ids[0]!);
    store.y[a] = 27.51;
    combat.advance(1, spatial);
    expect(combat.director.selected[a]).toBe(0);
    store.y[a] = 27.5;
    combat.advance(2, spatial);
    expect(combat.director.selected[a]).toBe(1);
    store.scene[a] = 1;
    combat.advance(3, spatial);
    expect(combat.director.selected[a]).toBe(0);
    const camera = new CameraController(new WorldProjection());
    camera.follow(20, 20, 0, 0);
    camera.follow(21, 21, 0, 10);
    const edge = camera.projection.screen(21, 28.5, 4, camera);
    expect(edge.y).toBeGreaterThanOrEqual(0);
    expect(edge.y).toBeLessThanOrEqual(1080);
  });
  it('releases old-target holds and retired-target waits before the next checkpoint', () => {
    const { combat, store, ids, spatial } = pack(2);
    combat.advance(1, spatial);
    const targetSlot = store.spawn(1, 20, 20),
      target = store.id(targetSlot);
    combat.pursuits.set(ids[0]!, { target, cause: 'territory', until: 3000 });
    combat.advance(2, spatial);
    expect(combat.snapshot().director!.holds.some(([id]) => id === ids[0])).toBe(false);
    combat.pursuits.set(ids[1]!, { target, cause: 'territory', until: 3000 });
    combat.advance(3, spatial);
    store.retire(targetSlot);
    combat.pruneRetired();
    const state = combat.snapshot().director!;
    expect(state.holds.some(([, id]) => id === target)).toBe(false);
    expect(state.waiting.some(([, id]) => id === target)).toBe(false);
    expect(state.grants.some(([id]) => id === target)).toBe(false);
  });
  it('keeps waiting creatures near the ring without spending attack stamina', () => {
    const { combat, store, ids, spatial, p } = pack(2, true);
    combat.configure({ ...DEFAULT_COMBAT_SETTINGS, player: { melee: 0, ranged: 0 } });
    for (let tick = 1; tick <= 90; tick++) combat.advance(tick, spatial);
    for (const id of ids) {
      const a = store.require(id);
      expect(Math.hypot(store.x[a]! - p.x, store.y[a]! - p.y)).toBeCloseTo(3.4, 0);
      expect(store.stamina[a]).toBe(100);
    }
    expect(combat.snapshot().attacks).toHaveLength(0);
  });
  it('shows predator cues on windup tick zero, then clears on cancel', () => {
    const { combat, ids, spatial } = pack(1);
    combat.advance(1, spatial);
    expect(combat.telegraph(ids[0]!, 1)).toMatchObject({
      kind: 'ground',
      predator: true,
      phase: 'windup',
    });
    combat.cancelAction(ids[0]!);
    expect(combat.telegraph(ids[0]!, 1)).toBeUndefined();
  });
  it.each([0, 1, 2, 3, 4, 5, 6, 7])(
    'telegraphs qualifying species %i even while the target guards and wellbeing can recover',
    (species) => {
      const { combat, store, ids, spatial, p } = pack(1);
      const a = store.require(ids[0]!);
      store.species[a] = species;
      store.level[a] = 40;
      store.food[a] = store.water[a] = store.rest[a] = 0.1;
      p.guarding = true;
      combat.advance(1, spatial);
      const category = CREATURE_MOVES[store.definition(a).id].category;
      expect(combat.telegraph(ids[0]!, 1)).toMatchObject({
        kind: category === 'melee' ? 'ground' : 'glint',
        phase: 'windup',
      });
    },
  );
  it('shows follow, defensive guard and attack from the existing partner state', () => {
    const { combat, ids, spatial } = pack(1);
    expect(combat.partnerIntent(ids[0]!, 1)).toBe('guard');
    combat.advance(1, spatial);
    expect(combat.partnerIntent(ids[0]!, 1)).toBe('attack');
    combat.cancelAction(ids[0]!);
    combat.pursuits.clear();
    expect(combat.partnerIntent(ids[0]!, 1)).toBe('follow');
  });
  it('replays a mid-fight save and migrates v6 attack timing without restarting', () => {
    const a = new SimulationHost(42, 1, 30, 'world:c14'),
      b = new SimulationHost(42, 1, 30, 'world:c14');
    const slot = [...a.entities.slots()].find((i) => !a.entities.protected(i))!;
    const id = a.entities.id(slot);
    a.entities.x[slot] = a.player.x + 1;
    a.entities.y[slot] = a.player.y;
    a.combat.pursuits.set(id, { target: 0, cause: 'territory', until: 3000 });
    a.step();
    const saved = a.snapshot();
    b.restore(saved);
    for (let n = 0; n < 60; n++) {
      a.step();
      b.step();
    }
    expect(b.snapshot().combat).toEqual(a.snapshot().combat);
    expect(b.player.hp).toBe(a.player.hp);
    const { director: _director, ...legacyCombat } = saved.combat;
    const old = { ...saved, version: 6, combat: legacyCombat };
    const migrated = migrateSave(old);
    expect(migrated.combat.attacks).toEqual(saved.combat.attacks);
    expect(migrated.combat.director.holds.length).toBe(saved.combat.attacks.length);
    a.dispose();
    b.dispose();
  });
  it('validates difficulty commands while paused and persists accepted settings', () => {
    const h = new SimulationHost(42, 1, 0);
    expect(
      CombatSettingsSchema.safeParse({ ...DEFAULT_COMBAT_SETTINGS, grantSpacing: 7 }).success,
    ).toBe(false);
    expect(
      CombatSettingsSchema.safeParse({ ...DEFAULT_COMBAT_SETTINGS, aggressionBias: Infinity })
        .success,
    ).toBe(false);
    expect(
      CombatSettingsSchema.safeParse({ ...DEFAULT_COMBAT_SETTINGS, wild: { melee: -1, ranged: 1 } })
        .success,
    ).toBe(false);
    send(h, { type: 'pause', token: 'menu' });
    expect(
      send(h, {
        type: 'configureCombat',
        settings: { ...DEFAULT_COMBAT_SETTINGS, grantSpacing: 12 },
      }).ok,
    ).toBe(true);
    expect(h.snapshot().combat.director.settings.grantSpacing).toBe(12);
    h.dispose();
  });
  it('reserves a bounded even-pixel region for each cue', () => {
    const b = telegraphBounds(
      {
        kind: 'ground',
        target: 0,
        range: 1.9,
        facingX: 1,
        facingY: 0,
        phase: 'windup',
        predator: true,
      },
      101,
      201,
      64,
    );
    expect(Object.values(b).every((v) => v % 2 === 0)).toBe(true);
    expect(b.width).toBeGreaterThan(CREATURE_MOVES.bramblefang.range * 128);
  });
});
