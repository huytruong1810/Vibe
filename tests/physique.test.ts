import { describe, expect, it } from 'vitest';
import { EntityStore } from '../src/domain/entities';
import { PHYSIQUES, PhysiquePolicy } from '../src/domain/physique';
import { SimulationHost } from '../src/domain/simulation';
import { migrateSave } from '../src/domain/save-schema';
import { CameraShake, FootprintTrail } from '../src/presentation/motion-feedback';
import type { ActorPresentation } from '../src/domain/presentation-contract';
import { send } from './helpers';

describe('durable physique and bounded motion', () => {
  it('preserves species balance at authored defaults and bounds extreme builds', () => {
    for (const body of Object.values(PHYSIQUES)) {
      expect(PhysiquePolicy.movement(body, body)).toBe(1);
      expect(PhysiquePolicy.attack(body, body)).toBe(1);
      expect(PhysiquePolicy.defense(body, body)).toBe(1);
    }
    const small = { heightMeters: 0.1, massKg: 0.2 },
      large = { heightMeters: 4, massKg: 1000 };
    for (const body of [small, large]) {
      expect(PhysiquePolicy.movement(body, PHYSIQUES.human)).toBeGreaterThanOrEqual(0.8);
      expect(PhysiquePolicy.movement(body, PHYSIQUES.human)).toBeLessThanOrEqual(1.15);
      expect(PhysiquePolicy.attack(body, PHYSIQUES.human)).toBeLessThanOrEqual(1.2);
      expect(PhysiquePolicy.defense(body, PHYSIQUES.human)).toBeGreaterThanOrEqual(0.9);
    }
    expect(PhysiquePolicy.impact(large, small, false)).toBeGreaterThan(
      PhysiquePolicy.impact(small, large, false),
    );
    expect(PhysiquePolicy.impact(large, small, true)).toBeLessThan(
      PhysiquePolicy.impact(large, small, false),
    );
  });
  it('rejects invalid bodies and preserves earned XP and maximum HP', () => {
    const s = new EntityStore(8),
      i = s.spawnHuman(0, 1, 5, 5);
    s.experience[i] = 250;
    const hp = s.maxHp(i);
    s.setPhysique(i, { heightMeters: 1.9, massKg: 92 });
    expect(s.maxHp(i)).toBe(hp);
    expect(s.experience[i]).toBe(250);
    expect(() => s.setPhysique(i, { heightMeters: NaN, massKg: 70 })).toThrow();
    expect(() => s.setPhysique(i, { heightMeters: 1.7, massKg: 0 })).toThrow();
  });
  it('connects actual movement to physique and restores durable traits and recoil', () => {
    const normal = new SimulationHost(42, 1, 0),
      heavy = new SimulationHost(42, 1, 0);
    const slot = heavy.entities.require(0);
    heavy.entities.setPhysique(slot, { heightMeters: 1.7, massKg: 140 });
    const start = normal.player.x;
    send(normal, { type: 'move', x: 1, y: 0 });
    send(heavy, { type: 'move', x: 1, y: 0 });
    normal.advance(10);
    heavy.advance(10);
    expect(heavy.player.x - start).toBeLessThan(normal.player.x - start);
    heavy.entities.recoilX[slot] = 1.2;
    const restored = new SimulationHost(42, 1, 0);
    restored.restore(migrateSave(heavy.snapshot()));
    expect(restored.entities.massKg[restored.entities.require(0)]).toBe(140);
    expect(restored.entities.recoilX[restored.entities.require(0)]).toBeCloseTo(1.2);
    const bad = heavy.snapshot();
    bad.entities.records.find((r) => r.id === 0)!.massKg = -1;
    expect(() => migrateSave(bad)).toThrow();
    const {
      artifacts: _artifacts,
      placements: _placements,
      artifactSequence: _serial,
      ...v4
    } = structuredClone(heavy.snapshot());
    const old = { ...v4, version: 4 } as unknown as {
      entities: { records: Record<string, unknown>[] };
    };
    for (const body of old.entities.records) {
      delete body.massKg;
      delete body.heightMeters;
      delete body.recoilX;
      delete body.recoilY;
    }
    expect(migrateSave(old).entities.records.every((r) => r.massKg > 0 && r.heightMeters > 0)).toBe(
      true,
    );
  });
});

const actor = (distance: number, discontinuity = 0): ActorPresentation => ({
  id: 0,
  appearanceKind: 'origin',
  appearanceId: 'aqualia',
  x: 5,
  y: 5,
  elevation: 0,
  facingX: 1,
  facingY: 0,
  pose: 'walk',
  protected: true,
  action: null,
  physique: { ...PHYSIQUES.human, strideTiles: 1.5, grounded: true },
  locomotion: { gait: 'walk', distance, discontinuity },
});
describe('cosmetic motion feedback', () => {
  it('bounds shake, freezes at a fixed tick and disables it for reduced motion', () => {
    const shake = new CameraShake();
    for (let i = 0; i < 20; i++) shake.add(10, 100, i);
    const first = shake.sample(11, false);
    expect(shake.sample(11, false)).toEqual(first);
    expect(Math.abs(first.x)).toBeLessThanOrEqual(6);
    expect(Math.abs(first.y)).toBeLessThanOrEqual(4);
    expect(shake.sample(11, true)).toEqual({ x: 0, y: 0 });
    expect(shake.sample(20, false)).toEqual({ x: 0, y: 0 });
    shake.reset();
    expect(shake.sample(0, false)).toEqual({ x: 0, y: 0 });
  });
  it('creates bounded contacts from movement and ignores pauses, teleports, hard ground and fliers', () => {
    const trail = new FootprintTrail();
    trail.observe(actor(0), 0, true);
    trail.observe(actor(0.8), 1, true);
    expect(trail.marks).toHaveLength(1);
    trail.observe(actor(0.8), 1, true);
    expect(trail.marks).toHaveLength(1);
    trail.observe(actor(20, 1), 2, true);
    expect(trail.marks).toHaveLength(1);
    trail.observe(actor(21, 1), 3, false);
    expect(trail.marks).toHaveLength(1);
    const flier = { ...actor(22, 1), physique: { ...actor(22, 1).physique!, grounded: false } };
    trail.observe(flier, 4, true);
    expect(trail.marks).toHaveLength(1);
    for (let i = 23; i < 400; i++) trail.observe(actor(i, 1), i, true);
    expect(trail.marks.length).toBeLessThanOrEqual(192);
    trail.prune(1000, new Set());
    expect(trail.marks).toHaveLength(0);
  });
});
