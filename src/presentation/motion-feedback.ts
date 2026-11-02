import type { ActorPresentation } from '../domain/presentation-contract';

/** Presentation ticks only: no camera effect can change input, combat or simulation state. */
export class CameraShake {
  private impulses: { tick: number; strength: number; seed: number }[] = [];
  add(tick: number, strength: number, seed: number): void {
    this.impulses.push({ tick, strength: Math.max(0, Math.min(6, strength)), seed });
    if (this.impulses.length > 8) this.impulses.shift();
  }
  sample(tick: number, reducedMotion: boolean): { x: number; y: number } {
    this.impulses = this.impulses.filter((i) => tick - i.tick < 9);
    if (reducedMotion) return { x: 0, y: 0 };
    let x = 0,
      y = 0;
    for (const i of this.impulses) {
      const age = tick - i.tick;
      if (age < 0) continue;
      const amplitude = i.strength * (1 - age / 9) ** 2;
      x += Math.sin(age * 2.9 + i.seed) * amplitude;
      y += Math.cos(age * 3.7 + i.seed) * amplitude * 0.65;
    }
    return {
      x: Math.round(Math.max(-6, Math.min(6, x))),
      y: Math.round(Math.max(-4, Math.min(4, y))),
    };
  }
  reset(): void {
    this.impulses = [];
  }
}
export interface Footprint {
  readonly x: number;
  readonly y: number;
  readonly elevation: number;
  readonly tick: number;
  readonly size: number;
  readonly angle: number;
}
/** Bounded cosmetic decals; only confirmed distance can create a contact. */
export class FootprintTrail {
  readonly marks: Footprint[] = [];
  private readonly steps = new Map<
    number,
    { distance: number; discontinuity: number; foot: number }
  >();
  observe(actor: ActorPresentation, tick: number, softSurface: boolean): void {
    const motion = actor.locomotion,
      body = actor.physique;
    if (!motion || !body) return;
    const previous = this.steps.get(actor.id),
      step = Math.max(0.12, body.strideTiles / 2);
    const valid =
      previous &&
      previous.discontinuity === motion.discontinuity &&
      motion.distance >= previous.distance &&
      motion.distance - previous.distance < 4;
    if (!valid) {
      this.steps.set(actor.id, {
        distance: motion.distance,
        discontinuity: motion.discontinuity,
        foot: 0,
      });
      return;
    }
    if (motion.distance - previous.distance < step) return;
    previous.distance = motion.distance;
    previous.foot++;
    if (!softSurface || !body.grounded || !['walk', 'run'].includes(actor.pose)) return;
    const length = Math.hypot(actor.facingX, actor.facingY) || 1,
      side = previous.foot % 2 ? 1 : -1;
    this.marks.push({
      x: actor.x - (actor.facingY / length) * 0.09 * side,
      y: actor.y + (actor.facingX / length) * 0.09 * side,
      elevation: actor.elevation,
      tick,
      size: Math.max(2, Math.min(7, 3 * (body.massKg / 70) ** 0.25)),
      angle: Math.atan2(actor.facingY, actor.facingX),
    });
    if (this.marks.length > 192) this.marks.shift();
  }
  prune(tick: number, visible: ReadonlySet<number>): void {
    while (this.marks[0] && tick - this.marks[0].tick > 180) this.marks.shift();
    for (const id of this.steps.keys()) if (!visible.has(id)) this.steps.delete(id);
  }
  reset(): void {
    this.marks.length = 0;
    this.steps.clear();
  }
}
