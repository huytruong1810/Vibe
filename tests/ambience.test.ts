import { describe, it, expect } from 'vitest';
import {
  AmbientEmitterSystem,
  calculateFoliageSway,
  evaluateColorGrading,
  findPropLightSources,
} from '../src/presentation/ambience';
import type { RenderSnapshot } from '../src/domain/contracts';
import { SimulationHost } from '../src/domain/simulation';

function mockSnapshot(overrides: Partial<RenderSnapshot> = {}): RenderSnapshot {
  const host = new SimulationHost(42, 1, 0, 'world:test:ambience');
  const base = host.frame();
  return {
    ...base,
    ...overrides,
  };
}

describe('AMB-M1…AMB-M4 World Ambience, Wind Sway & Color Grading', () => {
  it('emits seasonal ambient particles with budget controls (AMB-M1, AMB-M4)', () => {
    const system = new AmbientEmitterSystem();
    const springFrame = mockSnapshot({ season: 0, hour: 12 });

    // High quality Spring produces petals
    const highParticles = system.sample(springFrame, 10.0, 'high', false);
    expect(highParticles.length).toBeGreaterThan(0);
    expect(highParticles.length).toBeLessThanOrEqual(64);
    expect(highParticles.some((p) => p.kind === 'petals')).toBe(true);

    // Low quality disables emitters (preserves performance budget)
    const lowParticles = system.sample(springFrame, 10.0, 'low', false);
    expect(lowParticles.length).toBe(0);

    // Medium quality emits fewer particles than high
    const medParticles = system.sample(springFrame, 10.0, 'medium', false);
    expect(medParticles.length).toBeGreaterThan(0);
    expect(medParticles.length).toBeLessThan(highParticles.length);

    // Autumn frame emits leaves
    const autumnFrame = mockSnapshot({ season: 2, hour: 14 });
    const autumnParticles = system.sample(autumnFrame, 10.0, 'high', false);
    expect(autumnParticles.some((p) => p.kind === 'leaves')).toBe(true);

    // Night frame emits fireflies
    const nightFrame = mockSnapshot({ hour: 23 });
    const nightParticles = system.sample(nightFrame, 10.0, 'high', false);
    expect(nightParticles.some((p) => p.kind === 'fireflies')).toBe(true);
  });

  it('calculates deterministic, bounded foliage wind sway (AMB-M2)', () => {
    // Zero wind produces zero sway
    expect(calculateFoliageSway(10, 15, 5.0, 0)).toBe(0);

    // Continuous sway at active wind
    const sway1 = calculateFoliageSway(10, 15, 1.0, 0.5);
    const sway2 = calculateFoliageSway(10, 15, 1.5, 0.5);
    expect(sway1).not.toBe(sway2);

    // Bounded within physical limits [-2.5, 2.5] pixels
    for (let t = 0; t < 20; t += 0.5) {
      const s = calculateFoliageSway(24, 32, t, 1.0);
      expect(Math.abs(s)).toBeLessThanOrEqual(2.5);
    }
  });

  it('evaluates smooth 4-phase color grading across the 24-hour cycle (AMB-M3, AMB-M4)', () => {
    // 1. Dawn (06:00): warm rosy tint
    const dawn = evaluateColorGrading(6.0, 'clear');
    expect(dawn.alpha).toBeGreaterThan(0.05);
    expect(dawn.alpha).toBeLessThanOrEqual(0.3);
    expect(dawn.color).toBe(0x3e2430);

    // 2. Midday (12:00): clear daylight, negligible tint
    const midday = evaluateColorGrading(12.0, 'clear');
    expect(midday.alpha).toBe(0);

    // 3. Dusk (18:30): golden amber / violet twilight tint
    const dusk = evaluateColorGrading(18.5, 'clear');
    expect(dusk.alpha).toBeGreaterThan(0.1);
    expect(dusk.alpha).toBeLessThanOrEqual(0.35);
    expect(dusk.color).toBe(0x381d28);

    // 4. Night (23:00): cool deep indigo moonlight
    const night = evaluateColorGrading(23.0, 'clear');
    expect(night.alpha).toBeGreaterThan(0.25);
    expect(night.alpha).toBeLessThanOrEqual(0.48);
    expect(night.color).toBe(0x0f2434);

    // Overcast weather (rain) increases darkness tint
    const rainyDay = evaluateColorGrading(12.0, 'rain');
    expect(rainyDay.alpha).toBeGreaterThan(0);
  });

  it('identifies outdoor props that emit additive light pools (AMB-M3)', () => {
    const props = [
      { id: 'prop:hearth_1', propId: 'env-prop-hearth', x: 20, y: 30 },
      { id: 'prop:lantern_1', propId: 'env-lantern-post', x: 25, y: 35 },
      { id: 'prop:waystone_1', propId: 'env-landmark-waystone', x: 50, y: 50 },
      { id: 'prop:crate_1', propId: 'env-crates-barrels', x: 10, y: 10 },
    ];

    const lights = findPropLightSources(props);
    expect(lights.length).toBe(3); // hearth, lantern, waystone (crates do not emit light)

    const hearth = lights.find((l) => l.propId === 'env-prop-hearth');
    expect(hearth).toBeDefined();
    expect(hearth!.radius).toBeGreaterThan(16);
    expect(hearth!.intensity).toBeGreaterThan(0.5);
  });
});
