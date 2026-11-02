import type { AttackTelegraph } from '../domain/presentation-contract';

export const evenPixel = (value: number): number => Math.round(value / 2) * 2;
/** Conservative reserved area includes the arc/glint and its thick outline. */
export function telegraphBounds(cue: AttackTelegraph, x: number, y: number, tilePixels: number) {
  const radius = evenPixel(cue.range * tilePixels);
  return {
    x: evenPixel(x) - radius - 8,
    y: evenPixel(y) - radius - 8,
    width: radius * 2 + 16,
    height: radius * 2 + 16,
  };
}
