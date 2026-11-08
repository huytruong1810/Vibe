import {
  SETTLEMENTS,
  VILLAGES,
  type Medium,
  type SettlementDefinition,
} from '../content/definitions';
import { CONFIG, type WorldPosition } from './values';

export enum Biome {
  Riverlands,
  Meadows,
  Forest,
  Mountains,
  Beach,
  Volcano,
  Swamp,
}
export enum Fluid {
  None,
  Freshwater,
  Saltwater,
  Lava,
  Mud,
}
export enum TileFlag {
  Solid = 1,
  Road = 2,
  Ramp = 4,
  Protected = 8,
  Ice = 16,
  Burning = 32,
  Reeds = 64,
  DeepWater = 128,
}
export const BIOME_NAMES = [
  'Riverlands',
  'Meadows',
  'Whispering Forest',
  'Craggy Mountains',
  'Sunlit Beach',
  'Emberlands',
  'Mosswater Swamp',
] as const;
export const BIOME_COLORS = [
  0x6c9f79, 0x91ad73, 0x547f66, 0x929480, 0xd7c894, 0x9b8275, 0x698e7b,
] as const;
export interface Building {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly village: number;
  readonly name: string;
}
export interface WorldDelta {
  index: number;
  resource: number;
  quantity: number;
  regrowAt: number;
  flags: number;
  fluid: number;
  reactionUntil: number;
}

/** Logical data never contains a Pixi object. Each chunk is a view over stable layers. */
export class ChunkStore {
  readonly biome: Uint8Array;
  readonly elevation: Uint8Array;
  readonly moisture: Float32Array;
  readonly temperature: Float32Array;
  readonly drainage: Float32Array;
  readonly coastDistance: Float32Array;
  readonly fluid: Uint8Array;
  readonly flags: Uint8Array;
  readonly resource: Uint16Array;
  readonly quantity: Uint16Array;
  readonly regrowAt: Float64Array;
  readonly reactionUntil: Float64Array;
  readonly changed = new Set<number>();
  readonly buildings: Building[] = [];
  revision = 0;
  constructor(
    readonly size: number = CONFIG.worldSize,
    readonly seed = 42,
    readonly coverage?: Uint8Array,
  ) {
    const n = size * size;
    if (coverage && coverage.length !== n) throw new RangeError('Invalid world coverage');
    this.biome = new Uint8Array(n);
    this.elevation = new Uint8Array(n);
    this.moisture = new Float32Array(n);
    this.temperature = new Float32Array(n);
    this.drainage = new Float32Array(n);
    this.coastDistance = new Float32Array(n);
    this.fluid = new Uint8Array(n);
    this.flags = new Uint8Array(n);
    this.resource = new Uint16Array(n);
    this.quantity = new Uint16Array(n);
    this.regrowAt = new Float64Array(n);
    this.reactionUntil = new Float64Array(n);
  }
  index(x: number, y: number): number {
    return Math.floor(y) * this.size + Math.floor(x);
  }
  contains(x: number, y: number): boolean {
    if (this.coverage)
      return (
        x >= 0 && y >= 0 && x < this.size && y < this.size && this.coverage[this.index(x, y)] === 1
      );
    return x >= 1 && y >= 1 && x < this.size - 1 && y < this.size - 1;
  }
  touch(index: number, navigation = false): void {
    this.changed.add(index);
    if (navigation) this.revision++;
  }
  chunk(cx: number, cy: number): { startX: number; startY: number; width: number; height: number } {
    return {
      startX: cx * CONFIG.chunkSize,
      startY: cy * CONFIG.chunkSize,
      width: Math.min(CONFIG.chunkSize, this.size - cx * CONFIG.chunkSize),
      height: Math.min(CONFIG.chunkSize, this.size - cy * CONFIG.chunkSize),
    };
  }
  deltas(): WorldDelta[] {
    return [...this.changed].map((index) => ({
      index,
      resource: this.resource[index]!,
      quantity: this.quantity[index]!,
      regrowAt: this.regrowAt[index]!,
      flags: this.flags[index]!,
      fluid: this.fluid[index]!,
      reactionUntil: this.reactionUntil[index]!,
    }));
  }
  restore(deltas: readonly WorldDelta[]): void {
    for (const d of deltas) {
      this.resource[d.index] = d.resource;
      this.quantity[d.index] = d.quantity;
      this.regrowAt[d.index] = d.regrowAt;
      this.flags[d.index] = d.flags;
      this.fluid[d.index] = d.fluid;
      this.reactionUntil[d.index] = d.reactionUntil;
      this.changed.add(d.index);
    }
    this.revision++;
  }
}


export class SettlementPlanner {
  locations(
    profileIndex: number,
  ): Record<'home' | 'work' | 'square' | 'shrine' | 'outpost', WorldPosition> {
    const village = Math.floor(profileIndex / 10),
      local = profileIndex % 10,
      v = VILLAGES[village]!;
    return {
      home: { x: v.x + [-13, -7, 3, 9, 15][local % 5]!, y: v.y + (local < 5 ? -7 : 9) },
      work: { x: v.x + ((local % 5) - 2) * 3, y: v.y - 4 },
      square: { x: v.x + ((local % 4) - 1.5) * 1.5, y: v.y + 2 + Math.floor(local / 4) },
      shrine: { x: v.x - 5 + (local % 3), y: v.y - 4 },
      outpost: { x: v.x - 44, y: v.y + 50 },
    };
  }
}

export interface Traversal {
  readonly air?: boolean;
  readonly lava: boolean;
  readonly water: boolean;
}
export const PLAYER_TRAVERSAL: Traversal = { lava: false, water: true };
export class SurfaceRules {
  static walkable(
    world: ChunkStore,
    x: number,
    y: number,
    traversal: Traversal = PLAYER_TRAVERSAL,
  ): boolean {
    if (!world.contains(x, y)) return false;
    const i = world.index(x, y),
      flags = world.flags[i]!;
    if (flags & TileFlag.Solid) return false;
    const fluid = world.fluid[i]!;
    if (fluid === Fluid.Lava && !traversal.lava && !traversal.air) return false;
    if (
      (fluid === Fluid.Freshwater || fluid === Fluid.Saltwater) &&
      !(flags & TileFlag.Ice) &&
      !traversal.air &&
      !traversal.water
    )
      return false;
    return true;
  }
  static canStep(
    world: ChunkStore,
    from: WorldPosition,
    to: WorldPosition,
    traversal: Traversal = PLAYER_TRAVERSAL,
  ): boolean {
    return this.canStepAt(world, from.x, from.y, to.x, to.y, traversal);
  }
  static canStepAt(
    world: ChunkStore,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    traversal: Traversal,
  ): boolean {
    if (!this.walkable(world, toX, toY, traversal)) return false;
    const a = world.index(fromX, fromY),
      b = world.index(toX, toY);
    const delta = Math.abs(world.elevation[a]! - world.elevation[b]!);
    return (
      (traversal.air && delta <= 2) ||
      delta === 0 ||
      (delta === 1 && ((world.flags[a]! | world.flags[b]!) & TileFlag.Ramp) !== 0)
    );
  }
  static medium(world: ChunkStore, index: number): Medium | null {
    return world.fluid[index] === Fluid.Freshwater
      ? 'freshwater'
      : world.fluid[index] === Fluid.Saltwater
        ? 'saltwater'
        : world.fluid[index] === Fluid.Mud
          ? 'mud'
          : world.fluid[index] === Fluid.Lava
            ? 'lava'
            : world.biome[index] === Biome.Beach
              ? 'sand'
              : null;
  }
}
export class TerrainNavigation {
  constructor(readonly world: ChunkStore) {}
  neighbors(index: number, traversal: Traversal): number[] {
    const x = index % this.world.size,
      y = Math.floor(index / this.world.size),
      result: number[] = [];
    for (const [dx, dy] of [
      [0, -1],
      [-1, 0],
      [1, 0],
      [0, 1],
    ]) {
      if (SurfaceRules.canStep(this.world, { x, y }, { x: x + dx!, y: y + dy! }, traversal))
        result.push(index + dy! * this.world.size + dx!);
    }
    return result;
  }
}
export function nearestSettlement(position: WorldPosition): SettlementDefinition {
  return SETTLEMENTS.reduce(
    (best, s) =>
      Math.hypot(s.x - position.x, s.y - position.y) <
      Math.hypot(best.x - position.x, best.y - position.y)
        ? s
        : best,
    SETTLEMENTS[0]!,
  );
}
