import { DualGridAutotiler } from '../src/presentation/autotiler';
import { describe, expect, it } from 'vitest';
import { SETTLEMENTS } from '../src/content/definitions';
import { ClimateSampler, Fluid, SurfaceRules, TileFlag, WorldGenerator } from '../src/domain/world';
import { NavigationService, SpatialIndex } from '../src/domain/navigation';
import { flatWorld } from './helpers';

describe('world and navigation', () => {
  it('reproduces layered geography, resources, and all seven biomes', () => {
    const a = new WorldGenerator().generate(42),
      b = new WorldGenerator().generate(42);
    expect(a.biome).toEqual(b.biome);
    expect(a.resource).toEqual(b.resource);
    expect(a.elevation).toEqual(b.elevation);
    expect(new Set(a.biome).size).toBe(7);
    expect(new WorldGenerator().generate(43).moisture).not.toEqual(a.moisture);
  });
  it.each([0, 42, 8123])('guarantees settlement connectivity for seed %s', (seed) => {
    const world = new WorldGenerator().generate(seed),
      nav = new NavigationService(world);
    expect(nav.connected(SETTLEMENTS[0]!, SETTLEMENTS)).toBe(true);
    for (const s of SETTLEMENTS) expect(SurfaceRules.walkable(world, s.x, s.y)).toBe(true);
  });
  it('samples simplex noise continuously across chunk coordinates', () => {
    const climate = new ClimateSampler(42);
    expect(Math.abs(climate.octave(0.31999, 0.7) - climate.octave(0.32001, 0.7))).toBeLessThan(
      0.001,
    );
  });
  it.each(Array.from({ length: 16 }, (_, i) => i))('computes dual-grid mask %s', (mask) => {
    const world = flatWorld(),
      tiler = new DualGridAutotiler();
    for (let corner = 0; corner < 4; corner++)
      world.fluid[world.index(4 + (corner % 2), 4 + Math.floor(corner / 2))] =
        mask & (1 << corner) ? Fluid.Freshwater : Fluid.None;
    expect(tiler.mask(world, 4, 4, (i) => world.fluid[i] === Fluid.Freshwater)).toBe(mask);
  });
  it('requires ramps between elevations and supports ice and lava capabilities', () => {
    const w = flatWorld(),
      at = w.index(5, 4);
    w.elevation[at] = 1;
    expect(SurfaceRules.canStep(w, { x: 4.5, y: 4.5 }, { x: 5.5, y: 4.5 })).toBe(false);
    w.flags[at] = TileFlag.Ramp;
    expect(SurfaceRules.canStep(w, { x: 4.5, y: 4.5 }, { x: 5.5, y: 4.5 })).toBe(true);
    w.fluid[at] = Fluid.Lava;
    expect(SurfaceRules.walkable(w, 5, 4)).toBe(false);
    expect(SurfaceRules.walkable(w, 5, 4, { lava: true, water: true })).toBe(true);
    w.fluid[at] = Fluid.Freshwater;
    expect(SurfaceRules.walkable(w, 5, 4, { lava: false, water: false })).toBe(false);
    w.flags[at]! |= TileFlag.Ice;
    expect(SurfaceRules.walkable(w, 5, 4, { lava: false, water: false })).toBe(true);
  });
  it('finds incremental paths through a gap without exceeding expansion budgets', () => {
    const w = flatWorld(),
      nav = new NavigationService(w);
    for (let y = 1; y < 15; y++) if (y !== 10) w.flags[w.index(7, y)] = TileFlag.Solid;
    nav.request({ id: 'test', start: { x: 3.5, y: 3.5 }, goal: { x: 11.5, y: 3.5 } });
    let iterations = 0;
    while (nav.result('test').status === 'pending' && iterations++ < 200) {
      nav.advance(5);
      expect(nav.expansions).toBeLessThanOrEqual(5);
    }
    const result = nav.result('test');
    expect(result.status).toBe('found');
    expect(result.points.some((p) => Math.floor(p.y) === 10)).toBe(true);
    nav.cancel('test');
    expect(nav.result('test').status).toBe('pending');
  });
  it('reports unreachable destinations and invalidates cached paths after terrain changes', () => {
    const w = flatWorld(),
      nav = new NavigationService(w);
    w.flags[w.index(5, 5)] = TileFlag.Solid;
    nav.request({ id: 'blocked', start: { x: 2, y: 2 }, goal: { x: 5, y: 5 } });
    nav.advance(1000);
    expect(nav.result('blocked').status).toBe('unreachable');
    w.flags[w.index(5, 5)] = 0;
    w.touch(w.index(5, 5), true);
    nav.request({ id: 'opened', start: { x: 2, y: 2 }, goal: { x: 5, y: 5 } });
    nav.advance(1000);
    expect(nav.result('opened').status).toBe('found');
  });
  it('bounds spatial queries and clears old occupancy', () => {
    const index = new SpatialIndex();
    for (let i = 0; i < 100; i++) index.insert(i, 4, 4);
    expect(index.query(4, 4, 2, 8)).toHaveLength(8);
    index.clear();
    expect(index.query(4, 4, 2)).toEqual([]);
  });
});
