import { z } from 'zod';
import { ItemIdSchema, NPC_PROFILES, SPECIES, SETTLEMENTS } from '../content/definitions';
import {
  GameSaveSchema as LegacySchema,
  migrateSave as parseLegacy,
  npcState,
} from './legacy-save';
import { EntityStore, FLOAT_COLUMNS, BYTE_COLUMNS } from './entities';
import { CONFIG } from './values';

const finite = z.number().finite(),
  uint = z.number().int().min(0).max(0xffffffff),
  need = finite.min(0).max(1);
const species = z.enum([
  'human',
  'ignicap',
  'rivallie',
  'zephyrit',
  'mireling',
  'cindermoth',
  'steamshell',
  'bramblefang',
  'marshstalker',
]);
const animalSpecies = species.exclude(['human']);
const position = {
  x: finite.min(1).max(CONFIG.worldSize - 1),
  y: finite.min(1).max(CONFIG.worldSize - 1),
};
const nature = z
  .object({
    response: z.enum(['avoid', 'retaliate']),
    aggression: z
      .array(
        z
          .object({ target: species.or(z.literal('nonhuman')), radius: finite.min(0.5).max(12) })
          .strict(),
      )
      .max(12),
  })
  .strict();
const fields = Object.fromEntries(
  [...FLOAT_COLUMNS, ...BYTE_COLUMNS].map((k) => [k, finite]),
) as Record<(typeof FLOAT_COLUMNS)[number] | (typeof BYTE_COLUMNS)[number], typeof finite>;
const entity = z
  .object({
    ...fields,
    ...position,
    id: uint,
    slot: uint.max(CONFIG.creatureCapacity + 30),
    owner: z.number().int().min(-1).max(30),
    herd: uint.max(65535),
    nature,
    preferences: z.array(ItemIdSchema).max(16),
    restrictions: z.array(ItemIdSchema).max(16),
    food: need,
    water: need,
    recreation: need,
    cleanliness: need,
    rest: need,
    trust: need,
    hp: finite.nonnegative(),
    stamina: finite.min(0).max(100),
    experience: finite.nonnegative(),
    wildness: finite.min(0).max(1.02),
    level: uint.min(1).max(50),
    species: uint.max(8),
    alive: z.literal(1),
    mode: uint.max(8),
    tier: uint.max(1),
    sleeping: uint.max(1),
    forcedRest: uint.max(1),
    voluntaryRest: uint.max(1),
    downed: uint.max(1),
    affinity: uint.max(2),
  })
  .strict();
const item = z
  .object({
    id: ItemIdSchema,
    instance: z
      .string()
      .regex(/^item:\d+$/)
      .max(40),
    originSpecies: z.array(animalSpecies).min(1).max(8).optional(),
  })
  .strict();
const attack = z
  .object({
    kind: z.enum(['strike', 'element']),
    startedAt: uint,
    hit: z.array(uint).max(CONFIG.creatureCapacity + 31),
  })
  .strict();
const legacy = LegacySchema.shape;
const combat = z
  .object({
    hunting: z.array(uint).max(CONFIG.creatureCapacity).default([]),
    serial: uint,
    encounters: legacy.combat.shape.encounters,
    nextAttack: z.array(z.tuple([uint, uint])).max(CONFIG.creatureCapacity + 31),
    duel: uint.max(29).nullable(),
    target: uint.nullable(),
    pursuits: z
      .array(
        z.tuple([
          uint,
          z
            .object({
              target: uint,
              cause: z.enum(['hunt', 'retaliate', 'territory', 'duel', 'assist']),
              until: uint,
            })
            .strict(),
        ]),
      )
      .max(CONFIG.creatureCapacity + 31),
    attacks: z.array(z.tuple([uint, attack])).max(CONFIG.creatureCapacity + 31),
    assaults: z.array(z.tuple([uint, uint])).max(30),
  })
  .strict();
export const GameSaveSchema = z
  .object({
    ...legacy,
    version: z.literal(3),
    contentVersion: z.literal(2),
    player: z
      .object({
        entityId: z.literal(0),
        origin: uint.max(2),
        dashUntil: uint,
        dashReadyAt: uint,
        attack: attack.nullable(),
        invulnerableUntil: uint,
      })
      .strict(),
    entities: z
      .object({
        count: uint.max(CONFIG.creatureCapacity),
        nextId: uint.min(100),
        records: z.array(entity).max(CONFIG.creatureCapacity + 31),
      })
      .strict(),
    npcs: z
      .array(
        npcState
          .omit({ x: true, y: true, facingX: true, facingY: true })
          .extend({ entityId: uint.min(1).max(30), partner: uint.nullable() }),
      )
      .length(30),
    inventory: z.tuple([item.nullable(), item.nullable()]),
    drops: z
      .array(
        z
          .object({
            id: uint.min(1),
            item: ItemIdSchema,
            ...position,
            originSpecies: z.array(animalSpecies).min(1).max(8).optional(),
          })
          .strict(),
      )
      .max(512),
    carrion: z
      .array(
        z
          .object({
            sourceId: uint.min(100),
            species: animalSpecies,
            ...position,
            remaining: uint.max(4),
            expiresAt: finite.nonnegative(),
          })
          .strict(),
      )
      .max(CONFIG.creatureCapacity * 2),
    supplies: z
      .array(
        z
          .object({
            id: z.string().max(100),
            ...position,
            stock: z.partialRecord(ItemIdSchema, uint.max(64)),
          })
          .strict(),
      )
      .length(9),
    ecology: z
      .object({
        target: uint.max(CONFIG.creatureCapacity),
        deaths: uint,
        births: uint,
        replacements: z
          .array(
            z
              .object({ species: uint.max(7), due: finite.nonnegative(), sourceId: uint.min(100) })
              .strict(),
          )
          .max(CONFIG.creatureCapacity),
      })
      .strict(),
    combat,
  })
  .omit({ creatures: true })
  .strict()
  .superRefine((save, ctx) => {
    const fail = (message: string): void => {
      ctx.addIssue({ code: 'custom', message });
    };
    const records = save.entities.records,
      ids = new Set(records.map((r) => r.id)),
      slots = new Set(records.map((r) => r.slot));
    if (ids.size !== records.length || slots.size !== records.length)
      fail('Duplicate entity ID or slot');
    if (records.filter((r) => r.species === 8).length !== 31 || !ids.has(0))
      fail('All 31 humans must be present');
    if (records.filter((r) => r.owner === 0).length > 1) fail('Multiple player partnerships');
    for (const r of records) {
      if (r.id >= save.entities.nextId && r.species !== 8)
        fail('Next identity would reuse a persistent ID');
      if (
        r.species === 8
          ? r.slot !== CONFIG.creatureCapacity + r.id || r.id > 30 || r.owner !== -1
          : r.slot >= save.entities.count || r.id < 100
      )
        fail('Entity kind/slot/identity mismatch');
      const maxHp = (r.species === 8 ? 100 : SPECIES[r.species]!.hp) + (r.level - 1) * 5;
      if (r.hp > maxHp + 0.01) fail('Entity exceeds durable maximum HP');
      if (r.owner > 0 && !save.npcs.some((n) => n.entityId === r.owner && n.partner === r.id))
        fail('Companion owner mismatch');
      if (r.sleeping && (r.hp === 0 || r.downed)) fail('Downed actors cannot sleep');
    }
    for (let i = 0; i < save.npcs.length; i++) {
      const n = save.npcs[i]!,
        profile = NPC_PROFILES[i]!;
      if (n.profileId !== profile.id || n.entityId !== i + 1) fail('Villager identity mismatch');
      const companion = records.find((r) => r.id === n.partner);
      if (
        (profile.partner === null) !== (n.partner === null) ||
        (n.partner !== null &&
          (!companion ||
            companion.owner !== n.entityId ||
            SPECIES[companion.species]?.id !== profile.partner))
      )
        fail('Permanent authored bond changed');
      if (new Set(n.memory.records.map((m) => m.id)).size !== n.memory.records.length)
        fail('Duplicate memory identities');
    }
    if (
      new Set(save.carrion.map((c) => c.sourceId)).size !== save.carrion.length ||
      save.carrion.some((c) => ids.has(c.sourceId))
    )
      fail('Carrion duplicates a living entity');
    if (
      new Set(save.ecology.replacements.map((r) => r.sourceId)).size !==
        save.ecology.replacements.length ||
      save.ecology.replacements.some((r) => ids.has(r.sourceId))
    )
      fail('Replacement identity has not retired');
    if (
      new Set(save.supplies.map((s) => s.id)).size !== 9 ||
      save.supplies.some((s) => !SETTLEMENTS.some((t) => t.id === s.id))
    )
      fail('Invalid settlement supplies');
    if (save.combat.target !== null && !ids.has(save.combat.target)) fail('Invalid combat target');
    if (save.combat.pursuits.some(([id, p]) => !ids.has(id) || !ids.has(p.target)))
      fail('Invalid pursuit entity');
    if (save.combat.hunting.some((id) => !ids.has(id))) fail('Invalid hunter identity');
    if (
      [
        ...save.carrion.map((c) => c.sourceId),
        ...save.ecology.replacements.map((r) => r.sourceId),
      ].some((id) => id >= save.entities.nextId)
    )
      fail('Retired identity exceeds allocation counter');
    for (const entries of [
      save.combat.pursuits,
      save.combat.nextAttack,
      save.combat.attacks,
      save.combat.assaults,
    ])
      if (new Set(entries.map(([id]) => id)).size !== entries.length)
        fail('Duplicate combat identity');
    for (const values of [
      save.worldDeltas.map((d) => d.index),
      save.drops.map((d) => d.id),
      save.inventory.filter(Boolean).map((i) => i!.instance),
    ])
      if (new Set<string | number>(values).size !== values.length)
        fail('Duplicate saved resource identity');
    for (const food of [
      ...save.inventory.filter(Boolean),
      ...save.drops.map((d) => ({ id: d.item, originSpecies: d.originSpecies })),
    ])
      if (food && ['meat', 'meal'].includes(food.id) && !food.originSpecies?.length)
        fail('Animal food lost species provenance');
  });
export type GameSave = z.infer<typeof GameSaveSchema>;

/** v2 indices become persistent IDs once. Historical event IDs and terrain are retained. */
export function migrateSave(input: unknown): GameSave {
  if (!input || typeof input !== 'object') throw new Error('Save must be an object');
  let candidate = input as Record<string, unknown>;
  if (candidate.version === 1 || candidate.version === 2) {
    const old = parseLegacy(candidate),
      store = new EntityStore(),
      c = old.creatures;
    store.spawnHuman(0, old.player.origin, old.player.x, old.player.y);
    const p = store.require(0);
    for (const k of ['hp', 'stamina', 'experience', 'level', 'facingX', 'facingY'] as const)
      store[k][p] = old.player[k];
    for (let i = 0; i < 30; i++) {
      const n = old.npcs[i]!;
      store.spawnHuman(i + 1, NPC_PROFILES[i]!.village, n.x, n.y);
      const b = store.require(i + 1);
      store.facingX[b] = n.facingX;
      store.facingY[b] = n.facingY;
    }
    for (let i = 0; i < c.count; i++) {
      const slot = store.spawn(c.bytes.species[i]!, c.floats.x[i]!, c.floats.y[i]!, c.owner[i]!);
      for (const k of FLOAT_COLUMNS)
        if (k in c.floats) store[k][slot] = (c.floats as Record<string, number[]>)[k]![i]!;
      for (const k of ['mode', 'tier', 'level'] as const) store[k][slot] = c.bytes[k][i]!;
      store.herd[slot] = c.herd[i]!;
      if (store.hp[slot] === 0) {
        store.downed[slot] = 1;
        store.recoverAt[slot] = Math.max(old.elapsedSeconds + 1, store.recoverAt[slot]!);
      }
    }
    if (store.hp[p] === 0) {
      store.downed[p] = 1;
      store.recoverAt[p] = old.elapsedSeconds + 1;
    }
    const key = (id: number): number => 100 + id;
    const reference = (value: string): string =>
      /^creature:\d+$/.test(value) ? `entity:${100 + Number(value.slice(9))}` : value;
    const npcs = old.npcs.map((n, i) => {
      const { x, y, facingX, facingY, ...metadata } = n;
      return {
        ...metadata,
        entityId: i + 1,
        partner: n.partner === null ? null : key(n.partner),
        memory: {
          ...n.memory,
          records: n.memory.records.map((m) => ({ ...m, subjects: m.subjects.map(reference) })),
        },
      };
    });
    const { creatures: unused, player: previous, npcs: oldNpcs, ...rest } = old;
    candidate = {
      ...rest,
      events: old.events.map((event) => ({ ...event, subjects: event.subjects.map(reference) })),
      version: 3,
      contentVersion: 2,
      player: {
        entityId: 0,
        origin: previous.origin,
        dashUntil: previous.dashUntil,
        dashReadyAt: previous.dashReadyAt,
        attack: previous.attack ? { ...previous.attack, hit: previous.attack.hit.map(key) } : null,
        invulnerableUntil: previous.invulnerableUntil,
      },
      entities: store.snapshot(),
      npcs,
      carrion: [],
      supplies: SETTLEMENTS.map((s) => ({
        id: s.id,
        x: s.x + 0.5,
        y: s.y + 2.5,
        stock: {
          berries: 12,
          reeds: 8,
          wheat: 8,
          nectar: 8,
          ashgrass: 8,
          fungi: 8,
          water: 12,
          fiber: 4,
        },
      })),
      ecology: { target: c.count, deaths: 0, births: 0, replacements: [] },
      combat: {
        ...old.combat,
        target: old.combat.target === null ? null : key(old.combat.target),
        encounters: old.combat.encounters.map((e) => ({ ...e, target: key(e.target) })),
        nextAttack: old.combat.nextAttack.map(([id, tick]) => [key(id), tick]),
        pursuits: [],
        attacks: [],
        assaults: [],
      },
    };
  }
  const result = GameSaveSchema.safeParse(candidate);
  if (!result.success)
    throw new Error(
      `Save is incompatible or damaged: ${result.error.issues
        .slice(0, 3)
        .map((i) => i.path.join('.') + ': ' + i.message)
        .join('; ')}`,
    );
  return result.data;
}
