import { z } from 'zod';

const count = z.number().int().min(0).max(16);
const pool = z.object({ melee: count, ranged: count }).strict();
export const CombatSettingsSchema = z
  .object({
    player: pool,
    partner: pool,
    villager: pool,
    wild: pool,
    grantSpacing: z.number().int().min(8).max(300),
    aggressionBias: z.number().finite().min(-1).max(1),
  })
  .strict();
export type CombatSettings = z.infer<typeof CombatSettingsSchema>;
export const DEFAULT_COMBAT_SETTINGS: CombatSettings = {
  player: { melee: 2, ranged: 1 },
  partner: { melee: 2, ranged: 1 },
  villager: { melee: 1, ranged: 1 },
  wild: { melee: 2, ranged: 1 },
  grantSpacing: 8,
  aggressionBias: 0,
};
export type AttackCategory = 'melee' | 'ranged';
/** Content-space viewport; one tile inset covers elevation and the 1080/64 rounding. */
export const COMBAT_VIEW = Object.freeze({ width: 30, height: 17, inset: 1 });
export const DirectorSnapshotSchema = z
  .object({
    settings: CombatSettingsSchema,
    holds: z.array(
      z.tuple([
        z.number().int().nonnegative(),
        z.number().int().nonnegative(),
        z.enum(['melee', 'ranged']),
      ]),
    ),
    waiting: z.array(
      z.tuple([
        z.number().int().nonnegative(),
        z.number().int().nonnegative(),
        z.number().int().nonnegative(),
      ]),
    ),
    grants: z.array(z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()])),
  })
  .strict();
export type DirectorSnapshot = z.infer<typeof DirectorSnapshotSchema>;

/** Reusable slot buffers. Entity-ID tags prevent recycled slots from inheriting state. */
export class CombatDirector {
  settings = structuredClone(DEFAULT_COMBAT_SETTINGS);
  readonly ids: Float64Array;
  readonly targets: Float64Array;
  readonly held: Uint8Array;
  readonly since: Float64Array;
  readonly lastGrant: Float64Array;
  readonly selected: Uint8Array;
  private readonly selectedTargets: Uint8Array;
  private readonly candidates: Int32Array;
  private readonly targetSlots: Int32Array;
  private readonly categories: Uint8Array;
  private readonly priorities: Float64Array;
  private readonly melee: Uint16Array;
  private readonly ranged: Uint16Array;
  private readonly limits: Uint16Array;
  private readonly heap: Int32Array;
  private readonly eligibleTargets: Uint8Array;
  private remainingTargets = 0;
  private heapLength = 0;
  private heapBuilt = false;
  private length = 0;
  constructor(readonly capacity: number) {
    this.ids = new Float64Array(capacity).fill(-1);
    this.targets = new Float64Array(capacity).fill(-1);
    this.held = new Uint8Array(capacity);
    this.since = new Float64Array(capacity).fill(-1);
    this.lastGrant = new Float64Array(capacity).fill(-Infinity);
    this.selected = new Uint8Array(capacity);
    this.selectedTargets = new Uint8Array(capacity);
    this.candidates = new Int32Array(capacity);
    this.targetSlots = new Int32Array(capacity);
    this.categories = new Uint8Array(capacity);
    this.priorities = new Float64Array(capacity);
    this.melee = new Uint16Array(capacity);
    this.ranged = new Uint16Array(capacity);
    this.limits = new Uint16Array(capacity);
    this.heap = new Int32Array(capacity);
    this.eligibleTargets = new Uint8Array(capacity);
  }
  touch(slot: number, id: number): void {
    if (this.ids[slot] === id) return;
    this.release(slot);
    this.ids[slot] = id;
    this.lastGrant[slot] = -Infinity;
  }
  release(slot: number): void {
    this.held[slot] = 0;
    this.targets[slot] = -1;
    this.since[slot] = -1;
  }
  begin(): void {
    this.length = 0;
    this.heapLength = 0;
    this.heapBuilt = false;
    this.remainingTargets = 0;
    this.eligibleTargets.fill(0);
    this.selected.fill(0);
    this.selectedTargets.fill(0);
    this.melee.fill(0);
    this.ranged.fill(0);
  }
  occupied(targetSlot: number, category: number): void {
    const counts = category === 1 ? this.melee : this.ranged;
    counts[targetSlot]!++;
  }
  consider(
    slot: number,
    target: number,
    targetSlot: number,
    category: AttackCategory,
    tick: number,
    aggression: number,
    distance: number,
    limit: number,
  ): void {
    if (this.targets[slot] !== target) this.release(slot);
    this.targets[slot] = target;
    if (this.since[slot]! < 0) this.since[slot] = tick;
    const counts = category === 'melee' ? this.melee : this.ranged;
    if (
      counts[targetSlot]! >= limit ||
      tick - this.lastGrant[targetSlot]! < this.settings.grantSpacing
    )
      return;
    if (!this.eligibleTargets[targetSlot]) {
      this.eligibleTargets[targetSlot] = 1;
      this.remainingTargets++;
    }
    const n = this.length++;
    this.candidates[n] = slot;
    this.targetSlots[n] = targetSlot;
    this.categories[n] = category === 'melee' ? 1 : 2;
    this.limits[n] = limit;
    this.priorities[n] =
      (tick - this.since[slot]!) / 30 +
      0.5 * Math.max(0, Math.min(1, aggression + this.settings.aggressionBias)) -
      0.1 * distance;
  }
  private higher(a: number, b: number): boolean {
    return (
      this.priorities[a]! > this.priorities[b]! ||
      (this.priorities[a] === this.priorities[b] &&
        this.ids[this.candidates[a]!]! < this.ids[this.candidates[b]!]!)
    );
  }
  private sift(root: number): void {
    const value = this.heap[root]!;
    while (root * 2 + 1 < this.heapLength) {
      let child = root * 2 + 1;
      if (child + 1 < this.heapLength && this.higher(this.heap[child + 1]!, this.heap[child]!))
        child++;
      if (!this.higher(this.heap[child]!, value)) break;
      this.heap[root] = this.heap[child]!;
      root = child;
    }
    this.heap[root] = value;
  }
  /** O(n log n) selection, including many independent wild targets; no tick allocations. */
  next(tick: number): number {
    if (this.remainingTargets === 0) return -1;
    if (!this.heapBuilt) {
      for (let n = 0; n < this.length; n++) this.heap[n] = n;
      this.heapLength = this.length;
      for (let n = (this.heapLength >> 1) - 1; n >= 0; n--) this.sift(n);
      this.heapBuilt = true;
    }
    while (this.heapLength > 0) {
      const best = this.heap[0]!;
      this.heap[0] = this.heap[--this.heapLength]!;
      if (this.heapLength) this.sift(0);
      const slot = this.candidates[best]!,
        target = this.targetSlots[best]!;
      const counts = this.categories[best] === 1 ? this.melee : this.ranged;
      if (
        this.selectedTargets[target] ||
        tick - this.lastGrant[target]! < this.settings.grantSpacing ||
        counts[target]! >= this.limits[best]!
      )
        continue;
      this.selected[slot] = 1;
      this.selectedTargets[target] = 1;
      this.remainingTargets--;
      return slot;
    }
    return -1;
  }
  commit(slot: number, targetSlot: number, category: AttackCategory, tick: number): void {
    this.held[slot] = category === 'melee' ? 1 : 2;
    this.since[slot] = -1;
    this.lastGrant[targetSlot] = tick;
    this.occupied(targetSlot, this.held[slot]!);
  }
  snapshot(): DirectorSnapshot {
    const holds: DirectorSnapshot['holds'] = [],
      waiting: DirectorSnapshot['waiting'] = [],
      grants: DirectorSnapshot['grants'] = [];
    for (let slot = 0; slot < this.capacity; slot++) {
      const id = this.ids[slot]!;
      if (id < 0) continue;
      if (this.held[slot])
        holds.push([id, this.targets[slot]!, this.held[slot] === 1 ? 'melee' : 'ranged']);
      else if (this.since[slot]! >= 0) waiting.push([id, this.targets[slot]!, this.since[slot]!]);
      if (Number.isFinite(this.lastGrant[slot])) grants.push([id, this.lastGrant[slot]!]);
    }
    return { settings: structuredClone(this.settings), holds, waiting, grants };
  }
  reset(): void {
    this.ids.fill(-1);
    this.targets.fill(-1);
    this.held.fill(0);
    this.since.fill(-1);
    this.lastGrant.fill(-Infinity);
    this.begin();
  }
}
