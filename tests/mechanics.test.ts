import { describe, expect, it } from 'vitest';
import { RECIPES, itemIds } from '../src/content/definitions';
import { CraftingService, RecipeRegistry, TwoSlotInventory } from '../src/domain/inventory';
import {
  EnvironmentalReactionSystem,
  HarvestSystem,
  RegrowthSystem,
  ResourceStore,
} from '../src/domain/resources';
import { Fluid, TileFlag } from '../src/domain/world';
import {
  CareInteractionSystem,
  CreatureStateStore,
  NeedsSystem,
  PartnershipService,
  SimulationTierManager,
  WellbeingPolicy,
  moveOnTerrain,
} from '../src/domain/creatures';
import {
  CombatSystem,
  DamagePolicy,
  ElementPolicy,
  EncounterService,
  ProgressionService,
} from '../src/domain/combat';
import { SpatialIndex } from '../src/domain/navigation';
import { NpcProfileRegistry } from '../src/domain/agents';
import { bindBody } from '../src/domain/entities';
import { flatWorld, player } from './helpers';

describe('inventory and resources', () => {
  it.each(RECIPES)('combines $a + $b atomically, in either order', (recipe) => {
    for (const [a, b] of [
      [recipe.a, recipe.b],
      [recipe.b, recipe.a],
    ]) {
      const inventory = new TwoSlotInventory();
      inventory.add(a!);
      inventory.add(b!);
      new CraftingService().combine(inventory);
      expect(inventory.state[0]?.id).toBe(recipe.result);
      expect(inventory.state[1]).toBeNull();
    }
  });
  it('preserves invalid inputs, enforces capacity, and completes WIP chains', () => {
    const inventory = new TwoSlotInventory();
    inventory.add('flint');
    inventory.add('stick');
    expect(inventory.add('berries')).toBe(false);
    inventory.combine(new RecipeRegistry());
    expect(inventory.state[0]?.id).toBe('tool-head');
    inventory.add('fiber');
    inventory.combine(new RecipeRegistry());
    expect(inventory.state[0]?.id).toBe('hatchet');
    inventory.add('water');
    const before = inventory.state;
    inventory.combine(new RecipeRegistry());
    expect(inventory.state).toEqual(before);
  });
  it('rejects ambiguous and cyclic recipes', () => {
    expect(
      () =>
        new RecipeRegistry([
          { a: 'flint', b: 'stick', result: 'fiber' },
          { a: 'stick', b: 'flint', result: 'hatchet' },
        ]),
    ).toThrow(/Ambiguous/);
    expect(
      () =>
        new RecipeRegistry([
          { a: 'flint', b: 'stick', result: 'fiber' },
          { a: 'fiber', b: 'stick', result: 'flint' },
        ]),
    ).toThrow(/Cyclic/);
  });
  it('does not consume a resource when both hands are full, and regrows depleted forage', () => {
    const world = flatWorld(),
      store = new ResourceStore(world),
      inventory = new TwoSlotInventory(),
      harvest = new HarvestSystem(store),
      index = world.index(4, 4);
    world.resource[index] = itemIds.indexOf('berries') + 1;
    world.quantity[index] = 1;
    inventory.add('water');
    inventory.add('stick');
    expect(harvest.harvest({ x: 4.5, y: 4.5 }, inventory, 10).ok).toBe(false);
    expect(world.quantity[index]).toBe(1);
    inventory.remove(0);
    expect(harvest.harvest({ x: 4.5, y: 4.5 }, inventory, 10).ok).toBe(true);
    expect(world.quantity[index]).toBe(0);
    const regrowth = new RegrowthSystem(world);
    regrowth.advance(189, 0);
    expect(world.quantity[index]).toBe(0);
    regrowth.advance(191, 0);
    expect(world.quantity[index]).toBeGreaterThan(0);
  });
  it('bounds reactions and protects critical terrain', () => {
    const world = flatWorld(),
      reactions = new EnvironmentalReactionSystem(world),
      index = world.index(4, 4);
    world.flags[index] = TileFlag.Protected;
    reactions.enqueue({ index, type: 'fire', remaining: 2 });
    reactions.advance(0);
    expect(world.flags[index]! & TileFlag.Burning).toBe(0);
    world.flags[index] = 0;
    world.fluid[index] = Fluid.Freshwater;
    reactions.enqueue({ index, type: 'freeze', remaining: 0 });
    reactions.advance(0);
    expect(world.flags[index]! & TileFlag.Ice).toBeTruthy();
    reactions.advance(41);
    expect(world.flags[index]! & TileFlag.Ice).toBe(0);
    for (let i = 0; i < 3000; i++) reactions.enqueue({ index, type: 'shock', remaining: 0 });
    expect(reactions.pending).toBe(2048);
    reactions.advance(50, 7);
    expect(reactions.pending).toBe(2041);
  });
});

describe('creature care and progression', () => {
  it.each([
    [0, 0],
    [0.25, 0.25],
    [0.5, 0.5],
    [0.75, 0.75],
    [0.751, 1],
    [1, 1],
  ])('has explicit wellbeing boundary %s', (value, expected) => {
    expect(WellbeingPolicy.multiplier(value!)).toBe(expected);
    expect(WellbeingPolicy.speed(value!)).toBeGreaterThanOrEqual(0.25);
  });
  it('lets sustained good care reverse wildness while neglect increases it', () => {
    expect(WellbeingPolicy.wildness(0.5, 0.9, 100)).toBeLessThan(0.5);
    expect(WellbeingPolicy.wildness(0.5, 0.1, 100)).toBeGreaterThan(0.5);
  });
  it('validates diets, consumes exactly one care item, and enforces a single partner', () => {
    const s = new CreatureStateStore(8),
      a = s.spawn(1, 4.5, 4.5),
      b = s.spawn(2, 4.5, 4.5),
      inventory = new TwoSlotInventory(),
      care = new CareInteractionSystem(s),
      partnership = new PartnershipService(s);
    inventory.add('berries');
    care.interact(a, 'feed', inventory, { x: 4, y: 4 }, flatWorld());
    expect(inventory.state[0]?.id).toBe('berries');
    inventory.remove(0);
    inventory.add('reeds');
    care.interact(a, 'feed', inventory, { x: 4, y: 4 }, flatWorld());
    expect(inventory.state[0]).toBeNull();
    s.trust[a] = 0.7;
    s.trust[b] = 0.7;
    expect(partnership.tame(a, { x: 4, y: 4 })).toMatch(/now your/);
    expect(partnership.tame(b, { x: 4, y: 4 })).toMatch(/already/);
    expect(partnership.partner).toBe(a);
    partnership.release();
    expect(partnership.partner).toBeNull();
    s.validate();
  });
  it('depletes NPC partner needs while retaining damageable health', () => {
    const s = new CreatureStateStore(2),
      i = s.spawn(0, 4, 4, 1);
    s.hp[i] = 10;
    new NeedsSystem().advance(s, 60, 100, { x: 4, y: 4 }, false);
    expect(s.food[i]).toBeLessThan(0.85);
    expect(s.hp[i]).toBeGreaterThanOrEqual(10);
  });
  it('breaks neglected partnerships without deleting creature identity', () => {
    const s = new CreatureStateStore(2),
      i = s.spawn(0, 4, 4, 0);
    s.food[i] = s.water[i] = s.cleanliness[i] = s.recreation[i] = 0.1;
    s.wildness[i] = 0.999;
    expect(new NeedsSystem().advance(s, 10, 100, { x: 100, y: 100 }, false)).toEqual([i]);
    expect(s.owner[i]).toBe(-1);
    expect(s.count).toBe(1);
  });
  it('bounds detailed simulation and preserves IDs across tier transitions', () => {
    const s = new CreatureStateStore(300);
    for (let i = 0; i < 200; i++) s.spawn(i % 6, 10, 10);
    const tiers = new SimulationTierManager();
    tiers.update(s, { x: 10, y: 10 });
    expect(tiers.detailed).toHaveLength(128);
    tiers.update(s, { x: 200, y: 200 });
    expect(tiers.detailed).toHaveLength(0);
    expect(s.count).toBe(200);
  });
  it('prevents dashes tunneling through solid tiles', () => {
    const w = flatWorld();
    w.flags[w.index(6, 4)] = TileFlag.Solid;
    const moved = moveOnTerrain(w, { x: 4.5, y: 4.5 }, 6, 0, { water: true, lava: false });
    expect(moved.x).toBeLessThan(6);
  });
  it('bounds elemental combinations and level-based rewards', () => {
    expect(ElementPolicy.against('water', ['fire'])).toBe(1.5);
    expect(ElementPolicy.against('fire', ['water', 'wind'])).toBe(1.125);
    expect(ElementPolicy.against(null, ['fire'])).toBe(1);
    expect(DamagePolicy.damage(10, 0, 10000, 1)).toBe(1);
    for (let ours = 1; ours <= 50; ours++)
      for (let theirs = 1; theirs <= 50; theirs++) {
        const r = ProgressionService.reward(ours, theirs);
        expect(r).toBeGreaterThanOrEqual(3);
        expect(r).toBeLessThanOrEqual(96);
      }
  });
  it('awards an encounter once and enforces battles per absolute day', () => {
    const s = new CreatureStateStore(8),
      p = player(),
      npcs = new NpcProfileRegistry().create();
    const partner = s.spawn(1, 4.5, 4.5, 0),
      opponent = s.spawn(0, 4.5, 4.5, 1);
    npcs[0]!.partner = s.id(opponent);
    npcs[0]!.x = p.x;
    npcs[0]!.y = p.y;
    const encounters = new EncounterService(s, p, npcs);
    expect(encounters.startBattle(0, 0, 1)).toMatch(/begun/);
    expect(encounters.resolve(s.id(opponent), 2)).toBeGreaterThan(0);
    expect(encounters.resolve(s.id(opponent), 2)).toBe(0);
    expect(encounters.startBattle(0, 0, 3)).toMatch(/already/);
    expect(encounters.startBattle(0, 7, 4)).toMatch(/begun/);
    expect(s.owner[partner]).toBe(0);
  });
  it('respects windup and hits a target only once during the active window', () => {
    const store = new CreatureStateStore(4),
      target = store.spawn(0, 5.5, 4.5),
      p = player(),
      spatial = new SpatialIndex();
    store.spawnHuman(0, 1, p.x, p.y);
    bindBody(p, store, 0);
    p.facingX = 1;
    p.facingY = 0;
    spatial.insert(target, 5.5, 4.5);
    const combat = new CombatSystem(store, p, new NpcProfileRegistry().create()),
      hp = store.hp[target]!;
    expect(combat.attack('strike', 0)).toBe(true);
    for (let tick = 0; tick < 4; tick++) combat.advance(tick, spatial);
    expect(store.hp[target]).toBe(hp);
    combat.advance(4, spatial);
    const afterHit = store.hp[target]!;
    expect(afterHit).toBeLessThan(hp);
    combat.advance(5, spatial);
    expect(store.hp[target]).toBe(afterHit);
    for (let tick = 6; tick <= 15; tick++) combat.advance(tick, spatial);
    expect(p.attack).toBeNull();
  });
});
