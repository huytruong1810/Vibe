import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, expect, it } from 'vitest';
import contract from '../art/source/world/spec/world_schema.json';
import { canonical, compileWorld } from '../scripts/lib/world-compiler';
import { buildWorld, writeCompiledWorld } from '../scripts/world-build';
import {
  AuthoredWorldLoader,
  authoredInteractionPosition,
  type CompiledWorld,
} from '../src/domain/authored-world';
import { ChunkStore, Fluid, SurfaceRules, TileFlag, TerrainNavigation } from '../src/domain/world';
import fixtures from './fixtures/world-traversal.json';

type NativeField = { __identifier: string; __value: unknown };
type NativeEntity = {
  iid: string;
  __identifier: string;
  __grid: number[];
  width: number;
  height: number;
  fieldInstances: NativeField[];
};
type NativeLayer = { __identifier: string; intGridCsv: number[]; entityInstances: NativeEntity[] };
type NativeProject = {
  levels: {
    identifier: string;
    worldX: number;
    worldY: number;
    pxWid: number;
    pxHei: number;
    fieldInstances: NativeField[];
    layerInstances: NativeLayer[];
  }[];
};
let source: NativeProject, compiled: CompiledWorld;
const options = {
  region: 'aqualia',
  level: 'aqualia_village',
  planDigest: 'a'.repeat(64),
  importerDigest: 'b'.repeat(64),
};
beforeAll(async () => {
  source = JSON.parse(await readFile('art/source/world/hearthwild.ldtk', 'utf8')) as NativeProject;
  compiled = compileWorld(source, options);
});
const layer = (p: NativeProject, key: string) =>
  p.levels[0]!.layerInstances.find((l) => l.__identifier === key)!;
const entities = (p: NativeProject) =>
  p.levels.flatMap((l) => l.layerInstances.flatMap((x) => x.entityInstances));

it('is repeatable and insensitive to source record order', () => {
  const changed = structuredClone(source);
  changed.levels.reverse();
  for (const lv of changed.levels) {
    lv.fieldInstances.reverse();
    lv.layerInstances.reverse();
    for (const l of lv.layerInstances) {
      l.entityInstances.reverse();
      for (const e of l.entityInstances) e.fieldInstances.reverse();
    }
  }
  expect(canonical(compileWorld(changed, options))).toBe(canonical(compiled));
  expect(canonical(compileWorld(source, options))).toBe(canonical(compiled));
});
it('preserves every selected placement, stable IDs, anchors and world point fields', () => {
  const result = new AuthoredWorldLoader().load(compiled);
  const selected = source.levels.find((l) => l.identifier === options.level)!;
  expect(result.definition.entities).toHaveLength(
    selected.layerInstances.flatMap((l) => l.entityInstances).length,
  );
  expect(compiled.entities.filter((e) => e.kind === 'Building')).toHaveLength(10);
  const building = compiled.entities.find((e) => e.kind === 'Building')!;
  const door = building.fields.door as { x: number; y: number };
  expect(authoredInteractionPosition(building)).toEqual({ x: door.x + 0.5, y: door.y + 0.5 });
  expect(
    new Set(compiled.entities.filter((e) => e.kind === 'VillagerAnchor').map((e) => e.fields.npcId))
      .size,
  ).toBe(10);
  for (const kind of ['Habitat', 'Service', 'Entrance', 'StorySpot', 'FestivalRoute', 'Decor'])
    expect(compiled.entities.some((e) => e.kind === kind)).toBe(true);
  expect(compiled.excludedLevels).toEqual(['aqualia_riverlands']);
});
it('preserves authored geometry, void and legacy boundary behavior', () => {
  const loaded = new AuthoredWorldLoader().load(compiled),
    w = loaded.world;
  expect(w.contains(0, 0)).toBe(true);
  expect(w.contains(90, 0)).toBe(false);
  expect(w.contains(-1, 0)).toBe(false);
  expect(w.contains(512, 0)).toBe(false);
  expect(w.flags[w.index(100, 0)]! & TileFlag.Solid).toBeTruthy();
  expect(new ChunkStore(32).contains(0, 0)).toBe(false);
  expect(() => new ChunkStore(32, 0, new Uint8Array(1))).toThrow();
});
it('retains water, depth, surface and deck independently of traversable fluid', () => {
  const { world, presentation } = new AuthoredWorldLoader().load(compiled);
  const deck = presentation.deck.findIndex((v, i) => v === 1 && presentation.water[i]! > 0);
  expect(deck).toBeGreaterThanOrEqual(0);
  expect(world.fluid[deck]).toBe(Fluid.None);
  expect(presentation.waterDepth[deck]).toBeGreaterThan(0);
  expect(compiled.legends.surface[presentation.surface[deck]!]).toBe('boardwalk');
  expect(
    SurfaceRules.walkable(world, deck % 512, Math.floor(deck / 512), { water: false, lava: false }),
  ).toBe(true);
  expect(world.drainage[deck]).toBe(0);
  expect(world.moisture[deck]).toBe(1);
});
it('maps biome overrides, mud, saltwater and protected roads from the contract', () => {
  const p = structuredClone(source),
    at = (key: string, index: number, v: number) => {
      layer(p, key).intGridCsv[index] = v;
    };
  at('ground', 0, 5);
  at('water', 0, 0);
  at('paths', 0, 0);
  at('water', 1, 4);
  at('paths', 1, 0);
  at('biome', 2, 7);
  at('collision', 2, 3);
  at('paths', 2, 1);
  const { world, presentation } = new AuthoredWorldLoader().load(compileWorld(p, options));
  expect(world.fluid[0]).toBe(Fluid.Mud);
  expect(world.fluid[1]).toBe(Fluid.Saltwater);
  expect(world.coastDistance[1]).toBe(0);
  expect(presentation.waterDepth[1]).toBe(2);
  expect(world.biome[2]).toBe(6);
  expect(world.temperature[2]).toBeCloseTo(0.65);
  expect(world.flags[2]).toBe(TileFlag.Protected | TileFlag.Road);
});
it('translates all point fields once at a nonzero level offset', () => {
  const p = structuredClone(source);
  p.levels[0]!.worldY = 128;
  const c = compileWorld(p, options),
    building = c.entities.find((e) => e.kind === 'Building')!;
  const original = compiled.entities.find((e) => e.id === building.id)!;
  expect(building.y).toBe(original.y + 4);
  expect(building.fields.door).toEqual({
    ...(original.fields.door as object),
    y: (original.fields.door as { y: number }).y + 4,
  });
  const route = c.entities.find((e) => e.kind === 'FestivalRoute')!,
    base = compiled.entities.find((e) => e.id === route.id)!;
  expect((route.fields.points as { y: number }[])[0]!.y).toBe(
    (base.fields.points as { y: number }[])[0]!.y + 4,
  );
});
it('defaults resource quantity to three and rejects overlapping resource nodes', () => {
  const p = structuredClone(source);
  const e: NativeEntity = {
    iid: 'resource-fixture',
    __identifier: 'ResourceNode',
    __grid: [20, 20],
    width: 32,
    height: 32,
    fieldInstances: [{ __identifier: 'resourceId', __value: 'berries' }],
  };
  layer(p, 'entities').entityInstances.push(e);
  const c = compileWorld(p, options),
    lv = c.levels[0]!;
  expect(lv.layers.quantity[e.__grid[1]! * lv.width + e.__grid[0]!]).toBe(3);
  const duplicate = structuredClone(e);
  duplicate.iid = 'duplicate-resource';
  layer(p, 'entities').entityInstances.push(duplicate);
  expect(() => compileWorld(p, options)).toThrow('Multiple resource');
});
for (const [name, edit] of [
  [
    'missing layer',
    (p: NativeProject) => {
      p.levels[0]!.layerInstances = p.levels[0]!.layerInstances.filter(
        (l) => l.__identifier !== 'paths',
      );
    },
  ],
  [
    'bad value',
    (p: NativeProject) => {
      layer(p, 'ground').intGridCsv[0] = 999;
    },
  ],
  [
    'bad length',
    (p: NativeProject) => {
      layer(p, 'ground').intGridCsv.pop();
    },
  ],
  [
    'overlap',
    (p: NativeProject) => {
      p.levels[1]!.worldX = 0;
    },
  ],
  [
    'negative',
    (p: NativeProject) => {
      p.levels[0]!.worldX = -32;
    },
  ],
  [
    'excessive bounds',
    (p: NativeProject) => {
      p.levels[1]!.worldX = 512 * 32;
    },
  ],
  [
    'duplicate entity',
    (p: NativeProject) => {
      layer(p, 'entities').entityInstances.push(
        structuredClone(layer(p, 'entities').entityInstances[0]!),
      );
    },
  ],
  [
    'unresolved reference',
    (p: NativeProject) => {
      entities(p)
        .find((e) => e.__identifier === 'Building')!
        .fieldInstances.find((f) => f.__identifier === 'settlement')!.__value =
        'settlement:missing';
    },
  ],
] as const)
  it(`rejects ${name}`, () => {
    const p = structuredClone(source);
    edit(p);
    expect(() => compileWorld(p, options)).toThrow();
  });

for (const f of fixtures)
  it(`import traversal parity: ${f.name}`, () => {
    const p = structuredClone(source),
      lv = p.levels[0]!,
      width = lv.pxWid / 32;
    for (const key of ['ground', 'water', 'paths', 'collision', 'elevation'])
      layer(p, key).intGridCsv.fill(key === 'ground' ? 1 : 0);
    for (const [x, y] of f.solid ?? []) layer(p, 'collision').intGridCsv[y! * width + x!] = 1;
    for (const [x, y] of f.ramps ?? []) layer(p, 'collision').intGridCsv[y! * width + x!] = 2;
    for (const [x, y, height] of f.heights ?? [])
      layer(p, 'elevation').intGridCsv[y! * width + x!] = height!;
    for (const [x, y] of f.fluid ?? []) layer(p, 'water').intGridCsv[y! * width + x!] = 1;
    for (const [x, y] of f.bridges ?? []) layer(p, 'paths').intGridCsv[y! * width + x!] = 4;
    const { world } = new AuthoredWorldLoader().load(compileWorld(p, options));
    expect(
      SurfaceRules.canStep(
        world,
        { x: f.from[0]!, y: f.from[1]! },
        { x: f.to[0]!, y: f.to[1]! },
        { water: f.water, lava: false },
      ),
    ).toBe(f.expected);
  });
it('connects adjacent levels but never traverses void or cuts a blocked corner', () => {
  const c = structuredClone(compiled),
    lv = c.levels[0]!;
  for (const values of Object.values(lv.layers)) values.fill(0);
  lv.layers.ground.fill(1);
  lv.layers.surface.fill(1);
  const second = structuredClone(lv);
  second.id = 'neighbor';
  second.x = lv.width;
  c.levels.push(second);
  c.entities = [];
  const { world } = new AuthoredWorldLoader().load(c);
  expect(world.drainage[0]).toBe(512 ** 2);
  expect(world.coastDistance[0]).toBe(512 ** 2);
  expect(world.moisture[0]).toBe(0);
  expect(
    new TerrainNavigation(world).neighbors(world.index(89, 2), { water: false, lava: false }),
  ).toContain(world.index(90, 2));
  expect(
    new TerrainNavigation(world).neighbors(world.index(179, 2), { water: false, lava: false }),
  ).not.toContain(world.index(180, 2));
  for (const [x, y] of [
    [1, 0],
    [0, 1],
  ])
    world.flags[world.index(x!, y!)] = TileFlag.Solid;
  expect(new TerrainNavigation(world).neighbors(0, { water: false, lava: false })).toEqual([]);
});
it('rejects malformed compiled input before exposing a world', () => {
  for (const mutate of [
    (c: CompiledWorld) => {
      c.levels[0]!.layers.fluid[0] = 999;
    },
    (c: CompiledWorld) => {
      c.levels[0]!.layers.ground.pop();
    },
    (c: CompiledWorld) => {
      c.entities.push(c.entities[0]!);
    },
  ]) {
    const c = structuredClone(compiled);
    mutate(c);
    expect(() => new AuthoredWorldLoader().load(c)).toThrow();
  }
});
it('validates the official project and scoped QA, and refuses unfinished full-region compilation', async () => {
  const bytes = await buildWorld({ region: 'aqualia', level: options.level, check: true });
  expect(JSON.parse(bytes).provenance.contractDigest).toMatch(/^[a-f0-9]{64}$/);
  const directory = await mkdtemp(join(tmpdir(), 'hearthwild-draft-map-'));
  try {
    const draft = structuredClone(source);
    const riverlands = draft.levels.find((l) => l.identifier === 'aqualia_riverlands')!;
    // Deliberately unfinished fixture, independent of live authoring progress.
    riverlands.layerInstances.forEach((l) => {
      l.intGridCsv.fill(0);
      l.entityInstances = [];
    });
    const project = join(directory, 'draft.ldtk');
    await writeFile(project, JSON.stringify(draft));
    await expect(buildWorld({ region: 'aqualia', check: true, project })).rejects.toThrow(
      'Worldforge validation failed',
    );
    await expect(buildWorld({ region: 'aqualia', project })).rejects.toThrow('validation only');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);
it('atomically replaces valid output and preserves it when compilation is rejected', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'hearthwild-import-')),
    file = join(dir, 'world.json');
  try {
    await writeCompiledWorld(file, canonical(compiled));
    const broken = structuredClone(source);
    layer(broken, 'ground').intGridCsv[0] = -1;
    await expect(
      (async () => writeCompiledWorld(file, canonical(compileWorld(broken, options))))(),
    ).rejects.toThrow();
    expect(await readFile(file, 'utf8')).toBe(canonical(compiled));
    await writeCompiledWorld(file, 'replacement\n');
    expect(await readFile(file, 'utf8')).toBe('replacement\n');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
it('uses the published surface priority', () => {
  expect(contract.derived.surfacePriority).toEqual(['paths', 'water', 'ground']);
});
