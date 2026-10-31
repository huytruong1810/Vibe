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
  /** Registered move ID. Legacy strike/element remain valid registry keys. */
  readonly move: string;
  readonly instanceId?: string;
  readonly startedAt: number;
  readonly activeAt: number;
  readonly recoveryAt: number;
  readonly endsAt: number;
}
export interface ActorPresentation {
  readonly physique?: {
    readonly heightMeters: number;
    readonly massKg: number;
    readonly strideTiles: number;
    readonly grounded: boolean;
  };
  readonly sceneId?: string;
  readonly rigId?: string;
  readonly appearanceRevision?: number;
  readonly equipment?: Readonly<Record<string, string | null>>;
  readonly held?: readonly [string | null, string | null];
  readonly reaction?: { readonly id: string; readonly startedAt: number; readonly endsAt: number };
  readonly activityVariant?: string;
  readonly activityInstanceId?: string;
  readonly locomotion?: {
    readonly gait: 'walk' | 'run';
    readonly distance: number;
    readonly discontinuity: number;
  };
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
  readonly strength?: number;
  readonly sequence: number;
  readonly tick: number;
  readonly actor: number;
  readonly target: number | null;
  readonly kind: 'hit' | 'gather' | 'craft' | 'care' | 'defeat' | 'recover';
}
export interface ScenePropPresentation {
  readonly id: string;
  readonly contentId: string;
  readonly x: number;
  readonly y: number;
  readonly elevation?: number;
  readonly layer: 'ground' | 'object' | 'roof' | 'canopy';
  readonly variant?: string;
  readonly interaction?: 'rest' | 'work' | 'wash' | 'eat' | 'equip';
}
export interface PortalPresentation {
  readonly id: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly targetSceneId: string;
  readonly allowed: boolean;
  readonly reason?: string;
  readonly assetContentIds: readonly string[];
}
export interface ScenePresentation {
  readonly name?: string;
  readonly id: string;
  readonly kind?: 'overworld' | 'building' | 'cave';
  readonly width: number;
  readonly height: number;
  readonly outside: boolean;
  readonly floorContentId?: string;
  readonly sceneAssetIds?: readonly string[];
  readonly props: readonly ScenePropPresentation[];
  readonly portals: readonly PortalPresentation[];
}
export interface ProjectilePresentation {
  readonly id: number;
  readonly sceneId: string;
  readonly x: number;
  readonly y: number;
  readonly facingX: number;
  readonly facingY: number;
  readonly kind: 'arrow';
}
