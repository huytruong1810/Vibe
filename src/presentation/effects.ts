import type { ElementType, ProjectilePresentation } from '../domain/presentation-contract';
import type { PixelPoint } from './compositor';

export type EffectKind =
  | 'hit'
  | 'gather'
  | 'craft'
  | 'care'
  | 'defeat'
  | 'recover'
  | 'projectile'
  | 'attack';

export type VfxShape = 'circle' | 'triangle' | 'crescent' | 'loam' | 'spark';
export type EmitterPattern = 'point' | 'slash_arc' | 'cone' | 'radial';

/**
 * Parametric move effect recipe (CMB-9, CMB-M6).
 * Expresses elemental shape language per ART-6.4 and palette ramps per ART-12.1.
 */
export interface CombatVfxRecipe {
  readonly moveId: string;
  readonly element: ElementType;
  readonly shape: VfxShape;
  readonly ramp: readonly number[];
  readonly emitter: EmitterPattern;
  readonly particleCount: number;
  readonly spreadRad: number;
  readonly speedMin: number;
  readonly speedMax: number;
  readonly lifetimeTicks: number;
  readonly hasTrail: boolean;
  readonly impactBurstCount: number;
}

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
  readonly element?: ElementType;
}

export interface ParametricVfxEmission {
  readonly id: string;
  readonly sceneId: string;
  readonly tick: number;
  readonly origin: PixelPoint;
  readonly recipe: CombatVfxRecipe;
  readonly facingX?: number;
  readonly facingY?: number;
  readonly essential?: boolean;
}

export interface EffectParticle extends PixelPoint {
  readonly alpha: number;
  readonly kind: EffectKind;
  readonly radius: number;
  readonly color?: number;
  readonly shape?: VfxShape;
}

/** Palette ramps per doctrine ART-12.1 */
export const ELEMENT_VFX_RAMPS: Readonly<Record<ElementType, readonly number[]>> = {
  water: [0x2a9d8f, 0x48cae4, 0xfbf3e0], // teal -> cyan -> white foam
  fire: [0xfff3b0, 0xf4a261, 0xe05338], // yellow core -> orange -> red edge
  air: [0x90e0ef, 0xcaf0f8, 0xfbf3e0], // pale mint and white crescents
  earth: [0x8d5b4c, 0xa7c957, 0x582f0e], // loam brown -> moss green
  physical: [0xe8c170, 0xffffff], // golden amber -> warm white
};

/** Shape language by element per doctrine ART-6.4 */
export const ELEMENT_SHAPES: Readonly<Record<ElementType, VfxShape>> = {
  water: 'circle',
  fire: 'triangle',
  air: 'crescent',
  earth: 'loam',
  physical: 'spark',
};

export const ELEMENT_PARTICLE_COLORS = ELEMENT_VFX_RAMPS;

export function effectSeed(id: string): number {
  let seed = 2166136261;
  for (let i = 0; i < id.length; i++) {
    seed ^= id.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

/**
 * Computes deterministic move effect recipe derived from move stats and ID (CMB-9).
 */
export function getCombatVfxRecipe(
  moveId: string,
  element: ElementType = 'physical',
  power = 10,
  _facingX = 1,
  _facingY = 0,
): CombatVfxRecipe {
  const shape = ELEMENT_SHAPES[element] ?? 'spark';
  const ramp = ELEMENT_VFX_RAMPS[element] ?? ELEMENT_VFX_RAMPS.physical;

  // Particle count scales monotonically with move power [4, 16]
  const countRaw = Math.floor(4 + (Math.max(1, power) - 4) * 0.55);
  const particleCount = Math.max(4, Math.min(16, countRaw));

  let emitter: EmitterPattern = 'point';
  let spreadRad = Math.PI / 4;
  if (moveId.includes('slash') || moveId.includes('strike') || moveId.includes('sweep')) {
    emitter = 'slash_arc';
    spreadRad = Math.PI / 2.5;
  } else if (moveId.includes('finisher') || moveId.includes('burst') || power >= 18) {
    emitter = 'radial';
    spreadRad = Math.PI * 2;
  } else if (moveId.includes('shot') || moveId.includes('thrust') || moveId.includes('pulse')) {
    emitter = 'cone';
    spreadRad = Math.PI / 4;
  }

  const speedMin = 1.0 + Math.min(1.0, power * 0.05);
  const speedMax = 1.8 + Math.min(1.6, power * 0.08);
  const lifetimeTicks = Math.max(8, Math.min(16, Math.floor(8 + power * 0.35)));
  const hasTrail = power >= 14;
  const impactBurstCount = Math.max(3, Math.min(12, Math.floor(particleCount * 0.75)));

  return {
    moveId,
    element,
    shape,
    ramp,
    emitter,
    particleCount,
    spreadRad,
    speedMin,
    speedMax,
    lifetimeTicks,
    hasTrail,
    impactBurstCount,
  };
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
  private readonly parametricEmissions: ParametricVfxEmission[] = [];
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

  emitParametricVfx(emission: ParametricVfxEmission): void {
    if (this.seen.has(emission.id)) return;
    this.seen.set(emission.id, emission.tick);
    if (this.seen.size > 256) this.seen.delete(this.seen.keys().next().value!);
    this.parametricEmissions.push(emission);
    if (this.parametricEmissions.length > 64) {
      this.parametricEmissions.shift();
    }
  }

  sample(
    sceneId: string,
    tick: number,
    reducedMotion: boolean,
    low: boolean,
  ): readonly EffectParticle[] {
    const particles: EffectParticle[] = [];

    // 1. Sample standard emissions (snapped to integer art grid)
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
          speed = (1 + random(emission.seed, n * 2 + 1) * 2) * (reducedMotion ? 0.4 : 1.0);
        const origin = emission.socket ?? emission.origin;
        const colors = emission.element ? ELEMENT_VFX_RAMPS[emission.element] : undefined;
        const color = colors ? colors[n % colors.length] : undefined;
        const shape = emission.element ? ELEMENT_SHAPES[emission.element] : 'spark';
        const dist = Math.min(reducedMotion ? 8 : 48, age * speed);

        particles.push({
          x: Math.round(origin.x + Math.cos(angle) * dist),
          y: Math.round(origin.y + Math.sin(angle) * dist + (reducedMotion ? 0 : age * age * 0.04)),
          alpha: 1 - age / 19,
          kind: emission.kind,
          radius: 2 + random(emission.seed, n + 80) * 2,
          color,
          shape,
        });
      }
    }

    // 2. Sample parametric move emissions (CMB-9, on integer art grid)
    for (let i = this.parametricEmissions.length - 1; i >= 0; i--) {
      const pEmission = this.parametricEmissions[i]!;
      const age = tick - pEmission.tick;
      const recipe = pEmission.recipe;
      if (age > recipe.lifetimeTicks) {
        this.parametricEmissions.splice(i, 1);
        continue;
      }
      if (
        age < 0 ||
        pEmission.sceneId !== sceneId ||
        (!pEmission.essential && low)
      ) {
        continue;
      }

      const seed = effectSeed(pEmission.id);
      const baseAngle = Math.atan2(pEmission.facingY ?? 0, pEmission.facingX ?? 1);

      for (let n = 0; n < recipe.particleCount; n++) {
        let angle = baseAngle;
        if (recipe.emitter === 'radial') {
          angle = (n / recipe.particleCount) * Math.PI * 2;
        } else if (recipe.emitter === 'slash_arc') {
          angle =
            baseAngle -
            recipe.spreadRad / 2 +
            (n / (recipe.particleCount - 1 || 1)) * recipe.spreadRad;
        } else {
          angle = baseAngle + (random(seed, n * 3) - 0.5) * recipe.spreadRad;
        }

        const baseSpeed =
          recipe.speedMin + random(seed, n * 3 + 1) * (recipe.speedMax - recipe.speedMin);
        const speed = reducedMotion ? baseSpeed * 0.35 : baseSpeed;
        const dist = reducedMotion ? Math.min(10, age * speed) : age * speed;

        const rawX = pEmission.origin.x + Math.cos(angle) * dist;
        const driftY =
          recipe.element === 'fire'
            ? -age * 0.8
            : recipe.element === 'air'
              ? Math.sin(age * 0.5) * 1.5
              : age * 0.05;
        const rawY = pEmission.origin.y + Math.sin(angle) * dist + (reducedMotion ? 0 : driftY);

        particles.push({
          x: Math.round(rawX),
          y: Math.round(rawY),
          alpha: Math.max(0, 1 - age / (recipe.lifetimeTicks + 1)),
          kind: 'attack',
          radius: 2 + (n % 2),
          color: recipe.ramp[n % recipe.ramp.length],
          shape: recipe.shape,
        });
      }
    }

    return particles;
  }

  reset(): void {
    this.emissions.length = 0;
    this.parametricEmissions.length = 0;
    this.seen.clear();
  }
}

export function visibleProjectiles(
  projectiles: readonly ProjectilePresentation[],
  sceneId: string,
): readonly ProjectilePresentation[] {
  return projectiles.filter((p) => p.sceneId === sceneId).slice(0, 128);
}

