/** Domain units are distinct at boundaries; hot loops use unboxed numbers. */
export type Brand<T, K extends string> = T & { readonly __brand: K };
export type EntityId = Brand<number, 'EntityId'>;
export type Tick = Brand<number, 'Tick'>;
export type AbsoluteDay = Brand<number, 'AbsoluteDay'>;
export type Need = Brand<number, 'Need'>;
export type Elevation = Brand<number, 'Elevation'>;
export type NpcId = `npc:${string}`;
export type SettlementId = `settlement:${string}`;
export type Element = 'fire' | 'water' | 'wind';
export interface WorldPosition {
  readonly x: number;
  readonly y: number;
  readonly scene?: number;
}
export interface TileCoordinate {
  readonly tx: number;
  readonly ty: number;
}
export interface DebugPath {
  readonly actor: string;
  readonly points: readonly WorldPosition[];
}
export const entityId = (value: number): EntityId => value as EntityId;
export const clamp = (value: number, min = 0, max = 1): number =>
  Math.max(min, Math.min(max, value));
export const distanceSquared = (a: WorldPosition, b: WorldPosition): number =>
  a.scene !== undefined && b.scene !== undefined && a.scene !== b.scene
    ? Infinity
    : (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export const normalize = (x: number, y: number): WorldPosition => {
  const length = Math.hypot(x, y);
  return length > 0.0001 ? { x: x / length, y: y / length } : { x: 0, y: 0 };
};
export function need(value: number): Need {
  if (!Number.isFinite(value) || value < 0 || value > 1)
    throw new RangeError('Need must be finite and in [0, 1]');
  return value as Need;
}

export const CONFIG = Object.freeze({
  worldSize: 512,
  chunkSize: 32,
  tickRate: 30,
  daySeconds: 1440,
  seasonDays: 7,
  detailedCreatures: 128,
  creatureCapacity: 2048,
  population: 1000,
  generatorVersion: 1,
  contentVersion: 3,
  saveVersion: 4,
  memoryLimit: 256,
  eventLimit: 128,
});
