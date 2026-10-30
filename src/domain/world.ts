import {
  SETTLEMENTS,
  VILLAGES,
  itemIds,
  type ItemId,
  type Medium,
  type SettlementDefinition,
} from '../content/definitions';
import { SeededRandom, hashString } from './core';
import { CONFIG, clamp, type WorldPosition } from './values';

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
const SIMPLEX_F = (Math.sqrt(3) - 1) / 2,
  SIMPLEX_G = (3 - Math.sqrt(3)) / 6;
const GRADIENTS = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

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
  ) {
    const n = size * size;
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

/** Seeded 2D simplex noise, O(1) samples and no coordinate-dependent allocation. */
export class ClimateSampler {
  private readonly perm = new Uint8Array(512);
  constructor(seed: number) {
    const random = new SeededRandom(seed);
    const p = Uint8Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
      const j = random.int(i + 1);
      [p[i], p[j]] = [p[j]!, p[i]!];
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255]!;
  }
  noise(x: number, y: number): number {
    const f = SIMPLEX_F,
      g = SIMPLEX_G;
    const s = (x + y) * f,
      i = Math.floor(x + s),
      j = Math.floor(y + s),
      t = (i + j) * g;
    const x0 = x - (i - t),
      y0 = y - (j - t),
      i1 = x0 > y0 ? 1 : 0,
      j1 = 1 - i1;
    const ii = i & 255,
      jj = j & 255;
    return (
      70 *
      (this.corner(x0, y0, this.perm[ii + this.perm[jj]!]!) +
        this.corner(x0 - i1 + g, y0 - j1 + g, this.perm[ii + i1 + this.perm[jj + j1]!]!) +
        this.corner(x0 - 1 + 2 * g, y0 - 1 + 2 * g, this.perm[ii + 1 + this.perm[jj + 1]!]!))
    );
  }
  private corner(dx: number, dy: number, hash: number): number {
    const m = 0.5 - dx * dx - dy * dy;
    if (m <= 0) return 0;
    const grad = GRADIENTS[hash & 7]!;
    return m ** 4 * (grad[0] * dx + grad[1] * dy);
  }
  octave(x: number, y: number): number {
    return (
      (this.noise(x, y) + 0.5 * this.noise(x * 2, y * 2) + 0.25 * this.noise(x * 4, y * 4)) / 1.75
    );
  }
}

export class HydrologyGenerator {
  sample(x: number, y: number, seed: number): { river: number; coast: number } {
    const phase = (seed % 1000) / 1000;
    const riverX = 258 + Math.sin(y / 39 + phase) * 24 + Math.sin(y / 101) * 17;
    const tributaryY = 225 + Math.sin(x / 48 + phase) * 23;
    return {
      river: Math.min(Math.abs(x - riverX), Math.abs(y - tributaryY) * 1.6),
      coast: 468 + Math.sin(y / 41) * 9 - x,
    };
  }
}
export class BiomeClassifier {
  classify(
    elevation: number,
    moisture: number,
    temperature: number,
    river: number,
    coast: number,
    volcano: number,
  ): Biome {
    if (coast < 13) return Biome.Beach;
    if (volcano < 39) return Biome.Volcano;
    if (river < 9) return moisture > 0.53 && temperature > 0.4 ? Biome.Swamp : Biome.Riverlands;
    if (elevation > 0.65) return Biome.Mountains;
    if (moisture > 0.55) return Biome.Forest;
    return Biome.Meadows;
  }
}

export class SettlementPlanner {
  place(world: ChunkStore): void {
    for (const s of SETTLEMENTS) {
      const radius = s.capital ? 16 : 7;
      for (let y = s.y - radius; y <= s.y + radius; y++)
        for (let x = s.x - radius; x <= s.x + radius; x++) {
          const i = world.index(x, y);
          world.elevation[i] = 0;
          world.fluid[i] = Fluid.None;
          world.flags[i] = TileFlag.Protected;
          world.biome[i] =
            s.village === 0 ? Biome.Mountains : s.village === 1 ? Biome.Riverlands : Biome.Beach;
          world.resource[i] = 0;
          world.quantity[i] = 0;
          if (Math.abs(x - s.x) <= 1 || Math.abs(y - s.y) <= 1) world.flags[i] |= TileFlag.Road;
        }
      const count = s.capital ? 10 : 2;
      for (let b = 0; b < count; b++) {
        const x = s.x + (s.capital ? [-13, -7, 3, 9, 15][b % 5]! : b === 0 ? -4 : 4),
          y = s.y + (s.capital ? (b < 5 ? -9 : 7) : -5);
        world.buildings.push({
          id: `${s.id}:home:${b}`,
          x,
          y,
          village: s.village,
          name: s.capital ? `${VILLAGES[s.village]!.name} cottage ${b + 1}` : `${s.name} shelter`,
        });
        for (let by = y - 1; by <= y; by++)
          for (let bx = x - 1; bx <= x + 1; bx++)
            world.flags[world.index(bx, by)]! |= TileFlag.Solid;
      }
      // Wells and starter forage are authored guarantees, not random generation accidents.
      for (const [dx, dy, item] of [
        [3, 2, 'flint'],
        [4, 2, 'stick'],
        [5, 2, 'fiber'],
        [-3, 2, 'berries'],
        [-4, 2, 'reeds'],
        [-5, 2, 'fungi'],
      ] as const) {
        const i = world.index(s.x + dx, s.y + dy);
        world.resource[i] = itemIds.indexOf(item) + 1;
        world.quantity[i] = 8;
      }
      world.fluid[world.index(s.x + 4, s.y - 3)] = Fluid.Freshwater;
    }
    const road = (a: WorldPosition, b: WorldPosition): void => {
      let x = Math.floor(a.x),
        y = Math.floor(a.y);
      let guard = 0;
      while ((x !== Math.floor(b.x) || y !== Math.floor(b.y)) && guard++ < world.size * 2) {
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const i = world.index(x + dx, y + dy);
            world.flags[i] = TileFlag.Road | TileFlag.Protected | TileFlag.Ramp;
            world.fluid[i] = Fluid.None;
            world.elevation[i] = 0;
            world.resource[i] = 0;
            world.quantity[i] = 0;
          }
        if (x !== Math.floor(b.x)) x += Math.sign(b.x - x);
        else y += Math.sign(b.y - y);
      }
    };
    for (const s of SETTLEMENTS) road(s, VILLAGES[s.village]!);
    road(VILLAGES[0]!, VILLAGES[1]!);
    road(VILLAGES[1]!, VILLAGES[2]!);
    // Generation-time connectivity proof over the reserved road graph.
    const visited = new Uint8Array(world.size ** 2),
      queue = new Int32Array(world.size ** 2);
    const targets = new Set(SETTLEMENTS.map((s) => world.index(s.x, s.y)));
    let head = 0,
      tail = 0;
    const first = world.index(VILLAGES[0].x, VILLAGES[0].y);
    queue[tail++] = first;
    visited[first] = 1;
    while (head < tail && targets.size) {
      const i = queue[head++]!;
      targets.delete(i);
      for (const offset of [-1, 1, -world.size, world.size]) {
        const next = i + offset;
        if (
          next < 0 ||
          next >= visited.length ||
          visited[next] ||
          !(world.flags[next]! & TileFlag.Road)
        )
          continue;
        visited[next] = 1;
        queue[tail++] = next;
      }
    }
    if (targets.size) throw new Error('Settlement road connectivity could not be established');
  }
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

export class WorldGenerator {
  generate(seed: number): ChunkStore {
    const world = new ChunkStore(CONFIG.worldSize, seed),
      climate = new ClimateSampler(seed),
      hydro = new HydrologyGenerator(),
      classifier = new BiomeClassifier();
    const random = new SeededRandom(hashString(`${seed}:resources`));
    const resources: readonly (readonly ItemId[])[] = [
      ['reeds', 'flint', 'wheat'],
      ['berries', 'wheat', 'nectar'],
      ['stick', 'berries', 'fungi'],
      ['flint', 'ore', 'ashgrass'],
      ['flint', 'nectar', 'berries'],
      ['ashgrass', 'ore', 'nectar'],
      ['fungi', 'reeds', 'stick'],
    ];
    for (let y = 0; y < world.size; y++)
      for (let x = 0; x < world.size; x++) {
        const i = world.index(x, y),
          h = hydro.sample(x, y, seed);
        const e = clamp(0.5 + climate.octave(x / 100, y / 100) * 0.38 + (180 - y) / 900);
        const m = clamp(0.5 + climate.octave(x / 82 + 51, y / 82 - 17) * 0.45);
        const t = clamp(0.65 - y / 1300 + climate.octave(x / 130 - 83, y / 130 + 29) * 0.2);
        const volcano = Math.hypot((x - 112) * 0.9, y - 56);
        const biome = classifier.classify(e, m, t, h.river, h.coast, volcano);
        world.biome[i] = biome;
        world.moisture[i] = m;
        world.temperature[i] = t;
        world.drainage[i] = h.river;
        world.coastDistance[i] = h.coast;
        world.elevation[i] = h.river < 7 || h.coast < 12 ? 0 : Math.floor(e * 3);
        if (h.coast < 0) world.fluid[i] = Fluid.Saltwater;
        else if (h.river < 3.5)
          world.fluid[i] = biome === Biome.Swamp ? Fluid.Mud : Fluid.Freshwater;
        else if (volcano < 13) world.fluid[i] = Fluid.Lava;
        if (!world.contains(x, y)) world.flags[i] = TileFlag.Solid;
        if (!world.fluid[i] && random.next() < 0.075) {
          const choices = resources[biome]!;
          world.resource[i] = itemIds.indexOf(choices[random.int(choices.length)]!) + 1;
          world.quantity[i] = 2 + random.int(4);
        }
      }
    // Natural ramps occur at selected one-level contour transitions.
    for (let y = 1; y < world.size - 1; y++)
      for (let x = 1; x < world.size - 1; x++) {
        const i = world.index(x, y);
        if (
          (x * 17 + y * 31 + seed) % 7 === 0 &&
          Math.abs(world.elevation[i]! - world.elevation[i + 1]!) === 1
        ) {
          world.flags[i]! |= TileFlag.Ramp;
          world.flags[i + 1]! |= TileFlag.Ramp;
        }
      }
    new SettlementPlanner().place(world);
    return world;
  }
}

export interface Traversal {
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
    if (fluid === Fluid.Lava && !traversal.lava) return false;
    if (
      (fluid === Fluid.Freshwater || fluid === Fluid.Saltwater) &&
      !(flags & TileFlag.Ice) &&
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
    if (!this.walkable(world, to.x, to.y, traversal)) return false;
    const a = world.index(from.x, from.y),
      b = world.index(to.x, to.y);
    const delta = Math.abs(world.elevation[a]! - world.elevation[b]!);
    return (
      delta === 0 || (delta === 1 && ((world.flags[a]! | world.flags[b]!) & TileFlag.Ramp) !== 0)
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
export class DualGridAutotiler {
  private static readonly patterns = Array.from({ length: 16 }, (_, mask) => {
    const rects: { x: number; y: number; width: number; height: number }[] = [];
    for (let y = 0; y < 16; y += 2) {
      let start = -1;
      for (let x = 0; x <= 16; x += 2) {
        const u = (x + 1) / 16,
          v = (y + 1) / 16;
        const weight =
          (mask & 1 ? (1 - u) * (1 - v) : 0) +
          (mask & 2 ? u * (1 - v) : 0) +
          (mask & 4 ? (1 - u) * v : 0) +
          (mask & 8 ? u * v : 0);
        const inside = x < 16 && weight >= 0.5;
        if (inside && start < 0) start = x;
        if (!inside && start >= 0) {
          rects.push({ x: start, y, width: x - start, height: 2 });
          start = -1;
        }
      }
    }
    return rects;
  });
  pattern(mask: number): readonly { x: number; y: number; width: number; height: number }[] {
    return DualGridAutotiler.patterns[mask & 15]!;
  }
  /** Bits are NW=1, NE=2, SW=4, SE=8. Shared corner samples remove chunk seams. */
  mask(
    world: { readonly size: number; index(x: number, y: number): number },
    x: number,
    y: number,
    matches: (index: number) => boolean,
  ): number {
    let mask = 0;
    for (let corner = 0; corner < 4; corner++) {
      const cx = x + (corner % 2),
        cy = y + Math.floor(corner / 2);
      if (cx >= 0 && cy >= 0 && cx < world.size && cy < world.size && matches(world.index(cx, cy)))
        mask |= 1 << corner;
    }
    return mask;
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
