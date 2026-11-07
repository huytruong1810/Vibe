import { readFile } from 'node:fs/promises';
import { beforeAll, expect, it } from 'vitest';
import {
  AuthoredWorldLoader,
  authoredInteractionPosition,
  type CompiledWorld,
} from '../src/domain/authored-world';
import { ChunkStore, Fluid, SurfaceRules, TileFlag, TerrainNavigation } from '../src/domain/world';

let compiled: CompiledWorld;
beforeAll(async () => {
  compiled = JSON.parse(
    await readFile('public/assets/generated/aqualia-region.json', 'utf8'),
  ) as CompiledWorld;
});

it('preserves all 371 reconciled placements across 2 levels, stable IDs, anchors and world point fields', () => {
  const result = new AuthoredWorldLoader().load(compiled);
  expect(compiled.levels).toHaveLength(2);
  expect(result.definition.entities).toHaveLength(371);
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
  expect(result.props.length).toBeGreaterThan(50);
  expect(result.props.some((p) => p.contentId === 'house_aqualia')).toBe(true);
  expect(result.props.some((p) => p.contentId === 'landmark_well')).toBe(true);
  expect(result.props.some((p) => p.layer === 'canopy')).toBe(true);
  expect(result.props.some((p) => p.layer === 'object')).toBe(true);
  expect(compiled.excludedLevels).toEqual([]);
});

it('preserves authored geometry, void and legacy boundary behavior', () => {
  const loaded = new AuthoredWorldLoader().load(compiled),
    w = loaded.world;
  expect(w.contains(0, 0)).toBe(true);
  expect(w.contains(90, 0)).toBe(true);
  expect(w.contains(210, 0)).toBe(false);
  expect(w.contains(-1, 0)).toBe(false);
  expect(w.contains(512, 0)).toBe(false);
  expect(w.flags[w.index(220, 0)]! & TileFlag.Solid).toBeTruthy();
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

it('connects adjacent levels but never traverses void or cuts a blocked corner', () => {
  const c = structuredClone(compiled),
    lv = c.levels.find((l) => l.id === 'aqualia_village')!;
  for (const values of Object.values(lv.layers)) values.fill(0);
  lv.layers.ground.fill(1);
  lv.layers.surface.fill(1);
  const second = structuredClone(lv);
  second.id = 'neighbor';
  second.x = lv.width;
  c.levels = [lv, second];
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
