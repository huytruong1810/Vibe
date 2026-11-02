import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { ITEMS } from '../src/content/definitions';
import { EquipmentService, GARMENT_SLOTS } from '../src/domain/equipment';
import { EntityStore } from '../src/domain/entities';
import { TwoSlotInventory } from '../src/domain/inventory';
import { NavigationService, SpatialIndex } from '../src/domain/navigation';
import { ProjectileSystem, sweptCircle } from '../src/domain/projectiles';
import { ResourceStore } from '../src/domain/resources';
import { SceneRegistry, sceneSaveLayouts } from '../src/domain/scenes';
import { SimulationHost } from '../src/domain/simulation';
import { ChunkStore, SurfaceRules, TileFlag, WorldGenerator } from '../src/domain/world';
import { send } from './helpers';

function equipment() {
  const inventory = new TwoSlotInventory(),
    service = new EquipmentService(inventory);
  service.initialize(1);
  return { inventory, service };
}
function instances(inventory: TwoSlotInventory, service: EquipmentService): string[] {
  return [
    ...inventory.state,
    ...service.snapshot().loadouts.flatMap((l) => [...Object.values(l.worn), ...l.combat]),
  ]
    .flatMap((i) => (i ? [i.instance] : []))
    .sort();
}
describe('equipment and finite arrows', () => {
  it.each(
    Object.values(ITEMS)
      .filter((d) => d.id.startsWith('pyrador-') && d.garment)
      .map((d) => d.id),
  )('atomically equips %s without losing either carried or worn instances', (id) => {
    const { inventory, service } = equipment();
    inventory.add(id);
    inventory.add('berries');
    const before = instances(inventory, service),
      incoming = inventory.state[0]!,
      slot = ITEMS[id].garment!.slot,
      previous = service.view().worn[slot];
    expect(service.equip(0)).toMatch(/^Equipped/);
    expect(service.view().worn[slot]?.instance).toBe(incoming.instance);
    expect(inventory.state[0]?.instance ?? null).toBe(previous?.instance ?? null);
    expect(instances(inventory, service)).toEqual(before);
    expect(Object.keys(service.view().worn).sort()).toEqual([...GARMENT_SLOTS].sort());
    expect(inventory.state).toHaveLength(2);
  });
  it('refuses full-hand unequip, rolls back failed drops and transfers successful drops exactly once', () => {
    const { inventory, service } = equipment(),
      world = new ChunkStore(16),
      resources = new ResourceStore(world);
    inventory.add('berries');
    inventory.add('water');
    const worn = service.view().worn.torso!,
      before = instances(inventory, service);
    expect(service.unequip('torso')).toMatch(/Both carried slots/);
    expect(service.unequip('torso', () => false)).toMatch(/no accessible/);
    expect(instances(inventory, service)).toEqual(before);
    expect(
      service.unequip('torso', (item) => resources.dropItem(item, { x: 4.5, y: 4.5 })),
    ).toMatch(/^Unequipped/);
    expect(service.view().worn.torso).toBeNull();
    expect(resources.drops[0]?.instance).toBe(worn.instance);
    expect(
      service.unequip('torso', (item) => resources.dropItem(item, { x: 4.5, y: 4.5 })),
    ).toMatch(/empty/);
    expect(resources.drops).toHaveLength(1);
    expect([...instances(inventory, service), resources.drops[0]!.instance!].sort()).toEqual(
      before,
    );
  });
  it('reserves without consuming, cancels freely and consumes once at release against the reserved instance', () => {
    const { inventory, service } = equipment();
    inventory.add('bow');
    inventory.add('arrow-bundle');
    const capacity = inventory.state[1]!.charges!;
    expect(service.reserve(0, 'first')).toBe(true);
    expect(service.reserve(0, 'first')).toBe(false);
    expect(service.reserve(0, 'other')).toBe(false);
    expect(service.view().ammo).toBe(capacity);
    service.cancel('first');
    expect(service.release('first')).toBe(false);
    expect(service.reserve(0, 'second')).toBe(true);
    expect(service.release('second')).toBe(true);
    expect(service.release('second')).toBe(false);
    expect(service.view().ammo).toBe(capacity - 1);
    expect(service.reserve(0, 'stale')).toBe(true);
    const replacement = inventory.create('arrow-bundle');
    inventory.set(1, replacement);
    expect(service.release('stale')).toBe(false);
    expect(inventory.state[1]).toEqual(replacement);
    expect(service.hasReservation(0)).toBe(false);
  });
  it('resupplies NPC combat ammunition only from one accepted finite supply unit', () => {
    const { inventory, service } = equipment();
    const archer = service
      .snapshot()
      .loadouts.find((l) => l.entityId !== 0 && l.combat[0]?.id === 'bow')!;
    expect(archer).toBeDefined();
    const capacity = service.held(archer.entityId)[1]!.charges!;
    for (let n = 0; n < capacity; n++) {
      expect(service.reserve(archer.entityId, `shot:${n}`)).toBe(true);
      expect(service.release(`shot:${n}`)).toBe(true);
    }
    let stock = 0,
      calls = 0;
    const consume = () => {
      calls++;
      if (stock === 0) return false;
      stock--;
      return true;
    };
    expect(service.resupply(archer.entityId, consume)).toBe(false);
    expect(service.held(archer.entityId)[1]!.charges).toBe(0);
    stock = 1;
    expect(service.resupply(archer.entityId, consume)).toBe(true);
    expect(stock).toBe(0);
    expect(service.held(archer.entityId)[1]!.charges).toBe(capacity);
    const before = calls;
    expect(service.resupply(archer.entityId, consume)).toBe(false);
    expect(calls).toBe(before);
    expect(inventory.state).toEqual([null, null]);
  });
  it('preserves reservations through a service snapshot without inventing charges', () => {
    const { inventory, service } = equipment();
    inventory.add('bow');
    inventory.add('arrow-bundle');
    service.reserve(0, 'saved');
    const state = service.snapshot(),
      restored = new EquipmentService(inventory);
    restored.restore(state);
    expect(restored.hasReservation(0)).toBe(true);
    const count = inventory.state[1]!.charges!;
    expect(restored.release('saved')).toBe(true);
    expect(restored.release('saved')).toBe(false);
    expect(inventory.state[1]!.charges).toBe(count - 1);
  });
});

function projectileFixture(capacity = 256) {
  const s = new EntityStore(capacity),
    actor = s.spawnHuman(0, 1, 3.5, 4.5),
    world = new ChunkStore(16),
    spatial = new SpatialIndex(),
    projectiles = new ProjectileSystem();
  const index = () => {
    spatial.clear();
    for (const i of s.slots()) spatial.insert(i, s.x[i]!, s.y[i]!, s.scene[i]!);
  };
  return { s, actor, world, spatial, projectiles, index };
}
describe('fixed-tick arrow sweeps', () => {
  it('finds a segment/circle contact and commits only the first target once', () => {
    expect(sweptCircle(0, 0, 2, 0, 1, 0, 0.25)).toBeCloseTo(0.375);
    expect(sweptCircle(0, 0, 2, 0, 1, 1, 0.25)).toBeNull();
    const f = projectileFixture(),
      near = f.s.spawn(1, 4.1, 4.5),
      far = f.s.spawn(1, 4.3, 4.5);
    f.index();
    const hits: number[] = [];
    f.projectiles.spawn(0, 0, 3.5, 4.5, 1, 0, 0);
    f.projectiles.advance(
      1,
      f.s,
      f.spatial,
      () => f.world,
      (_, target) => hits.push(target),
    );
    f.projectiles.advance(
      2,
      f.s,
      f.spatial,
      () => f.world,
      (_, target) => hits.push(target),
    );
    expect(hits).toEqual([f.s.id(near)]);
    expect(hits).not.toContain(f.s.id(far));
    expect(f.projectiles.size).toBe(0);
  });
  it('blocks exact wall crossings and diagonal corner grazes before a body behind the wall', () => {
    const f = projectileFixture(),
      target = f.s.spawn(1, 4.5, 5.5);
    f.s.x[f.actor] = 3.96;
    f.s.y[f.actor] = 4.95;
    f.world.flags[f.world.index(4, 4)] = TileFlag.Solid;
    f.index();
    const hits: number[] = [];
    f.projectiles.spawn(0, 0, 3.96, 4.95, 1, 1, 0);
    f.projectiles.advance(
      1,
      f.s,
      f.spatial,
      () => f.world,
      (_, id) => hits.push(id),
    );
    expect(hits).not.toContain(f.s.id(target));
    expect(f.projectiles.size).toBe(0);
  });
  it('does not let unrelated occupants fill a broad-phase cap and hide the actual collider', () => {
    const f = projectileFixture();
    for (let n = 0; n < 129; n++) f.s.spawn(1, 6.5, 6.5);
    const target = f.s.spawn(1, 4.1, 4.5);
    f.index();
    const hits: number[] = [];
    f.projectiles.spawn(0, 0, 3.5, 4.5, 1, 0, 0);
    f.projectiles.advance(
      1,
      f.s,
      f.spatial,
      () => f.world,
      (_, id) => hits.push(id),
    );
    expect(hits).toEqual([f.s.id(target)]);
  });
  it('keeps arrows and target queries inside their original scene', () => {
    const f = projectileFixture(),
      outside = f.s.spawn(1, 4.1, 4.5),
      inside = f.s.spawn(1, 4.1, 4.5);
    f.s.scene[inside] = 1;
    f.index();
    const hits: [number, number][] = [];
    f.projectiles.spawn(0, 0, 3.5, 4.5, 1, 0, 0);
    f.projectiles.advance(
      1,
      f.s,
      f.spatial,
      () => f.world,
      (_, id, __, scene) => hits.push([id, scene]),
    );
    expect(hits).toEqual([[f.s.id(outside), 0]]);
    expect(hits.some(([id]) => id === f.s.id(inside))).toBe(false);
  });
  it('bounds population and lifetime and restores active projectile identities', () => {
    const f = projectileFixture();
    expect(f.projectiles.spawn(0, 0, 3, 4, 0, 0, 0)).toBe(false);
    for (let n = 0; n < 64; n++) expect(f.projectiles.spawn(0, 0, 3, 4, 1, 0, 0)).toBe(true);
    expect(f.projectiles.spawn(0, 0, 3, 4, 1, 0, 0)).toBe(false);
    const restored = new ProjectileSystem();
    restored.restore(f.projectiles.snapshot());
    expect(restored.snapshot()).toEqual(f.projectiles.snapshot());
    restored.advance(
      20,
      f.s,
      f.spatial,
      () => f.world,
      () => {
        throw Error('Expired arrows cannot hit');
      },
    );
    expect(restored.size).toBe(0);
  });
});

let generated: ChunkStore;
beforeAll(() => {
  generated = new WorldGenerator().generate(42);
});
const geography = (w: ChunkStore) => {
  const hash = createHash('sha256');
  for (const a of [
    w.biome,
    w.elevation,
    w.moisture,
    w.temperature,
    w.drainage,
    w.coastDistance,
    w.fluid,
    w.flags,
    w.resource,
    w.quantity,
  ])
    hash.update(new Uint8Array(a.buffer, a.byteOffset, a.byteLength));
  return hash.digest('hex');
};
const scenes = () => {
  const supplies = new ResourceStore(generated),
    registry = new SceneRegistry(generated, supplies);
  registry.bindOverworldNavigation(new NavigationService(generated));
  return { registry, supplies };
};
describe('pocket scenes, access and shared settlement supplies', () => {
  it('adds exactly 42 buildings and three caves without modifying a generated overworld layer', () => {
    const before = geography(generated),
      { registry } = scenes();
    expect(generated.buildings).toHaveLength(42);
    expect(registry.definitions.filter((d) => d.kind === 'building')).toHaveLength(42);
    expect(registry.definitions.filter((d) => d.kind === 'cave')).toHaveLength(3);
    expect(registry.portals).toHaveLength(90);
    expect(new Set(registry.definitions.map((d) => d.id)).size).toBe(46);
    for (const definition of registry.definitions.filter((d) => d.code !== 0)) {
      const context = registry.context(definition.code),
        entrance = registry.portals.find((p) => p.target === definition.code)!;
      expect(SurfaceRules.walkable(generated, entrance.x, entrance.y)).toBe(true);
      expect(
        SurfaceRules.walkable(context.world, entrance.destination.x, entrance.destination.y),
      ).toBe(true);
      expect(
        context.navigation.connected(entrance.destination, [
          { x: 3.5, y: 4.5 },
          { x: 4.5, y: 5.5 },
        ]),
      ).toBe(true);
    }
    expect(geography(generated)).toBe(before);
  });
  it('always resolves scene zero to the supplied overworld rather than a blank parallel map', () => {
    const registry = new SceneRegistry(generated, new ResourceStore(generated));
    expect(registry.context(0).world === generated).toBe(true);
  });
  it('publishes immutable canonical save layouts that agree with all constructed scenes', () => {
    const layouts = sceneSaveLayouts(),
      { registry } = scenes();
    expect(layouts).toHaveLength(46);
    expect(Object.isFrozen(layouts)).toBe(true);
    expect(layouts.map((l) => ({ ...l })).sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      registry.definitions
        .map((d) => ({ id: d.id, width: d.width, height: d.height }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    );
  });
  it('requires invitations for private homes, permits the owner and always leaves exits usable after revocation', () => {
    const { registry } = scenes(),
      portal = registry.portals.find((p) => p.source === 0 && p.owner !== null)!;
    expect(registry.allowed(portal, 0, 7)).toBe(false);
    expect(registry.allowed(portal, portal.owner!, 7)).toBe(true);
    registry.invite(portal.owner!, 7);
    expect(registry.allowed(portal, 0, 7)).toBe(true);
    expect(registry.allowed(portal, 0, 8)).toBe(false);
    const s = new EntityStore(),
      i = s.spawnHuman(0, 1, portal.x, portal.y);
    expect(registry.transfer(s, 0, portal.id, 7)).toBeNull();
    expect(s.scene[i]).toBe(portal.target);
    registry.revoke(portal.owner!);
    const exit = registry.portals.find((p) => p.source === portal.target)!;
    expect(registry.allowed(exit, 0, 7)).toBe(true);
    expect(registry.transfer(s, 0, exit.id, 7)).toBeNull();
    expect(s.scene[i]).toBe(0);
    expect({ x: s.x[i], y: s.y[i] }).toEqual({ x: portal.x, y: portal.y });
  });
  it('revalidates source, proximity, life and sleep before any scene mutation', () => {
    const { registry } = scenes(),
      portal = registry.portals.find((p) => p.source === 0 && p.owner === null)!,
      s = new EntityStore(),
      i = s.spawnHuman(0, 1, portal.x + 5, portal.y);
    expect(registry.transfer(s, 0, portal.id, 0)).toMatch(/closer/);
    s.x[i] = portal.x;
    s.sleeping[i] = 1;
    expect(registry.transfer(s, 0, portal.id, 0)).toMatch(/Wake/);
    s.sleeping[i] = 0;
    s.hp[i] = 0;
    expect(registry.transfer(s, 0, portal.id, 0)).toMatch(/recover/);
    expect(s.scene[i]).toBe(0);
    s.hp[i] = 100;
    expect(registry.transfer(s, 0, portal.id, 0)).toBeNull();
    expect(registry.transfer(s, 0, portal.id, 0)).toMatch(/no longer/);
  });
  it('aliases one finite pantry account across rooms instead of minting a new stock per interior', () => {
    const { registry, supplies } = scenes(),
      definitions = registry.definitions.filter((d) => d.kind === 'building' && d.village === 1),
      first = definitions[0]!,
      second = definitions.find((d) => d.settlement === first.settlement && d.code !== first.code)!;
    const account = supplies.supplies.find((s) => s.id === first.settlement)!,
      a = registry.context(first.code).resources,
      b = registry.context(second.code).resources;
    expect(a.supplies[0]!.stock).toBe(account.stock);
    expect(b.supplies[0]!.stock).toBe(account.stock);
    const before = account.stock.berries!;
    expect(a.consumeSupply({ x: 3.5, y: 5.5, scene: first.code }, 'berries')).toBe(true);
    expect(b.supplies[0]!.stock.berries).toBe(before - 1);
    expect(account.stock.berries).toBe(before - 1);
    expect(a.consumeSupply({ x: 3.5, y: 5.5, scene: second.code }, 'berries')).toBe(false);
  });
  it('restores scene-local resources and remaps numeric storage codes through stable saved IDs', () => {
    const { registry } = scenes(),
      cave = registry.definitions.find((d) => d.kind === 'cave')!,
      context = registry.context(cave.code);
    const resource = [...context.world.resource].findIndex(Boolean),
      before = context.world.quantity[resource]!;
    expect(context.resources.consume(resource, 5)).toBe(true);
    expect(context.resources.drop('flint', { x: 4.5, y: 5.5, scene: cave.code })).toBe(true);
    const saved = structuredClone(registry.snapshot()),
      restored = scenes().registry;
    restored.restore(saved);
    expect(restored.context(cave.code).world.quantity[resource]).toBe(before - 1);
    expect(restored.context(cave.code).resources.drops).toEqual(context.resources.drops);
    expect(restored.remap({ ...saved, bindings: [{ code: 777, id: cave.id }] }, 777)).toBe(
      cave.code,
    );
    expect(() =>
      restored.remap({ ...saved, bindings: [{ code: 777, id: 'cave:obsolete' }] }, 777),
    ).toThrow(/missing/);
  });
  it('remaps scene-local drop and carrion references when saved numeric codes change', () => {
    const { registry } = scenes(),
      cave = registry.definitions.find((d) => d.kind === 'cave')!,
      context = registry.context(cave.code);
    context.resources.drop('flint', { x: 4.5, y: 5.5, scene: cave.code });
    context.resources.addCarrion({
      sourceId: 999,
      species: 'rivallie',
      remaining: 2,
      expiresAt: 800,
      x: 6.5,
      y: 5.5,
      scene: cave.code,
    });
    const saved = structuredClone(registry.snapshot());
    const binding = saved.bindings.find((b) => b.id === cave.id)!;
    binding.code = 777;
    for (const state of saved.states) {
      state.drops = state.drops.map((drop) => ({ ...drop, scene: 777 }));
      state.carrion = state.carrion.map((body) => ({ ...body, scene: 777 }));
    }
    const restored = scenes().registry;
    restored.restore(saved);
    expect(restored.context(cave.code).resources.drops[0]?.scene).toBe(cave.code);
    expect(restored.context(cave.code).resources.carrion[0]?.scene).toBe(cave.code);
    expect(restored.context(cave.code).resources.carrion[0]?.remaining).toBe(2);
  });
});

describe('equipment and portal command boundary', () => {
  it('locks carried items during a reserved bow windup and rejects an obsolete-scene portal', () => {
    const host = new SimulationHost(42, 1, 0, 'equipment-commands');
    host.inventory.set(0, host.inventory.create('bow'));
    host.inventory.set(1, host.inventory.create('arrow-bundle'));
    expect(send(host, { type: 'attack', kind: 'strike' }).ok).toBe(true);
    const state = host.inventory.state;
    expect(send(host, { type: 'swap' }).ok).toBe(false);
    expect(host.inventory.state).toEqual(state);
    expect(host.equipment.hasReservation(0)).toBe(true);
    host.equipment.cancel(host.player.attack!.instanceId!);
    host.player.attack = null;
    const obsolete = send(host, {
      type: 'enterPortal',
      portalId: 'does-not-exist',
      expectedScene: 'obsolete',
    });
    expect(obsolete.ok).toBe(false);
    expect(obsolete.message).toMatch(/obsolete/);
    host.dispose();
  });
  it('equips through validated commands while preserving two carried slots and human progress', () => {
    const host = new SimulationHost(42, 1, 0, 'equipment-progress');
    host.inventory.add('pyrador-coat');
    host.inventory.add('berries');
    const experience = host.player.experience,
      hp = host.player.maxHp,
      old = host.equipment.view().worn.torso!;
    expect(send(host, { type: 'equip', slot: 0 }).ok).toBe(true);
    expect(host.inventory.state[0]?.instance).toBe(old.instance);
    expect(host.inventory.state).toHaveLength(2);
    expect(host.player.experience).toBe(experience);
    expect(host.player.maxHp).toBe(hp);
    host.dispose();
  });
});
