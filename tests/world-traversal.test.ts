import { expect, it } from 'vitest';
import fixtures from './fixtures/world-traversal.json';
import { ChunkStore, SurfaceRules, TileFlag, Fluid, TerrainNavigation } from '../src/domain/world';

for (const f of fixtures)
  it(`worldforge parity: ${f.name}`, () => {
    const world = new ChunkStore(32);
    const index = (x: number, y: number) => (y + 2) * 32 + x + 2;
    for (const [x, y] of f.solid ?? []) world.flags[index(x!, y!)] = TileFlag.Solid;
    for (const [x, y] of f.ramps ?? []) world.flags[index(x!, y!)] = TileFlag.Ramp;
    for (const [x, y, z] of f.heights ?? []) world.elevation[index(x!, y!)] = z!;
    for (const [x, y] of f.fluid ?? []) world.fluid[index(x!, y!)] = Fluid.Freshwater;
    // Import contract: a bridge is a dry walk surface above retained authoring water.
    for (const [x, y] of f.bridges ?? []) world.fluid[index(x!, y!)] = 0;
    // Place the local fixture inside ChunkStore's outer safety border.
    const to = f.name === 'edge' ? { x: -1, y: 2 } : { x: f.to[0]! + 2, y: f.to[1]! + 2 };
    expect(
      SurfaceRules.canStep(world, { x: f.from[0]! + 2, y: f.from[1]! + 2 }, to, {
        water: f.water,
        lava: false,
      }),
    ).toBe(f.expected);
  });
it('authored navigation uses cardinal edges and cannot cut a blocked corner', () => {
  const world = new ChunkStore(32);
  for (const i of [98, 65, 34, 67]) world.flags[i] = TileFlag.Solid;
  expect(new TerrainNavigation(world).neighbors(66, { water: false, lava: false })).toEqual([]);
});
