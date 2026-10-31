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
    if (actor.action) return 'attack';
    if (hit || actor.reaction) return 'hit';
    if (actor.pose === 'walk' && actor.locomotion?.gait === 'run') return 'run';
    return actor.pose;
  }
}
export interface PoseSample {
  readonly state: AnimationState;
  readonly facing: Facing;
  readonly frameIndex: number;
  readonly frameId: string;
  readonly phase: 'windup' | 'active' | 'recovery' | null;
  readonly phaseProgress: number;
  readonly cycle: number;
  readonly instanceId: string;
}
interface ActorAnimation {
  key: string;
  x: number;
  y: number;
  distance: number;
  start: number;
  discontinuity: number;
  distanceOrigin: number;
}
interface ConfirmedDistance {
  from: number;
  to: number;
  fromTick: number;
  toTick: number;
  discontinuity: number;
}
interface ConfirmedTransform {
  from: { x: number; y: number; elevation: number };
  to: { x: number; y: number; elevation: number };
  fromTick: number;
  toTick: number;
  discontinuity: number;
}
/** One instance per renderer; call once per visible actor, on the shared render clock.
 * Distance uses authoritative positions and combat uses absolute simulation ticks. */
export class AnimationController {
  private readonly actors = new Map<number, ActorAnimation>();
  private readonly distances = new Map<number, ConfirmedDistance>();
  private readonly transforms = new Map<number, ConfirmedTransform>();
  private session = '';
  private lastTick = -1;
  /** Odometers are committed values. Sampling never predicts beyond either packet. */
  accept(session: string, tick: number, actors: readonly ActorPresentation[]): void {
    if (session !== this.session || tick < this.lastTick) {
      this.reset();
      this.session = session;
    }
    this.lastTick = tick;
    for (const actor of actors) {
      const transform = this.transforms.get(actor.id),
        discontinuity = actor.locomotion?.discontinuity ?? 0;
      const position = { x: actor.x, y: actor.y, elevation: actor.elevation };
      const resetTransform =
        !transform ||
        transform.discontinuity !== discontinuity ||
        Math.hypot(actor.x - transform.to.x, actor.y - transform.to.y) >= 4;
      this.transforms.set(actor.id, {
        from: resetTransform ? position : transform.to,
        to: position,
        fromTick: resetTransform ? tick : transform.toTick,
        toTick: tick,
        discontinuity,
      });
      if (!actor.locomotion) continue;
      const previous = this.distances.get(actor.id),
        current = actor.locomotion;
      const reset =
        !previous ||
        tick < previous.toTick ||
        current.discontinuity !== previous.discontinuity ||
        current.distance < previous.to;
      this.distances.set(actor.id, {
        from: reset ? current.distance : previous.to,
        to: current.distance,
        fromTick: reset ? tick : previous.toTick,
        toTick: tick,
        discontinuity: current.discontinuity,
      });
    }
  }
  /** Sprite travel and foot cadence use the same confirmed interval. */
  position(actor: ActorPresentation, tick: number): { x: number; y: number; elevation: number } {
    const p = this.transforms.get(actor.id);
    if (!p) return { x: actor.x, y: actor.y, elevation: actor.elevation };
    const alpha = Math.max(
      0,
      Math.min(1, (tick - p.fromTick) / Math.max(1, p.toTick - p.fromTick)),
    );
    return {
      x: p.from.x + (p.to.x - p.from.x) * alpha,
      y: p.from.y + (p.to.y - p.from.y) * alpha,
      elevation: p.from.elevation + (p.to.elevation - p.from.elevation) * alpha,
    };
  }
  sample(actor: ActorPresentation, clip: AnimationClip, tick: number): PoseSample {
    let state = this.actors.get(actor.id);
    const instance =
      clip.state === 'attack' && actor.action
        ? (actor.action.instanceId ?? `${actor.action.move}:${actor.action.startedAt}`)
        : clip.state === 'hit' && actor.reaction
          ? actor.reaction.id
          : `${clip.state}:${actor.activityVariant ?? ''}:${actor.activityInstanceId ?? ''}`;
    const key = `${clip.state}:${instance}`;
    const discontinuity = actor.locomotion?.discontinuity ?? 0;
    if (!state || state.discontinuity !== discontinuity) {
      state = {
        key,
        x: actor.x,
        y: actor.y,
        distance: 0,
        start: actor.reaction && clip.state === 'hit' ? actor.reaction.startedAt : tick,
        discontinuity,
        distanceOrigin: actor.locomotion?.distance ?? 0,
      };
      this.actors.set(actor.id, state);
    } else if (state.key !== key) {
      state.key = key;
      state.start = clip.state === 'hit' && actor.reaction ? actor.reaction.startedAt : tick;
    }
    // Teleports and restore corrections do not play many strides in a single frame.
    const delta = Math.hypot(actor.x - state.x, actor.y - state.y);
    if (delta < 4) state.distance += delta;
    state.x = actor.x;
    state.y = actor.y;
    const confirmed = this.distances.get(actor.id);
    const distance = actor.locomotion
      ? confirmed && confirmed.discontinuity === discontinuity
        ? confirmed.from +
          (confirmed.to - confirmed.from) *
            Math.max(
              0,
              Math.min(
                1,
                (tick - confirmed.fromTick) / Math.max(1, confirmed.toTick - confirmed.fromTick),
              ),
            ) -
          state.distanceOrigin
        : actor.locomotion.distance - state.distanceOrigin
      : state.distance;
    let index = 0,
      phase: PoseSample['phase'] = null,
      progress = 0,
      cycle = 0;
    if (clip.playback === 'combat' && actor.action && clip.phases) {
      const a = actor.action;
      phase = tick < a.activeAt ? 'windup' : tick < a.recoveryAt ? 'active' : 'recovery';
      const phaseRange =
        tick < a.activeAt
          ? { range: clip.phases.windup, start: a.startedAt, end: a.activeAt }
          : tick < a.recoveryAt
            ? { range: clip.phases.active, start: a.activeAt, end: a.recoveryAt }
            : { range: clip.phases.recovery, start: a.recoveryAt, end: a.endsAt };
      const [from, to] = phaseRange.range;
      progress = Math.max(
        0,
        Math.min(1, (tick - phaseRange.start) / Math.max(1, phaseRange.end - phaseRange.start)),
      );
      index = from + Math.min(to - from - 1, Math.max(0, Math.floor(progress * (to - from))));
    } else if (clip.playback === 'distance') {
      cycle = Math.max(0, distance) / clip.stride!;
      progress = cycle % 1;
      index = Math.floor(progress * clip.frameIds.length) % clip.frameIds.length;
    } else {
      const elapsed = Math.max(0, tick - state.start) / 30;
      const n = Math.floor(elapsed * clip.fps);
      cycle = (elapsed * clip.fps) / clip.frameIds.length;
      progress = cycle % 1;
      index =
        clip.playback === 'once' ? Math.min(clip.frameIds.length - 1, n) : n % clip.frameIds.length;
    }
    return {
      state: clip.state,
      facing: clip.facing,
      frameIndex: index,
      frameId: clip.frameIds[index]!,
      phase,
      phaseProgress: progress,
      cycle,
      instanceId: instance,
    };
  }
  frame(actor: ActorPresentation, clip: AnimationClip, tick: number): string {
    return this.sample(actor, clip, tick).frameId;
  }
  retain(ids: ReadonlySet<number>): void {
    for (const id of this.actors.keys()) if (!ids.has(id)) this.actors.delete(id);
    for (const id of this.distances.keys()) if (!ids.has(id)) this.distances.delete(id);
    for (const id of this.transforms.keys()) if (!ids.has(id)) this.transforms.delete(id);
  }
  reset(): void {
    this.actors.clear();
    this.distances.clear();
    this.transforms.clear();
    this.session = '';
    this.lastTick = -1;
  }
}
/** All modular layers use the body's sample. Missing authored frames are explicit gaps. */
export function layerFrameId(clip: AnimationClip, sample: PoseSample): string | undefined {
  return clip.state === sample.state && clip.facing === sample.facing
    ? clip.frameIds[sample.frameIndex]
    : undefined;
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
