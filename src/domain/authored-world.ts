import { z } from 'zod';
import { ChunkStore, Fluid, TileFlag } from './world';
import { CONFIG, clamp } from './values';
import { itemIds } from '../content/definitions';

const hash = z.string().regex(/^[a-f0-9]{64}$/);
const integer = z.number().int().nonnegative();
const channel = z.array(integer.max(65535)).max(CONFIG.worldSize ** 2);
export type MapValue = string | number | boolean | null | MapValue[] | { [key: string]: MapValue };
const value: z.ZodType<MapValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(value),
    z.record(z.string(), value),
  ]),
);
const entity = z
  .object({
    id: z.string().min(1),
    kind: z.string().min(1),
    level: z.string().min(1),
    x: integer,
    y: integer,
    width: integer.positive(),
    height: integer.positive(),
    fields: z.record(z.string(), value),
  })
  .strict();
const level = z
  .object({
    id: z.string().min(1),
    x: integer,
    y: integer,
    width: integer.positive().max(CONFIG.worldSize),
    height: integer.positive().max(CONFIG.worldSize),
    fields: z.record(z.string(), value),
    layers: z
      .object({
        biome: channel,
        elevation: channel,
        fluid: channel,
        flags: channel,
        resource: channel,
        quantity: channel,
        ground: channel,
        water: channel,
        paths: channel,
        surface: channel,
        waterDepth: channel,
        deck: channel,
      })
      .strict(),
  })
  .strict();
export const CompiledWorldSchema = z
  .object({
    formatVersion: z.literal(1),
    status: z.literal('candidate'),
    region: z.string().min(1),
    size: z.literal(CONFIG.worldSize),
    scope: z.string().min(1),
    excludedLevels: z.array(z.string()),
    provenance: z
      .object({ sourceDigest: hash, contractDigest: hash, planDigest: hash, importerDigest: hash })
      .strict(),
    legends: z
      .object({
        ground: z.array(z.string()),
        water: z.array(z.string()),
        paths: z.array(z.string()),
        surface: z.array(z.string()),
      })
      .strict(),
    levels: z.array(level).min(1).max(256),
    entities: z.array(entity).max(100000),
  })
  .strict();
export type CompiledWorld = z.infer<typeof CompiledWorldSchema>;
export type AuthoredEntity = CompiledWorld['entities'][number];
export type AuthoredLevel = CompiledWorld['levels'][number];
/** Point coordinates remain integer tiles in bundles; consumers choose centers. */
export function authoredInteractionPosition(e: AuthoredEntity): { x: number; y: number } {
  const point = e.kind === 'Building' ? (e.fields.door as { x: number; y: number }) : e;
  if (!point || !Number.isInteger(point.x) || !Number.isInteger(point.y))
    throw new Error('Invalid interaction point');
  return { x: point.x + 0.5, y: point.y + 0.5 };
}
export interface LoadedAuthoredWorld {
  readonly world: ChunkStore;
  readonly definition: CompiledWorld;
  readonly presentation: Readonly<
    Record<'ground' | 'water' | 'paths' | 'surface' | 'waterDepth' | 'deck', Uint8Array>
  >;
}

/** No random generation: all occupied tiles and actors originate in authored data. */
export class AuthoredWorldLoader {
  load(input: unknown): LoadedAuthoredWorld {
    const data = CompiledWorldSchema.parse(input);
    const coverage = new Uint8Array(data.size ** 2);
    const ids = new Set<string>();
    const levelsById = new Map(data.levels.map((l) => [l.id, l]));
    for (const lv of data.levels) {
      if (ids.has(lv.id) || lv.x + lv.width > data.size || lv.y + lv.height > data.size)
        throw new Error('Duplicate or out-of-bounds authored level');
      ids.add(lv.id);
      for (const values of Object.values(lv.layers))
        if (values.length !== lv.width * lv.height)
          throw new Error('Authored layer length mismatch');
      for (let y = 0; y < lv.height; y++)
        for (let x = 0; x < lv.width; x++) {
          const i = (lv.y + y) * data.size + lv.x + x;
          if (coverage[i]) throw new Error('Overlapping authored levels');
          coverage[i] = 1;
        }
    }
    const world = new ChunkStore(data.size, 0, coverage);
    world.flags.fill(TileFlag.Solid);
    const presentation = Object.fromEntries(
      ['ground', 'water', 'paths', 'surface', 'waterDepth', 'deck'].map((k) => [
        k,
        new Uint8Array(data.size ** 2),
      ]),
    ) as unknown as LoadedAuthoredWorld['presentation'];
    for (const lv of data.levels)
      for (let y = 0; y < lv.height; y++)
        for (let x = 0; x < lv.width; x++) {
          const local = y * lv.width + x,
            i = world.index(lv.x + x, lv.y + y);
          for (const key of [
            'biome',
            'elevation',
            'fluid',
            'flags',
            'resource',
            'quantity',
          ] as const) {
            const v = lv.layers[key][local]!;
            if (
              v >
              (key === 'biome'
                ? 6
                : key === 'elevation'
                  ? 2
                  : key === 'fluid'
                    ? 4
                    : key === 'flags'
                      ? 15
                      : key === 'resource'
                        ? itemIds.length
                        : 99)
            )
              throw new Error(`Invalid compiled ${key}`);
            world[key][i] = v;
          }
          for (const key of Object.keys(presentation) as (keyof typeof presentation)[]) {
            const v = lv.layers[key][local]!;
            const limit =
              key === 'deck'
                ? 1
                : key === 'waterDepth'
                  ? 2
                  : data.legends[key as 'ground' | 'water' | 'paths' | 'surface'].length - 1;
            if (v > limit || v > 255) throw new Error(`Invalid compiled ${key}`);
            presentation[key][i] = v;
          }
          if (
            (world.resource[i] === 0) !== (world.quantity[i] === 0) ||
            (presentation.deck[i] === 1 && world.fluid[i] !== Fluid.None) ||
            (presentation.water[i] === 0) !== (presentation.waterDepth[i] === 0) ||
            (presentation.paths[i] === 0) !== ((world.flags[i]! & TileFlag.Road) === 0)
          )
            throw new Error('Inconsistent compiled tile channels');
        }
    ids.clear();
    for (const e of data.entities) {
      const lv = levelsById.get(e.level);
      if (
        ids.has(e.id) ||
        !lv ||
        e.x < lv.x ||
        e.y < lv.y ||
        e.x + e.width > lv.x + lv.width ||
        e.y + e.height > lv.y + lv.height
      )
        throw new Error('Duplicate or out-of-bounds authored entity');
      ids.add(e.id);
    }
    const waterDistance = distanceField(world, (i) => presentation.water[i]! > 0);
    const saltDistance = distanceField(
      world,
      (i) =>
        world.fluid[i] === Fluid.Saltwater ||
        data.legends.water[presentation.water[i]!]?.startsWith('salt_') === true,
    );
    // Biome order is the shared Biome enum. These are environmental baselines,
    // independent of visual grading, day/night and the eventual weather model.
    const temperatures = [0.6, 0.65, 0.55, 0.3, 0.7, 0.9, 0.65];
    for (let i = 0; i < coverage.length; i++)
      if (coverage[i]) {
        world.drainage[i] = waterDistance[i]!;
        world.coastDistance[i] = saltDistance[i]!;
        world.moisture[i] = clamp(1 - waterDistance[i]! / 16);
        world.temperature[i] = temperatures[world.biome[i]!]!;
      }
    return { world, definition: data, presentation };
  }
}

/** Multi-source cardinal BFS, O(covered tiles); no paths through void. */
const cardinal = [
  [0, -1],
  [-1, 0],
  [1, 0],
  [0, 1],
] as const;
function distanceField(world: ChunkStore, source: (index: number) => boolean): Uint32Array {
  // A disconnected component can wind much farther than Manhattan distance.
  // One past the maximum simple path is an unambiguous finite no-source value.
  const result = new Uint32Array(world.size ** 2).fill(world.size ** 2);
  const queue = new Uint32Array(result.length);
  let head = 0,
    tail = 0;
  for (let i = 0; i < result.length; i++)
    if (world.coverage![i] && source(i)) {
      result[i] = 0;
      queue[tail++] = i;
    }
  while (head < tail) {
    const i = queue[head++]!,
      x = i % world.size,
      y = Math.floor(i / world.size);
    for (const [dx, dy] of cardinal) {
      const nx = x + dx!,
        ny = y + dy!;
      if (!world.contains(nx, ny)) continue;
      const next = world.index(nx, ny);
      if (result[next]! > result[i]! + 1) {
        result[next] = result[i]! + 1;
        queue[tail++] = next;
      }
    }
  }
  return result;
}
