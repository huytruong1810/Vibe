import { z } from 'zod';
import { ReadingProvenanceSchema } from './text-contracts';
import { CONFIG } from './values';
import type { NpcProfile } from '../content/definitions';

const tick = z.number().finite().nonnegative();
const id = z.string().min(1).max(200);
const text = z.string().min(1).max(280);
export const MemoryTypeSchema = z.enum([
  'episodic',
  'semantic',
  'commitment',
  'relationship',
  'reflection',
  'sight',
  'reading',
]);
export const MemoryRecordV2Schema = z
  .object({
    id,
    type: MemoryTypeSchema,
    text,
    subjects: z.array(id).max(40),
    importance: z.number().int().min(1).max(10),
    createdTick: tick,
    lastAccessTick: tick,
    confidence: z.enum(['witnessed', 'told', 'inferred']),
    source: z
      .object({
        kind: z.enum(['event', 'session', 'reflection', 'sight', 'artifact']),
        ids: z.array(id).max(256),
        reading: ReadingProvenanceSchema.optional(),
      })
      .strict(),
    invalidAtTick: tick.optional(),
    supersededBy: id.optional(),
  })
  .strict()
  .superRefine((record, ctx) => {
    if (
      record.source.reading &&
      (record.type !== 'reading' ||
        record.source.kind !== 'artifact' ||
        !record.source.ids.includes(record.source.reading.artifactId))
    )
      ctx.addIssue({
        code: 'custom',
        message: 'Reading provenance must bind a reading memory to its artifact source',
      });
  });
export type MemoryType = z.infer<typeof MemoryTypeSchema>;
export type MemoryRecordV2 = z.infer<typeof MemoryRecordV2Schema>;
export const CoreBlocksSchema = z
  .object({
    self: z.string().max(300),
    player: z.string().max(400),
    relationships: z.string().max(400),
  })
  .strict();
export type CoreBlocks = z.infer<typeof CoreBlocksSchema>;
export const MemoryStateSchema = z
  .object({
    revision: tick.int().max(Number.MAX_SAFE_INTEGER),
    serial: tick.int().max(Number.MAX_SAFE_INTEGER),
    core: CoreBlocksSchema,
    records: z.array(MemoryRecordV2Schema),
    pending: z.array(MemoryRecordV2Schema),
    lastReflection: tick,
    importanceSinceReflection: tick,
  })
  .strict()
  .superRefine((m, ctx) => {
    const all = [...m.records, ...m.pending];
    if (
      m.records.filter(validMemory).length > 400 ||
      new Set(all.map((r) => r.id)).size !== all.length
    )
      ctx.addIssue({ code: 'custom', message: 'Memory capacity or identity conflict' });
    const ids = new Set(m.records.map((r) => r.id));
    if (m.pending.some((r) => !validMemory(r) || r.supersededBy))
      ctx.addIssue({ code: 'custom', message: 'Deferred writes cannot already be invalidated' });
    if (
      m.records.some(
        (r) =>
          r.supersededBy &&
          (r.invalidAtTick === undefined || !ids.has(r.supersededBy) || r.supersededBy === r.id),
      )
    )
      ctx.addIssue({ code: 'custom', message: 'Dangling memory supersession' });
  });
export type MemoryState = z.infer<typeof MemoryStateSchema>;
export const validMemory = (r: MemoryRecordV2): boolean => r.invalidAtTick === undefined;
export function seedCore(profile: NpcProfile): CoreBlocks {
  return {
    self: `${profile.name}, ${profile.role}. ${profile.background}`.slice(0, 300),
    player: '',
    relationships: profile.relationships.join(', ').slice(0, 400),
  };
}
export function createMemory(profile: NpcProfile): MemoryState {
  return {
    revision: 0,
    serial: 0,
    core: seedCore(profile),
    records: [],
    pending: [],
    lastReflection: 0,
    importanceSinceReflection: 0,
  };
}
export function migrateMemory(
  profile: NpcProfile,
  old: {
    revision: number;
    serial: number;
    summary: string;
    records: (LegacyMemoryInput & { id: string })[];
    lastReflection: number;
  },
): MemoryState {
  const owner = { profileId: profile.id, memory: createMemory(profile) };
  owner.memory.serial = Math.max(
    old.serial,
    ...old.records.map((r) => Number(r.id.match(/:m(\d+)$/)?.[1]) || 0),
  );
  for (const input of old.records) {
    const before = owner.memory.records.length;
    new MemoryRepository().append(owner, input, input.id);
    // Legacy conversations were stored as witnessed under the published migration contract.
    if (input.kind === 'conversation')
      for (const record of owner.memory.records.slice(before)) record.confidence = 'witnessed';
  }
  if (old.summary)
    new MemoryRepository().append(owner, {
      tick: 0,
      day: 0,
      kind: 'fact',
      text: `Earlier, I remembered: ${old.summary}`,
      subjects: [profile.id],
      importance: 5,
      sourceIds: [],
    });
  owner.memory.revision = old.revision;
  owner.memory.lastReflection = old.lastReflection;
  return owner.memory;
}
type Owner = { profileId: string; memory: MemoryState };
export type LegacyMemoryInput = {
  tick: number;
  day: number;
  kind: 'fact' | 'hearsay' | 'reflection' | 'conversation';
  text: string;
  subjects: readonly string[];
  importance: number;
  sourceIds: readonly string[];
};
export type MemoryInput = Omit<MemoryRecordV2, 'id'>;
export class MemoryRepository {
  append(npc: Owner, input: MemoryInput | LegacyMemoryInput, preservedId?: string): MemoryRecordV2 {
    const m = npc.memory;
    const record: MemoryInput =
      'kind' in input
        ? {
            type: input.kind === 'reflection' ? 'reflection' : 'episodic',
            text: input.text,
            subjects: [...input.subjects],
            importance: Math.max(1, Math.min(10, Math.round(input.importance))),
            createdTick: input.tick,
            lastAccessTick: input.tick,
            confidence:
              input.kind === 'hearsay' || input.kind === 'conversation'
                ? 'told'
                : input.kind === 'reflection'
                  ? 'inferred'
                  : 'witnessed',
            source: {
              kind:
                input.kind === 'conversation'
                  ? 'session'
                  : input.kind === 'reflection'
                    ? 'reflection'
                    : 'event',
              ids: [...input.sourceIds],
            },
          }
        : input;
    // Long deterministic observations are retained as linked-size records, never truncated.
    let first: MemoryRecordV2 | undefined;
    for (let start = 0; start < Math.max(1, record.text.length); start += 280) {
      const next = MemoryRecordV2Schema.parse({
        ...record,
        text: record.text.slice(start, start + 280) || 'No detail recorded.',
        id: start === 0 && preservedId ? preservedId : `${npc.profileId}:m${++m.serial}`,
      });
      if (m.records.filter(validMemory).length < 400) m.records.push(next);
      else m.pending.push(next);
      m.importanceSinceReflection += next.importance;
      first ??= next;
    }
    m.revision++;
    return first!;
  }
  drain(npc: Owner): void {
    const m = npc.memory;
    let room = 400 - m.records.filter(validMemory).length;
    if (room > 0 && m.pending.length) {
      m.records.push(...m.pending.splice(0, room));
      m.revision++;
    }
  }
  estimateTokens(text: string): number {
    return Math.ceil(new TextEncoder().encode(text).length / 3);
  }
}

export type MemoryVectors = {
  query: readonly number[];
  records: ReadonlyMap<string, { text: string; vector: readonly number[] }>;
};
export function cosine(a: readonly number[], b: readonly number[]): number {
  if (a.length !== 256 || b.length !== 256) return 0;
  let dot = 0,
    aa = 0,
    bb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    aa += a[i]! ** 2;
    bb += b[i]! ** 2;
  }
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}
export class MemoryRetriever {
  /** These are persistent claims, not simulation action commitments. */
  pinned(npc: Owner, subjects: readonly string[] = ['player']): MemoryRecordV2[] {
    return npc.memory.records
      .filter(
        (r) =>
          validMemory(r) &&
          !r.supersededBy &&
          (r.type === 'commitment' || r.type === 'relationship') &&
          r.subjects.some((subject) => subjects.includes(subject)),
      )
      .sort((a, b) => b.createdTick - a.createdTick || a.id.localeCompare(b.id));
  }
  retrieve(
    npc: Owner,
    query: string,
    now: number,
    count = 8,
    vectors?: MemoryVectors,
    mode: 'combined' | 'relevance' = 'combined',
    subjects: readonly string[] = ['player'],
  ): MemoryRecordV2[] {
    const words = new Set(query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
    const rows = npc.memory.records
      .filter((r) => validMemory(r) && !r.supersededBy)
      .map((record) => {
        const cached = vectors?.records.get(record.id);
        let relevance: number;
        if (vectors && cached?.text === record.text)
          relevance = Math.max(0, Math.min(1, (cosine(vectors.query, cached.vector) - 0.3) / 0.7));
        else {
          const terms = new Set(record.text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
          relevance = [...words].filter((w) => terms.has(w)).length / Math.max(1, words.size);
        }
        const recency = Math.pow(
          0.995,
          Math.max(0, now - record.createdTick) / ((CONFIG.tickRate * CONFIG.daySeconds) / 24),
        );
        return {
          record,
          score:
            mode === 'relevance'
              ? relevance
              : 0.35 * recency + 0.35 * (record.importance / 10) + 0.65 * relevance,
        };
      });
    // Explicit counts above eight are maintenance/embedding queries, not dialogue prompts.
    const pinned =
      mode === 'combined' && count <= 8
        ? this.pinned(npc, subjects).slice(0, Math.min(4, count))
        : [];
    const pinnedIds = new Set(pinned.map((r) => r.id));
    return [
      ...pinned,
      ...rows
        .filter((r) => !pinnedIds.has(r.record.id))
        .sort(
          (a, b) =>
            b.score - a.score ||
            b.record.createdTick - a.record.createdTick ||
            (a.record.id < b.record.id ? -1 : a.record.id > b.record.id ? 1 : 0),
        )
        .slice(0, Math.max(0, count - pinned.length))
        .map((r) => r.record),
    ];
  }
}

const operation = z.discriminatedUnion('op', [
  z
    .object({
      op: z.literal('ADD'),
      type: MemoryTypeSchema,
      text,
      subjects: z.array(id).max(40),
      importance: z.number().int().min(1).max(10),
    })
    .strict(),
  z
    .object({
      op: z.literal('UPDATE'),
      id,
      text,
      importance: z.number().int().min(1).max(10).optional(),
    })
    .strict(),
  z.object({ op: z.literal('INVALIDATE'), id, reason: text }).strict(),
  z.object({ op: z.literal('NOOP') }).strict(),
]);
export const ExtractionResponseSchema = z
  .object({
    operations: z.array(operation).max(8),
    blocks: z
      .array(
        z
          .object({
            block: z.enum(['self', 'player', 'relationships']),
            value: z.string().max(400),
          })
          .strict(),
      )
      .max(2),
  })
  .strict();
export const SynthesisResponseSchema = z
  .object({
    records: z
      .array(z.object({ text, sourceIds: z.array(id).min(1).max(32) }).strict())
      .min(1)
      .max(3),
  })
  .strict();
export const FoldResponseSchema = z
  .object({ text, sourceIds: z.array(id).min(2).max(32) })
  .strict();
export interface MemoryTarget {
  sessionId: string;
  revision: number;
  sourceIds: readonly string[];
}
/** Validate a whole proposal before changing any persistent state. */
export function applyExtraction(
  npc: Owner,
  target: MemoryTarget,
  output: unknown,
  now: number,
  entities: ReadonlySet<string>,
): boolean {
  const parsed = ExtractionResponseSchema.safeParse(output),
    m = npc.memory;
  if (!parsed.success || target.revision !== m.revision) return false;
  const { operations, blocks } = parsed.data;
  const grounded = (value: string): boolean =>
    (value.match(/(?:npc:[A-Za-z_-]+|entity:\d+)/g) ?? []).every((entity) => entities.has(entity));
  const supplied = new Set(target.sourceIds),
    changed = new Set<string>();
  const core = { ...m.core };
  for (const edit of blocks) {
    if (changed.has(edit.block) || !grounded(edit.value)) return false;
    changed.add(edit.block);
    core[edit.block] = edit.value;
  }
  if (!CoreBlocksSchema.safeParse(core).success) return false;
  changed.clear();
  for (const op of operations) {
    if ('text' in op && !grounded(op.text)) return false;
    if (op.op === 'ADD' && op.subjects.some((s) => !entities.has(s))) return false;
    if (op.op === 'UPDATE' || op.op === 'INVALIDATE') {
      if (
        !supplied.has(op.id) ||
        changed.has(op.id) ||
        !m.records.some((r) => r.id === op.id && validMemory(r))
      )
        return false;
      changed.add(op.id);
    }
  }
  const repository = new MemoryRepository();
  // Free explicitly invalidated slots first; replacements retain their slot, new writes may defer.
  const order = { INVALIDATE: 0, UPDATE: 1, ADD: 2, NOOP: 3 };
  for (const op of [...operations].sort((a, b) => order[a.op] - order[b.op])) {
    if (op.op === 'NOOP') continue;
    if (op.op === 'INVALIDATE') {
      m.records.find((r) => r.id === op.id)!.invalidAtTick = now;
      continue;
    }
    const old = op.op === 'UPDATE' ? m.records.find((r) => r.id === op.id)! : undefined;
    if (old) old.invalidAtTick = now;
    const added = repository.append(npc, {
      type: op.op === 'ADD' ? op.type : old!.type,
      text: op.text,
      subjects: op.op === 'ADD' ? op.subjects : [...old!.subjects],
      importance: op.importance ?? old!.importance,
      confidence: 'told',
      createdTick: now,
      lastAccessTick: now,
      source: { kind: 'session', ids: [target.sessionId] },
    });
    if (old) old.supersededBy = added.id;
  }
  m.core = core;
  m.revision++;
  repository.drain(npc);
  return true;
}

export function applySynthesis(
  npc: Owner,
  target: MemoryTarget,
  output: unknown,
  now: number,
  folding: boolean,
): boolean {
  const m = npc.memory;
  const accumulatedImportance = m.importanceSinceReflection;
  if (m.revision !== target.revision) return false;
  const parsed = folding
    ? FoldResponseSchema.safeParse(output)
    : SynthesisResponseSchema.safeParse(output);
  if (!parsed.success) return false;
  const records = 'records' in parsed.data ? parsed.data.records : [parsed.data];
  const originals = m.records.filter((r) => target.sourceIds.includes(r.id) && validMemory(r));
  if (records.some((r) => r.sourceIds.some((s) => !originals.some((o) => o.id === s))))
    return false;
  if (
    folding &&
    (originals.some((r) => r.type !== 'episodic') ||
      records[0]!.sourceIds.length !== originals.length ||
      new Set(records[0]!.sourceIds).size !== originals.length)
  )
    return false;
  if (!folding && m.records.filter(validMemory).length + records.length > 400) return false;
  if (folding) for (const r of originals) r.invalidAtTick = now;
  const repository = new MemoryRepository();
  for (const r of records) {
    const added = repository.append(npc, {
      type: folding ? 'episodic' : 'reflection',
      text: r.text,
      subjects: [...new Set(originals.flatMap((o) => o.subjects))].slice(0, 40),
      importance: folding ? Math.max(...originals.map((o) => o.importance)) : 6,
      confidence: 'inferred',
      createdTick: now,
      lastAccessTick: now,
      source: { kind: 'reflection', ids: r.sourceIds },
    });
    if (folding) for (const original of originals) original.supersededBy = added.id;
  }
  if (!folding) {
    m.importanceSinceReflection = 0;
    m.lastReflection = now;
  } else m.importanceSinceReflection = accumulatedImportance;
  repository.drain(npc);
  return true;
}
