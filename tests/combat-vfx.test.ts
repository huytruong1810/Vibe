import { describe, it, expect } from 'vitest';
import {
  EffectDirector,
  getCombatVfxRecipe,
  type VfxShape,
} from '../src/presentation/effects';
import type { ElementType } from '../src/domain/presentation-contract';

describe('CMB-M6 Parametric Pixel Particle VFX System', () => {
  it('generates deterministic effect recipes mapped to elemental shape language (ART-6.4, ART-12.1)', () => {
    // Water -> circle shape, teal/cyan/white ramp
    const waterRecipe = getCombatVfxRecipe('water_pulse', 'water', 12, 1, 0);
    expect(waterRecipe.shape).toBe<VfxShape>('circle');
    expect(waterRecipe.element).toBe<ElementType>('water');
    expect(waterRecipe.ramp).toEqual([0x2a9d8f, 0x48cae4, 0xfbf3e0]);
    expect(waterRecipe.particleCount).toBeGreaterThanOrEqual(4);
    expect(waterRecipe.particleCount).toBeLessThanOrEqual(16);

    // Fire -> triangle shape, yellow/orange/red ramp
    const fireRecipe = getCombatVfxRecipe('flame_burst', 'fire', 15, 0, 1);
    expect(fireRecipe.shape).toBe<VfxShape>('triangle');
    expect(fireRecipe.element).toBe<ElementType>('fire');
    expect(fireRecipe.ramp).toEqual([0xfff3b0, 0xf4a261, 0xe05338]);

    // Wind (air) -> crescent shape, mint/white ramp
    const windRecipe = getCombatVfxRecipe('gale_slash', 'air', 10, -1, 0);
    expect(windRecipe.shape).toBe<VfxShape>('crescent');
    expect(windRecipe.element).toBe<ElementType>('air');
    expect(windRecipe.ramp).toEqual([0x90e0ef, 0xcaf0f8, 0xfbf3e0]);

    // Earth -> loam shape, brown/green ramp
    const earthRecipe = getCombatVfxRecipe('rock_toss', 'earth', 8, 0, -1);
    expect(earthRecipe.shape).toBe<VfxShape>('loam');
    expect(earthRecipe.element).toBe<ElementType>('earth');
    expect(earthRecipe.ramp).toEqual([0x8d5b4c, 0xa7c957, 0x582f0e]);

    // Physical -> spark shape, gold/white ramp
    const physRecipe = getCombatVfxRecipe('strike_finisher', 'physical', 20, 1, 1);
    expect(physRecipe.shape).toBe<VfxShape>('spark');
    expect(physRecipe.element).toBe<ElementType>('physical');
    expect(physRecipe.ramp).toEqual([0xe8c170, 0xffffff]);
    expect(physRecipe.hasTrail).toBe(true); // High power attacks leave trails
  });

  it('scales particle counts and velocities monotonically with move power within validated bounds', () => {
    const light = getCombatVfxRecipe('light_jab', 'physical', 4);
    const mid = getCombatVfxRecipe('heavy_strike', 'physical', 12);
    const heavy = getCombatVfxRecipe('mega_finisher', 'physical', 24);

    expect(light.particleCount).toBeLessThanOrEqual(mid.particleCount);
    expect(mid.particleCount).toBeLessThanOrEqual(heavy.particleCount);
    expect(light.speedMax).toBeLessThanOrEqual(heavy.speedMax);

    // Bounded between [4, 16] particles
    expect(light.particleCount).toBeGreaterThanOrEqual(4);
    expect(heavy.particleCount).toBeLessThanOrEqual(16);
  });

  it('snaps all sampled particle positions to the integer art pixel grid (ART-1.1, ART-12.2)', () => {
    const director = new EffectDirector();
    const recipe = getCombatVfxRecipe('aqua_jet', 'water', 14, 1, 0);

    director.emitParametricVfx({
      id: 'vfx:test:1',
      sceneId: 'test-scene',
      tick: 10,
      origin: { x: 42.7, y: 19.3 }, // Non-integer world projection
      recipe,
    });

    const particles = director.sample('test-scene', 12, false, false);
    expect(particles.length).toBeGreaterThan(0);

    for (const p of particles) {
      expect(Number.isInteger(p.x), `Particle x was not snapped: ${p.x}`).toBe(true);
      expect(Number.isInteger(p.y), `Particle y was not snapped: ${p.y}`).toBe(true);
      expect(p.shape).toBe('circle');
      expect(recipe.ramp).toContain(p.color);
    }
  });

  it('respects quality and reduced motion constraints without breaking essential hits', () => {
    const director = new EffectDirector();
    const recipe = getCombatVfxRecipe('blaze', 'fire', 16, 0, 1);

    director.emitParametricVfx({
      id: 'vfx:test:essential',
      sceneId: 'test-scene',
      tick: 20,
      origin: { x: 50, y: 50 },
      recipe,
      essential: true,
    });

    director.emitParametricVfx({
      id: 'vfx:test:nonessential',
      sceneId: 'test-scene',
      tick: 20,
      origin: { x: 50, y: 50 },
      recipe,
      essential: false,
    });

    // On low quality, non-essential particles are filtered out
    const lowQualityParticles = director.sample('test-scene', 22, false, true);
    expect(lowQualityParticles.length).toBe(recipe.particleCount); // Only essential emission sampled

    // On reduced motion, particles stay closer to origin (no excessive velocity travel)
    const reducedMotionParticles = director.sample('test-scene', 22, true, false);
    for (const p of reducedMotionParticles) {
      const dist = Math.hypot(p.x - 50, p.y - 50);
      expect(dist).toBeLessThan(12); // Clamped travel distance
    }
  });
});
