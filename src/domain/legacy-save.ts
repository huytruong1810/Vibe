import { z } from 'zod';
import { ItemIdSchema, NPC_PROFILES, SPECIES } from '../content/definitions';
import { CONFIG as CURRENT_CONFIG } from './values';
const CONFIG = { ...CURRENT_CONFIG, saveVersion: 2, contentVersion: 1 };

const finite = z.number().finite(),
  nonnegative = finite.nonnegative(),
  integer = z.number().int(),
  coordinate = finite.min(1).max(CONFIG.worldSize - 1);
const npcId = z.enum(
  NPC_PROFILES.map((n) => n.id) as [
    (typeof NPC_PROFILES)[number]['id'],
    ...(typeof NPC_PROFILES)[number]['id'][],
  ],
);
const position = { x: coordinate, y: coordinate };
const boundedText = z.string().max(1600),
  sourceIds = z.array(z.string().max(200)).max(256);
const memoryRecord = z
  .object({
    id: z.string().max(200),
    tick: nonnegative,
    day: nonnegative,
    kind: z.enum(['fact', 'hearsay', 'reflection', 'conversation']),
    text: boundedText,
    subjects: z.array(z.string().max(200)).max(40),
    importance: finite.min(0).max(10),
    sourceIds,
  })
  .strict();
const commitment = z
  .object({
    id: z.string().max(200),
    participants: z.array(npcId).max(30),
    location: z.string().max(100),
    startsAt: nonnegative,
    endsAt: nonnegative,
    status: z.enum(['planned', 'fulfilled', 'missed']),
    sourceIds,
  })
  .strict();
const location = z.enum(['home', 'work', 'square', 'shrine', 'outpost']);
export const npcState = z
  .object({
    profileId: npcId,
    ...position,
    activity: z.string().max(160),
    facingX: finite,
    facingY: finite,
    revision: integer.nonnegative(),
    lastBattleDay: integer.min(-1),
    lastGiftDay: integer.min(-1),
    partner: integer
      .min(0)
      .max(CONFIG.creatureCapacity - 1)
      .nullable(),
    affinity: finite.min(-100).max(100),
    relations: z.partialRecord(npcId, finite.min(-100).max(100)),
    memory: z
      .object({
        revision: integer.nonnegative(),
        serial: integer.nonnegative(),
        summary: boundedText,
        records: z.array(memoryRecord).max(CONFIG.memoryLimit),
        lastReflection: nonnegative,
      })
      .strict(),
    override: z
      .object({ location, until: nonnegative, activity: z.string().max(100) })
      .strict()
      .nullable(),
    tomorrow: z
      .object({
        day: integer.nonnegative(),
        location,
        startHour: finite.min(6).max(20),
        durationHours: finite.min(0.5).max(3),
      })
      .strict()
      .nullable(),
    followingUntil: nonnegative,
    lastPlan: nonnegative,
    lastSocial: finite,
    heard: z.array(z.string().max(200)).max(128),
    commitments: z.array(commitment).max(32),
    gesture: z.enum(['spark', 'bubble', 'chirp']).nullable(),
    gestureUntil: nonnegative,
  })
  .strict();
const column = z.array(finite).max(CONFIG.creatureCapacity),
  byteColumn = z.array(integer.min(0).max(255)).max(CONFIG.creatureCapacity);
const creatures = z
  .object({
    count: integer.min(0).max(CONFIG.creatureCapacity),
    floats: z
      .object({
        x: column,
        y: column,
        vx: column,
        vy: column,
        hp: column,
        food: column,
        water: column,
        recreation: column,
        cleanliness: column,
        wildness: column,
        trust: column,
        targetX: column,
        targetY: column,
        commitUntil: column,
        recoverAt: column,
        experience: column,
      })
      .strict(),
    bytes: z
      .object({
        species: byteColumn,
        alive: byteColumn,
        mode: byteColumn,
        tier: byteColumn,
        level: byteColumn,
      })
      .strict(),
    owner: z.array(integer.min(-1).max(30)).max(CONFIG.creatureCapacity),
    herd: z.array(integer.min(0).max(65535)).max(CONFIG.creatureCapacity),
  })
  .strict();
const item = z
  .object({
    id: ItemIdSchema,
    instance: z
      .string()
      .regex(/^item:\d+$/)
      .max(40),
  })
  .strict()
  .nullable();
const combat = z
  .object({
    serial: integer.nonnegative(),
    encounters: z
      .array(
        z
          .object({
            id: integer.nonnegative(),
            target: integer.nonnegative(),
            npcIndex: integer.min(0).max(29).nullable(),
            resolved: z.boolean(),
            startedAt: nonnegative,
          })
          .strict(),
      )
      .max(256),
    nextAttack: z.array(z.tuple([integer.nonnegative(), nonnegative])).max(CONFIG.creatureCapacity),
    duel: integer.min(0).max(29).nullable(),
    target: integer.nonnegative().nullable(),
  })
  .strict();

export const GameSaveSchema = z
  .object({
    version: z.literal(CONFIG.saveVersion),
    generatorVersion: z.literal(CONFIG.generatorVersion),
    contentVersion: z.literal(CONFIG.contentVersion),
    seed: integer.min(-2147483648).max(4294967295),
    tick: integer.nonnegative(),
    elapsedSeconds: nonnegative,
    random: z
      .object({ ecology: integer.min(0).max(4294967295), combat: integer.min(0).max(4294967295) })
      .strict(),
    player: z
      .object({
        ...position,
        facingX: finite.min(-1).max(1),
        facingY: finite.min(-1).max(1),
        hp: finite.min(0).max(100),
        maxHp: z.literal(100),
        stamina: finite.min(0).max(100),
        experience: nonnegative,
        level: integer.min(1).max(50),
        origin: integer.min(0).max(2),
        dashUntil: nonnegative,
        dashReadyAt: nonnegative,
        attack: z
          .object({
            kind: z.enum(['strike', 'element']),
            startedAt: nonnegative,
            hit: z.array(integer.nonnegative()).max(CONFIG.creatureCapacity),
          })
          .strict()
          .nullable(),
        invulnerableUntil: nonnegative,
      })
      .strict(),
    inventory: z.tuple([item, item]),
    inventorySerial: integer.nonnegative(),
    creatures,
    npcs: z.array(npcState).length(30),
    worldDeltas: z
      .array(
        z
          .object({
            index: integer.min(0).max(CONFIG.worldSize ** 2 - 1),
            resource: integer.min(0).max(14),
            quantity: integer.min(0).max(65535),
            regrowAt: nonnegative,
            flags: integer.min(0).max(63),
            fluid: integer.min(0).max(4),
            reactionUntil: nonnegative,
          })
          .strict(),
      )
      .max(CONFIG.worldSize ** 2),
    drops: z
      .array(z.object({ id: integer.positive(), item: ItemIdSchema, ...position }).strict())
      .max(512),
    markers: z
      .array(z.object({ ...position, label: z.string().max(100), source: npcId }).strict())
      .max(16),
    reactions: z
      .array(
        z
          .object({
            index: integer.min(0).max(CONFIG.worldSize ** 2 - 1),
            type: z.enum(['fire', 'freeze', 'shock', 'thaw']),
            remaining: integer.min(0).max(4),
          })
          .strict(),
      )
      .max(2048),
    combat,
    events: z
      .array(
        z
          .object({
            id: z.string().max(200),
            tick: nonnegative,
            day: nonnegative,
            type: z.string().max(100),
            text: boundedText,
            ...position,
            subjects: z.array(z.string().max(200)).max(40),
            importance: finite.min(0).max(10),
          })
          .strict(),
      )
      .max(CONFIG.eventLimit),
    eventSerial: integer.nonnegative(),
    journal: z.array(z.string().max(100)).max(64),
  })
  .strict()
  .superRefine((save, context) => {
    const fail = (message: string): void => {
      context.addIssue({ code: 'custom', message });
    };
    const c = save.creatures;
    for (const [name, array] of Object.entries({
      ...c.floats,
      ...c.bytes,
      owner: c.owner,
      herd: c.herd,
    }))
      if (array.length !== c.count) fail(`Creature column length mismatch: ${name}`);
    for (let i = 0; i < c.count; i++) {
      if (
        c.bytes.species[i]! > 5 ||
        c.bytes.level[i]! < 1 ||
        c.bytes.level[i]! > 50 ||
        c.bytes.alive[i]! > 1 ||
        c.bytes.tier[i]! > 1 ||
        c.bytes.mode[i]! > 8
      )
        fail(`Invalid creature definition at ${i}`);
      if (
        c.floats.x[i]! < 1 ||
        c.floats.x[i]! >= CONFIG.worldSize - 1 ||
        c.floats.y[i]! < 1 ||
        c.floats.y[i]! >= CONFIG.worldSize - 1
      )
        fail(`Creature outside world: ${i}`);
      if (
        c.floats.hp[i]! < 0 ||
        c.floats.experience[i]! < 0 ||
        c.floats.wildness[i]! < 0 ||
        c.floats.wildness[i]! > 1.02
      )
        fail(`Invalid creature stats: ${i}`);
      const definition = SPECIES[c.bytes.species[i]!];
      if (definition && c.floats.hp[i]! > definition.hp + (c.bytes.level[i]! - 1) * 5 + 0.01)
        fail(`Creature exceeds maximum HP: ${i}`);
      for (const key of ['food', 'water', 'recreation', 'cleanliness', 'trust'] as const)
        if (c.floats[key][i]! < 0 || c.floats[key][i]! > 1.0001) fail(`Invalid ${key} at ${i}`);
      if (c.owner[i]! > 0 && save.npcs[c.owner[i]! - 1]?.partner !== i)
        fail(`Partner owner mismatch: ${i}`);
    }
    if (c.owner.filter((o) => o === 0).length > 1) fail('Multiple player partnerships');
    for (let i = 0; i < save.npcs.length; i++) {
      const n = save.npcs[i]!;
      if (n.profileId !== NPC_PROFILES[i]!.id) fail('NPC profile order mismatch');
      if ((NPC_PROFILES[i]!.partner === null) !== (n.partner === null))
        fail('Permanent NPC partner rule changed');
      if (
        n.partner !== null &&
        SPECIES[c.bytes.species[n.partner]!]?.id !== NPC_PROFILES[i]!.partner
      )
        fail('NPC partner species changed');
      if (n.partner !== null && (n.partner >= c.count || c.owner[n.partner] !== i + 1))
        fail('NPC partner mismatch');
      if (new Set(n.memory.records.map((r) => r.id)).size !== n.memory.records.length)
        fail('Duplicate memory identities');
    }
    if (new Set(save.worldDeltas.map((d) => d.index)).size !== save.worldDeltas.length)
      fail('Duplicate terrain changes');
    if (new Set(save.drops.map((d) => d.id)).size !== save.drops.length)
      fail('Duplicate ground drop');
    if (save.combat.target !== null && save.combat.target >= c.count) fail('Invalid combat target');
    if (
      save.combat.encounters.some((e) => e.target >= c.count) ||
      save.combat.nextAttack.some(([i]) => i >= c.count)
    )
      fail('Invalid encounter entity');
    const instances = save.inventory.filter(Boolean).map((i) => i!.instance);
    if (new Set(instances).size !== instances.length) fail('Duplicate carried item instance');
  });

export function migrateSave(input: unknown): GameSave {
  if (!input || typeof input !== 'object') throw new Error('Save must be an object');
  let candidate = input as Record<string, unknown>;
  if (candidate.version === 1) {
    candidate = {
      ...candidate,
      version: 2,
      inventorySerial: candidate.inventorySerial ?? 0,
      markers: candidate.markers ?? [],
      reactions: candidate.reactions ?? [],
      journal: candidate.journal ?? [],
    };
  }
  const result = GameSaveSchema.safeParse(candidate);
  if (!result.success)
    throw new Error(
      `Save is incompatible or damaged: ${result.error.issues
        .slice(0, 3)
        .map((i) => i.message)
        .join('; ')}`,
    );
  return result.data as GameSave;
}

export type GameSave = z.infer<typeof GameSaveSchema>;
