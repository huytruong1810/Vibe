import type { SpeciesId } from '../content/definitions';
import { clamp } from './values';

export interface Physique {
  readonly heightMeters: number;
  readonly massKg: number;
}
/** Authored balance defaults, not estimates of real animal biology. Height is standing body height. */
export const PHYSIQUES: Readonly<Record<SpeciesId, Physique>> = Object.freeze({
  human: { heightMeters: 1.7, massKg: 70 },
  ignicap: { heightMeters: 0.65, massKg: 12 },
  rivallie: { heightMeters: 0.65, massKg: 18 },
  zephyrit: { heightMeters: 0.8, massKg: 8 },
  mireling: { heightMeters: 0.55, massKg: 11 },
  cindermoth: { heightMeters: 0.4, massKg: 2 },
  steamshell: { heightMeters: 0.7, massKg: 48 },
  bramblefang: { heightMeters: 1.05, massKg: 78 },
  marshstalker: { heightMeters: 0.9, massKg: 44 },
});
export function validatePhysique(body: Physique): void {
  if (
    !Number.isFinite(body.heightMeters) ||
    !Number.isFinite(body.massKg) ||
    body.heightMeters < 0.1 ||
    body.heightMeters > 4 ||
    body.massKg < 0.2 ||
    body.massKg > 1000
  )
    throw new RangeError('Body height must be 0.1–4 m and mass 0.2–1000 kg.');
}
/** Baseline species stats already account for species size. Ratios avoid counting size twice. */
export class PhysiquePolicy {
  static movement(body: Physique, baseline: Physique): number {
    return clamp(
      Math.sqrt(body.heightMeters / baseline.heightMeters) /
        Math.cbrt(body.massKg / baseline.massKg),
      0.8,
      1.15,
    );
  }
  static attack(body: Physique, baseline: Physique): number {
    return clamp(
      (body.massKg / baseline.massKg) ** 0.2 * (body.heightMeters / baseline.heightMeters) ** 0.1,
      0.85,
      1.2,
    );
  }
  static defense(body: Physique, baseline: Physique): number {
    return clamp((body.massKg / baseline.massKg) ** 0.15, 0.9, 1.15);
  }
  static stride(body: Physique): number {
    return clamp(body.heightMeters * 0.88, 0.25, 2.5);
  }
  static impact(attacker: Physique, target: Physique, guarded: boolean): number {
    return clamp(1.5 * Math.sqrt(attacker.massKg / target.massKg), 0.3, 3) * (guarded ? 0.45 : 1);
  }
}
