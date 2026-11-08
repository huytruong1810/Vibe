import { createHash } from 'node:crypto';
import { z } from 'zod';
import contractJson from '../../art/source/world/spec/world_schema.json';
import { itemIds } from '../../src/content/definitions';
import {
  AuthoredWorldLoader,
  type CompiledWorld,
  type MapValue,
} from '../../src/domain/authored-world';
import { Fluid, TileFlag } from '../../src/domain/world';
import { CONFIG } from '../../src/domain/values';

interface Field {
  type: string;
  required?: boolean;
  values?: string[];
  ref?: string;
  pattern?: string;
  min?: number;
  max?: number;
  minItems?: number;
}
interface LayerValue {
  value: number;
  id: string;
  surface?: string;
  fluid?: string;
  flag?: string;
  elevation?: number;
  depth?: string;
  overWater?: boolean;
}
interface Contract {
  schemaVersion: number;
  ldtk: { gridSizeArtPx: number };
  layers: {
    id: string;
    type: string;
    required?: boolean;
    fullCoverage?: boolean;
    values?: LayerValue[];
    entities?: string[];
  }[];
  layerOrder: string[];
  levelFields: Record<string, Field>;
  entities: Record<string, { fields: Record<string, Field>; size: string }>;
  enums: Record<string, unknown>;
  derived: { surfacePriority: string[]; surfaces: string[] };
}
const contract = contractJson as unknown as Contract;
const nativeField = z.object({ __identifier: z.string(), __value: z.unknown() }).passthrough();
const nativeEntity = z
  .object({
    iid: z.string().min(1),
    __identifier: z.string(),
    __grid: z.tuple([z.number().int(), z.number().int()]),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    fieldInstances: z.array(nativeField),
  })
  .passthrough();
const nativeLayer = z
  .object({
    __identifier: z.string(),
    __type: z.string(),
    __cWid: z.number().int(),
    __cHei: z.number().int(),
    __gridSize: z.number().int(),
    intGridCsv: z.array(z.number().int()),
    entityInstances: z.array(nativeEntity),
  })
  .passthrough();
const nativeProject = z
  .object({
    jsonVersion: z.literal('1.5.3'),
    worldLayout: z.literal('Free'),
    externalLevels: z.literal(false),
    defaultGridSize: z.literal(32),
    levels: z
      .array(
        z
          .object({
            identifier: z.string(),
            worldX: z.number().int(),
            worldY: z.number().int(),
            pxWid: z.number().int().positive(),
            pxHei: z.number().int().positive(),
            fieldInstances: z.array(nativeField),
            layerInstances: z.array(nativeLayer),
          })
          .passthrough(),
      )
      .min(1),
  })
  .passthrough();

/** Canonical keys, LF and stable records; editor array order is not world identity. */
export function canonical(value: unknown): string {
  const sorted = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(sorted)
      : v !== null && typeof v === 'object'
        ? Object.fromEntries(
            Object.entries(v)
              .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
              .map(([k, x]) => [k, sorted(x)]),
          )
        : v;
  return JSON.stringify(sorted(value), null, 2) + '\n';
}
export const digest = (value: unknown): string =>
  createHash('sha256').update(canonical(value)).digest('hex');

function fields(
  input: z.infer<typeof nativeField>[],
  definitions: Record<string, Field>,
  region: string,
): Record<string, MapValue> {
  const out: Record<string, MapValue> = {};
  function valid(v: unknown, d: Field): boolean {
    if (d.type.startsWith('array<'))
      return (
        Array.isArray(v) &&
        v.length >= (d.minItems ?? 0) &&
        v.every((x) => valid(x, { ...d, type: d.type.slice(6, -1) }))
      );
    if (d.type === 'point')
      return (
        v !== null &&
        typeof v === 'object' &&
        Object.keys(v).sort().join(',') === 'cx,cy' &&
        Object.values(v).every((x) => Number.isInteger(x) && (x as number) >= 0)
      );
    if (d.type === 'bool') return typeof v === 'boolean';
    if (d.type === 'int' || d.type === 'float')
      return (
        typeof v === 'number' &&
        Number.isFinite(v) &&
        (d.type !== 'int' || Number.isInteger(v)) &&
        v >= (d.min ?? -Infinity) &&
        v <= (d.max ?? Infinity)
      );
    if (
      typeof v !== 'string' ||
      !v ||
      v.length > 500 ||
      (d.pattern && !new RegExp(d.pattern).test(v))
    )
      return false;
    let allowed = d.values ?? (d.ref ? contract.enums[d.ref] : undefined) ?? contract.enums[d.type];
    if (d.type === 'itemId') allowed = itemIds;
    if (d.type === 'npcId') allowed = (allowed as Record<string, string[]>)[region];
    return !Array.isArray(allowed) || allowed.includes(v);
  }
  const seen = new Set<string>();
  for (const f of input) {
    const d = definitions[f.__identifier];
    if (!d || seen.has(f.__identifier))
      throw new Error(`Unknown/duplicate field ${f.__identifier}`);
    seen.add(f.__identifier);
    if (f.__value === null || f.__value === undefined) {
      if (d.required) throw new Error(`Required field ${f.__identifier}`);
      continue;
    }
    if (!valid(f.__value, d)) throw new Error(`Invalid field ${f.__identifier}`);
    out[f.__identifier] = f.__value as MapValue;
  }
  for (const [name, d] of Object.entries(definitions))
    if (d.required && !(name in out)) throw new Error(`Missing field ${name}`);
  return out;
}

export interface CompileOptions {
  region: string;
  level?: string;
  planDigest: string;
  importerDigest: string;
}
/** Pure compilation. CLI additionally requires pinned official-schema and worldforge QA. */
export function compileWorld(input: unknown, options: CompileOptions): CompiledWorld {
  const project = nativeProject.parse(input),
    grid = contract.ldtk.gridSizeArtPx;
  const byLayer = Object.fromEntries(contract.layers.map((l) => [l.id, l]));
  const valueAt = (layer: string, value: number) =>
    byLayer[layer]!.values?.find((v) => v.value === value);
  const legends = {
    ground: ['none', ...byLayer.ground!.values!.map((v) => v.id)],
    water: ['none', ...byLayer.water!.values!.map((v) => v.id)],
    paths: ['none', ...byLayer.paths!.values!.map((v) => v.id)],
    surface: ['none', ...contract.derived.surfaces],
  };
  // Numeric source values index the legends, including explicit holes if a future
  // contract uses non-contiguous values.
  for (const name of ['ground', 'water', 'paths'] as const)
    for (const v of byLayer[name]!.values!) legends[name][v.value] = v.id;
  const occupied = new Uint8Array(CONFIG.worldSize ** 2),
    levelIds = new Set<string>(),
    entityIds = new Set<string>(),
    semanticIds = new Set<string>();
  const levels: CompiledWorld['levels'] = [],
    entities: CompiledWorld['entities'] = [];
  const sourceEntities: { kind: string; id: string; fields: Record<string, MapValue> }[] = [];
  for (const lv of [...project.levels].sort((a, b) =>
    a.identifier.localeCompare(b.identifier, 'en'),
  )) {
    const [x, y, width, height] = [lv.worldX, lv.worldY, lv.pxWid, lv.pxHei].map(
      (v) => v / grid,
    ) as [number, number, number, number];
    if (
      [x, y, width, height].some((v) => !Number.isInteger(v) || v < 0) ||
      levelIds.has(lv.identifier) ||
      x + width > CONFIG.worldSize ||
      y + height > CONFIG.worldSize
    )
      throw new Error('Duplicate/out-of-bounds level geometry');
    levelIds.add(lv.identifier);
    for (let dy = 0; dy < height; dy++)
      for (let dx = 0; dx < width; dx++) {
        const i = (y + dy) * CONFIG.worldSize + x + dx;
        if (occupied[i]) throw new Error('Overlapping levels');
        occupied[i] = 1;
      }
    const levelFields = fields(lv.fieldInstances, contract.levelFields, options.region);
    const source: Record<string, number[]> = {};
    const layersSeen = new Set<string>();
    for (const layer of lv.layerInstances) {
      const d = byLayer[layer.__identifier];
      if (
        !d ||
        layersSeen.has(d.id) ||
        layer.__type !== d.type ||
        layer.__cWid !== width ||
        layer.__cHei !== height ||
        layer.__gridSize !== grid
      )
        throw new Error('Unknown/duplicate/malformed layer');
      layersSeen.add(d.id);
      if (d.type === 'IntGrid') {
        if (
          layer.intGridCsv.length !== width * height ||
          layer.intGridCsv.some((v) =>
            v === 0
              ? d.fullCoverage && (!options.level || options.level === lv.identifier)
              : !d.values!.some((a) => a.value === v),
          )
        )
          throw new Error(`Invalid layer values ${d.id}`);
        source[d.id] = layer.intGridCsv;
      }
      for (const e of layer.entityInstances) {
        const definition = contract.entities[e.__identifier];
        if (!definition || !d.entities?.includes(e.__identifier) || entityIds.has(e.iid))
          throw new Error('Invalid/duplicate entity');
        entityIds.add(e.iid);
        const f = fields(e.fieldInstances, definition.fields, options.region);
        const semantic =
          f.sceneId ??
          f.id ??
          (e.__identifier === 'VillagerAnchor' ? `${String(f.npcId)}:${String(f.role)}` : null);
        if (semantic !== null) {
          const key = `${e.__identifier}:${String(semantic)}`;
          if (semanticIds.has(key)) throw new Error('Duplicate semantic identity');
          semanticIds.add(key);
        }
        sourceEntities.push({ kind: e.__identifier, id: e.iid, fields: f });
        const [ex, ey] = e.__grid,
          ew = e.width / grid,
          eh = e.height / grid;
        if (
          ex < 0 ||
          ey < 0 ||
          !Number.isInteger(ew) ||
          !Number.isInteger(eh) ||
          ex + ew > width ||
          ey + eh > height ||
          (definition.size === 'point' && (ew !== 1 || eh !== 1))
        )
          throw new Error('Out-of-bounds entity');
        const translate = (v: MapValue, desc: Field): MapValue => {
          if (desc.type === 'point') {
            const p = v as { cx: number; cy: number };
            if (p.cx >= width || p.cy >= height) throw new Error('Point field outside level');
            return { x: p.cx + x, y: p.cy + y };
          }
          return desc.type === 'array<point>'
            ? (v as MapValue[]).map((p) => translate(p, { type: 'point' }))
            : v;
        };
        if (
          (!options.level || lv.identifier === options.level) &&
          levelFields.region === options.region
        )
          entities.push({
            id: e.iid,
            kind: e.__identifier,
            level: lv.identifier,
            x: ex + x,
            y: ey + y,
            width: ew,
            height: eh,
            fields: Object.fromEntries(
              Object.entries(f).map(([k, v]) => [k, translate(v, definition.fields[k]!)]),
            ),
          });
      }
    }
    if (contract.layers.some((d) => d.required && !layersSeen.has(d.id)))
      throw new Error('Missing required layer');
    if ((options.level && lv.identifier !== options.level) || levelFields.region !== options.region)
      continue;
    const count = width * height;
    const output = Object.fromEntries(
      [
        'biome',
        'elevation',
        'fluid',
        'flags',
        'resource',
        'quantity',
        'ground',
        'water',
        'paths',
        'surface',
        'waterDepth',
        'deck',
      ].map((k) => [k, Array<number>(count).fill(0)]),
    ) as CompiledWorld['levels'][number]['layers'];
    for (let i = 0; i < count; i++) {
      const ground = source.ground![i]!,
        water = source.water![i]!,
        path = source.paths![i]!;
      const g = valueAt('ground', ground)!,
        w = valueAt('water', water),
        p = valueAt('paths', path);
      const biome = source.biome?.[i] ?? 0;
      output.biome[i] = biome
        ? biome - 1
        : ['riverlands', 'meadows', 'forest', 'mountains', 'beach', 'volcano', 'swamp'].indexOf(
            String(levelFields.biome),
          );
      output.elevation[i] = valueAt('elevation', source.elevation![i]!)?.elevation ?? 0;
      output.fluid[i] = p?.overWater
        ? Fluid.None
        : w?.fluid === 'freshwater'
          ? Fluid.Freshwater
          : w?.fluid === 'saltwater'
            ? Fluid.Saltwater
            : g.id === 'mud'
              ? Fluid.Mud
              : Fluid.None;
      const flag = valueAt('collision', source.collision![i]!)?.flag;
      output.flags[i] =
        (flag ? (TileFlag[flag as keyof typeof TileFlag] as number) : 0) |
        (path ? TileFlag.Road : 0);
      output.ground[i] = ground;
      output.water[i] = water;
      output.paths[i] = path;
      output.waterDepth[i] = !w ? 0 : w.depth === 'deep' ? 2 : 1;
      output.deck[i] = p?.overWater ? 1 : 0;
      const surface = contract.derived.surfacePriority
        .map((k) => valueAt(k, source[k]![i]!)?.surface)
        .find(Boolean);
      output.surface[i] = legends.surface.indexOf(surface!);
    }
    for (const e of entities.filter(
      (e) => e.level === lv.identifier && e.kind === 'ResourceNode',
    )) {
      const i = (e.y - y) * width + e.x - x;
      if (output.resource[i]) throw new Error('Multiple resource nodes on one tile');
      output.resource[i] = itemIds.indexOf(e.fields.resourceId as (typeof itemIds)[number]) + 1;
      output.quantity[i] = Number(e.fields.quantity ?? 3);
    }
    levels.push({ id: lv.identifier, x, y, width, height, fields: levelFields, layers: output });
  }
  if (!levels.length) throw new Error('No selected authored levels');
  const settlements = new Set(
    sourceEntities.filter((e) => e.kind === 'Settlement').map((e) => e.fields.id),
  );
  const buildings = new Set(
    sourceEntities.filter((e) => e.kind === 'Building').map((e) => e.fields.sceneId),
  );
  const landmarks = new Set(
    sourceEntities.filter((e) => e.kind === 'Landmark').map((e) => e.fields.id),
  );
  for (const e of sourceEntities) {
    if (e.kind === 'Building' && !settlements.has(e.fields.settlement))
      throw new Error('Unresolved settlement');
    if (e.kind === 'Entrance' && e.fields.kind === 'interior' && !buildings.has(e.fields.sceneId))
      throw new Error('Unresolved entrance');
    if (e.kind === 'StorySpot' && !landmarks.has(e.fields.subject))
      throw new Error('Unresolved story subject');
  }
  entities.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const payload = { levels, entities };
  const result: CompiledWorld = {
    formatVersion: 1,
    status: 'candidate',
    size: CONFIG.worldSize,
    region: options.region,
    scope: options.level ?? 'region',
    excludedLevels: project.levels
      .filter((l) => !levels.some((v) => v.id === l.identifier))
      .map((l) => l.identifier)
      .sort(),
    legends,
    ...payload,
    provenance: {
      sourceDigest: digest(payload),
      contractDigest: digest(contractJson),
      planDigest: options.planDigest,
      importerDigest: options.importerDigest,
    },
  };
  new AuthoredWorldLoader().load(result);
  return result;
}
