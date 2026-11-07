import { z } from 'zod';
import { NPC_PROFILES, SETTLEMENTS } from '../content/definitions';
import { groundWriting } from '../content/writing-grounding';
import {
  ArtifactStore,
  ArtifactIdSchema,
  type Artifact,
  type ArtifactPlacement,
} from './artifacts';
import { MemoryRepository } from './memory';
import type { EntityStore } from './entities';
import type { TwoSlotInventory } from './inventory';
import type { SceneRegistry } from './scenes';
import { CONFIG, type NpcId } from './values';
import type { LiteracyAction, ReadingTarget } from './text-contracts';

const uint = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  range = z.tuple([uint.min(1), uint.min(1)]);
const continuation = z
  .object({
    artifactId: ArtifactIdSchema,
    revision: uint.min(1),
    next: range,
    kind: z.enum(['pages', 'lines']),
    offset: uint.max(23),
  })
  .strict();
export const LiteracySnapshotSchema = z
  .array(
    z
      .object({
        npcId: z.enum(NPC_PROFILES.map((p) => p.id)),
        readDay: z.number().int().min(-1),
        reads: uint.max(6),
        noteDay: z.number().int().min(-1),
        pageDay: z.number().int().min(-1),
        hands: z
          .array(
            z
              .object({
                id: z.enum(['note', 'book']),
                instance: z.string().min(1).max(200),
                artifact: ArtifactIdSchema,
              })
              .strict(),
          )
          .max(2),
        continuation: continuation.optional(),
      })
      .strict(),
  )
  .max(30)
  .superRefine((rows, ctx) => {
    if (new Set(rows.map((r) => r.npcId)).size !== rows.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate literacy state' });
  });
export type LiteracySnapshot = z.infer<typeof LiteracySnapshotSchema>;
interface DiarySeedSave {
  artifacts: Artifact[];
  artifactSequence: number;
  inventorySerial: number;
  placements: ArtifactPlacement[];
  scenes: { bindings: { id: string }[] };
  elapsedSeconds: number;
}
/** Add upgrade content before validation; restoring an already-v9 save is pure. */
export function seedLegacyDiary<T extends DiarySeedSave>(save: T): T {
  if (
    !Array.isArray(save.artifacts) ||
    !Array.isArray(save.placements) ||
    !Array.isArray(save.scenes?.bindings) ||
    save.artifacts.length >= 512 ||
    save.artifactSequence >= Number.MAX_SAFE_INTEGER ||
    save.inventorySerial >= 0xffffffff
  )
    return save;
  const index = NPC_PROFILES.findIndex((p) => p.name === 'Lark'),
    profile = NPC_PROFILES[index];
  if (
    !profile ||
    save.artifacts.some(
      (a) => a?.kind === 'book' && a.author?.kind === 'npc' && a.author.id === profile.id,
    )
  )
    return save;
  const capital = SETTLEMENTS.find((s) => s.capital && s.village === profile.village),
    home = capital ? `${capital.id}:home:${index % 10}` : '';
  if (!save.scenes.bindings.some((s) => s?.id === home)) return save;
  const propId = `${home}:table`,
    slot = [0, 1].find(
      (slot) =>
        !save.placements.some((p) => p?.sceneId === home && p.propId === propId && p.slot === slot),
    );
  if (slot === undefined) return save;
  const store = new ArtifactStore();
  try {
    store.restore(save.artifacts, save.artifactSequence);
  } catch {
    return save;
  }
  let record: Artifact;
  try {
    record = store.create({
      kind: 'book',
      title: 'Sketch diary',
      author: { kind: 'npc', id: profile.id },
      createdDay: Math.floor(save.elapsedSeconds / CONFIG.daySeconds),
      pages: [[]],
    });
  } catch {
    return save;
  }
  const inventorySerial = save.inventorySerial + 1,
    item = { id: 'book' as const, instance: `item:${inventorySerial}`, artifact: record.id };
  return {
    ...save,
    artifacts: store.snapshot(),
    artifactSequence: store.serial,
    inventorySerial,
    placements: [...save.placements, { artifactId: record.id, sceneId: home, propId, slot, item }],
  };
}
type State = LiteracySnapshot[number];
type TextArtifact = Extract<Artifact, { kind: 'book' | 'note' }>;
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export class LiteracyService {
  private readonly states = new Map<NpcId, State>();
  private readonly tokens = new MemoryRepository();
  constructor(
    private readonly store: EntityStore,
    private readonly artifacts: ArtifactStore,
    private readonly inventory: TwoSlotInventory,
    private readonly placements: ArtifactPlacement[],
    private readonly scenes: SceneRegistry,
  ) {}
  seedDiary(day: number): void {
    const index = NPC_PROFILES.findIndex((p) => p.name === 'Lark'),
      profile = NPC_PROFILES[index];
    if (
      !profile ||
      this.artifacts
        .views()
        .some((a) => a.kind === 'book' && a.author.kind === 'npc' && a.author.id === profile.id) ||
      this.artifacts.views().length >= 512
    )
      return;
    const home = this.scenes.home(index + 1),
      table = home?.props.find((p) => p.display?.accepts.includes('book'));
    if (!home || !table?.display) return;
    const slot = Array.from({ length: table.display.slots }, (_, n) => n).find(
      (slot) =>
        !this.placements.some(
          (p) => p.sceneId === home.id && p.propId === table.id && p.slot === slot,
        ),
    );
    if (slot === undefined) return;
    const record = this.artifacts.create({
      kind: 'book',
      title: 'Sketch diary',
      author: { kind: 'npc', id: profile.id },
      createdDay: day,
      pages: [[]],
    });
    const item = { ...this.inventory.create('book'), artifact: record.id };
    this.placements.push({ sceneId: home.id, propId: table.id, slot, artifactId: record.id, item });
  }
  snapshot(): LiteracySnapshot {
    return structuredClone([...this.states.values()]);
  }
  clearContinuation(artifactId: string): void {
    for (const state of this.states.values())
      if (state.continuation?.artifactId === artifactId) delete state.continuation;
  }
  restore(snapshot: LiteracySnapshot): void {
    this.states.clear();
    for (const state of LiteracySnapshotSchema.parse(snapshot)) this.states.set(state.npcId, state);
  }
  private state(id: NpcId): State {
    return (
      this.states.get(id) ?? {
        npcId: id,
        readDay: -1,
        reads: 0,
        noteDay: -1,
        pageDay: -1,
        hands: [],
      }
    );
  }
  private body(id: NpcId): number {
    return this.store.require(NPC_PROFILES.findIndex((p) => p.id === id) + 1);
  }
  private alive(id: NpcId): boolean {
    const i = this.body(id);
    return this.store.hp[i]! > 0 && !this.store.sleeping[i];
  }
  private homePlacement(id: NpcId, artifactId: string): boolean {
    const home = this.scenes.home(this.store.id(this.body(id)));
    return (
      !!home && this.placements.some((p) => p.artifactId === artifactId && p.sceneId === home.id)
    );
  }
  private carries(id: NpcId, artifactId: string): boolean {
    return this.state(id).hands.some((i) => i.artifact === artifactId);
  }
  reachable(id: NpcId, artifactId: string, dialogue = false): boolean {
    if (this.carries(id, artifactId) || this.homePlacement(id, artifactId)) return true;
    const s = this.store,
      i = this.body(id);
    if (
      dialogue &&
      s.scene[i] === s.scene[s.require(0)] &&
      distance({ x: s.x[i]!, y: s.y[i]! }, { x: s.x[s.require(0)]!, y: s.y[s.require(0)]! }) <= 4 &&
      this.inventory.state.some((item) => item?.artifact === artifactId)
    )
      return true;
    const scene = this.scenes.definitions[s.scene[i]!]!;
    return this.placements.some(
      (p) =>
        p.artifactId === artifactId &&
        p.sceneId === scene.id &&
        scene.props.some(
          (prop) => prop.id === p.propId && distance(prop, { x: s.x[i]!, y: s.y[i]! }) <= 2,
        ),
    );
  }
  private text(id: string): TextArtifact {
    const record = this.artifacts.get(id);
    if (!record || record.kind === 'painting') throw Error('That readable text is unavailable.');
    return record;
  }
  validate(id: NpcId, action: LiteracyAction, day: number, dialogue = false): string | null {
    try {
      if (!this.alive(id))
        throw Error('The villager must be awake and well enough to read or write.');
      const state = this.state(id);
      if (action.type === 'READ_TEXT') {
        if (state.readDay === day && state.reads >= 6)
          throw Error('This villager has used today’s six reads.');
        if (!this.reachable(id, action.artifactId, dialogue))
          throw Error('That text is not within the villager’s reach.');
        this.excerpt(id, action);
      } else if (action.type === 'WRITE_NOTE') {
        if (state.noteDay === day) throw Error('This villager has already written a note today.');
        groundWriting(action.title, true);
        action.lines.forEach((line) => groundWriting(line));
        if (!groundWriting(action.title, true)) throw Error('Give the note a title.');
        if (action.giveToPlayer) {
          const s = this.store,
            i = this.body(id),
            p = s.require(0);
          if (
            !dialogue ||
            s.scene[i] !== s.scene[p] ||
            distance({ x: s.x[i]!, y: s.y[i]! }, { x: s.x[p]!, y: s.y[p]! }) > 4
          )
            throw Error('The dialogue partner is too far away for a note.');
          if (this.inventory.state.every(Boolean))
            throw Error('The player needs a free hand for this note.');
        } else if (!this.freeDisplay(id) && state.hands.length >= 2)
          throw Error('The villager has no room for another note.');
      } else {
        if (state.pageDay === day) throw Error('This villager has already written a page today.');
        const record = this.text(action.artifactId);
        if (
          record.kind !== 'book' ||
          record.sealed ||
          record.author.kind !== 'npc' ||
          record.author.id !== id ||
          (!this.carries(id, record.id) && !this.homePlacement(id, record.id))
        )
          throw Error('Only an owned, unsealed book held or kept at home can be appended.');
        if (record.pages.length >= 48) throw Error('The book has no blank pages left.');
        action.lines.forEach((line) => groundWriting(line));
      }
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'The text proposal is invalid.';
    }
  }
  private freeDisplay(id: NpcId): { sceneId: string; propId: string; slot: number } | null {
    const home = this.scenes.home(this.store.id(this.body(id)));
    if (!home || this.store.scene[this.body(id)] !== home.code) return null;
    for (const prop of home.props)
      if (prop.display?.accepts.includes('note'))
        for (let slot = 0; slot < prop.display.slots; slot++)
          if (
            !this.placements.some(
              (p) => p.sceneId === home.id && p.propId === prop.id && p.slot === slot,
            )
          )
            return { sceneId: home.id, propId: prop.id, slot };
    return null;
  }
  execute(
    id: NpcId,
    action: LiteracyAction,
    day: number,
    dialogue = false,
  ): { ok: boolean; message: string } {
    const error = this.validate(id, action, day, dialogue);
    if (error) return { ok: false, message: error };
    if (action.type === 'READ_TEXT')
      return { ok: false, message: 'Reading requires a bounded reading job.' };
    try {
      const state = this.state(id);
      if (action.type === 'WRITE_PAGE') {
        const record = this.text(action.artifactId);
        if (record.kind !== 'book') throw Error('Expected a book.');
        this.artifacts.update(record.id, {
          pages: [...record.pages, action.lines.map((line) => groundWriting(line))],
        });
        this.clearContinuation(record.id);
        state.pageDay = day;
      } else {
        const record = this.artifacts.create({
          kind: 'note',
          title: groundWriting(action.title, true),
          author: { kind: 'npc', id },
          createdDay: day,
          lines: action.lines.map((line) => groundWriting(line)),
        });
        const item = { ...this.inventory.create('note'), id: 'note' as const, artifact: record.id };
        if (action.giveToPlayer) this.inventory.insert(item);
        else {
          const display = this.freeDisplay(id);
          if (display) this.placements.push({ ...display, artifactId: record.id, item });
          else state.hands.push(item);
        }
        state.noteDay = day;
      }
      this.states.set(id, state);
      return {
        ok: true,
        message: action.type === 'WRITE_PAGE' ? 'A diary page was written.' : 'A note was written.',
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Writing could not be saved.',
      };
    }
  }
  beginRead(
    id: NpcId,
    action: Extract<LiteracyAction, { type: 'READ_TEXT' }>,
    day: number,
    conversationId?: string,
  ): ReadingTarget {
    const error = this.validate(id, action, day, !!conversationId);
    if (error) throw Error(error);
    const target = this.excerpt(id, action),
      state = this.state(id);
    state.reads = state.readDay === day ? state.reads + 1 : 1;
    state.readDay = day;
    this.states.set(id, state);
    return { ...target, ...(conversationId ? { conversationId } : {}) };
  }
  private excerpt(
    id: NpcId,
    action: Extract<LiteracyAction, { type: 'READ_TEXT' }>,
  ): ReadingTarget {
    const record = this.text(action.artifactId),
      kind = record.kind === 'book' ? 'pages' : 'lines';
    const requested = action[kind];
    if (!requested || action[kind === 'pages' ? 'lines' : 'pages'])
      throw Error('Choose the matching page or line range.');
    const [from, to] = requested,
      limit = kind === 'pages' ? 2 : 48,
      length = record.kind === 'book' ? record.pages.length : record.lines.length;
    if (to < from || to - from + 1 > limit || from > length)
      throw Error('The requested reading range is invalid or too wide.');
    const end = Math.min(to, length),
      saved = this.state(id).continuation;
    const offset =
      saved &&
      saved.artifactId === record.id &&
      saved.revision === record.revision &&
      saved.kind === kind &&
      saved.next[0] === from &&
      saved.next[1] === to
        ? saved.offset
        : 0;
    const lines: { text: string; page: number; line: number }[] = [];
    if (record.kind === 'book') {
      for (let page = from; page <= end; page++)
        record.pages[page - 1]!.forEach((text, line) => {
          if (page !== from || line >= offset) lines.push({ text, page, line: line + 1 });
        });
    } else
      for (let line = from; line <= end; line++)
        lines.push({ text: record.lines[line - 1]!, page: 1, line });
    if (!lines.length) throw Error('There is no written text in that range.');
    let count = 0,
      excerpt = '';
    for (let n = 1; n <= lines.length; n++) {
      const text =
        lines
          .slice(0, n)
          .map((l) => l.text)
          .join('\n') + (n < lines.length ? `\n[… ${lines.length - n} more lines not read]` : '');
      if (this.tokens.estimateTokens(JSON.stringify(text)) > 600) break;
      count = n;
      excerpt = text;
    }
    if (!count) throw Error('A line exceeds the reading excerpt budget.');
    const read = lines.slice(0, count),
      first = read[0]!,
      last = read.at(-1)!;
    const source = {
      artifactId: record.id,
      revision: record.revision,
      ...(kind === 'pages'
        ? {
            pages: [first.page, last.page] as [number, number],
            pageLines: [...new Set(read.map((l) => l.page))].map((page) => ({
              page,
              from: read.find((l) => l.page === page)!.line,
              to: read.filter((l) => l.page === page).at(-1)!.line,
            })),
          }
        : { lines: [first.line, last.line] as [number, number] }),
    };
    let next: ReadingTarget['continuation'];
    if (count < lines.length) {
      const unread = lines[count]!;
      const start = kind === 'pages' ? unread.page : unread.line;
      next = {
        artifactId: record.id,
        revision: record.revision,
        kind,
        next: [start, Math.min(length, start + limit - 1)],
        offset: kind === 'pages' ? unread.line - 1 : 0,
      };
    } else if (end < length)
      next = {
        artifactId: record.id,
        revision: record.revision,
        kind,
        next: [end + 1, Math.min(length, end + limit)],
        offset: 0,
      };
    return {
      metadata: {
        id: record.id,
        kind: record.kind,
        title: record.title,
        author: record.author,
        createdDay: record.createdDay,
        revision: record.revision,
        sealed: record.sealed,
        length,
      },
      source,
      requested: structuredClone(action),
      excerpt,
      ...(next ? { continuation: next } : {}),
    };
  }
  validateResult(id: NpcId, target: ReadingTarget, dialogue: boolean): boolean {
    return (
      this.alive(id) &&
      this.artifacts.get(target.source.artifactId)?.revision === target.source.revision &&
      this.reachable(id, target.source.artifactId, dialogue)
    );
  }
  finishRead(id: NpcId, target: ReadingTarget, wantsMore: boolean): void {
    const state = this.state(id);
    if (wantsMore && target.continuation) state.continuation = structuredClone(target.continuation);
    else delete state.continuation;
    this.states.set(id, state);
  }
  facts(id: NpcId, dialogue = false): object {
    const s = this.store,
      i = this.body(id),
      origin = { x: s.x[i]!, y: s.y[i]! };
    const rows = this.artifacts
      .views()
      .filter((a) => a.kind !== 'painting' && this.reachable(id, a.id, dialogue))
      .map((a) => {
        const placement = this.placements.find((p) => p.artifactId === a.id),
          scene = placement
            ? this.scenes.definitions.find((d) => d.id === placement.sceneId)
            : undefined,
          prop = scene?.props.find((p) => p.id === placement?.propId);
        return {
          a,
          distance: this.carries(id, a.id)
            ? 0
            : scene?.code === s.scene[i] && prop
              ? distance(origin, prop)
              : this.homePlacement(id, a.id)
                ? 100
                : 1,
        };
      })
      .sort((a, b) => a.distance - b.distance || Number(a.a.id.slice(4)) - Number(b.a.id.slice(4)));
    const readables: object[] = [];
    for (const { a } of rows) {
      const candidate = {
        artifactId: a.id,
        kind: a.kind,
        title: a.title,
        author: a.author.kind === 'player' ? 'player' : a.author.id,
        [a.kind === 'book' ? 'pages' : 'lines']: a.length,
        sealed: a.sealed,
      };
      if (this.tokens.estimateTokens(JSON.stringify([...readables, candidate])) <= 120)
        readables.push(candidate);
      if (readables.length === 5) break;
    }
    const next = this.state(id).continuation;
    return {
      readables,
      ...(next &&
      this.artifacts.get(next.artifactId)?.revision === next.revision &&
      this.reachable(id, next.artifactId, dialogue)
        ? { continueReading: { artifactId: next.artifactId, [next.kind]: next.next } }
        : {}),
    };
  }
}
