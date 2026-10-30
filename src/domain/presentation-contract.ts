/** Disposable read models. These facts cannot command gameplay and are never saved. */
export type ActorPose =
  | 'idle'
  | 'walk'
  | 'run'
  | 'attack'
  | 'guard'
  | 'hit'
  | 'dash'
  | 'eat'
  | 'drink'
  | 'bathe'
  | 'work'
  | 'social'
  | 'sleep'
  | 'downed'
  | 'recovery';
export interface ActionTiming {
  readonly move: 'strike' | 'element';
  readonly startedAt: number;
  readonly activeAt: number;
  readonly recoveryAt: number;
  readonly endsAt: number;
}
export interface ActorPresentation {
  readonly id: number;
  readonly appearanceKind: 'npc' | 'origin' | 'species';
  readonly appearanceId: string;
  readonly x: number;
  readonly y: number;
  readonly elevation: number;
  readonly facingX: number;
  readonly facingY: number;
  readonly pose: ActorPose;
  readonly protected: boolean;
  readonly action: ActionTiming | null;
}
export interface PresentationCue {
  readonly sequence: number;
  readonly tick: number;
  readonly actor: number;
  readonly target: number | null;
  readonly kind: 'hit' | 'gather' | 'craft' | 'care' | 'defeat' | 'recover';
}
