import { EntityStore, NatureRules } from './entities';
import { SpatialIndex } from './navigation';
import { TileFlag, type ChunkStore } from './world';

export interface ArrowProjectile {
  readonly id: number;
  readonly actor: number;
  readonly scene: number;
  x: number;
  y: number;
  readonly vx: number;
  readonly vy: number;
  readonly expiresAt: number;
  readonly power: number;
}
export interface ProjectileSnapshot {
  serial: number;
  arrows: ArrowProjectile[];
}

/** Fixed-tick swept point/circle collision; one arrow commits at most one hit. */
export class ProjectileSystem {
  private serial = 0;
  private readonly arrows = new Map<number, ArrowProjectile>();
  get size(): number {
    return this.arrows.size;
  }
  spawn(
    actor: number,
    scene: number,
    x: number,
    y: number,
    dx: number,
    dy: number,
    tick: number,
    power = 12,
  ): boolean {
    if (this.arrows.size >= 64) return false;
    if (![x, y, dx, dy, tick, power].every(Number.isFinite)) return false;
    const length = Math.hypot(dx, dy);
    if (length < 0.0001) return false;
    const id = ++this.serial;
    this.arrows.set(id, {
      id,
      actor,
      scene,
      x,
      y,
      vx: (dx / length) * 18,
      vy: (dy / length) * 18,
      expiresAt: tick + 20,
      power,
    });
    return true;
  }
  advance(
    tick: number,
    s: EntityStore,
    spatial: SpatialIndex,
    worldFor: (scene: number) => ChunkStore,
    hit: (actor: number, target: number, power: number, scene: number) => void,
  ): void {
    for (const arrow of this.arrows.values()) {
      const actor = s.slot(arrow.actor);
      if (tick >= arrow.expiresAt || actor === undefined) {
        this.arrows.delete(arrow.id);
        continue;
      }
      const dx = arrow.vx / 30,
        dy = arrow.vy / 30,
        world = worldFor(arrow.scene);
      const obstruction = sweptWall(world, arrow.x, arrow.y, dx, dy);
      let impact: { target: number; t: number } | undefined;
      const midX = arrow.x + dx / 2,
        midY = arrow.y + dy / 2,
        radius = Math.hypot(dx, dy) / 2 + 0.35;
      for (const target of spatial.query(midX, midY, radius, s.capacity, arrow.scene)) {
        if (Math.abs(s.x[target]! - midX) > radius || Math.abs(s.y[target]! - midY) > radius)
          continue;
        if (
          !NatureRules.canAttack(s, actor, target) ||
          s.scene[target] !== arrow.scene ||
          s.owner[target] === arrow.actor ||
          s.owner[actor] === s.id(target)
        )
          continue;
        const t = sweptCircle(arrow.x, arrow.y, dx, dy, s.x[target]!, s.y[target]!, 0.35);
        if (
          t !== null &&
          (obstruction === null || t < obstruction - 1e-9) &&
          (!impact || t < impact.t || (t === impact.t && s.id(target) < impact.target))
        )
          impact = { target: s.id(target), t };
      }
      if (impact) {
        this.arrows.delete(arrow.id);
        hit(arrow.actor, impact.target, arrow.power, arrow.scene);
      } else if (obstruction !== null) this.arrows.delete(arrow.id);
      else {
        arrow.x += dx;
        arrow.y += dy;
      }
    }
  }
  snapshot(): ProjectileSnapshot {
    return { serial: this.serial, arrows: [...this.arrows.values()].map((a) => ({ ...a })) };
  }
  restore(snapshot: ProjectileSnapshot): void {
    this.serial = snapshot.serial;
    this.arrows.clear();
    for (const a of snapshot.arrows) this.arrows.set(a.id, { ...a });
  }
}
/** Exact supercover grid traversal. A corner touch blocks when either adjacent cell is solid.
 * Fixed-speed arrows cross at most a few cells per tick; the world boundary bounds long rays. */
export function sweptWall(
  world: ChunkStore,
  x: number,
  y: number,
  dx: number,
  dy: number,
): number | null {
  const blocked = (cx: number, cy: number) =>
    !world.contains(cx + 0.5, cy + 0.5) ||
    (world.flags[world.index(cx, cy)]! & TileFlag.Solid) !== 0;
  let cx = Math.floor(x),
    cy = Math.floor(y);
  if (blocked(cx, cy)) return 0;
  const sx = Math.sign(dx),
    sy = Math.sign(dy),
    deltaX = dx === 0 ? Infinity : Math.abs(1 / dx),
    deltaY = dy === 0 ? Infinity : Math.abs(1 / dy);
  let nextX = dx > 0 ? (cx + 1 - x) / dx : dx < 0 ? (x - cx) / -dx : Infinity;
  let nextY = dy > 0 ? (cy + 1 - y) / dy : dy < 0 ? (y - cy) / -dy : Infinity;
  for (let step = 0; step < world.size * 2 + 4; step++) {
    const t = Math.min(nextX, nextY);
    if (t > 1) return null;
    if (Math.abs(nextX - nextY) < 1e-10) {
      if (blocked(cx + sx, cy) || blocked(cx, cy + sy)) return t;
      cx += sx;
      cy += sy;
      nextX += deltaX;
      nextY += deltaY;
    } else if (nextX < nextY) {
      cx += sx;
      nextX += deltaX;
    } else {
      cy += sy;
      nextY += deltaY;
    }
    if (blocked(cx, cy)) return t;
  }
  return 0;
}
export function sweptCircle(
  x: number,
  y: number,
  dx: number,
  dy: number,
  cx: number,
  cy: number,
  radius: number,
): number | null {
  const ox = x - cx,
    oy = y - cy,
    c = ox * ox + oy * oy - radius * radius;
  if (c <= 0) return 0;
  const a = dx * dx + dy * dy;
  if (a <= 0) return null;
  const b = 2 * (ox * dx + oy * dy),
    disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const t = (-b - Math.sqrt(disc)) / (2 * a);
  return t >= 0 && t <= 1 ? t : null;
}
