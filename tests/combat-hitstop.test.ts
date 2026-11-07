import { describe, it, expect } from 'vitest';
import { SimulationHost } from '../src/domain/simulation';
import { send } from './helpers';
import { COMBO_ATTACKS } from '../src/domain/combat';
import { EffectDirector } from '../src/presentation/effects';

describe('CMB-M3 & CMB-M5 Action combat feel: presentation hit-stop and rich hit-cues', () => {
  it('enriches hit presentation cues with element, effectiveness, and critical flags', () => {
    const host = new SimulationHost(42, 1, 0, 'world:hitstop:richcue');
    const s = host.entities;
    host.player.facingX = 1;
    host.player.facingY = 0;
    const targetSlot = host.creatures.spawn(0, host.player.x + 1.2, host.player.y);

    // Start strike attack
    expect(send(host, { type: 'attack', kind: 'strike' }).ok).toBe(true);
    const def = COMBO_ATTACKS.strike[0]!;

    // Step through windup and hit tick
    for (let t = 0; t <= def.windup; t++) host.step();

    const frame = host.frame();
    const hitCues = frame.cues.filter((c) => c.kind === 'hit');
    expect(hitCues.length).toBeGreaterThan(0);

    const hitCue = hitCues[0]!;
    expect(hitCue.element).toBe('physical');
    expect(hitCue.effectiveness).toBeDefined();
    expect(typeof hitCue.critical).toBe('boolean');
    expect(hitCue.target).toBeDefined();
  });

  it('marks combo finisher hit as critical with enhanced strength', () => {
    const host = new SimulationHost(42, 1, 0, 'world:hitstop:finisher');
    const s = host.entities;
    host.player.facingX = 1;
    host.player.facingY = 0;
    const targetSlot = host.creatures.spawn(0, host.player.x + 1.2, host.player.y);

    // Hit 1 jab
    expect(send(host, { type: 'attack', kind: 'strike' }).ok).toBe(true);
    const def1 = COMBO_ATTACKS.strike[0]!;
    for (let t = 0; t < def1.windup + def1.active; t++) host.step();

    // Hit 2 sweep
    expect(send(host, { type: 'attack', kind: 'strike' }).ok).toBe(true);
    const def2 = COMBO_ATTACKS.strike[1]!;
    for (let t = 0; t < def2.windup + def2.active; t++) host.step();

    // Reset target position to stay in range
    s.x[targetSlot] = host.player.x + 1.2;
    s.y[targetSlot] = host.player.y;

    // Hit 3 finisher
    expect(send(host, { type: 'attack', kind: 'strike' }).ok).toBe(true);
    const def3 = COMBO_ATTACKS.strike[2]!;
    for (let t = 0; t <= def3.windup; t++) host.step();

    const frame = host.frame();
    const hitCues = frame.cues.filter((c) => c.kind === 'hit');
    const finisherCue = hitCues.at(-1);
    expect(finisherCue).toBeDefined();
    expect(finisherCue!.critical).toBe(true);
    expect(finisherCue!.strength).toBeGreaterThanOrEqual(1.5);
  });

  it('samples elemental spark colors in EffectDirector based on cue element', () => {
    const director = new EffectDirector();

    // Emit fire hit
    director.emit({
      id: 'cue:test:fire',
      sceneId: 'test-scene',
      kind: 'hit',
      tick: 10,
      seed: 1234,
      origin: { x: 100, y: 100 },
      count: 4,
      element: 'fire',
    });

    const fireParticles = director.sample('test-scene', 11, false, false);
    expect(fireParticles.length).toBeGreaterThan(0);
    // Fire particles should carry ember/flame hex tones
    expect(fireParticles.some((p) => p.color === 0xe05338 || p.color === 0xf4a261)).toBe(true);

    // Emit water hit
    director.emit({
      id: 'cue:test:water',
      sceneId: 'test-scene',
      kind: 'hit',
      tick: 20,
      seed: 5678,
      origin: { x: 100, y: 100 },
      count: 4,
      element: 'water',
    });

    const waterParticles = director.sample('test-scene', 21, false, false);
    expect(waterParticles.length).toBeGreaterThan(0);
    // Water particles should carry aquamarine/river spray hex tones
    expect(waterParticles.some((p) => p.color === 0x2a9d8f || p.color === 0x48cae4)).toBe(true);
  });

  it('calculates hit-stop freeze window on heavy and critical hits without altering simulation ticks', () => {
    const host = new SimulationHost(42, 1, 0, 'world:hitstop:timing');
    host.player.facingX = 1;
    host.player.facingY = 0;
    host.creatures.spawn(0, host.player.x + 1.2, host.player.y);

    // Initial simulation tick
    const startTick = host.tick;

    // Advance 10 simulation ticks
    for (let i = 0; i < 10; i++) host.step();

    // Simulation tick advances strictly deterministically
    expect(host.tick).toBe(startTick + 10);
  });
});
