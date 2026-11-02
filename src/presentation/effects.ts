import type { ProjectilePresentation } from '../domain/presentation-contract';
import type { PixelPoint } from './compositor';

export type EffectKind = 'hit' | 'gather' | 'craft' | 'care' | 'defeat' | 'recover' | 'projectile';
export interface EffectEmission {
  readonly id: string;
  readonly sceneId: string;
  readonly kind: EffectKind;
  readonly tick: number;
  readonly seed: number;
  readonly origin: PixelPoint;
  readonly socket?: PixelPoint;
  readonly count: number;
  readonly essential?: boolean;
}
export interface EffectParticle extends PixelPoint {
  readonly alpha: number;
  readonly kind: EffectKind;
  readonly radius: number;
}
const random = (seed: number, index: number): number => {
  let x = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 0x100000000;
};
/** Transient, seeded and bounded. Presentation cannot change projectile collision or damage. */
export class EffectDirector {
  private readonly emissions: EffectEmission[] = [];
  private readonly seen = new Map<string, number>();
  constructor(readonly capacity = 256) {}
  emit(emission: EffectEmission): void {
    if (this.seen.has(emission.id)) return;
    this.seen.set(emission.id, emission.tick);
    if (this.seen.size > 256) this.seen.delete(this.seen.keys().next().value!);
    const count = Math.max(
      0,
      Math.min(
        32,
        Math.floor(emission.count),
        this.capacity - this.emissions.reduce((n, e) => n + e.count, 0),
      ),
    );
    if (count > 0) this.emissions.push({ ...emission, count });
  }
  sample(
    sceneId: string,
    tick: number,
    reducedMotion: boolean,
    low: boolean,
  ): readonly EffectParticle[] {
    const particles: EffectParticle[] = [];
    for (let i = this.emissions.length - 1; i >= 0; i--) {
      const emission = this.emissions[i]!,
        age = tick - emission.tick;
      if (age > 18) {
        this.emissions.splice(i, 1);
        continue;
      }
      if (
        age < 0 ||
        emission.sceneId !== sceneId ||
        (!emission.essential && (reducedMotion || low))
      )
        continue;
      for (let n = 0; n < emission.count; n++) {
        const angle = random(emission.seed, n * 2) * Math.PI * 2,
          speed = 1 + random(emission.seed, n * 2 + 1) * 2;
        const origin = emission.socket ?? emission.origin;
        particles.push({
          x: origin.x + Math.cos(angle) * age * speed,
          y: origin.y + Math.sin(angle) * age * speed + age * age * 0.04,
          alpha: 1 - age / 19,
          kind: emission.kind,
          radius: 2 + random(emission.seed, n + 80) * 2,
        });
      }
    }
    return particles;
  }
  reset(): void {
    this.emissions.length = 0;
    this.seen.clear();
  }
}
export function visibleProjectiles(
  projectiles: readonly ProjectilePresentation[],
  sceneId: string,
): readonly ProjectilePresentation[] {
  return projectiles.filter((p) => p.sceneId === sceneId).slice(0, 128);
}
export function effectSeed(id: string): number {
  let seed = 2166136261;
  for (let i = 0; i < id.length; i++) {
    seed ^= id.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}
