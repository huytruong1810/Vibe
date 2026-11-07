import type { RenderSnapshot } from '../domain/contracts';
import type { Quality } from './quality';

export type AmbientParticleKind = 'petals' | 'mist' | 'fireflies' | 'leaves' | 'spores';

export interface AmbientParticle {
  readonly x: number;
  readonly y: number;
  readonly alpha: number;
  readonly kind: AmbientParticleKind;
  readonly radius: number;
  readonly color: number;
}

export interface ColorGradingState {
  readonly color: number;
  readonly alpha: number;
}

export interface PropLightSource {
  readonly propId: string;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly intensity: number;
}

const AMBIENT_COLORS: Readonly<Record<AmbientParticleKind, readonly number[]>> = {
  petals: [0xf4b6c2, 0xffe4e8, 0xffffff],
  leaves: [0xd97736, 0xcca01d, 0x9e472a],
  fireflies: [0xddff66, 0xe8ff88, 0xaaff55],
  mist: [0xbad0d9, 0xc8dbe3, 0xa8c2cc],
  spores: [0x70c1b3, 0x247ba0, 0xb2dbbf],
};

function pseudoRandom(seed: number, index: number): number {
  let x = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 0x100000000;
}

export class AmbientEmitterSystem {
  constructor(readonly maxParticles = 64) {}

  sample(
    frame: RenderSnapshot,
    seconds: number,
    quality: Quality,
    reducedMotion: boolean,
  ): readonly AmbientParticle[] {
    if (quality === 'low') return [];

    const capacity = quality === 'high' ? Math.min(this.maxParticles, 54) : 24;
    const particles: AmbientParticle[] = [];

    // Determine primary ambient kind
    const isNight = frame.hour >= 20 || frame.hour < 5;
    let kind: AmbientParticleKind = 'petals';
    if (isNight) {
      kind = 'fireflies';
    } else if (frame.season === 2) {
      kind = 'leaves';
    } else if (frame.weather.kind === 'rain') {
      kind = 'mist';
    } else if (frame.season === 0) {
      kind = 'petals';
    } else {
      kind = 'spores';
    }

    const colors = AMBIENT_COLORS[kind];
    const wind = reducedMotion ? 0 : (frame.weather.wind ?? 0.3);

    for (let i = 0; i < capacity; i++) {
      const seed = i * 1973 + frame.season * 31;
      const speedX =
        (15 + pseudoRandom(seed, 1) * 30) * (wind >= 0 ? 1 : -1) * Math.max(0.2, Math.abs(wind));
      const speedY =
        kind === 'fireflies' ? Math.sin(seconds + i) * 6 : 10 + pseudoRandom(seed, 2) * 20;

      const spawnX = (i * 137.5 + (reducedMotion ? 0 : seconds * speedX)) % 512;
      const spawnY = (i * 89.3 + (reducedMotion ? 0 : seconds * speedY)) % 512;

      const alphaPulse =
        kind === 'fireflies'
          ? Math.max(0.1, (Math.sin(seconds * 2.5 + i * 1.7) + 1) * 0.45)
          : Math.min(0.85, 0.4 + pseudoRandom(seed, 3) * 0.45);

      particles.push({
        x: Math.floor(((spawnX % 512) + 512) % 512),
        y: Math.floor(((spawnY % 512) + 512) % 512),
        alpha: Math.round(alphaPulse * 100) / 100,
        kind,
        radius: kind === 'fireflies' ? 1.5 : kind === 'mist' ? 3.5 : 2.0,
        color: colors[i % colors.length]!,
      });
    }

    return particles;
  }
}

export function calculateFoliageSway(
  x: number,
  y: number,
  timeSeconds: number,
  windStrength: number,
): number {
  if (windStrength === 0) return 0;
  const phase = timeSeconds * 2.2 + x * 0.45 + y * 0.3;
  const raw = Math.sin(phase) * windStrength * 2.0;
  return Math.max(-2.5, Math.min(2.5, Math.round(raw * 100) / 100));
}

export function evaluateColorGrading(hour: number, weatherKind?: string): ColorGradingState {
  const normHour = ((hour % 24) + 24) % 24;

  // 1. Dawn: 05:00 - 07:30
  if (normHour >= 5.0 && normHour < 7.5) {
    const progress = (normHour - 5.0) / 2.5;
    // Peak at midpoint (~06:15)
    const curve = Math.sin(progress * Math.PI);
    const alpha = Math.round(curve * 0.22 * 100) / 100;
    return { color: 0x3e2430, alpha: Math.max(0.06, alpha) };
  }

  // 2. Midday: 07:30 - 17:00
  if (normHour >= 7.5 && normHour < 17.0) {
    const isOvercast = weatherKind === 'rain';
    if (isOvercast) {
      return { color: 0x203040, alpha: 0.16 };
    }
    return { color: 0x000000, alpha: 0 };
  }

  // 3. Dusk: 17:00 - 20:00
  if (normHour >= 17.0 && normHour < 20.0) {
    const progress = (normHour - 17.0) / 3.0;
    const curve = Math.sin(progress * Math.PI);
    const alpha = Math.round((0.12 + curve * 0.18) * 100) / 100;
    return { color: 0x381d28, alpha };
  }

  // 4. Night: 20:00 - 05:00
  const nightCenterDist = normHour >= 20.0 ? (normHour - 20.0) / 4.0 : (4.0 - normHour) / 4.0;
  const alpha = Math.min(0.46, Math.max(0.28, 0.36 + nightCenterDist * 0.08));
  return { color: 0x0f2434, alpha: Math.round(alpha * 100) / 100 };
}

export function findPropLightSources(
  props: readonly { id: string; contentId?: string; propId?: string; x: number; y: number }[],
): readonly PropLightSource[] {
  const sources: PropLightSource[] = [];
  for (const prop of props) {
    const key = prop.contentId ?? prop.propId ?? '';
    if (key.includes('hearth')) {
      sources.push({ propId: key, x: prop.x, y: prop.y, radius: 28, intensity: 0.85 });
    } else if (key.includes('lantern')) {
      sources.push({ propId: key, x: prop.x, y: prop.y, radius: 22, intensity: 0.75 });
    } else if (key.includes('waystone') || key.includes('shrine')) {
      sources.push({ propId: key, x: prop.x, y: prop.y, radius: 24, intensity: 0.65 });
    } else if (key.includes('bell-post') || key.includes('torch')) {
      sources.push({ propId: key, x: prop.x, y: prop.y, radius: 18, intensity: 0.6 });
    }
  }
  return sources;
}
