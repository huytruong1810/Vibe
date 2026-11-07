import type { SpeciesId } from './definitions';
export interface Tactics {
  aggression: number;
  caution: number;
  packness: number;
  flankBias: number;
  kiteRange: number;
  guardBias: number;
  elementBias: number;
  fleeAt: number;
  notice: number;
  separation: number;
  alignment: number;
  cohesion: number;
}
function tactics(
  a: number,
  c: number,
  p: number,
  f: number,
  k: number,
  g: number,
  e: number,
  hp: number,
  notice: number,
): Tactics {
  return {
    aggression: a,
    caution: c,
    packness: p,
    flankBias: f,
    kiteRange: k,
    guardBias: g,
    elementBias: e,
    fleeAt: hp,
    notice,
    separation: 0.7 + c * 0.2,
    alignment: p * 0.1,
    cohesion: p * 0.06,
  };
}
export const CREATURE_TACTICS: Readonly<Record<Exclude<SpeciesId, 'human'>, Tactics>> = {
  rivallie: tactics(0.4, 0.6, 0.3, 0.2, 0, 0.3, 0.5, 0.3, 8),
  bramblefang: tactics(0.8, 0.2, 0.9, 0.9, 0, 0.1, 0.2, 0.2, 10),
  marshstalker: tactics(0.7, 0.4, 0.3, 0.5, 0, 0.2, 0.3, 0.25, 8),
  mireling: tactics(0.3, 0.3, 0.4, 0.1, 0, 0.8, 0.4, 0.1, 6),
  steamshell: tactics(0.4, 0.3, 0.2, 0, 0, 0.9, 0.6, 0.1, 7),
  zephyrit: tactics(0.5, 0.5, 0.6, 0.4, 2.5, 0.1, 0.4, 0.35, 10),
  cindermoth: tactics(0.4, 0.5, 0.4, 0.2, 3.5, 0.1, 0.8, 0.35, 10),
  ignicap: tactics(0.2, 0.7, 0.3, 0, 0, 0.4, 0.6, 0.5, 6),
};
