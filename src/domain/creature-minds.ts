import { CREATURE_TACTICS, type Tactics } from '../content/creature-tactics';
export { CREATURE_TACTICS } from '../content/creature-tactics';
import { hashString } from './core';
import { z } from 'zod';
import { SPECIES, CREATURE_MOVES, itemIds, type SpeciesId } from '../content/definitions';
import { EntityStore } from './entities';
import { CreatureMode, creatureTraversal, moveOnTerrain, WellbeingPolicy } from './creatures';
import { Biome, Fluid, TileFlag, SurfaceRules, type ChunkStore } from './world';
import type { CombatSystem } from './combat';

export const OBSERVATION_SCHEMA = 'crm-obs-1';
export const CONDITIONING_SCHEMA = 'crm-cond-1';
export const CONDITIONING_SIZE = 30;
/** Conditioning is separate from the honest local observation, including for future policies. */
export function fillConditioning(
  out: Float32Array,
  species: number,
  template: number,
  temperament: number,
  level: number,
  bondHearts: number,
  partner: boolean,
): void {
  if (
    out.length !== CONDITIONING_SIZE ||
    !Number.isInteger(species) ||
    species < 0 ||
    species > 7 ||
    !Number.isInteger(template) ||
    template < 0 ||
    template > 3 ||
    !Number.isInteger(temperament) ||
    temperament < 0 ||
    temperament > 14
  )
    throw Error('Invalid crm-cond-1 conditioning');
  out.fill(0);
  out[species] = 1;
  out[8 + template] = 1;
  out[12 + temperament] = 1;
  out[27] = Math.min(1, Math.max(0, level / 100));
  out[28] = Math.min(1, Math.max(0, bondHearts / 10));
  out[29] = partner ? 1 : 0;
}
// Change this identity whenever scoring or execution semantics change.
export const SCRIPTED_RULES = 'crm-scripted-1';
export const INTENTS = [
  'hold',
  'approach',
  'flankLeft',
  'flankRight',
  'retreat',
  'flee',
  'strike',
  'element',
  'guard',
  'dash',
  'callPack',
  'follow',
] as const;
export type CreatureIntent = (typeof INTENTS)[number];
export enum Engagement {
  Calm,
  Alert,
  Engaged,
  Disengaging,
}
export const SCRIPTED_RULES_HASH = `crm-scripted-1:${hashString(JSON.stringify(CREATURE_TACTICS)).toString(16)}`;

/** Integer hash buckets and caller-owned result buffers. IDs break distance ties. */
export class PerceptionGrid {
  private readonly heads: Int32Array;
  private readonly next: Int32Array;
  private readonly distances: Float64Array;
  private readonly groupDistances = new Float64Array(6);
  constructor(
    private readonly store: EntityStore,
    buckets = 4096,
    private readonly loaded: (scene: number) => boolean = () => true,
  ) {
    this.heads = new Int32Array(buckets);
    this.next = new Int32Array(store.capacity);
    this.distances = new Float64Array(8);
    this.heads.fill(-1);
  }
  private bucket(scene: number, x: number, y: number): number {
    return (
      ((Math.imul(scene + 1, 73856093) ^ Math.imul(x, 19349663) ^ Math.imul(y, 83492791)) >>> 0) %
      this.heads.length
    );
  }
  rebuild(): void {
    this.heads.fill(-1);
    const s = this.store;
    for (let i = s.capacity - 1; i >= 0; i--) {
      if (!s.alive[i] || s.hp[i]! <= 0 || !this.loaded(s.scene[i]!)) continue;
      const key = this.bucket(s.scene[i]!, Math.floor(s.x[i]! / 4), Math.floor(s.y[i]! / 4));
      this.next[i] = this.heads[key]!;
      this.heads[key] = i;
    }
  }
  visible(i: number, j: number, radius: number, world?: ChunkStore): boolean {
    const s = this.store;
    if (i === j || !s.alive[j] || s.hp[j]! <= 0 || s.scene[i] !== s.scene[j]) return false;
    const dx = s.x[j]! - s.x[i]!,
      dy = s.y[j]! - s.y[i]!,
      d2 = dx * dx + dy * dy;
    const tile = world?.index(s.x[j]!, s.y[j]!);
    const concealed =
      world &&
      tile !== undefined &&
      (world.flags[tile]! & TileFlag.Reeds ||
        world.resource[tile] === itemIds.indexOf('reeds') + 1 ||
        this.deepWater(world, tile));
    const limit = radius * (concealed ? 0.5 : 1);
    if (d2 > limit * limit) return false;
    if (d2 <= 4) return true;
    return dx * s.facingX[i]! + dy * s.facingY[i]! >= Math.sqrt(d2) * -0.3420201433256687;
  }
  private deepWater(world: ChunkStore, tile: number): boolean {
    return !!(world.flags[tile]! & TileFlag.DeepWater);
  }
  nearest(
    i: number,
    radius: number,
    out: Int32Array,
    world?: ChunkStore,
    filter = 0,
    target = -1,
  ): number {
    const s = this.store,
      k = Math.min(8, out.length),
      own = s.definition(i),
      aggression = s.nature(i).aggression;
    out.fill(-1);
    this.distances.fill(Infinity);
    let count = 0;
    const minX = Math.floor((s.x[i]! - radius) / 4),
      maxX = Math.floor((s.x[i]! + radius) / 4);
    const minY = Math.floor((s.y[i]! - radius) / 4),
      maxY = Math.floor((s.y[i]! + radius) / 4);
    for (let cy = minY; cy <= maxY; cy++)
      for (let cx = minX; cx <= maxX; cx++) {
        for (let j = this.heads[this.bucket(s.scene[i]!, cx, cy)]!; j >= 0; j = this.next[j]!) {
          // Hash collisions must not duplicate actors or leak other cells/scenes.
          if (
            Math.floor(s.x[j]! / 4) !== cx ||
            Math.floor(s.y[j]! / 4) !== cy ||
            s.scene[j] !== s.scene[i]
          )
            continue;
          if (filter) {
            const ally =
              !s.isHuman(j) &&
              s.herd[j] === s.herd[i] &&
              s.species[j] === s.species[i] &&
              s.id(j) !== target;
            const other = s.definition(j);
            let threat = s.id(j) === target || !!other.prey?.includes(own.id);
            if (filter === 1 && !threat)
              for (const rule of aggression)
                if (rule.target === other.id || (rule.target === 'nonhuman' && !s.isHuman(j))) {
                  threat = true;
                  break;
                }
            if (
              (filter === 1 && (ally || !threat)) ||
              (filter === 2 && !ally) ||
              (filter === 3 && !own.prey?.includes(other.id))
            )
              continue;
          }
          if (!this.visible(i, j, radius, world)) continue;
          const dx = s.x[j]! - s.x[i]!,
            dy = s.y[j]! - s.y[i]!,
            d2 = dx * dx + dy * dy;
          let n = 0;
          while (
            n < count &&
            (this.distances[n]! < d2 || (this.distances[n] === d2 && s.id(out[n]!) < s.id(j)))
          )
            n++;
          if (n >= k) continue;
          for (let m = Math.min(count, k - 1); m > n; m--) {
            out[m] = out[m - 1]!;
            this.distances[m] = this.distances[m - 1]!;
          }
          out[n] = j;
          this.distances[n] = d2;
          count = Math.min(k, count + 1);
        }
      }
    return count;
  }
  /** One spatial walk fills the three independently ranked observation groups. */
  observationNeighbors(
    i: number,
    radius: number,
    threats: Int32Array,
    allies: Int32Array,
    prey: Int32Array,
    world?: ChunkStore,
    target = -1,
  ): void {
    threats.fill(-1);
    allies.fill(-1);
    prey.fill(-1);
    this.groupDistances.fill(Infinity);
    const s = this.store,
      own = s.definition(i),
      aggression = s.nature(i).aggression,
      minX = Math.floor((s.x[i]! - radius) / 4),
      maxX = Math.floor((s.x[i]! + radius) / 4),
      minY = Math.floor((s.y[i]! - radius) / 4),
      maxY = Math.floor((s.y[i]! + radius) / 4);
    for (let cy = minY; cy <= maxY; cy++)
      for (let cx = minX; cx <= maxX; cx++)
        for (let j = this.heads[this.bucket(s.scene[i]!, cx, cy)]!; j >= 0; j = this.next[j]!) {
          if (
            Math.floor(s.x[j]! / 4) !== cx ||
            Math.floor(s.y[j]! / 4) !== cy ||
            !this.visible(i, j, radius, world)
          )
            continue;
          const other = s.definition(j),
            ally =
              !s.isHuman(j) &&
              s.herd[j] === s.herd[i] &&
              s.species[j] === s.species[i] &&
              s.id(j) !== target,
            food = !!own.prey?.includes(other.id),
            dx = s.x[j]! - s.x[i]!,
            dy = s.y[j]! - s.y[i]!,
            d2 = dx * dx + dy * dy;
          let threat = s.id(j) === target || !!other.prey?.includes(own.id);
          if (!ally && !threat)
            for (const rule of aggression)
              if (rule.target === other.id || (rule.target === 'nonhuman' && !s.isHuman(j))) {
                threat = true;
                break;
              }
          if (ally) this.insertNeighbor(j, d2, allies, 3);
          else if (threat) this.insertNeighbor(j, d2, threats, 0);
          if (food) this.insertNeighbor(j, d2, prey, 5);
        }
  }
  private insertNeighbor(j: number, d2: number, out: Int32Array, offset: number): void {
    const distances = this.groupDistances;
    let n = 0;
    while (
      n < out.length &&
      (distances[offset + n]! < d2 ||
        (distances[offset + n] === d2 && out[n]! >= 0 && this.store.id(out[n]!) < this.store.id(j)))
    )
      n++;
    if (n === out.length) return;
    for (let m = out.length - 1; m > n; m--) {
      out[m] = out[m - 1]!;
      distances[offset + m] = distances[offset + m - 1]!;
    }
    out[n] = j;
    distances[offset + n] = d2;
  }
  /** Fold flocking neighbors directly; unrelated nearby actors never crowd out herd mates. */
  flock(i: number, out: Float64Array, world?: ChunkStore): void {
    out.fill(0);
    const s = this.store,
      x = s.x[i]!,
      y = s.y[i]!;
    const minX = Math.floor((x - 4) / 4),
      maxX = Math.floor((x + 4) / 4);
    const minY = Math.floor((y - 4) / 4),
      maxY = Math.floor((y + 4) / 4);
    for (let cy = minY; cy <= maxY; cy++)
      for (let cx = minX; cx <= maxX; cx++) {
        for (let j = this.heads[this.bucket(s.scene[i]!, cx, cy)]!; j >= 0; j = this.next[j]!) {
          if (
            j === i ||
            s.herd[j] !== s.herd[i] ||
            s.species[j] !== s.species[i] ||
            Math.floor(s.x[j]! / 4) !== cx ||
            Math.floor(s.y[j]! / 4) !== cy ||
            !this.visible(i, j, 4, world)
          )
            continue;
          const dx = x - s.x[j]!,
            dy = y - s.y[j]!,
            d2 = dx * dx + dy * dy;
          if (d2 > 0.001 && d2 < 1.8) {
            out[0]! += dx / d2;
            out[1]! += dy / d2;
          }
          out[2]! += s.vx[j]!;
          out[3]! += s.vy[j]!;
          out[4]! += s.x[j]!;
          out[5]! += s.y[j]!;
          out[6]!++;
        }
      }
    if (out[6]) {
      out[2]! /= out[6]!;
      out[3]! /= out[6]!;
      out[4] = out[4]! / out[6]! - x;
      out[5] = out[5]! / out[6]! - y;
    }
  }
}

const fields = [
  'engage',
  'since',
  'intent',
  'target',
  'until',
  'nextDecision',
  'lastSeen',
  'reactionAt',
  'eventTick',
  'lastHit',
  'lastLanded',
  'dashBias',
  'elementUse',
  'homeX',
  'homeY',
  'homeScene',
  'rng',
  'lastCall',
  'packUntil',
  'leader',
  'command',
  'commandTarget',
  'flanked',
  'strikes',
  'safeX',
  'safeY',
  'safeAt',
  'lastHp',
  'lastMove',
  'scene',
  'lastWindup',
  'request',
  'seenX',
  'seenY',
  'seenVx',
  'seenVy',
  'dashUntil',
  'guardUntil',
  'packBroken',
  'ambush',
  'intentSince',
  'seenFacingX',
  'seenFacingY',
] as const;
type Field = (typeof fields)[number];
const finite = z.number().finite();
export const MindSnapshotSchema = z
  .object({
    observation: z.literal(OBSERVATION_SCHEMA),
    conditioning: z.literal(CONDITIONING_SCHEMA),
    rules: z.literal(SCRIPTED_RULES),
    rulesHash: z.literal(SCRIPTED_RULES_HASH),
    records: z
      .array(
        z
          .object({
            id: z.number().int().nonnegative(),
            values: z.array(finite).length(fields.length),
          })
          .strict(),
      )
      .max(2048),
  })
  .strict();
export type MindSnapshot = z.infer<typeof MindSnapshotSchema>;
export function validateMindState(
  snapshot: MindSnapshot,
  entities: readonly { id: number; species: number; scene: number; hp: number }[],
  tick: number,
  fail: (message: string) => void,
): void {
  const records = new Map(entities.map((r) => [r.id, r])),
    seen = new Set<number>();
  for (const r of snapshot.records) {
    const entity = records.get(r.id),
      v = Object.fromEntries(fields.map((f, n) => [f, r.values[n]!])) as Record<Field, number>;
    if (!entity || entity.species >= 8 || seen.has(r.id)) {
      fail('Invalid or duplicate creature mind identity');
      continue;
    }
    seen.add(r.id);
    for (const [field, max] of [
      ['engage', 3],
      ['intent', 11],
      ['command', 2],
      ['request', 7],
    ] as const)
      if (!Number.isInteger(v[field]) || v[field] < 0 || v[field] > max)
        fail(`Invalid creature mind ${field}`);
    if (!Number.isInteger(v.rng) || v.rng < 0 || v.rng > 0xffffffff)
      fail('Invalid creature RNG state');
    if (v.scene !== entity.scene) fail('Creature mind scene disagrees with body');
    for (const f of ['since', 'lastSeen', 'lastMove', 'eventTick', 'lastWindup'] as const)
      if (!Number.isInteger(v[f]) || v[f] < 0 || v[f] > tick)
        fail(`Invalid creature mind tick ${f}`);
    for (const f of [
      'until',
      'nextDecision',
      'reactionAt',
      'safeAt',
      'packUntil',
      'dashUntil',
      'guardUntil',
    ] as const)
      if (!Number.isSafeInteger(v[f]) || v[f] < 0) fail(`Invalid creature mind schedule ${f}`);
    for (const f of ['target', 'commandTarget', 'leader'] as const) {
      const id = v[f];
      if (!Number.isInteger(id) || id < -1 || (id >= 0 && !records.has(id)))
        fail(`Dangling creature mind ${f}`);
    }
    if (v.target >= 0 && records.get(v.target)?.scene !== entity.scene)
      fail('Cross-scene creature mind target');
  }
}
export function emptyMinds(): MindSnapshot {
  return {
    observation: OBSERVATION_SCHEMA,
    conditioning: CONDITIONING_SCHEMA,
    rules: SCRIPTED_RULES,
    rulesHash: SCRIPTED_RULES_HASH,
    records: [],
  };
}
export function initialMindRecord(
  r: {
    id: number;
    x: number;
    y: number;
    scene: number;
    hp: number;
    species: number;
  },
  seed = 0,
): MindSnapshot['records'][number] {
  const v = Object.fromEntries(fields.map((f) => [f, 0])) as Record<Field, number>;
  v.target = v.leader = v.commandTarget = -1;
  v.homeX = r.x;
  v.homeY = r.y;
  v.homeScene = v.scene = r.scene;
  v.rng = (Math.imul((r.id ^ seed) >>> 0, 1664525) + 1013904223) >>> 0;
  v.request =
    CREATURE_TACTICS[SPECIES[r.species]!.id as Exclude<SpeciesId, 'human'>].elementBias >= 0.5
      ? 7
      : 6;
  v.lastCall = v.lastHit = v.lastLanded = -300;
  v.lastHp = r.hp;
  return { id: r.id, values: fields.map((f) => v[f]) };
}
export function remapMindScenes(
  snapshot: MindSnapshot,
  remap: (scene: number) => number,
): MindSnapshot {
  const scene = fields.indexOf('scene'),
    home = fields.indexOf('homeScene');
  return {
    ...snapshot,
    records: snapshot.records.map((r) => {
      const values = [...r.values];
      values[scene] = remap(values[scene]!);
      values[home] = remap(values[home]!);
      return { ...r, values };
    }),
  };
}
export interface CreatureBrain {
  choose(
    observation: Float32Array,
    scores: Float32Array,
    legal: Uint8Array,
    current: number,
    random: number,
  ): number;
}
export class ScriptedCreatureBrain implements CreatureBrain {
  choose(
    _observation: Float32Array,
    scores: Float32Array,
    legal: Uint8Array,
    current: number,
    random: number,
  ): number {
    let best = 0,
      value = -Infinity;
    for (let n = 0; n < 12; n++) {
      if (!legal[n]) continue;
      const score =
        scores[n]! + (n === current ? 0.1 : 0) + (((random >>> (n % 24)) & 255) / 255) * 0.05;
      if (score > value) {
        value = score;
        best = n;
      }
    }
    return best;
  }
}

/** Saved columns use float64 so ticks, stable uint32 IDs and RNG states remain exact. */
export class CreatureMinds {
  readonly state: Record<Field, Float64Array>;
  readonly ids: Float64Array;
  readonly grid: PerceptionGrid;
  readonly observations: Float32Array;
  readonly scores: Float32Array;
  readonly legal = new Uint8Array(12);
  readonly fullRate: Uint8Array;
  private readonly inspectorObservation = new Float32Array(64);
  private readonly flocking = new Float64Array(7);
  private readonly motionPosition = { x: 0, y: 0 };
  private readonly neighbors = new Int32Array(8);
  private readonly threatSlots = new Int32Array(3);
  private readonly allySlots = new Int32Array(2);
  private readonly preySlot = new Int32Array(1);
  private readonly ranked: Int32Array;
  private readonly observationViews: Float32Array[];
  private readonly scoreViews: Float32Array[];
  private readonly brain: CreatureBrain = new ScriptedCreatureBrain();
  now = 480;
  brainMs = 0;
  movementMs = 0;
  constructor(
    private readonly s: EntityStore,
    private readonly combat: CombatSystem,
    private readonly worldFor: (scene: number) => ChunkStore | undefined,
    private readonly loaded: (scene: number) => boolean = () => true,
    private readonly seed = 0,
  ) {
    this.state = Object.fromEntries(fields.map((f) => [f, new Float64Array(s.capacity)])) as Record<
      Field,
      Float64Array
    >;
    this.ids = new Float64Array(s.capacity);
    this.ids.fill(-1);
    this.grid = new PerceptionGrid(s, 4096, loaded);
    this.observations = new Float32Array(s.capacity * 64);
    this.scores = new Float32Array(s.capacity * 12);
    this.observationViews = Array.from({ length: s.capacity }, (_, i) =>
      this.observations.subarray(i * 64, i * 64 + 64),
    );
    this.scoreViews = Array.from({ length: s.capacity }, (_, i) =>
      this.scores.subarray(i * 12, i * 12 + 12),
    );
    this.fullRate = new Uint8Array(s.capacity);
    this.ranked = new Int32Array(48);
  }
  tactics(i: number): Tactics {
    return CREATURE_TACTICS[SPECIES[this.s.species[i]!]!.id as Exclude<SpeciesId, 'human'>];
  }
  sync(): void {
    const s = this.s,
      a = this.state;
    for (let i = 0; i < s.count; i++) {
      if (!s.alive[i] || s.isHuman(i)) {
        this.ids[i] = -1;
        continue;
      }
      if (this.ids[i] !== s.id(i)) {
        const record = initialMindRecord(
          {
            id: s.id(i),
            x: s.x[i]!,
            y: s.y[i]!,
            scene: s.scene[i]!,
            hp: s.hp[i]!,
            species: s.species[i]!,
          },
          this.seed,
        );
        for (let n = 0; n < fields.length; n++) a[fields[n]!][i] = record.values[n]!;
        this.ids[i] = s.id(i);
      }
      if (s.hp[i]! <= 0 || a.scene[i] !== s.scene[i]) {
        a.engage[i] = Engagement.Calm;
        a.intent[i] = 0;
        a.target[i] = a.leader[i] = -1;
        a.command[i] = 0;
        a.commandTarget[i] = -1;
        a.scene[i] = a.homeScene[i] = s.scene[i]!;
        a.homeX[i] = s.x[i]!;
        a.homeY[i] = s.y[i]!;
        this.combat.cancelAction(s.id(i));
        this.combat.pursuits.delete(s.id(i));
      }
      if (s.owner[i] !== 0) {
        a.command[i] = 0;
        a.commandTarget[i] = -1;
      }
      const commandTarget = s.slot(a.commandTarget[i]!);
      if (
        a.commandTarget[i]! >= 0 &&
        (commandTarget === undefined ||
          s.hp[commandTarget]! <= 0 ||
          s.scene[commandTarget] !== s.scene[i])
      ) {
        a.command[i] = 0;
        a.commandTarget[i] = -1;
      }
      if (a.leader[i]! >= 0 && s.slot(a.leader[i]!) === undefined) {
        a.packBroken[i] = 1;
        a.leader[i] = -1;
      }
      const target = s.slot(a.target[i]!);
      if (
        a.target[i]! >= 0 &&
        (target === undefined || s.hp[target]! <= 0 || s.scene[target] !== s.scene[i])
      )
        a.target[i] = -1;
    }
  }
  sees(i: number, j: number): boolean {
    return this.grid.visible(i, j, this.tactics(i).notice, this.worldFor(this.s.scene[i]!));
  }
  alert(i: number, target: number, tick: number): void {
    const a = this.state;
    if (a.engage[i] === Engagement.Calm) {
      a.engage[i] = Engagement.Alert;
      a.since[i] = tick;
      a.until[i] = tick + 6 + (this.s.id(i) % 7);
      a.nextDecision[i] = a.until[i]!;
      a.intent[i] = 8;
      a.flanked[i] = 0;
      a.strikes[i] = 0;
      a.packBroken[i] = 0;
      a.leader[i] = this.s.id(i);
      for (let j = 0; j < this.s.count; j++)
        if (
          this.s.alive[j] &&
          this.s.hp[j]! > 0 &&
          this.s.species[j] === this.s.species[i] &&
          this.s.herd[j] === this.s.herd[i] &&
          this.s.scene[j] === this.s.scene[i] &&
          Math.hypot(this.s.x[j]! - this.s.x[i]!, this.s.y[j]! - this.s.y[i]!) <= 12
        )
          a.leader[i] = Math.min(a.leader[i]!, this.s.id(j));
    }
    a.target[i] = target;
    a.lastSeen[i] = tick;
    const b = this.s.slot(target);
    if (b !== undefined) {
      a.seenX[i] = this.s.x[b]!;
      a.seenY[i] = this.s.y[b]!;
      a.seenVx[i] = this.s.vx[b]!;
      a.seenVy[i] = this.s.vy[b]!;
      a.seenFacingX[i] = this.s.facingX[b]!;
      a.seenFacingY[i] = this.s.facingY[b]!;
    }
  }
  private random(i: number): number {
    const a = this.state;
    a.rng[i] = (Math.imul(a.rng[i]!, 1664525) + 1013904223) >>> 0;
    return a.rng[i]!;
  }
  reaction(i: number, tick: number): void {
    const a = this.state,
      delay = this.combat.director.settings.reactionDelay;
    if (a.eventTick[i] === tick) return;
    a.eventTick[i] = tick;
    const at = tick + delay.min + (this.random(i) % (delay.max - delay.min + 1));
    a.reactionAt[i] = a.reactionAt[i]! > tick ? Math.min(a.reactionAt[i]!, at) : at;
  }
  command(kind: 'focus' | 'regroup', target: number | undefined, tick: number): boolean {
    const s = this.s;
    this.sync();
    let i = -1;
    for (let n = 0; n < s.count; n++)
      if (s.alive[n] && s.owner[n] === 0 && s.hp[n]! > 0) {
        i = n;
        break;
      }
    if (i < 0) return false;
    const b = target === undefined ? undefined : s.slot(target);
    if (
      kind === 'focus' &&
      (b === undefined || !this.sees(i, b) || s.owner[b] === 0 || target === 0)
    )
      return false;
    this.state.command[i] = kind === 'focus' ? 1 : 2;
    this.state.commandTarget[i] = kind === 'focus' ? target! : 0;
    if (kind === 'focus')
      this.combat.pursuits.set(s.id(i), { target: target!, cause: 'assist', until: tick + 450 });
    else {
      this.combat.pursuits.delete(s.id(i));
      this.combat.cancelAction(s.id(i));
    }
    this.alert(i, kind === 'focus' ? target! : 0, tick);
    return true;
  }
  engage(tick: number): void {
    this.sync();
    const s = this.s,
      a = this.state;
    for (let i = 0; i < s.count; i++) {
      if (this.ids[i]! < 0 || s.hp[i]! <= 0 || !this.loaded(s.scene[i]!)) continue;
      const pursuit = this.combat.pursuits.get(s.id(i));
      if (pursuit && a.engage[i] === Engagement.Calm) this.alert(i, pursuit.target, tick);
      if (a.engage[i] === Engagement.Calm) {
        const count = this.grid.nearest(
          i,
          this.tactics(i).notice,
          this.neighbors,
          this.worldFor(s.scene[i]!),
          1,
        );
        for (let n = 0; n < count; n++) {
          const other = this.neighbors[n]!;
          if (s.definition(other).prey?.includes(s.definition(i).id)) {
            this.alert(i, s.id(other), tick);
            this.combat.pursuits.set(s.id(i), {
              target: s.id(other),
              cause: 'retaliate',
              until: tick + 450,
            });
            break;
          }
        }
        if (a.engage[i] === Engagement.Calm) continue;
      }
      if (pursuit && a.target[i] !== pursuit.target) this.alert(i, pursuit.target, tick);
      const b = s.slot(a.target[i]!);
      if (b !== undefined && this.sees(i, b)) {
        a.lastSeen[i] = tick;
        a.seenX[i] = s.x[b]!;
        a.seenY[i] = s.y[b]!;
        a.seenVx[i] = s.vx[b]!;
        a.seenVy[i] = s.vy[b]!;
        a.seenFacingX[i] = s.facingX[b]!;
        a.seenFacingY[i] = s.facingY[b]!;
      }
      if (s.hp[i]! < a.lastHp[i]!) {
        a.lastHit[i] = tick - 1;
        this.reaction(i, tick);
      }
      a.lastHp[i] = s.hp[i]!;
      if (b !== undefined) {
        const phase = this.combat.actionPhase(s.id(b), tick),
          started = this.combat.actionStarted(s.id(b));
        if (phase === 1 && started !== a.lastWindup[i] && this.sees(i, b)) {
          a.lastWindup[i] = started;
          if (this.combat.actionMove(s.id(b)) === 'element')
            a.elementUse[i] = Math.min(1, a.elementUse[i]! + 0.15);
          this.reaction(i, tick);
        }
        if (this.sees(i, b) && Math.hypot(s.vx[b]!, s.vy[b]!) > 8) {
          const side = s.vx[b]! * s.facingY[i]! - s.vy[b]! * s.facingX[i]!;
          a.dashBias[i] = Math.max(-1, Math.min(1, a.dashBias[i]! + Math.sign(side) * 0.01));
        }
      }
      const leader = s.slot(a.leader[i]!);
      const broken =
        s.definition(i).id === 'bramblefang' &&
        a.leader[i] !== s.id(i) &&
        (leader === undefined || s.hp[leader]! <= 0);
      if (broken) a.packBroken[i] = 1;
      const world = this.worldFor(s.scene[i]!);
      const marshLost =
        s.definition(i).id === 'marshstalker' &&
        world &&
        b !== undefined &&
        world.biome[world.index(a.seenX[i]!, a.seenY[i]!)] !== Biome.Swamp &&
        Math.hypot(a.seenX[i]! - a.homeX[i]!, a.seenY[i]! - a.homeY[i]!) > 4;
      const escaped =
        b !== undefined && Math.hypot(a.seenX[i]! - a.homeX[i]!, a.seenY[i]! - a.homeY[i]!) > 18;
      const preyEscaped =
        pursuit?.cause === 'hunt' &&
        b !== undefined &&
        Math.hypot(a.seenX[i]! - s.x[i]!, a.seenY[i]! - s.y[i]!) > this.tactics(i).notice * 1.5;
      if (
        a.engage[i] !== Engagement.Disengaging &&
        (tick - a.lastSeen[i]! >= 90 ||
          escaped ||
          preyEscaped ||
          broken ||
          marshLost ||
          b === undefined)
      ) {
        a.engage[i] = Engagement.Disengaging;
        a.since[i] = tick;
        a.intent[i] = 4;
        this.combat.cancelAction(s.id(i));
        this.combat.pursuits.delete(s.id(i));
      }
      if (a.engage[i] === Engagement.Disengaging) {
        if (tick - a.since[i]! >= 60) {
          a.engage[i] = Engagement.Calm;
          a.target[i] = -1;
          a.intent[i] = 0;
          s.mode[i] = CreatureMode.Wander;
        }
        continue;
      }
      s.mode[i] = CreatureMode.Combat;
      if (a.engage[i] === Engagement.Alert && tick >= a.until[i]!) a.engage[i] = Engagement.Engaged;
    }
    this.fullRate.fill(0);
    let count = 0;
    const player = s.require(0);
    for (let i = 0; i < s.count; i++) {
      if (this.ids[i]! < 0 || !a.engage[i] || s.scene[i] !== s.scene[player]) continue;
      const dx = Math.abs(s.x[i]! - s.x[player]!),
        dy = Math.abs(s.y[i]! - s.y[player]!);
      if (dx > 30 || dy > 17) continue;
      const distance = dx * dx + dy * dy;
      let n = 0;
      while (n < count) {
        const j = this.ranked[n]!,
          x = s.x[j]! - s.x[player]!,
          y = s.y[j]! - s.y[player]!,
          d = x * x + y * y;
        if (distance < d || (distance === d && s.id(i) < s.id(j))) break;
        n++;
      }
      if (n >= 48) continue;
      for (let j = Math.min(count, 47); j > n; j--) this.ranked[j] = this.ranked[j - 1]!;
      this.ranked[n] = i;
      count = Math.min(48, count + 1);
    }
    for (let n = 0; n < count; n++) this.fullRate[this.ranked[n]!] = 1;
  }
  active(i: number): boolean {
    return !this.s.isHuman(i) && this.state.engage[i] !== Engagement.Calm;
  }
  intent(i: number): CreatureIntent {
    return INTENTS[this.state.intent[i]!] ?? 'hold';
  }
  attackKind(i: number): 'strike' | 'element' {
    return this.state.intent[i] === 6
      ? 'strike'
      : this.state.intent[i] === 7
        ? 'element'
        : this.state.request[i] === 7
          ? 'element'
          : 'strike';
  }
  canStart(i: number): boolean {
    return (
      this.state.engage[i] === Engagement.Engaged &&
      (this.state.intent[i] === 6 || this.state.intent[i] === 7) &&
      this.attackKind(i) === this.combat.grantedKind(i) &&
      this.combat.director.targets[i] === this.state.target[i]
    );
  }
  fillObservation(
    i: number,
    tick: number,
    refreshSafe = true,
    out = this.observationViews[i]!,
  ): Float32Array {
    const s = this.s,
      a = this.state,
      o = out;
    o.fill(0);
    o[0] = s.hp[i]! / s.maxHp(i);
    o[1] = s.stamina[i]! / 100;
    o[2] = o[3] = Math.min(1, this.combat.cooldown(s.id(i), tick) / 60);
    const phase = this.combat.actionPhase(s.id(i), tick);
    o[4 + phase] = 1;
    const world = this.worldFor(s.scene[i]!);
    const air = creatureTraversal(s, i).air;
    const water = world && world.fluid[world.index(s.x[i]!, s.y[i]!)]! > 0;
    o[air ? 10 : water ? 9 : 8] = 1;
    const b = s.slot(a.target[i]!);
    if (world && b !== undefined && this.sees(i, b))
      o[11] =
        (world.elevation[world.index(s.x[b]!, s.y[b]!)]! -
          world.elevation[world.index(s.x[i]!, s.y[i]!)]!) /
        2;
    for (let n = 0; n < 3; n++) o[12 + n * 8 + 4] = -1;
    for (let n = 0; n < 2; n++) o[36 + n * 5 + 2] = -1;
    o[50] = -1;
    const radius = this.tactics(i).notice;
    this.grid.observationNeighbors(
      i,
      radius,
      this.threatSlots,
      this.allySlots,
      this.preySlot,
      world,
      a.target[i]!,
    );
    for (let n = 0; n < 3 && this.threatSlots[n]! >= 0; n++) {
      const j = this.threatSlots[n]!,
        k = 12 + n * 8,
        phase = this.combat.actionPhase(s.id(j), tick);
      o[k] = (s.x[j]! - s.x[i]!) / 8;
      o[k + 1] = (s.y[j]! - s.y[i]!) / 8;
      o[k + 2] = s.vx[j]! / 12;
      o[k + 3] = s.vy[j]! / 12;
      o[k + 4] = s.hp[j]! / s.maxHp(j);
      o[k + 5] = phase === 1 ? 1 : 0;
      o[k + 6] = phase
        ? Math.min(
            1,
            Math.max(
              0,
              (tick - this.combat.actionStarted(s.id(j))) / this.combat.actionWindup(s.id(j)),
            ),
          )
        : 0;
      o[k + 7] = s.id(j) === 0 ? 1 : 0;
    }
    let allies = 0,
      cx = 0,
      cy = 0;
    for (let n = 0; n < 2 && this.allySlots[n]! >= 0; n++) {
      allies++;
      const j = this.allySlots[n]!,
        k = 36 + n * 5,
        dx = (s.x[j]! - s.x[i]!) / 8,
        dy = (s.y[j]! - s.y[i]!) / 8;
      o[k] = dx;
      o[k + 1] = dy;
      o[k + 2] = s.hp[j]! / s.maxHp(j);
      o[k + 3] = a.engage[j]! > 0 ? 1 : 0;
      o[k + 4] = this.combat.director.held[j]! > 0 ? 1 : 0;
      cx += dx;
      cy += dy;
    }
    if (this.preySlot[0]! >= 0) {
      const j = this.preySlot[0]!;
      o[46] = (s.x[j]! - s.x[i]!) / 8;
      o[47] = (s.y[j]! - s.y[i]!) / 8;
      o[48] = s.vx[j]! / 12;
      o[49] = s.vy[j]! / 12;
      o[50] = s.hp[j]! / s.maxHp(j);
    }
    o[51] = cx / Math.max(1, allies);
    o[52] = cy / Math.max(1, allies);
    if (refreshSafe) this.safeMedium(i, tick);
    let dx = a.safeX[i]! - s.x[i]!,
      dy = a.safeY[i]! - s.y[i]!,
      len = Math.max(1, Math.hypot(dx, dy));
    o[53] = dx / len;
    o[54] = dy / len;
    dx = a.homeX[i]! - s.x[i]!;
    dy = a.homeY[i]! - s.y[i]!;
    len = Math.max(1, Math.hypot(dx, dy));
    o[55] = dx / len;
    o[56] = dy / len;
    o[57] = Math.min(1, (tick - a.lastHit[i]!) / 300);
    o[58] = Math.min(1, (tick - a.lastLanded[i]!) / 300);
    o[59] = a.dashBias[i]!;
    o[60] = a.elementUse[i]!;
    o[61] = a.command[i]! / 2;
    o[62] = this.combat.director.selected[i]! || this.combat.director.held[i]! ? 1 : 0;
    o[63] = this.combat.pressure(i);
    return o;
  }
  private safeMedium(i: number, tick: number): void {
    const a = this.state,
      s = this.s;
    if (a.safeAt[i]! > tick) return;
    const leader = s.slot(a.leader[i]!),
      cache =
        leader !== undefined && s.scene[leader] === s.scene[i] && s.hp[leader]! > 0 ? leader : i;
    if (cache !== i && a.safeAt[cache]! > tick) {
      a.safeAt[i] = a.safeAt[cache]!;
      a.safeX[i] = a.safeX[cache]!;
      a.safeY[i] = a.safeY[cache]!;
      return;
    }
    a.safeAt[i] = tick + 60;
    a.safeX[i] = a.homeX[i]!;
    a.safeY[i] = a.homeY[i]!;
    const world = this.worldFor(s.scene[i]!);
    if (!world) return;
    const id = s.definition(i).id,
      medium = id === 'ignicap' ? 'lava' : id === 'mireling' ? 'mud' : 'freshwater';
    let best = 257;
    for (let dy = -16; dy <= 16; dy++)
      for (let dx = -16; dx <= 16; dx++) {
        const d = dx * dx + dy * dy,
          x = Math.floor(s.x[i]!) + dx + 0.5,
          y = Math.floor(s.y[i]!) + dy + 0.5;
        if (d >= best || !world.contains(x, y)) continue;
        if (
          (SurfaceRules.medium(world, world.index(x, y)) === medium ||
            (id === 'cindermoth' &&
              ((this.now / 60) % 24 >= 18 || (this.now / 60) % 24 < 6) &&
              !!(world.flags[world.index(x, y)]! & TileFlag.Burning))) &&
          SurfaceRules.walkable(world, x, y, creatureTraversal(s, i))
        ) {
          best = d;
          a.safeX[i] = x;
          a.safeY[i] = y;
        }
      }
    if (cache !== i) {
      a.safeAt[cache] = a.safeAt[i]!;
      a.safeX[cache] = a.safeX[i]!;
      a.safeY[cache] = a.safeY[i]!;
    }
  }
  decide(tick: number): void {
    const started = performance.now(),
      s = this.s,
      a = this.state;
    for (let i = 0; i < s.count; i++) {
      if (
        this.ids[i]! < 0 ||
        s.hp[i]! <= 0 ||
        !this.loaded(s.scene[i]!) ||
        a.engage[i] !== Engagement.Engaged
      )
        continue;
      if (a.reactionAt[i]! > tick || tick < a.until[i]!) continue;
      const early = a.reactionAt[i]! > 0 && a.reactionAt[i]! <= tick;
      if (!early && tick < a.nextDecision[i]!) continue;
      if (!this.fullRate[i] && tick % 15 !== s.id(i) % 15) continue;
      const o = this.fillObservation(i, tick),
        t = this.tactics(i),
        scores = this.scoreViews[i]!,
        legal = this.legal;
      const b = s.slot(a.target[i]!),
        visible = b !== undefined && this.sees(i, b),
        distance = b === undefined ? 99 : Math.hypot(a.seenX[i]! - s.x[i]!, a.seenY[i]! - s.y[i]!);
      const windup = o[17]! > 0 || o[25]! > 0 || o[33]! > 0,
        hp = o[0]!,
        id = s.definition(i).id;
      scores.fill(0);
      legal.fill(1);
      const observed =
        this.threatSlots[0] === b ||
        this.threatSlots[1] === b ||
        this.threatSlots[2] === b ||
        this.preySlot[0] === b;
      const permission = !!this.combat.director.selected[i] && observed,
        ready =
          this.combat.cooldown(s.id(i), tick) <= 0 && this.combat.actionPhase(s.id(i), tick) === 0;
      legal[6] = visible && permission && ready && s.stamina[i]! >= 5 ? 1 : 0;
      legal[7] = visible && permission && ready && s.stamina[i]! >= 16 ? 1 : 0;
      // A selection is for one exact category. Never spend it on a different pool.
      if (this.attackKind(i) === 'strike') legal[7] = 0;
      else legal[6] = 0;
      legal[2] = legal[3] = t.flankBias > 0 && (o[38]! >= 0 || o[43]! >= 0) ? 1 : 0;
      legal[10] = tick - a.lastCall[i]! >= 300 && (o[38]! >= 0 || o[43]! >= 0) ? 1 : 0;
      legal[11] = s.owner[i] === 0 ? 1 : 0;
      legal[9] = s.stamina[i]! >= 8 ? 1 : 0;
      scores[0] = 0.15 + (!permission ? t.caution : 0.0);
      scores[1] = 0.65 + t.aggression * 0.25 + (distance > 4 ? 0.3 : 0);
      scores[2] = scores[3] = t.packness * t.flankBias + (!permission ? 0.25 : 0);
      scores[4] = distance < Math.max(2, t.kiteRange) ? 0.65 : 0.1;
      const predator = b !== undefined && !!s.definition(b).prey?.includes(s.definition(i).id);
      scores[5] = hp < t.fleeAt ? 3 + (t.fleeAt - hp) : predator ? 2 + t.caution : 0;
      scores[6] =
        0.8 +
        t.aggression +
        this.combat.director.settings.aggressionBias -
        (windup ? t.caution : 0);
      scores[7] = 0.8 + t.elementBias + this.combat.director.settings.aggressionBias;
      scores[8] =
        (windup ? 1.5 : 0.3) * t.guardBias + (tick - a.lastHit[i]! < 30 ? t.guardBias * 0.5 : 0);
      scores[9] = windup ? (1 - t.guardBias) * 1.8 : 0;
      scores[10] = t.packness * (a.lastCall[i]! < 0 ? 2 : 0.3);
      scores[11] = a.command[i] === 2 ? 1.5 : 0.1;
      if (!permission && distance < 4 && hp >= t.fleeAt && (t.packness < 0.8 || a.flanked[i])) {
        const beat = (tick + s.id(i)) % 90;
        if (beat < 6) scores[1] = 1.4;
        else if (beat < 12) scores[4] = 1.4;
      }
      if (a.command[i] === 1) {
        const bonus = 0.2 + 0.6 * Math.min(1, s.bondHearts[i]! / 8);
        scores[1]! += bonus;
        scores[6]! += bonus;
        scores[7]! += bonus;
      }
      if (id === 'bramblefang' && (o[38]! >= 0 || o[43]! >= 0)) {
        if (a.lastCall[i]! < a.since[i]!) scores[10] = 5;
        let gathered = !!a.flanked[i];
        for (let j = 0; j < s.count; j++) {
          if (
            j !== i &&
            this.ids[j]! >= 0 &&
            s.hp[j]! > 0 &&
            s.herd[j] === s.herd[i] &&
            s.species[j] === s.species[i] &&
            s.scene[j] === s.scene[i] &&
            a.engage[j] === Engagement.Engaged &&
            Math.hypot(s.x[j]! - s.x[i]!, s.y[j]! - s.y[i]!) <= 12 &&
            !a.flanked[j]
          )
            gathered = false;
        }
        if (!gathered) {
          legal[6] = legal[7] = 0;
          scores[2]! += 1.5;
          scores[3]! += 1.5;
        }
      }
      if (id === 'mireling') scores[8]! += 1.4;
      if (id === 'steamshell') {
        if (tick - a.lastHit[i]! < 24) {
          scores[8] = 3;
          a.guardUntil[i] = a.lastHit[i]! + 24;
        } else if (a.guardUntil[i]! > 0 && tick - a.guardUntil[i]! < 60) {
          scores[7] = 4;
          a.request[i] = 7;
          const nearest = this.threatSlots[0]!;
          if (nearest >= 0 && s.id(nearest) !== a.target[i]) {
            a.target[i] = s.id(nearest);
            const p = this.combat.pursuits.get(s.id(i));
            if (p) this.combat.pursuits.set(s.id(i), { ...p, target: s.id(nearest) });
          }
        }
      }
      if (id === 'marshstalker' && !a.strikes[i]) {
        const world = this.worldFor(s.scene[i]!);
        const tile = world?.index(s.x[i]!, s.y[i]!);
        const hour = (this.now / 60) % 24;
        if (
          world &&
          tile !== undefined &&
          (world.flags[tile]! & TileFlag.Reeds || world.fluid[tile] === Fluid.Freshwater) &&
          hour >= 17 &&
          hour < 21 &&
          distance > 3
        ) {
          scores[0] = 4;
          a.ambush[i] = 1;
        } else if (a.ambush[i]) {
          scores[6] = 4;
          a.request[i] = 6;
        }
      }
      if (id === 'rivallie' && Math.hypot(a.safeX[i]! - s.x[i]!, a.safeY[i]! - s.y[i]!) > 4)
        scores[5] = 2;
      if (id === 'cindermoth') {
        scores[7]! += 0.8;
        scores[2]! += 0.2;
        scores[3]! += 0.2;
      }

      if (id === 'zephyrit' && tick - a.lastLanded[i]! < 45) {
        scores[4] = 3;
        legal[6] = legal[7] = 0;
      }
      if (id === 'ignicap' && a.strikes[i]! >= 1) {
        scores[5] = 3;
        legal[6] = legal[7] = 0;
      }
      if (
        id === 'ignicap' &&
        worldCornered(this.worldFor(s.scene[i]!), s.x[i]!, s.y[i]!, creatureTraversal(s, i))
      ) {
        scores[7] = 5;
        a.request[i] = 7;
        legal[7] =
          visible &&
          permission &&
          ready &&
          s.stamina[i]! >= 16 &&
          this.combat.grantedKind(i) === 'element'
            ? 1
            : 0;
      }
      const desired = scores[7]! > scores[6]! ? 7 : 6;
      if (this.combat.actionPhase(s.id(i), tick) === 0) a.request[i] = desired;
      legal[6] = legal[6] && this.combat.grantedKind(i) === 'strike' ? 1 : 0;
      legal[7] = legal[7] && this.combat.grantedKind(i) === 'element' ? 1 : 0;
      let next = this.brain.choose(o, scores, legal, a.intent[i]!, this.random(i));
      if (next === 2 && s.id(i) % 2) next = 3;
      if (next === 9) {
        a.dashUntil[i] = tick + 6;
        s.stamina[i] = Math.max(0, s.stamina[i]! - 8);
      }
      if (a.intent[i] !== next) a.intentSince[i] = tick;
      a.intent[i] = next;
      a.until[i] = tick + 6;
      a.nextDecision[i] = tick + (this.fullRate[i] ? 3 + (s.id(i) % 4) : 15);
      a.reactionAt[i] = 0;
      a.dashBias[i]! *= 0.995;
      a.elementUse[i]! *= 0.995;
    }
    this.brainMs = performance.now() - started;
  }
  execute(tick: number): void {
    const started = performance.now(),
      s = this.s,
      a = this.state;
    for (let i = 0; i < s.count; i++) {
      if (
        this.ids[i]! < 0 ||
        !this.active(i) ||
        s.hp[i]! <= 0 ||
        !this.loaded(s.scene[i]!) ||
        a.lastMove[i] === tick
      )
        continue;
      a.lastMove[i] = tick;
      s.vx[i] = s.vy[i] = 0;
      const b = s.slot(a.target[i]!),
        intent = a.intent[i]!,
        world = this.worldFor(s.scene[i]!);
      if (!world) continue;
      let dx = 0,
        dy = 0,
        boost = 1;
      const tx = b === undefined ? a.homeX[i]! : a.seenX[i]!,
        ty = b === undefined ? a.homeY[i]! : a.seenY[i]!;
      const deltaX = tx - s.x[i]!,
        deltaY = ty - s.y[i]!,
        distance = Math.max(0.001, Math.hypot(deltaX, deltaY));
      s.targetX[i] = tx;
      s.targetY[i] = ty;
      if (b !== undefined) {
        s.facingX[i] = deltaX / distance;
        s.facingY[i] = deltaY / distance;
      }
      if (a.engage[i] === Engagement.Alert) continue;
      const t = this.tactics(i),
        ring = Math.max(CREATURE_MOVES[s.definition(i).id].range + 1.5, t.kiteRange);
      if (a.engage[i] === Engagement.Disengaging) {
        dx = a.homeX[i]! - s.x[i]!;
        dy = a.homeY[i]! - s.y[i]!;
        if (a.packBroken[i]) {
          dx = -deltaX;
          dy = -deltaY;
          boost = 1.2;
        }
      } else if (intent === 1 || intent === 6 || intent === 7) {
        const stop = this.combat.director.selected[i]
          ? CREATURE_MOVES[s.definition(i).id].range * 0.8
          : ring - ((tick + s.id(i)) % 90 < 6 && intent === 1 ? 0.35 : 0);
        if (distance > stop) {
          const lead = Math.min(1, distance / Math.max(1, s.definition(i).speed));
          dx = deltaX + (b === undefined ? 0 : a.seenVx[i]!) * lead;
          dy = deltaY + (b === undefined ? 0 : a.seenVy[i]!) * lead;
        }
      } else if (intent === 2 || intent === 3) {
        const side = intent === 2 ? 1 : -1;
        const angle =
          Math.atan2(
            b === undefined ? 0 : a.seenFacingY[i]!,
            b === undefined ? 1 : a.seenFacingX[i]!,
          ) +
          (side * 70 * Math.PI) / 180;
        dx = tx + Math.cos(angle) * ring - s.x[i]!;
        dy = ty + Math.sin(angle) * ring - s.y[i]!;
        if (Math.hypot(dx, dy) < 0.65 && tick - a.since[i]! >= 24) a.flanked[i] = 1;
      } else if (intent === 4) {
        if (distance < ring + 1) {
          dx = -deltaX;
          dy = -deltaY;
        }
      } else if (intent === 5) {
        const o = this.observationViews[i]!;
        let cx = 0,
          cy = 0,
          weight = 0;
        for (let n = 0; n < 3; n++) {
          const k = 12 + n * 8;
          if (o[k + 4]! < 0) continue;
          const w = 1 / (0.5 + Math.hypot(o[k]!, o[k + 1]!)) + o[k + 5]!;
          cx += o[k]! * w;
          cy += o[k + 1]! * w;
          weight += w;
        }
        dx = weight ? -cx / weight : -deltaX / distance;
        dy = weight ? -cy / weight : -deltaY / distance;
        dx += (a.safeX[i]! - s.x[i]!) * 0.5;
        dy += (a.safeY[i]! - s.y[i]!) * 0.5;
        boost = tick - a.intentSince[i]! < 60 ? 1.2 : 1;
      } else if (intent === 9 && tick < a.dashUntil[i]!) {
        const side = a.dashBias[i]! > 0.2 ? -1 : a.dashBias[i]! < -0.2 ? 1 : s.id(i) % 2 ? 1 : -1;
        dx = -deltaY * side;
        dy = deltaX * side;
        boost = 2;
      } else if (intent === 10 && a.lastCall[i] !== tick) {
        if (tick - a.lastCall[i]! >= 300) {
          a.lastCall[i] = tick;
          a.packUntil[i] = tick + 120;
          for (let j = 0; j < s.count; j++)
            if (
              j !== i &&
              this.ids[j]! >= 0 &&
              s.hp[j]! > 0 &&
              s.scene[j] === s.scene[i] &&
              s.herd[j] === s.herd[i] &&
              s.species[j] === s.species[i] &&
              Math.hypot(s.x[j]! - s.x[i]!, s.y[j]! - s.y[i]!) <= 12
            ) {
              this.alert(j, a.target[i]!, tick);
              a.packUntil[j] = tick + 120;
              a.lastCall[j] = tick;
            }
        }
      } else if (intent === 11) {
        const p = s.require(0);
        dx = s.x[p]! - s.facingX[p]! - s.facingY[p]! * 0.7 - s.x[i]!;
        dy = s.y[p]! - s.facingY[p]! + s.facingX[p]! * 0.7 - s.y[i]!;
        if (Math.hypot(dx, dy) < 1) dx = dy = 0;
      }
      if (
        !this.combat.director.selected[i] &&
        distance < ring &&
        (intent === 0 || intent === 1 || intent === 6 || intent === 7)
      ) {
        const side = s.id(i) % 2 ? 1 : -1;
        dx = -deltaX / distance - (deltaY / distance) * 0.25 * side;
        dy = -deltaY / distance + (deltaX / distance) * 0.25 * side;
        if (distance < 0.01) dx = side;
      }
      // Per-species boids use local visible herd mates, blended before the speed clamp.
      if (dx || dy) {
        const flock = this.flocking;
        this.grid.flock(i, flock, world);
        const length = Math.max(0.001, Math.hypot(dx, dy));
        dx /= length;
        dy /= length;
        if (flock[6]) {
          const cohesion = t.cohesion * (tick < a.packUntil[i]! ? 1.5 : 1);
          dx += flock[0]! * t.separation + flock[2]! * t.alignment + flock[4]! * cohesion;
          dy += flock[1]! * t.separation + flock[3]! * t.alignment + flock[5]! * cohesion;
        }
      }
      if (
        s.definition(i).id === 'marshstalker' &&
        a.ambush[i] &&
        !a.strikes[i] &&
        (intent === 1 || intent === 6)
      )
        boost = 1.5;
      if (
        s.definition(i).id === 'cindermoth' &&
        ((this.now / 60) % 24 >= 18 || (this.now / 60) % 24 < 6) &&
        !this.combat.director.selected[i] &&
        world.flags[world.index(a.safeX[i]!, a.safeY[i]!)]! & TileFlag.Burning
      ) {
        dx = a.safeX[i]! - s.x[i]!;
        dy = a.safeY[i]! - s.y[i]!;
      }
      if (s.definition(i).id === 'cindermoth' && (dx || dy)) {
        const flutter = Math.sin(tick * 0.4 + s.id(i)) * 0.3,
          x = dx;
        dx -= dy * flutter;
        dy += x * flutter;
      }
      if ((intent === 5 || intent === 9) && (dx || dy)) {
        const length = Math.max(0.001, Math.hypot(dx, dy));
        s.facingX[i] = dx / length;
        s.facingY[i] = dy / length;
      }
      if (this.combat.actionPhase(s.id(i), tick) > 0) dx = dy = 0;
      if (dx || dy) {
        const length = Math.max(0.001, Math.hypot(dx, dy)),
          step =
            (s.definition(i).speed *
              WellbeingPolicy.speed(s.wellbeing(i)) *
              s.movementFactor(i) *
              boost) /
            30;
        this.motionPosition.x = s.x[i]!;
        this.motionPosition.y = s.y[i]!;
        const moved = moveOnTerrain(
          world,
          this.motionPosition,
          (dx / length) * step,
          (dy / length) * step,
          creatureTraversal(s, i),
          this.motionPosition,
        );
        s.vx[i] = (moved.x - s.x[i]!) * 30;
        s.vy[i] = (moved.y - s.y[i]!) * 30;
        s.x[i] = moved.x;
        s.y[i] = moved.y;
      }
    }
    this.movementMs = performance.now() - started;
  }
  landed(actor: number, tick: number): void {
    const i = this.s.slot(actor);
    if (i !== undefined && !this.s.isHuman(i)) this.state.lastLanded[i] = tick;
  }
  started(i: number, tick: number): void {
    this.state.strikes[i]!++;
    if (this.s.definition(i).id === 'zephyrit') this.state.lastLanded[i] = tick;
  }
  snapshot(): MindSnapshot {
    return {
      ...emptyMinds(),
      records: Array.from(this.ids, (id, i) => ({
        id,
        values: fields.map((f) => this.state[f][i]!),
      })).filter((r) => r.id >= 0),
    };
  }
  restore(snapshot?: MindSnapshot): void {
    this.ids.fill(-1);
    for (const f of fields) this.state[f].fill(0);
    this.sync();
    if (snapshot)
      for (const r of snapshot.records) {
        const i = this.s.slot(r.id);
        if (i === undefined || this.s.isHuman(i)) continue;
        for (let n = 0; n < fields.length; n++) this.state[fields[n]!][i] = r.values[n]!;
      }
    this.grid.rebuild();
  }
  debug(
    selected: number | null,
    tick: number,
  ): {
    id: number;
    intent: string;
    target: number;
    token: number;
    scores: { intent: string; score: number }[];
    observation?: number[];
  }[] {
    const out = [],
      candidates: number[] = [];
    const s = this.s,
      player = s.require(0);
    for (let i = 0; i < s.count; i++) {
      if (this.ids[i]! < 0 || !this.loaded(s.scene[i]!)) continue;
      if (
        s.id(i) === selected ||
        (this.active(i) &&
          s.scene[i] === s.scene[player] &&
          Math.hypot(s.x[i]! - s.x[player]!, s.y[i]! - s.y[player]!) < 40)
      )
        candidates.push(i);
    }
    candidates.sort((a, b) =>
      s.id(a) === selected
        ? -1
        : s.id(b) === selected
          ? 1
          : (s.x[a]! - s.x[player]!) ** 2 +
              (s.y[a]! - s.y[player]!) ** 2 -
              (s.x[b]! - s.x[player]!) ** 2 -
              (s.y[b]! - s.y[player]!) ** 2 || s.id(a) - s.id(b),
    );
    for (const i of candidates) {
      const scores = INTENTS.map((intent, n) => ({ intent, score: this.scores[i * 12 + n]! }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);
      out.push({
        id: this.s.id(i),
        intent: this.intent(i),
        target: this.state.target[i]!,
        token: this.combat.director.held[i]!,
        scores,
        ...(this.s.id(i) === selected || (selected === null && out.length === 0)
          ? {
              observation: Array.from(
                this.fillObservation(i, tick, false, this.inspectorObservation),
              ),
            }
          : {}),
      });
      if (out.length >= 48) break;
    }
    return out;
  }
  reset(): void {
    this.ids.fill(-1);
    for (const f of fields) this.state[f].fill(0);
    this.observations.fill(0);
    this.scores.fill(0);
  }
}

function worldCornered(
  world: ChunkStore | undefined,
  x: number,
  y: number,
  traversal: import('./world').Traversal,
): boolean {
  if (!world) return false;
  return (
    !SurfaceRules.canStepAt(world, x, y, x + 1, y, traversal) &&
    !SurfaceRules.canStepAt(world, x, y, x - 1, y, traversal) &&
    !SurfaceRules.canStepAt(world, x, y, x, y + 1, traversal) &&
    !SurfaceRules.canStepAt(world, x, y, x, y - 1, traversal)
  );
}
