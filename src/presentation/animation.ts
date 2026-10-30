import type { ActorPresentation, PresentationCue } from '../domain/presentation-contract';
import type { AnimationClip, AnimationState, Facing } from './assets/catalog';

const DIRECTIONS: readonly Facing[] = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'];
/** Interpolate between confirmed snapshots, never beyond the latest committed tick.
 * The small presentation delay permits all action frames at a 10 Hz packet rate. */
export class PresentationClock {
  private session = '';
  private from = 0;
  private to = 0;
  private received = 0;
  private seconds = 0;
  private paused = true;
  accept(session: string, tick: number, seconds: number, paused: boolean, now: number): void {
    const reset = session !== this.session || tick < this.to;
    this.from = reset || paused ? tick : this.to;
    this.to = tick;
    this.seconds = seconds;
    this.received = now;
    this.paused = paused;
    this.session = session;
  }
  sample(now: number): { tick: number; seconds: number } {
    const alpha = this.paused ? 1 : Math.max(0, Math.min(1, (now - this.received) / 100));
    const tick = this.from + (this.to - this.from) * alpha;
    return { tick, seconds: this.seconds - (this.to - tick) / 30 };
  }
  reset(): void {
    this.session = '';
    this.from = this.to = 0;
    this.paused = true;
  }
}
export function facingFor(x: number, y: number, previous: Facing = 's'): Facing {
  if (Math.hypot(x, y) < 0.0001) return previous;
  return DIRECTIONS[(Math.round(Math.atan2(y, x) / (Math.PI / 4)) + 8) % 8]!;
}
/** Priority is decided from committed state, never from dialogue text or sprite frames. */
export class PoseResolver {
  resolve(actor: ActorPresentation, hit = false): AnimationState {
    if (actor.pose === 'downed') return 'downed';
    if (hit) return 'hit';
    if (actor.action) return 'attack';
    return actor.pose;
  }
}
/** One instance per renderer; call once per visible actor, on the shared render clock.
 * Distance uses authoritative positions and combat uses absolute simulation ticks. */
export class AnimationController {
  private readonly actors = new Map<
    number,
    { clip: string; x: number; y: number; distance: number; start: number }
  >();
  frame(actor: ActorPresentation, clip: AnimationClip, tick: number): string {
    let state = this.actors.get(actor.id);
    if (!state || state.clip !== clip.id) {
      state = { clip: clip.id, x: actor.x, y: actor.y, distance: 0, start: tick };
      this.actors.set(actor.id, state);
    }
    // Teleports and restore corrections do not play many strides in a single frame.
    const delta = Math.hypot(actor.x - state.x, actor.y - state.y);
    if (delta < 4) state.distance += delta;
    state.x = actor.x;
    state.y = actor.y;
    let index = 0;
    if (clip.playback === 'combat' && actor.action && clip.phases) {
      const a = actor.action;
      const phase =
        tick < a.activeAt
          ? { range: clip.phases.windup, start: a.startedAt, end: a.activeAt }
          : tick < a.recoveryAt
            ? { range: clip.phases.active, start: a.activeAt, end: a.recoveryAt }
            : { range: clip.phases.recovery, start: a.recoveryAt, end: a.endsAt };
      const [from, to] = phase.range;
      index =
        from +
        Math.min(
          to - from - 1,
          Math.max(
            0,
            Math.floor(((tick - phase.start) / Math.max(1, phase.end - phase.start)) * (to - from)),
          ),
        );
    } else if (clip.playback === 'distance') {
      index =
        Math.floor((state.distance / clip.stride!) * clip.frameIds.length) % clip.frameIds.length;
    } else {
      const elapsed = Math.max(0, tick - state.start) / 30;
      const n = Math.floor(elapsed * clip.fps);
      index =
        clip.playback === 'once' ? Math.min(clip.frameIds.length - 1, n) : n % clip.frameIds.length;
    }
    return clip.frameIds[index]!;
  }
  retain(ids: ReadonlySet<number>): void {
    for (const id of this.actors.keys()) if (!ids.has(id)) this.actors.delete(id);
  }
  reset(): void {
    this.actors.clear();
  }
}
/** Bounded sequence high-water mark prevents replay when a snapshot repeats cues. */
export class PresentationCueReader {
  private session = '';
  private tick = -1;
  private sequence = 0;
  read(
    session: string,
    tick: number,
    cues: readonly PresentationCue[],
  ): readonly PresentationCue[] {
    const reset = session !== this.session || tick < this.tick;
    if (reset) {
      this.session = session;
      this.sequence = 0;
    }
    this.tick = tick;
    const fresh = cues.filter((c) => c.sequence > this.sequence);
    if (fresh.length) this.sequence = Math.max(...fresh.map((c) => c.sequence));
    // Joining/restoring a session should not replay an old visual effect history.
    return fresh.filter((c) => tick - c.tick <= 15);
  }
  reset(): void {
    this.session = '';
    this.tick = -1;
    this.sequence = 0;
  }
}
