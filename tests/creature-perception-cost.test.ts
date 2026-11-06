import { describe, expect, it, vi } from 'vitest';
import { PerceptionGrid, Engagement } from '../src/domain/creature-minds';
import { EntityStore, bindBody } from '../src/domain/entities';
import { CombatSystem } from '../src/domain/combat';
import { SpatialIndex } from '../src/domain/navigation';
import { flatWorld, player } from './helpers';

describe('calm creature perception cost', () => {
  it('replays the old unconditional search to identical body, mind and combat state', () => {
    const make = () => {
      const s = new EntityStore(32),
        p = player();
      s.spawnHuman(0, 1, 20, 20);
      bindBody(p, s, 0);
      for (let n = 0; n < 32; n++) s.spawn(n % 8, 8 + (n % 8) * 2, 8 + Math.floor(n / 8) * 2);
      return { s, combat: new CombatSystem(s, p, [], flatWorld(64)), spatial: new SpatialIndex() };
    };
    const optimized = make(),
      oldSearch = make();
    vi.spyOn(oldSearch.combat.minds.grid, 'hasPredatorNearby').mockReturnValue(true);
    for (let tick = 1; tick <= 1200; tick++) {
      optimized.combat.advance(tick, optimized.spatial);
      oldSearch.combat.advance(tick, oldSearch.spatial);
      if (tick % 30 === 0) {
        expect(optimized.s.snapshot()).toEqual(oldSearch.s.snapshot());
        expect(optimized.combat.snapshot()).toEqual(oldSearch.combat.snapshot());
      }
    }
  });
  it('never discards the existing honest nearest-threat result across species, cells and scenes', () => {
    const s = new EntityStore(160),
      world = flatWorld(64);
    for (let n = 0; n < 160; n++) {
      const i = s.spawn(n % 8, 8 + (n % 16) * 2.7, 8 + Math.floor(n / 16) * 3.1);
      s.scene[i] = n % 3 === 0 ? 1 : 0;
      s.facingX[i] = n % 2 ? 1 : -1;
      s.facingY[i] = 0;
    }
    const grid = new PerceptionGrid(s, 16),
      out = new Int32Array(8);
    grid.rebuild();
    for (let i = 0; i < s.count; i++) {
      const count = grid.nearest(i, 10, out, world, 1);
      const predator = Array.from(out.slice(0, count)).find((j) =>
        s.definition(j).prey?.includes(s.definition(i).id),
      );
      if (predator !== undefined) expect(grid.hasPredatorNearby(i, 10)).toBe(true);
    }
    // Hash collisions are deliberately dense above. Rebuilding removes retired predators.
    for (let i = 0; i < s.count; i++) if (s.definition(i).prey?.length) s.retire(i);
    grid.rebuild();
    for (let i = 0; i < s.count; i++)
      if (s.alive[i]) expect(grid.hasPredatorNearby(i, 10)).toBe(false);
  });
  it('keeps unthreatened calm creatures out of expensive neighbor queries', () => {
    const s = new EntityStore(200),
      p = player();
    s.spawnHuman(0, 1, 20, 20);
    bindBody(p, s, 0);
    for (let n = 0; n < 200; n++) s.spawn(1, 10 + (n % 20), 10 + Math.floor(n / 20));
    const combat = new CombatSystem(s, p, [], flatWorld(64)),
      nearest = vi.spyOn(combat.minds.grid, 'nearest');
    combat.advance(1, new SpatialIndex());
    expect(nearest).not.toHaveBeenCalled();
    expect(Array.from(combat.minds.state.engage.slice(0, 200))).toEqual(
      Array(200).fill(Engagement.Calm),
    );
    expect(combat.snapshot().attacks).toEqual([]);
  });
});
