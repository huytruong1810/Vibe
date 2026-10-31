import { z } from 'zod';
import { ITEMS, ItemIdSchema } from '../content/definitions';
import { GameSaveV3Schema, migrateSaveV3, type GameSaveV3 } from './save-v3';
import { EquipmentService, GARMENT_SLOTS } from './equipment';
import { TwoSlotInventory } from './inventory';
import { SceneRegistry, sceneSaveLayouts } from './scenes';
import { ResourceStore } from './resources';
import { WorldGenerator } from './world';
import { CONFIG } from './values';
import { PHYSIQUES } from './physique';
import { SPECIES } from '../content/definitions';
import { ATTACKS, WEAPON_ATTACKS } from './combat';

export { GameSaveV3Schema } from './save-v3';
const uint = z.number().int().min(0).max(0xffffffff);
const finite = z.number().finite();
const sceneCode = uint.max(65535);
const instance = z
  .string()
  .regex(/^item:\d+$/)
  .max(40);
const legacy = GameSaveV3Schema.shape;
const item = z
  .object({
    id: ItemIdSchema,
    instance,
    originSpecies: legacy.inventory._def.items[0].unwrap().shape.originSpecies,
    charges: uint.max(12).optional(),
  })
  .strict();
const nullableItem = item.nullable();
const attack = legacy.player.shape.attack.unwrap().extend({
  moveId: z.enum(['strike', 'element', 'sword_slash', 'spear_thrust', 'bow_shot']).optional(),
  instanceId: z
    .string()
    .regex(/^action:\d+:\d+$/)
    .max(120)
    .optional(),
  released: z.boolean().optional(),
});
const drop = legacy.drops.element.extend({
  scene: sceneCode.optional(),
  instance: instance.optional(),
  charges: uint.max(12).optional(),
});
const carrion = legacy.carrion.element.extend({ scene: sceneCode.optional() });
const equipment = z
  .object({
    loadouts: z
      .array(
        z
          .object({
            entityId: uint.max(30),
            worn: z
              .object({
                head: nullableItem,
                torso: nullableItem,
                hands: nullableItem,
                legs: nullableItem,
                feet: nullableItem,
                back: nullableItem,
              })
              .strict(),
            combat: z.tuple([nullableItem, nullableItem]),
          })
          .strict(),
      )
      .length(31),
    reservations: z
      .array(
        z
          .object({
            id: z
              .string()
              .regex(/^action:\d+:\d+$/)
              .max(120),
            entityId: uint.max(30),
            instance,
          })
          .strict(),
      )
      .max(31),
  })
  .strict();
const scenes = z
  .object({
    bindings: z
      .array(z.object({ code: sceneCode, id: z.string().min(1).max(200) }).strict())
      .min(1)
      .max(256),
    states: z
      .array(
        z
          .object({
            id: z.string().min(1).max(200),
            deltas: legacy.worldDeltas,
            drops: z.array(drop).max(512),
            carrion: z.array(carrion).max(CONFIG.creatureCapacity * 2),
          })
          .strict(),
      )
      .max(255),
    invitations: z.array(z.object({ owner: uint.min(1).max(30), untilDay: uint }).strict()).max(30),
  })
  .strict();
const projectiles = z
  .object({
    serial: uint,
    arrows: z
      .array(
        z
          .object({
            id: uint.min(1),
            actor: uint,
            scene: sceneCode,
            x: finite.min(0).max(CONFIG.worldSize),
            y: finite.min(0).max(CONFIG.worldSize),
            vx: finite.min(-18).max(18),
            vy: finite.min(-18).max(18),
            expiresAt: uint,
            power: finite.min(0).max(100),
          })
          .strict(),
      )
      .max(64),
  })
  .strict();

/** v4 persists explicit scene membership, finite equipment and in-flight projectiles. */
export const GameSaveSchema = z
  .object({
    ...legacy,
    version: z.literal(4),
    contentVersion: z.literal(3),
    entities: legacy.entities.extend({
      records: z
        .array(
          legacy.entities.shape.records.element.extend({
            scene: sceneCode,
            heightMeters: finite.min(0.1).max(4),
            massKg: finite.min(0.2).max(1000),
            recoilX: finite.min(-4).max(4),
            recoilY: finite.min(-4).max(4),
          }),
        )
        .max(CONFIG.creatureCapacity + 31),
    }),
    player: legacy.player.extend({ attack: attack.nullable(), guarding: z.boolean().optional() }),
    inventory: z.tuple([nullableItem, nullableItem]),
    equipment,
    scenes,
    drops: z.array(drop).max(512),
    carrion: z.array(carrion).max(CONFIG.creatureCapacity * 2),
    supplies: z.array(legacy.supplies.element.extend({ scene: sceneCode.optional() })).length(9),
    combat: legacy.combat.extend({
      attacks: z.array(z.tuple([uint, attack])).max(CONFIG.creatureCapacity + 31),
      projectiles,
    }),
    events: z
      .array(legacy.events.element.extend({ scene: sceneCode.optional() }))
      .max(CONFIG.eventLimit),
    markers: z.array(legacy.markers.element.extend({ scene: sceneCode.optional() })).max(16),
  })
  .strict()
  .superRefine((save, ctx) => {
    const fail = (message: string): void => ctx.addIssue({ code: 'custom', message });
    // Retain the established entity/ecology/social invariants across the additive schema change.
    const old = GameSaveV3Schema.safeParse(v3Projection(save));
    if (!old.success)
      for (const issue of old.error.issues)
        ctx.addIssue({ code: 'custom', path: issue.path, message: issue.message });
    validateV4(save, fail);
  });
export type GameSave = z.infer<typeof GameSaveSchema>;

function v3Attack(value: GameSave['player']['attack']): GameSaveV3['player']['attack'] {
  return value ? { kind: value.kind, startedAt: value.startedAt, hit: value.hit } : null;
}
function v3Projection(save: GameSave): unknown {
  const { equipment: _equipment, scenes: _scenes, ...base } = save;
  const { guarding: _guarding, ...player } = save.player;
  const { projectiles: _projectiles, ...combat } = save.combat;
  const oldItem = (value: GameSave['inventory'][number]) => {
    if (!value) return null;
    const { charges: _charges, ...old } = value;
    return old;
  };
  return {
    ...base,
    version: 3,
    contentVersion: 2,
    player: { ...player, attack: v3Attack(player.attack) },
    entities: {
      ...save.entities,
      records: save.entities.records.map(
        ({
          scene: _scene,
          heightMeters: _height,
          massKg: _mass,
          recoilX: _rx,
          recoilY: _ry,
          ...record
        }) => record,
      ),
    },
    inventory: [oldItem(save.inventory[0]), oldItem(save.inventory[1])],
    drops: save.drops.map(
      ({ scene: _scene, instance: _instance, charges: _charges, ...value }) => value,
    ),
    carrion: save.carrion.map(({ scene: _scene, ...value }) => value),
    supplies: save.supplies.map(({ scene: _scene, ...value }) => value),
    events: save.events.map(({ scene: _scene, ...value }) => value),
    markers: save.markers.map(({ scene: _scene, ...value }) => value),
    combat: { ...combat, attacks: save.combat.attacks.map(([id, value]) => [id, v3Attack(value)]) },
  };
}

function validateV4(save: GameSave, fail: (message: string) => void): void {
  const records = new Map(save.entities.records.map((r) => [r.id, r]));
  const bindings = new Map(save.scenes.bindings.map((b) => [b.code, b.id]));
  const layouts = new Map(sceneSaveLayouts().map((layout) => [layout.id, layout]));
  const codes = new Map(save.scenes.bindings.map((binding) => [binding.id, binding.code]));
  if (
    bindings.size !== save.scenes.bindings.length ||
    new Set(bindings.values()).size !== bindings.size ||
    bindings.get(0) !== 'overworld'
  )
    fail('Duplicate or invalid scene bindings');
  if (bindings.size !== layouts.size || [...bindings.values()].some((id) => !layouts.has(id)))
    fail('Saved scene bindings must cover the canonical scene registry');
  const inside = (point: { x: number; y: number }, code: number): boolean => {
    const layout = layouts.get(bindings.get(code) ?? '');
    return (
      !!layout && point.x >= 0 && point.y >= 0 && point.x < layout.width && point.y < layout.height
    );
  };
  for (const entity of records.values()) {
    if (!bindings.has(entity.scene)) fail('Entity refers to an unknown scene');
    else if (!inside(entity, entity.scene)) fail('Entity position is outside its scene');
  }
  for (const scoped of [...save.events, ...save.markers])
    if (!inside(scoped, scoped.scene ?? 0))
      fail('Event or marker refers to an invalid scene or position');
  const allocated = new Set<string>();
  const checkItem = (
    value: {
      id: keyof typeof ITEMS;
      instance?: string;
      charges?: number;
      originSpecies?: readonly string[];
    } | null,
  ): void => {
    if (!value) return;
    const capacity = ITEMS[value.id].ammo?.capacity;
    if (
      capacity !== undefined
        ? value.charges === undefined || value.charges > capacity
        : value.charges !== undefined
    )
      fail('Invalid finite ammunition charges');
    if (value.instance) {
      const counter = Number(value.instance.slice(5));
      if (!Number.isSafeInteger(counter) || counter < 1 || counter > save.inventorySerial)
        fail('Item allocation counter would reuse an identity');
      if (allocated.has(value.instance))
        fail('Duplicate item instance across carried, worn, loadout or dropped items');
      allocated.add(value.instance);
    }
    if (['meat', 'meal'].includes(value.id) && !value.originSpecies?.length)
      fail('Animal food lost species provenance');
  };
  save.inventory.forEach(checkItem);
  const loadouts = new Map(save.equipment.loadouts.map((l) => [l.entityId, l]));
  if (loadouts.size !== 31 || [...loadouts.keys()].some((id) => records.get(id)?.species !== 8))
    fail('Equipment must bind exactly the 31 humans');
  for (const loadout of save.equipment.loadouts) {
    for (const slot of GARMENT_SLOTS) {
      const value = loadout.worn[slot];
      checkItem(value);
      if (value && ITEMS[value.id].garment?.slot !== slot)
        fail('Garment does not fit its worn slot');
    }
    loadout.combat.forEach(checkItem);
    if (loadout.entityId === 0 && loadout.combat.some(Boolean))
      fail('Player combat equipment must use the two carried slots');
    if (
      loadout.entityId !== 0 &&
      ((loadout.combat[0] && !ITEMS[loadout.combat[0].id].weapon) ||
        (loadout.combat[1] &&
          (loadout.combat[0]?.id !== 'bow' || loadout.combat[1].id !== 'arrow-bundle')))
    )
      fail('NPC combat loadout cannot store resources');
  }
  const actions = new Map<number, NonNullable<GameSave['player']['attack']>>(save.combat.attacks);
  if (actions.size !== save.combat.attacks.length || actions.has(0))
    fail('Duplicate or invalid NPC attack actor');
  if (save.player.attack) {
    if (actions.has(0)) fail('Duplicate player attack');
    actions.set(0, save.player.attack);
  }
  const actionIds = new Set<string>();
  for (const [actor, action] of actions) {
    const move = action.moveId ?? action.kind;
    const definition = WEAPON_ATTACKS[move] ?? ATTACKS[action.kind];
    if (
      !records.has(actor) ||
      action.startedAt > save.tick ||
      save.tick >= action.startedAt + definition.windup + definition.active + definition.recovery
    )
      fail('Invalid active attack actor or time');
    if (!action.moveId || !action.instanceId)
      fail('Active attacks require a move and instance identity');
    if ((action.kind === 'element') !== (move === 'element')) fail('Attack kind and move disagree');
    const requiredWeapon =
      move === 'sword_slash'
        ? 'sword'
        : move === 'spear_thrust'
          ? 'spear'
          : move === 'bow_shot'
            ? 'bow'
            : null;
    const held = actor === 0 ? save.inventory : loadouts.get(actor)?.combat;
    if (requiredWeapon && (records.get(actor)?.species !== 8 || held?.[0]?.id !== requiredWeapon))
      fail('Weapon attack has no matching carried weapon');
    if (
      action.released &&
      (move !== 'bow_shot' || save.tick < action.startedAt + definition.windup)
    )
      fail('Invalid projectile release phase');
    if (
      action.instanceId &&
      (actionIds.has(action.instanceId) ||
        action.instanceId !== `action:${actor}:${action.startedAt}`)
    )
      fail('Duplicate or mismatched attack instance');
    if (action.instanceId) actionIds.add(action.instanceId);
    if (new Set(action.hit).size !== action.hit.length) fail('Duplicate hit identity in an attack');
    if (action.hit.some((id) => !records.has(id) && (id < 100 || id >= save.entities.nextId)))
      fail('Attack hit references an unallocated identity');
  }
  const reservations = new Set<string>(),
    reservingActors = new Set<number>();
  for (const reservation of save.equipment.reservations) {
    const action = actions.get(reservation.entityId);
    const held =
      reservation.entityId === 0 ? save.inventory : loadouts.get(reservation.entityId)?.combat;
    if (
      reservations.has(reservation.id) ||
      reservingActors.has(reservation.entityId) ||
      !action ||
      action.instanceId !== reservation.id ||
      action.moveId !== 'bow_shot' ||
      action.released ||
      held?.[0]?.id !== 'bow' ||
      held[1]?.id !== 'arrow-bundle' ||
      held[1].instance !== reservation.instance ||
      !held[1].charges
    )
      fail('Invalid or duplicate ammunition reservation');
    reservations.add(reservation.id);
    reservingActors.add(reservation.entityId);
  }
  for (const [actor, action] of actions)
    if (action.moveId === 'bow_shot' && !action.released && !reservingActors.has(actor))
      fail('Unreleased bow attack has no ammunition reservation');
  const projectileIds = new Set<number>();
  for (const arrow of save.combat.projectiles.arrows) {
    if (
      projectileIds.has(arrow.id) ||
      arrow.id > save.combat.projectiles.serial ||
      records.get(arrow.actor)?.species !== 8 ||
      !bindings.has(arrow.scene) ||
      !inside(arrow, arrow.scene) ||
      arrow.expiresAt <= save.tick ||
      arrow.expiresAt > save.tick + 20 ||
      Math.abs(Math.hypot(arrow.vx, arrow.vy) - 18) > 0.001 ||
      arrow.power !== WEAPON_ATTACKS.bow_shot!.power
    )
      fail('Invalid projectile identity, scene, lifetime or velocity');
    projectileIds.add(arrow.id);
  }
  const seenStates = new Set<string>();
  const carrionSources = new Set<number>();
  const checkCarrion = (value: GameSave['carrion'][number], scope: number): void => {
    if (
      records.has(value.sourceId) ||
      carrionSources.has(value.sourceId) ||
      value.sourceId >= save.entities.nextId
    )
      fail('Carrion duplicates a living, protected, retired or unallocated identity');
    carrionSources.add(value.sourceId);
    if ((value.scene !== undefined && value.scene !== scope) || !inside(value, scope))
      fail('Carrion refers to a different or invalid scene');
  };
  const checkDrops = (values: readonly GameSave['drops'][number][], scope: number): void => {
    const ids = new Set<number>();
    for (const value of values) {
      if (ids.has(value.id)) fail('Duplicate scene-local ground drop identity');
      ids.add(value.id);
      if ((value.scene !== undefined && value.scene !== scope) || !inside(value, scope))
        fail('Ground drop refers to a different or invalid scene');
      checkItem({ ...value, id: value.item });
    }
  };
  for (const state of save.scenes.states) {
    if (
      state.id === 'overworld' ||
      seenStates.has(state.id) ||
      ![...bindings.values()].includes(state.id)
    )
      fail('Invalid or duplicate pocket-scene state');
    seenStates.add(state.id);
    const code = codes.get(state.id);
    const layout = layouts.get(state.id);
    if (code === undefined || !layout) continue;
    const side = 2 ** Math.ceil(Math.log2(Math.max(layout.width, layout.height)));
    if (
      state.deltas.some((delta) => delta.index >= side * side) ||
      new Set(state.deltas.map((delta) => delta.index)).size !== state.deltas.length
    )
      fail('Invalid or duplicate local terrain delta');
    checkDrops(state.drops, code);
    for (const value of state.carrion) checkCarrion(value, code);
  }
  for (const record of records.values())
    if (record.scene !== 0 && !seenStates.has(bindings.get(record.scene) ?? ''))
      fail('Occupied pocket scene is missing its saved state');
  checkDrops(save.drops, 0);
  for (const value of save.carrion) checkCarrion(value, 0);
  if (new Set(save.scenes.invitations.map((i) => i.owner)).size !== save.scenes.invitations.length)
    fail('Duplicate scene invitation');
}

/** One-time upgrade. Existing geography, identity, social history and carried items remain intact. */
export function migrateSave(input: unknown): GameSave {
  if (!input || typeof input !== 'object') throw new Error('Save must be an object');
  let candidate = input as Record<string, unknown>;
  if (candidate.version === 1 || candidate.version === 2 || candidate.version === 3) {
    const old = migrateSaveV3(candidate);
    const inventory = new TwoSlotInventory();
    inventory.restore(
      old.inventory,
      Math.max(old.inventorySerial, ...old.inventory.map((i) => Number(i?.instance.slice(5)) || 0)),
    );
    const service = new EquipmentService(inventory);
    service.initialize(old.player.origin);
    const world = new WorldGenerator().generate(old.seed);
    const registry = new SceneRegistry(world, new ResourceStore(world));
    const upgradeAttack = (value: GameSaveV3['player']['attack'], actor: number) =>
      value
        ? { ...value, moveId: value.kind, instanceId: `action:${actor}:${value.startedAt}` }
        : null;
    candidate = {
      ...old,
      version: 4,
      contentVersion: 3,
      entities: {
        ...old.entities,
        records: old.entities.records.map((record) => ({ ...record, scene: 0 })),
      },
      player: { ...old.player, attack: upgradeAttack(old.player.attack, 0) },
      inventorySerial: inventory.serial,
      equipment: service.snapshot(),
      scenes: registry.snapshot(),
      drops: old.drops.map((value) => ({ ...value, scene: 0 })),
      events: old.events.map((value) => ({ ...value, scene: 0 })),
      markers: old.markers.map((value) => ({ ...value, scene: 0 })),
      combat: {
        ...old.combat,
        attacks: old.combat.attacks.map(([actor, value]) => [actor, upgradeAttack(value, actor)]),
        projectiles: { serial: 0, arrows: [] },
      },
    };
  }
  // Additive defaults also accept development v4 checkpoints made before physique was introduced.
  if (candidate.version === 4 && candidate.entities && typeof candidate.entities === 'object') {
    const entities = candidate.entities as { records?: unknown[] };
    if (Array.isArray(entities.records))
      candidate = {
        ...candidate,
        entities: {
          ...entities,
          records: entities.records.map((value) => {
            if (!value || typeof value !== 'object') return value;
            const record = value as Record<string, unknown>,
              index = record.species;
            const id =
              index === 8 ? 'human' : typeof index === 'number' ? SPECIES[index]?.id : undefined;
            const body = PHYSIQUES[id ?? 'human'];
            return {
              heightMeters: Math.fround(body.heightMeters),
              massKg: Math.fround(body.massKg),
              recoilX: 0,
              recoilY: 0,
              ...record,
            };
          }),
        },
      };
  }
  const result = GameSaveSchema.safeParse(candidate);
  if (!result.success)
    throw new Error(
      `Save is incompatible or damaged: ${result.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
    );
  return result.data;
}
