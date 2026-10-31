import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import {
  EntityStore,
  bindBody,
  NatureRules,
  SleepSystem,
  PASSIVE,
  NEUTRAL,
} from '../src/domain/entities';
import { NeedsSystem, WellbeingPolicy } from '../src/domain/creatures';
import { SimulationHost } from '../src/domain/simulation';
import { migrateSave } from '../src/domain/save-schema';
import { CombatSystem, ElementPolicy } from '../src/domain/combat';
import { TwoSlotInventory, RecipeRegistry } from '../src/domain/inventory';
import { ResourceStore, ResourceLocator, HarvestSystem } from '../src/domain/resources';
import { EcologyService, SurvivalController } from '../src/domain/survival';
import { SpatialIndex, NavigationService } from '../src/domain/navigation';
import { SeededRandom } from '../src/domain/core';
import { flatWorld, player, send } from './helpers';

describe('unified bodies and stable identities', () => {
  it('shares human position, health, progression and affinity through body references', () => {
    const s = new EntityStore(4),
      p = player(),
      slot = s.spawnHuman(0, 1, 4, 4);
    bindBody(p, s, 0);
    p.x = 7;
    p.hp = 42;
    p.experience = 25;
    p.level = 2;
    expect(s.x[slot]).toBe(7);
    expect(s.hp[slot]).toBe(42);
    expect(s.experience[slot]).toBe(25);
    expect(p.maxHp).toBe(105);
    expect(s.definition(slot).id).toBe('human');
    expect(ElementPolicy.against('fire', s.definition(slot).elements)).toBe(0.75);
  });
  it('reuses storage while never reusing an identity', () => {
    const s = new EntityStore(1),
      a = s.spawn(0, 4, 4),
      old = s.id(a);
    s.retire(a);
    const b = s.spawn(1, 5, 5);
    expect(b).toBe(a);
    expect(s.id(b)).toBeGreaterThan(old);
    expect(s.slot(old)).toBeUndefined();
    const copy = new EntityStore(1);
    copy.restore(s.snapshot());
    expect(copy.id(copy.spawnHuman(0, 1, 4, 4))).toBe(0);
  });
  it('persists profile preferences and restrictions independently of species eligibility', () => {
    const s = new EntityStore(2),
      a = s.spawnHuman(0, 1, 4, 4);
    s.preferDiet(a, ['fungi']);
    s.restrictDiet(a, ['meat', 'meal']);
    const copy = new EntityStore(2);
    copy.restore(s.snapshot());
    expect(copy.diet(a)[0]).toBe('fungi');
    expect(copy.diet(a)).not.toContain('meat');
  });
  it('transports identities larger than the exact Float32 integer range', () => {
    const host = new SimulationHost(42, 1, 24),
      state = host.entities.snapshot();
    state.nextId = 16777217;
    host.entities.restore(state);
    const slot = host.entities.spawn(2, host.player.x + 1, host.player.y),
      id = host.entities.id(slot),
      frame = host.frame();
    expect(id).toBe(16777217);
    expect([...frame.ids]).toContain(id);
    structuredClone(frame, { transfer: [frame.packed.buffer] });
    expect(host.entities.id(slot)).toBe(id);
  });
  it('creates 1,031 living entities with approximately four percent predators', () => {
    const host = new SimulationHost(42, 1, 1000);
    expect(host.entities.livingCount).toBe(1031);
    expect(host.entities.wildlifeCount).toBe(1000);
    expect(
      [...host.entities.slots()].filter(
        (i) => host.entities.species[i] === 6 || host.entities.species[i] === 7,
      ),
    ).toHaveLength(40);
  });
});

describe('physiology and latched sleep', () => {
  it('uses five needs without changing maximum HP or earned experience', () => {
    const s = new EntityStore(1),
      i = s.spawn(1, 4, 4);
    s.food[i] = s.water[i] = s.recreation[i] = s.cleanliness[i] = 1;
    s.rest[i] = 0;
    s.experience[i] = 99;
    expect(s.wellbeing(i)).toBe(0.8);
    expect(s.maxHp(i)).toBe(72);
    expect(s.experience[i]).toBe(99);
    expect(WellbeingPolicy.speed(0)).toBe(0.25);
    expect(SleepSystem.metabolism(0, false)).toBe(1.25);
    expect(SleepSystem.metabolism(1, false)).toBe(1);
    expect(SleepSystem.metabolism(0, true)).toBe(0.5);
  });
  it('keeps forced sleep latched through partial recovery and storage', () => {
    const s = new EntityStore(1),
      i = s.spawn(1, 4, 4);
    s.rest[i] = 0;
    SleepSystem.update(s, i, 0, 0);
    expect(s.sleeping[i]).toBe(1);
    expect(s.forcedRest[i]).toBe(1);
    SleepSystem.update(s, i, 120, 120);
    expect(s.rest[i]).toBeCloseTo(0.25);
    expect(s.forcedRest[i]).toBe(1);
    const copy = new EntityStore(1);
    copy.restore(s.snapshot());
    SleepSystem.update(copy, i, 119, 239);
    expect(copy.sleeping[i]).toBe(1);
    SleepSystem.update(copy, i, 2, 241);
    expect(copy.forcedRest[i]).toBe(0);
    expect(copy.sleeping[i]).toBe(0);
  });
  it('emergency waking retains the obligation and resumes when safe', () => {
    const s = new EntityStore(1),
      i = s.spawn(1, 4, 4);
    s.rest[i] = 0;
    SleepSystem.update(s, i, 0, 0);
    SleepSystem.interrupt(s, i, 10);
    expect(s.sleeping[i]).toBe(0);
    expect(s.forcedRest[i]).toBe(1);
    SleepSystem.update(s, i, 1, 11);
    expect(s.sleeping[i]).toBe(0);
    SleepSystem.update(s, i, 0, 16);
    expect(s.sleeping[i]).toBe(1);
    s.water[i] = 0.01;
    SleepSystem.update(s, i, 1, 17);
    expect(s.sleeping[i]).toBe(0);
    expect(s.forcedRest[i]).toBe(1);
  });
  it('never sleeps or recovers Rest on a corpse or downed body', () => {
    const s = new EntityStore(1),
      i = s.spawn(0, 4, 4);
    s.hp[i] = 0;
    s.rest[i] = 0;
    expect(SleepSystem.begin(s, i)).toBe(false);
    SleepSystem.update(s, i, 100, 100);
    expect(s.hp[i]).toBe(0);
    expect(s.rest[i]).toBe(0);
    expect(s.sleeping[i]).toBe(0);
  });
  it('voluntary sleep restores to full and sleeping metabolism is lower', () => {
    const s = new EntityStore(2),
      a = s.spawn(1, 4, 4),
      b = s.spawn(1, 5, 4);
    s.rest[a] = s.rest[b] = 0.5;
    SleepSystem.begin(s, a);
    new NeedsSystem().advance(s, 30, 30, { x: 100, y: 100 }, false);
    expect(s.food[a]).toBeGreaterThan(s.food[b]!);
    expect(s.rest[a]).toBeGreaterThan(0.5);
    expect(s.rest[b]).toBeLessThan(0.5);
    SleepSystem.update(s, a, 240, 270);
    expect(s.rest[a]).toBe(1);
    expect(s.sleeping[a]).toBe(0);
  });
  it('stops acceleration on waking, critical needs, damage and nested pauses', () => {
    const h = new SimulationHost(42, 1, 24),
      p = h.entities.require(0);
    expect(send(h, { type: 'sleep' }).ok).toBe(true);
    expect(send(h, { type: 'accelerate', factor: 8 }).ok).toBe(true);
    expect(h.timeScale).toBe(8);
    h.entities.water[p] = 0.05;
    h.step();
    expect(h.timeScale).toBe(1);
    h.entities.water[p] = 1;
    send(h, { type: 'sleep' });
    send(h, { type: 'accelerate', factor: 8 });
    send(h, { type: 'wake' });
    expect(h.timeScale).toBe(1);
    send(h, { type: 'sleep' });
    send(h, { type: 'accelerate', factor: 8 });
    send(h, { type: 'pause', token: 'menu' });
    expect(h.timeScale).toBe(1);
    const tick = h.tick;
    h.advance(8);
    expect(h.tick).toBe(tick);
  });
  it('lets human eating and finite services restore actual needs', () => {
    const h = new SimulationHost(42, 1, 24),
      p = h.entities.require(0);
    h.entities.food[p] = 0.2;
    h.entities.water[p] = 0.2;
    h.inventory.add('berries');
    expect(send(h, { type: 'use', slot: 0 }).ok).toBe(true);
    expect(h.entities.food[p]).toBeCloseTo(0.55);
    const pantry = h.resources.supply(h.player)!,
      before = pantry.stock.berries!;
    expect(send(h, { type: 'service', action: 'eat' }).ok).toBe(true);
    expect(pantry.stock.berries).toBe(before - 1);
    expect(send(h, { type: 'service', action: 'drink' }).ok).toBe(true);
    expect(h.entities.water[p]).toBe(1);
  });
  it('NPC companions consume real supplies without a personal inventory', () => {
    const s = new EntityStore(1),
      i = s.spawn(1, 4.5, 4.5, 1),
      world = flatWorld(),
      resources = new ResourceStore(world);
    Object.assign(resources.supplies[0]!, { x: 4.5, y: 4.5, stock: { reeds: 1 } });
    s.food[i] = 0.2;
    const ai = new SurvivalController(
      s,
      world,
      resources,
      new ResourceLocator(resources),
      new NavigationService(world),
    );
    expect(ai.decide(i, 0)).toBe(true);
    ai.move(i, 1, 0);
    expect(resources.supplies[0]!.stock.reeds).toBe(0);
    expect(s.food[i]).toBeCloseTo(0.45);
  });
});

describe('nature, social attacks and predation', () => {
  it('derives mutually consistent Nature labels', () => {
    const s = new EntityStore(3),
      a = s.spawn(2, 4, 4),
      b = s.spawn(6, 5, 4);
    s.setNature(a, PASSIVE);
    expect(s.displayNature(a)).toEqual(['Passive']);
    s.setNature(a, NEUTRAL);
    expect(s.displayNature(a)).toEqual(['Neutral']);
    s.setNature(a, { response: 'avoid', aggression: [{ target: 'human', radius: 6 }] });
    expect(s.displayNature(a)).toEqual(['Hostile-human']);
    expect(s.displayNature(b)).toContain('Hostile-zephyrit');
    expect(s.displayNature(b)).not.toContain('Passive');
  });
  it('allows same-species conflict but rejects hunting and raw or processed cannibalism', () => {
    const s = new EntityStore(3),
      a = s.spawn(6, 4, 4),
      b = s.spawn(6, 5, 4),
      prey = s.spawn(2, 6, 4);
    s.food[a] = 0.2;
    expect(NatureRules.canAttack(s, a, b)).toBe(true);
    expect(NatureRules.canHunt(s, a, b)).toBe(false);
    expect(NatureRules.canHunt(s, a, prey)).toBe(true);
    const inventory = new TwoSlotInventory();
    inventory.add('meat', ['bramblefang']);
    inventory.add('nectar');
    inventory.combine(new RecipeRegistry());
    expect(inventory.state[0]!.originSpecies).toEqual(['bramblefang']);
    expect(NatureRules.canConsume(s, a, inventory.state[0]!)).toBe(false);
    expect(NatureRules.canConsume(s, a, { id: 'meat' })).toBe(false);
    expect(NatureRules.canConsume(s, a, { id: 'meat', originSpecies: ['zephyrit'] })).toBe(true);
  });
  it('protects humans and bonded companions from hunting and edible remains', () => {
    const s = new EntityStore(2),
      a = s.spawn(6, 4, 4),
      b = s.spawn(2, 5, 4, 0),
      human = s.spawnHuman(0, 1, 6, 4);
    expect(NatureRules.canHunt(s, a, b)).toBe(false);
    expect(NatureRules.canHunt(s, a, human)).toBe(false);
    const resources = new ResourceStore(flatWorld()),
      ecology = new EcologyService(s, resources.world, resources, new SeededRandom(1));
    s.hp[b] = s.hp[human] = 0;
    ecology.resolveDeaths(0);
    expect(resources.carrion).toHaveLength(0);
    expect(s.slot(s.id(b))).toBe(b);
  });
  it('checks hunger hysteresis and preserves an active hunt across save/load', () => {
    const s = new EntityStore(3),
      h = s.spawn(6, 4, 4),
      prey = s.spawn(2, 5, 4);
    expect(NatureRules.canHunt(s, h, prey)).toBe(false);
    s.food[h] = 0.5;
    expect(NatureRules.canHunt(s, h, prey)).toBe(false);
    expect(NatureRules.canHunt(s, h, prey, true)).toBe(true);
    const p = player();
    s.spawnHuman(0, 1, 12, 12);
    bindBody(p, s, 0);
    const combat = new CombatSystem(s, p, []),
      state = combat.snapshot();
    state.hunting = [s.id(h)];
    state.pursuits = [[s.id(h), { target: s.id(prey), cause: 'hunt', until: 600 }]];
    combat.restore(state);
    combat.advance(31, new SpatialIndex());
    expect(combat.pursuits.get(s.id(h))?.cause).toBe('hunt');
    s.food[h] = 0.81;
    expect(NatureRules.canHunt(s, h, prey, true)).toBe(false);
  });
  it('reserves a hunt for one hunter and releases retired navigation work', () => {
    const s = new EntityStore(4),
      a = s.spawn(6, 4, 4),
      b = s.spawn(6, 4, 5),
      prey = s.spawn(2, 5, 4),
      p = player();
    s.spawnHuman(0, 1, 12, 12);
    bindBody(p, s, 0);
    s.food[a] = s.food[b] = 0.2;
    const spatial = new SpatialIndex();
    for (const slot of s.slots()) spatial.insert(slot, s.x[slot]!, s.y[slot]!);
    const combat = new CombatSystem(s, p, []);
    combat.advance(30, spatial);
    expect(
      [...combat.pursuits.values()].filter((p) => p.cause === 'hunt' && p.target === s.id(prey)),
    ).toHaveLength(1);
    const world = flatWorld(),
      resources = new ResourceStore(world),
      navigation = new NavigationService(world);
    Object.assign(resources.supplies[0]!, { x: 8, y: 8, stock: { reeds: 1 } });
    const eater = s.spawn(1, 4, 4, 1),
      ai = new SurvivalController(s, world, resources, new ResourceLocator(resources), navigation);
    s.food[eater] = 0.1;
    ai.decide(eater, 0);
    const id = s.id(eater);
    navigation.request({ id: `survival:${id}`, start: { x: 4, y: 4 }, goal: { x: 8, y: 8 } });
    s.retire(eater);
    ai.pruneRetired();
    expect(navigation.pending).toBe(0);
    expect(ai.active(eater)).toBe(false);
  });
  it('does not consume food while sleeping and uses the same fatigue tiers for humans', () => {
    const s = new EntityStore(1),
      i = s.spawnHuman(0, 1, 4, 4);
    SleepSystem.begin(s, i);
    expect(NatureRules.canConsume(s, i, { id: 'berries' })).toBe(false);
    const h = new SimulationHost(42, 1, 24);
    h.inventory.add('berries');
    send(h, { type: 'sleep' });
    expect(send(h, { type: 'use', slot: 0 }).ok).toBe(false);
    expect(h.inventory.state[0]?.id).toBe('berries');
    expect(send(h, { type: 'service', action: 'eat' }).ok).toBe(false);
  });
  it('hunts only when hungry, handles passive flight, and grants no ambient XP', () => {
    const s = new EntityStore(3),
      world = flatWorld(32),
      p = player();
    s.spawnHuman(0, 1, 28, 28);
    bindBody(p, s, 0);
    const hunter = s.spawn(6, 4.5, 4.5),
      prey = s.spawn(2, 5.5, 4.5);
    s.hp[prey] = 1;
    const combat = new CombatSystem(s, p, [], world),
      spatial = new SpatialIndex();
    const rebuild = () => {
      spatial.clear();
      for (const i of s.slots()) spatial.insert(i, s.x[i]!, s.y[i]!);
    };
    s.food[hunter] = 0.9;
    rebuild();
    combat.advance(30, spatial);
    expect(combat.pursuits.has(s.id(hunter))).toBe(false);
    s.food[hunter] = 0.2;
    rebuild();
    combat.advance(60, spatial);
    expect(combat.pursuits.get(s.id(hunter))?.cause).toBe('hunt');
    for (let tick = 61; tick < 100; tick++) {
      rebuild();
      combat.advance(tick, spatial);
    }
    expect(s.hp[prey]).toBe(0);
    expect(p.experience).toBe(0);
    expect(s.experience[hunter]).toBe(0);
  });
  it('requires edible unbonded prey before replenishing a predator population', () => {
    const s = new EntityStore(4),
      world = flatWorld(32),
      resources = new ResourceStore(world);
    world.biome.fill(1);
    s.spawn(2, 15, 15, 0);
    s.spawn(2, 16, 15, 1);
    const ecology = new EcologyService(s, world, resources, new SeededRandom(42));
    ecology.target = 100;
    ecology.replacements.push({ species: 6, due: 0, sourceId: 999 });
    ecology.replenish(1);
    expect(ecology.births).toBe(0);
    expect(ecology.replacements).toHaveLength(1);
  });
  it('does not turn an unrelated companion assault into a rewarded duel', () => {
    const h = new SimulationHost(42, 1, 24),
      s = h.entities,
      duelist = h.npcs.findIndex((n) => n.partner !== null),
      npc = h.npcs[duelist]!;
    const opponent = s.require(npc.partner!),
      other = h.npcs.find((n) => n.partner !== null && n !== npc)!,
      victim = s.require(other.partner!);
    const ally = [...s.slots()].find((i) => !s.isHuman(i) && s.owner[i] === -1)!;
    s.owner[ally] = 0;
    s.x[ally] = h.player.x - 1;
    s.y[ally] = h.player.y;
    npc.x = h.player.x;
    npc.y = h.player.y;
    s.x[opponent] = h.player.x + 3.5;
    s.y[opponent] = h.player.y;
    expect(h.combat.encounters.startBattle(duelist, 0, h.tick)).toMatch(/begun/);
    s.x[victim] = h.player.x + 1;
    s.y[victim] = h.player.y;
    s.hp[victim] = 1;
    h.player.facingX = 1;
    h.player.facingY = 0;
    const spatial = new SpatialIndex();
    for (const i of s.slots()) spatial.insert(i, s.x[i]!, s.y[i]!);
    expect(h.combat.attack('strike', 0)).toBe(true);
    for (let tick = 0; tick < 6; tick++) h.combat.advance(tick, spatial);
    expect(s.hp[victim]).toBe(0);
    expect(s.downed[victim]).toBe(1);
    expect(h.player.experience).toBe(0);
    expect(h.combat.encounters.encounters.some((e) => e.target === s.id(victim))).toBe(false);
  });
  it('remembers bounded nonlethal villager assaults, retaliates and disallows dialogue escape', () => {
    const h = new SimulationHost(42, 1, 24),
      npc = h.npcs[10]!,
      body = h.entities.require(npc.entityId);
    npc.x = h.player.x + 1;
    npc.y = h.player.y;
    h.player.facingX = 1;
    h.player.facingY = 0;
    h.advance(10);
    npc.x = h.player.x + 1;
    npc.y = h.player.y;
    const affinity = npc.affinity;
    expect(send(h, { type: 'attack', kind: 'strike' }).ok).toBe(true);
    h.advance(5);
    expect(h.entities.hp[body]).toBeLessThan(100);
    expect(npc.affinity).toBe(affinity - 10);
    expect(
      npc.memory.records.some(
        (m) => m.text.includes('assault') && m.subjects.includes('player') && m.sourceIds.length,
      ),
    ).toBe(true);
    expect(h.combat.active(npc.entityId)).toBe(true);
    expect(send(h, { type: 'interact', npcId: npc.profileId }).ok).toBe(false);
    expect(h.player.experience).toBe(0);
    expect(h.resources.carrion.some((c) => c.species === 'human')).toBe(false);
    h.entities.hp[body] = 1;
    h.player.attack = null;
    h.player.stamina = 100;
    npc.x = h.player.x + 1;
    npc.y = h.player.y;
    expect(send(h, { type: 'attack', kind: 'strike' }).ok).toBe(true);
    h.advance(5);
    expect(h.entities.hp[body]).toBe(0);
    expect(h.entities.downed[body]).toBe(1);
    expect(h.entities.recoverAt[body]).toBeGreaterThan(h.calendar.elapsedSeconds);
    expect(h.player.experience).toBe(0);
  });
  it('retires killed wildlife exactly once, shares food quantities, and replaces with a fresh identity', () => {
    const s = new EntityStore(2),
      world = flatWorld(32),
      resources = new ResourceStore(world),
      i = s.spawn(2, 4.5, 4.5),
      id = s.id(i);
    const ecology = new EcologyService(s, world, resources, new SeededRandom(2));
    ecology.target = 1;
    s.hp[i] = 0;
    ecology.resolveDeaths(0);
    ecology.resolveDeaths(1);
    expect(resources.carrion).toHaveLength(1);
    expect(ecology.replacements).toHaveLength(1);
    expect(s.slot(id)).toBeUndefined();
    const inventory = new TwoSlotInventory();
    new HarvestSystem(resources).harvest({ x: 4.5, y: 4.5 }, inventory, 1);
    expect(inventory.state[0]?.originSpecies).toEqual(['zephyrit']);
    expect(resources.carrion[0]!.remaining).toBe(3);
    for (let n = 0; n < 10; n++) resources.takeCarrion(id);
    expect(resources.carrion[0]!.remaining).toBe(0);
    const replacement = s.spawn(2, 4.5, 4.5);
    expect(s.id(replacement)).toBeGreaterThan(id);
    new NeedsSystem().advance(s, 100, 100, { x: 4, y: 4 }, false);
    expect(s.slot(id)).toBeUndefined();
  });
});

describe('save v4 compatibility', () => {
  const legacy = JSON.parse(
    readFileSync(new URL('./fixtures/v2-save.json', import.meta.url), 'utf8'),
  ) as Record<string, unknown>;
  it('migrates a real v2 checkpoint retaining progress, bonds, terrain and memories', () => {
    const migrated = migrateSave(legacy),
      p = migrated.entities.records.find((e) => e.id === 0)!;
    expect(migrated.version).toBe(4);
    expect(migrated.contentVersion).toBe(3);
    expect(migrated.generatorVersion).toBe(1);
    expect(p.hp).toBe(73);
    expect(p.experience).toBe(25);
    expect(p.rest).toBeGreaterThan(0.8);
    expect(migrated.inventory.map((i) => i?.id)).toEqual(['flint', 'stick']);
    expect(migrated.entities.records.find((e) => e.id === 100)!.owner).toBe(0);
    expect(migrated.npcs[10]!.memory.summary).toBe('The traveler helped at the canal.');
    expect(migrated.npcs[10]!.memory.records.at(-1)!.subjects).toContain('entity:100');
    expect(migrated.worldDeltas).toEqual(legacy.worldDeltas);
    expect(migrated.entities.records.filter((e) => e.species < 8)).toHaveLength(24);
    expect(migrated.entities.records.some((e) => e.species === 6 || e.species === 7)).toBe(false);
    const h = new SimulationHost(migrated.seed, 1, 0);
    h.restore(migrated);
    const restored = migrateSave(h.snapshot());
    // Simulation tiers are recomputed from positions; all durable state survives.
    for (const record of restored.entities.records)
      record.tier = migrated.entities.records.find((e) => e.id === record.id)!.tier;
    expect(restored).toEqual(migrated);
  });
  it('migrates defeated legacy wildlife as recoverable downed actors, without retroactive carrion', () => {
    const old = structuredClone(legacy) as unknown as { creatures: { floats: { hp: number[] } } };
    old.creatures.floats.hp[1] = 0;
    const migrated = migrateSave(old),
      actor = migrated.entities.records.find((e) => e.id === 101)!;
    expect(actor.downed).toBe(1);
    expect(migrated.carrion).toHaveLength(0);
  });
  it('rejects duplicated identity, consumption provenance loss and living carrion', () => {
    const save = migrateSave(legacy),
      bad = structuredClone(save);
    bad.entities.records[1]!.id = bad.entities.records[0]!.id;
    expect(() => migrateSave(bad)).toThrow(/Duplicate/);
    const lost = structuredClone(save);
    lost.inventory[0] = { id: 'meal', instance: 'item:9' };
    expect(() => migrateSave(lost)).toThrow(/provenance/);
    const living = structuredClone(save);
    living.carrion.push({
      sourceId: 100,
      species: 'rivallie',
      x: 264,
      y: 282,
      remaining: 4,
      expiresAt: 1000,
    });
    expect(() => migrateSave(living)).toThrow(/living/);
  });
  it('retains a forced sleep obligation and commitments through a complete host restore', () => {
    const save = migrateSave(legacy),
      p = save.entities.records.find((e) => e.id === 0)!;
    p.rest = 0.2;
    p.forcedRest = 1;
    p.sleeping = 1;
    save.npcs[10]!.commitments.push({
      id: 'promise:legacy',
      participants: [save.npcs[10]!.profileId],
      location: 'home',
      startsAt: 600,
      endsAt: 700,
      status: 'planned',
      sourceIds: ['legacy:event'],
    });
    const h = new SimulationHost(save.seed, 1, 0);
    h.restore(save);
    const roundTrip = migrateSave(h.snapshot());
    expect(roundTrip.entities.records.find((e) => e.id === 0)!.forcedRest).toBe(1);
    expect(roundTrip.npcs[10]!.commitments).toHaveLength(1);
    expect(send(h, { type: 'wake' }).ok).toBe(false);
  });
});
