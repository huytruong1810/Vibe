import {
  ITEMS,
  SETTLEMENTS,
  itemIds,
  type ItemId,
  type Medium,
  type SpeciesId,
} from '../content/definitions';
import { BinaryHeap } from './core';
import { TwoSlotInventory, type ItemInstance } from './inventory';
import { ChunkStore, Fluid, SurfaceRules, TileFlag } from './world';
import { CONFIG, distanceSquared, type WorldPosition } from './values';

export interface GroundDrop extends WorldPosition {
  readonly id: number;
  readonly item: ItemId;
  readonly originSpecies?: readonly SpeciesId[];
  readonly instance?: string;
  readonly charges?: number;
  readonly artifact?: string;
}
export interface Carrion extends WorldPosition {
  readonly sourceId: number;
  readonly species: SpeciesId;
  remaining: number;
  readonly expiresAt: number;
}
export interface SettlementSupply extends WorldPosition {
  readonly id: string;
  stock: Partial<Record<ItemId, number>>;
}
export interface ResourceCandidate extends WorldPosition {
  readonly index: number;
  readonly score: number;
}

export class ResourceStore {
  readonly drops: GroundDrop[] = [];
  readonly carrion: Carrion[] = [];
  readonly supplies: SettlementSupply[] = SETTLEMENTS.map((s) => ({
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
      'arrow-bundle': 2,
    },
  }));
  private serial = 0;
  constructor(readonly world: ChunkStore) {}
  item(index: number): ItemId | null {
    return itemIds[this.world.resource[index]! - 1] ?? null;
  }
  consume(index: number, now: number): boolean {
    if (!this.world.quantity[index]) return false;
    this.world.quantity[index]!--;
    if (!this.world.quantity[index]) this.world.regrowAt[index] = now + 180;
    this.world.touch(index);
    return true;
  }
  drop(item: ItemId, position: WorldPosition, originSpecies?: readonly SpeciesId[]): boolean {
    if (this.drops.length >= 512 || !SurfaceRules.walkable(this.world, position.x, position.y))
      return false;
    this.drops.push({
      id: ++this.serial,
      item,
      x: position.x,
      y: position.y,
      scene: position.scene ?? 0,
      ...(originSpecies?.length ? { originSpecies: [...originSpecies] } : {}),
    });
    return true;
  }
  dropItem(item: ItemInstance, position: WorldPosition): boolean {
    if (!this.drop(item.id, position, item.originSpecies)) return false;
    const previous = this.drops.pop()!;
    this.drops.push({
      ...previous,
      instance: item.instance,
      ...(item.artifact ? { artifact: item.artifact } : {}),
      ...(item.charges !== undefined ? { charges: item.charges } : {}),
    });
    return true;
  }
  restore(drops: readonly GroundDrop[]): void {
    this.drops.splice(0, this.drops.length, ...drops);
    this.serial = Math.max(0, ...drops.map((d) => d.id));
  }
  supply(at: WorldPosition): SettlementSupply | undefined {
    return this.supplies
      .filter((s) => distanceSquared(s, at) < 96 ** 2)
      .sort((a, b) => distanceSquared(a, at) - distanceSquared(b, at))[0];
  }
  hasSupply(at: WorldPosition, item: ItemId): boolean {
    return (this.supply(at)?.stock[item] ?? 0) > 0;
  }
  consumeSupply(at: WorldPosition, item: ItemId): boolean {
    const supply = this.supply(at);
    if (!supply || !(supply.stock[item]! > 0)) return false;
    supply.stock[item]!--;
    return true;
  }
  addCarrion(body: Carrion): boolean {
    if (this.carrion.some((c) => c.sourceId === body.sourceId) || body.species === 'human')
      return false;
    this.carrion.push({ ...body });
    return true;
  }
  takeCarrion(sourceId: number): { id: 'meat'; originSpecies: readonly SpeciesId[] } | null {
    const body = this.carrion.find((c) => c.sourceId === sourceId);
    if (!body || body.remaining <= 0) return null;
    body.remaining--;
    return { id: 'meat', originSpecies: [body.species] };
  }
  replenish(locator: ResourceLocator, now: number): void {
    // Finite pantry production: each accepted unit removes one real regrowing crop.
    for (const supply of this.supplies)
      for (const item of ['berries', 'reeds', 'wheat', 'nectar', 'ashgrass', 'fungi'] as const) {
        if ((supply.stock[item] ?? 0) >= 16) continue;
        const source = locator.find(supply, [item], -100, now, 1)[0];
        if (source && source.score < 48 ** 2 && this.consume(source.index, now))
          supply.stock[item] = (supply.stock[item] ?? 0) + 1;
      }
    // Settlement fletching uses the same flint + reeds recipe as player crafting.
    // No stock replenishes merely because an equipped archer ran out.
    for (const supply of this.supplies) {
      if ((supply.stock['arrow-bundle'] ?? 0) >= 2 || (supply.stock.reeds ?? 0) < 1) continue;
      const source = locator.find(supply, ['flint'], -101, now, 1)[0];
      if (source && source.score < 48 ** 2 && this.consume(source.index, now)) {
        supply.stock.reeds!--;
        supply.stock['arrow-bundle'] = (supply.stock['arrow-bundle'] ?? 0) + 1;
      }
    }
    for (let i = this.carrion.length - 1; i >= 0; i--)
      if (this.carrion[i]!.expiresAt <= now || this.carrion[i]!.remaining <= 0)
        this.carrion.splice(i, 1);
  }
}

export class ResourceLocator {
  private readonly buckets = new Map<string, number[]>();
  private readonly reservations = new Map<number, { owner: number; until: number }>();
  private readonly columns: number;
  constructor(private readonly store: ResourceStore) {
    const w = store.world;
    this.columns = Math.ceil(w.size / CONFIG.chunkSize);
    for (let i = 0; i < w.resource.length; i++) {
      const item = store.item(i);
      if (item) this.add(item, i);
      const medium = SurfaceRules.medium(w, i);
      // Sample medium fields sparsely; wells are retained even when off the lattice.
      if (medium && (i % 4 === 0 || w.flags[i]! & TileFlag.Protected)) this.add(medium, i);
    }
  }
  private add(kind: string, i: number): void {
    const w = this.store.world,
      key = `${kind}:${Math.floor(Math.floor(i / w.size) / CONFIG.chunkSize) * this.columns + Math.floor((i % w.size) / CONFIG.chunkSize)}`;
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = [];
      this.buckets.set(key, bucket);
    }
    bucket.push(i);
  }
  find(
    position: WorldPosition,
    kinds: readonly (ItemId | Medium)[],
    owner: number,
    now: number,
    limit = 8,
  ): ResourceCandidate[] {
    const w = this.store.world,
      cx = Math.floor(position.x / CONFIG.chunkSize),
      cy = Math.floor(position.y / CONFIG.chunkSize);
    const found: ResourceCandidate[] = [];
    for (let ring = 0; ring <= 2; ring++) {
      for (let dy = -ring; dy <= ring; dy++)
        for (let dx = -ring; dx <= ring; dx++) {
          if (ring > 0 && Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
          const x = cx + dx,
            y = cy + dy;
          if (x < 0 || y < 0 || x >= this.columns || y >= this.columns) continue;
          for (const kind of kinds)
            for (const i of this.buckets.get(`${kind}:${y * this.columns + x}`) ?? []) {
              const reservation = this.reservations.get(i);
              if (reservation && reservation.until > now && reservation.owner !== owner) continue;
              if (itemIds.includes(kind as ItemId) && !w.quantity[i]) continue;
              const candidate = {
                x: (i % w.size) + 0.5,
                y: Math.floor(i / w.size) + 0.5,
                index: i,
                score: 0,
              };
              candidate.score = distanceSquared(position, candidate);
              found.push(candidate);
            }
        }
      if (found.length >= limit) break;
    }
    return found.sort((a, b) => a.score - b.score).slice(0, limit);
  }
  reserve(index: number, owner: number, now: number): void {
    this.reservations.set(index, { owner, until: now + 10 });
    if (this.reservations.size > 2048)
      for (const [i, value] of this.reservations)
        if (value.until < now) this.reservations.delete(i);
  }
  release(index: number, owner: number): void {
    if (this.reservations.get(index)?.owner === owner) this.reservations.delete(index);
  }
}

export class HarvestSystem {
  constructor(private readonly store: ResourceStore) {}
  harvest(
    position: WorldPosition,
    inventory: TwoSlotInventory,
    now: number,
  ): { ok: boolean; message: string } {
    const ground = this.store.drops.findIndex((d) => distanceSquared(d, position) <= 3.2);
    if (ground >= 0) {
      const drop = this.store.drops[ground]!;
      if (
        !(drop.instance
          ? inventory.insert({
              id: drop.item,
              instance: drop.instance,
              ...(drop.artifact ? { artifact: drop.artifact } : {}),
              ...(drop.originSpecies ? { originSpecies: drop.originSpecies } : {}),
              ...(drop.charges !== undefined ? { charges: drop.charges } : {}),
            })
          : inventory.add(drop.item, drop.originSpecies))
      )
        return { ok: false, message: 'Both hands are full. Drop, use, or combine an item first.' };
      this.store.drops.splice(ground, 1);
      return { ok: true, message: `Picked up ${ITEMS[drop.item].name}.` };
    }
    const body = this.store.carrion.find(
      (c) => c.remaining > 0 && distanceSquared(c, position) <= 3.2,
    );
    if (body) {
      if (!inventory.add('meat', [body.species]))
        return { ok: false, message: 'Both hands are full.' };
      this.store.takeCarrion(body.sourceId);
      return { ok: true, message: 'Harvested wild meat. Its species provenance is retained.' };
    }
    const w = this.store.world,
      candidates: { index: number; d: number }[] = [];
    for (let y = Math.floor(position.y) - 2; y <= Math.floor(position.y) + 2; y++)
      for (let x = Math.floor(position.x) - 2; x <= Math.floor(position.x) + 2; x++) {
        if (!w.contains(x, y)) continue;
        const i = w.index(x, y),
          d = distanceSquared(position, { x: x + 0.5, y: y + 0.5 });
        if (d <= 4 && w.quantity[i]) candidates.push({ index: i, d });
      }
    candidates.sort((a, b) => a.d - b.d);
    const target = candidates[0];
    if (!target) {
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          if (w.fluid[w.index(position.x + dx, position.y + dy)] === Fluid.Freshwater) {
            return inventory.add('water')
              ? { ok: true, message: 'Collected spring water.' }
              : { ok: false, message: 'Both hands are full.' };
          }
      return {
        ok: false,
        message: 'No resource within reach. Look for berries, reeds, wood, or stones.',
      };
    }
    const item = this.store.item(target.index)!;
    if (item === 'ore' && !inventory.state.some((s) => s?.id === 'hatchet'))
      return { ok: false, message: 'Copper veins need a stone hatchet.' };
    if (!inventory.add(item))
      return { ok: false, message: 'Both hands are full. Drop, use, or combine an item first.' };
    this.store.consume(target.index, now);
    return { ok: true, message: `Gathered ${ITEMS[item].name}.` };
  }
}

export class RegrowthSystem {
  private readonly pending = new BinaryHeap<number>();
  private readonly tracked = new Set<number>();
  constructor(private readonly world: ChunkStore) {}
  advance(now: number, season: number, budget = 64): void {
    for (const i of this.world.changed)
      if (this.world.resource[i] && !this.world.quantity[i] && !this.tracked.has(i)) {
        this.tracked.add(i);
        this.pending.push(i, this.world.regrowAt[i]!);
      }
    for (let n = 0; n < budget && this.pending.size; n++) {
      const i = this.pending.pop()!;
      if (this.world.regrowAt[i]! > now) {
        this.pending.push(i, this.world.regrowAt[i]!);
        break;
      }
      this.tracked.delete(i);
      if (this.world.flags[i]! & TileFlag.Burning) {
        this.world.regrowAt[i] = now + 60;
        continue;
      }
      this.world.quantity[i] = season === 3 ? 1 : season === 1 ? 4 : 3;
      this.world.regrowAt[i] = 0;
      this.world.touch(i);
    }
  }
}

export type ReactionType = 'fire' | 'freeze' | 'shock' | 'thaw';
export interface Reaction {
  readonly index: number;
  readonly type: ReactionType;
  readonly remaining: number;
}
export class EnvironmentalReactionSystem {
  private readonly queue: Reaction[] = [];
  private readonly active = new Set<number>();
  constructor(private readonly world: ChunkStore) {}
  enqueue(reaction: Reaction): boolean {
    if (this.queue.length >= 2048 || reaction.index < 0 || reaction.index >= this.world.size ** 2)
      return false;
    this.queue.push(reaction);
    return true;
  }
  advance(now: number, budget = 32): number[] {
    const shocked: number[] = [];
    for (const i of this.active)
      if (this.world.reactionUntil[i]! <= now) {
        const hadIce = (this.world.flags[i]! & TileFlag.Ice) !== 0;
        this.world.flags[i]! &= ~(TileFlag.Burning | TileFlag.Ice);
        this.world.touch(i, hadIce);
        this.active.delete(i);
      }
    // A generation boundary bounds propagation, even when new work is enqueued.
    const count = Math.min(budget, this.queue.length);
    for (let n = 0; n < count; n++) {
      const r = this.queue.shift()!,
        i = r.index;
      if (r.remaining < 0 || this.world.flags[i]! & TileFlag.Protected) continue;
      if (r.type === 'fire' && !this.world.fluid[i] && !(this.world.flags[i]! & TileFlag.Burning)) {
        this.world.flags[i]! |= TileFlag.Burning;
        this.world.reactionUntil[i] = now + 8;
        this.active.add(i);
        this.world.quantity[i] = 0;
        if (this.world.resource[i]) this.world.regrowAt[i] = now + 240;
        this.world.touch(i);
        if (r.remaining > 0)
          for (const offset of [-1, 1, -this.world.size, this.world.size]) {
            const next = i + offset;
            if (
              next >= 0 &&
              next < this.world.size ** 2 &&
              (Math.abs(offset) !== 1 ||
                Math.floor(next / this.world.size) === Math.floor(i / this.world.size)) &&
              this.world.resource[next]
            )
              this.enqueue({ ...r, index: next, remaining: r.remaining - 1 });
          }
      } else if (
        r.type === 'freeze' &&
        [Fluid.Freshwater, Fluid.Saltwater].includes(this.world.fluid[i]!)
      ) {
        this.world.flags[i]! |= TileFlag.Ice;
        this.world.reactionUntil[i] = now + 40;
        this.world.touch(i, true);
        this.active.add(i);
      } else if (r.type === 'thaw') {
        this.world.flags[i]! &= ~TileFlag.Ice;
        this.world.touch(i, true);
        this.active.delete(i);
      } else if (r.type === 'shock' && this.world.fluid[i]) {
        shocked.push(i);
        if (r.remaining > 0)
          for (const offset of [-1, 1, -this.world.size, this.world.size]) {
            const next = i + offset;
            if (
              next >= 0 &&
              next < this.world.size ** 2 &&
              (Math.abs(offset) !== 1 ||
                Math.floor(next / this.world.size) === Math.floor(i / this.world.size)) &&
              this.world.fluid[next] &&
              !shocked.includes(next)
            )
              this.enqueue({ ...r, index: next, remaining: r.remaining - 1 });
          }
      }
    }
    return shocked;
  }
  snapshot(): Reaction[] {
    return this.queue.slice();
  }
  restore(queue: readonly Reaction[]): void {
    this.queue.splice(0, this.queue.length, ...queue);
    this.active.clear();
    for (const i of this.world.changed)
      if (this.world.flags[i]! & (TileFlag.Ice | TileFlag.Burning)) this.active.add(i);
  }
  get pending(): number {
    return this.queue.length;
  }
}
