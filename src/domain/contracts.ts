import { ContextSettingsSchema } from './conversation';
import { CombatSettingsSchema, type CombatSettings } from './combat-director';
import { z } from 'zod';
import { NPC_PROFILES, SETTLEMENTS } from '../content/definitions';
import type { InventoryState } from './inventory';
import type { PlayerState } from './combat';
import type { DomainEvent, InferenceJob, Marker, NpcState, AgentAction } from './agents';
import type { GroundDrop } from './resources';
import type { Carrion, SettlementSupply } from './resources';
import type { Building, WorldDelta } from './world';
import type { DebugPath, NpcId, WorldPosition } from './values';
import type { WeatherState } from './core';
import type { DialogueEmotion } from './dialogue';
import { PaintingResultSchema } from './painting';
import { ArtifactIdSchema, PaintingBriefSchema, ARTIFACT_PALETTE } from './artifacts';
import { ARTIFACT_LIMITS } from '../content/definitions';
import type { EquipmentView } from './equipment';
import type { Artifact, ArtifactView, ArtifactPlacement } from './artifacts';
import type { ScenePresentation, ProjectilePresentation } from './presentation-contract';
import type { StatName } from './entities';

const npc = z.enum(NPC_PROFILES.map((n) => n.id) as [NpcId, ...NpcId[]]);
const slot = z.union([z.literal(0), z.literal(1)]);
export const CommandPayloadSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('configurePainting'), enabled: z.boolean() }).strict(),
  z
    .object({
      type: z.literal('artifactWrite'),
      slot,
      title: z.string().min(1).max(48).optional(),
      page: z.number().int().min(1).max(48).optional(),
      lines: z.array(z.string().max(96)).max(24),
    })
    .strict(),
  z.object({ type: z.literal('artifactPageAdd'), slot }).strict(),
  z
    .object({ type: z.literal('artifactPageRemove'), slot, page: z.number().int().min(1).max(48) })
    .strict(),
  z.object({ type: z.literal('artifactSeal'), slot }).strict(),
  z
    .object({
      type: z.literal('paintingTouchUp'),
      slot,
      pixels: z
        .string()
        .length(1024)
        .regex(/^[A-Za-z0-9+/]+$/),
      palette: z
        .array(
          z
            .string()
            .regex(/^#[0-9a-f]{6}$/)
            .refine((color) => ARTIFACT_PALETTE.has(color)),
        )
        .min(1)
        .max(ARTIFACT_LIMITS.colors),
    })
    .strict(),
  z
    .object({
      type: z.literal('partnerCommand'),
      command: z.enum(['focus', 'regroup']),
      target: z.number().int().nonnegative().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('inspectCreature'),
      entityId: z.number().int().nonnegative().nullable(),
    })
    .strict(),
  z.object({ type: z.literal('configureCombat'), settings: CombatSettingsSchema }).strict(),
  z.object({ type: z.literal('configureContext'), settings: ContextSettingsSchema }).strict(),
  z
    .object({
      type: z.literal('artifactDisplay'),
      slot,
      propId: z.string().min(1).max(200),
      displaySlot: z.number().int().min(0).max(511),
    })
    .strict(),
  z
    .object({
      type: z.literal('artifactTake'),
      propId: z.string().min(1).max(200),
      displaySlot: z.number().int().min(0).max(511),
    })
    .strict(),
  z.object({ type: z.literal('furniture'), propId: z.string().min(1).max(200) }).strict(),
  z.object({ type: z.literal('equip'), slot }).strict(),
  z
    .object({
      type: z.literal('unequip'),
      slot: z.enum(['head', 'torso', 'hands', 'legs', 'feet', 'back']),
      drop: z.boolean().optional(),
    })
    .strict(),
  z.object({ type: z.literal('guard'), active: z.boolean() }).strict(),
  z
    .object({
      type: z.literal('enterPortal'),
      portalId: z.string().min(1).max(200),
      expectedScene: z.string().min(1).max(200),
    })
    .strict(),
  z.object({ type: z.literal('invite'), npcId: npc }).strict(),
  z.object({ type: z.literal('sleep') }).strict(),
  z.object({ type: z.literal('wake') }).strict(),
  z
    .object({
      type: z.literal('accelerate'),
      factor: z.union([z.literal(1), z.literal(2), z.literal(4), z.literal(8)]),
    })
    .strict(),
  z.object({ type: z.literal('service'), action: z.enum(['eat', 'drink', 'wash']) }).strict(),
  z.object({ type: z.literal('debug'), enabled: z.boolean() }).strict(),
  z
    .object({
      type: z.literal('move'),
      x: z.number().finite().min(-1).max(1),
      y: z.number().finite().min(-1).max(1),
    })
    .strict(),
  z.object({ type: z.literal('attack'), kind: z.enum(['strike', 'element']) }).strict(),
  z.object({ type: z.literal('dash') }).strict(),
  z.object({ type: z.literal('harvest') }).strict(),
  z.object({ type: z.literal('combine') }).strict(),
  z.object({ type: z.literal('swap') }).strict(),
  z.object({ type: z.literal('drop'), slot }).strict(),
  z.object({ type: z.literal('use'), slot }).strict(),
  z
    .object({
      type: z.literal('paintingRequest'),
      slot,
      prompt: z.string().min(1).max(240),
      mood: PaintingBriefSchema.shape.mood,
      composition: PaintingBriefSchema.shape.composition.optional(),
    })
    .strict(),
  z.object({ type: z.literal('paintingKeep'), requestId: ArtifactIdSchema }).strict(),
  z.object({ type: z.literal('paintingDiscard'), requestId: ArtifactIdSchema }).strict(),
  z
    .object({
      type: z.literal('paintingResult'),
      artifactId: ArtifactIdSchema,
      revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
      result: PaintingResultSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('paintingFailure'),
      artifactId: ArtifactIdSchema,
      revision: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
      reason: z.string().max(200),
    })
    .strict(),
  z
    .object({
      type: z.literal('care'),
      creature: z.number().int().nonnegative(),
      action: z.enum(['feed', 'water', 'pet', 'bathe', 'heal']),
    })
    .strict(),
  z.object({ type: z.literal('tame'), creature: z.number().int().nonnegative() }).strict(),
  z.object({ type: z.literal('release') }).strict(),
  z.object({ type: z.literal('interact'), npcId: npc }).strict(),
  z.object({ type: z.literal('giveGift'), npcId: npc, slot }).strict(),
  z.object({ type: z.literal('dialogue'), text: z.string().trim().min(1).max(1200) }).strict(),
  z.object({ type: z.literal('closeDialogue') }).strict(),
  z.object({ type: z.literal('battle'), npcId: npc }).strict(),
  z
    .object({
      type: z.literal('agentResult'),
      jobId: z.string().max(200),
      output: z.unknown(),
      promptTokens: z.number().int().nonnegative().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('agentFailure'),
      jobId: z.string().max(200),
      reason: z.string().max(200),
    })
    .strict(),
  z.object({ type: z.literal('pause'), token: z.enum(['hidden', 'menu']) }).strict(),
  z.object({ type: z.literal('resume'), token: z.enum(['hidden', 'menu']) }).strict(),
  z
    .object({ type: z.literal('reaction'), reaction: z.enum(['fire', 'freeze', 'shock', 'thaw']) })
    .strict(),
  z
    .object({
      type: z.literal('travel'),
      settlementId: z.enum(SETTLEMENTS.map((s) => s.id) as [string, ...string[]]),
    })
    .strict(),
]);
export type CommandPayload = z.infer<typeof CommandPayloadSchema>;
export const WorldCommandSchema = z
  .object({
    id: z.string().min(1).max(200),
    session: z.string().min(1).max(120),
    issuer: z.enum(['player', 'inference']),
    command: CommandPayloadSchema,
  })
  .strict();
export type WorldCommand = z.infer<typeof WorldCommandSchema>;
export interface CommandResult {
  readonly id: string;
  readonly ok: boolean;
  readonly message: string;
  readonly artifactId?: string;
}
export interface DialogueState {
  readonly npcId: NpcId;
  readonly revision: number;
  readonly lines: {
    speaker: 'player' | 'npc' | 'system';
    text: string;
    emotion?: DialogueEmotion;
  }[];
  invitePending?: boolean;
  readonly staged: AgentAction[];
  pendingJob: string | null;
  reading?: boolean;
}
export interface CreatureView {
  readonly heightMeters: number;
  readonly massKg: number;
  readonly kind: 'human' | 'nonhuman';
  readonly rest: number;
  readonly sleeping: boolean;
  readonly forcedRest: boolean;
  readonly nature: readonly string[];
  readonly goal: WorldPosition;
  readonly commitUntil: number;
  readonly id: number;
  readonly name: string;
  readonly species: string;
  readonly elements: readonly string[];
  readonly owner: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly level: number;
  readonly experience: number;
  readonly attack: number;
  readonly defense: number;
  readonly speed: number;
  readonly food: number;
  readonly water: number;
  readonly recreation: number;
  readonly cleanliness: number;
  readonly wildness: number;
  readonly trust: number;
  readonly mode: string;
  readonly x: number;
  readonly y: number;
  readonly bondHearts?: number;
  readonly disposition?: string;
  readonly moves?: readonly string[];
  readonly stats?: Readonly<Record<StatName, number>>;
  readonly baseStats?: Readonly<Record<StatName, number>>;
  readonly potential?: readonly number[];
  readonly revealedPotential?: number;
  readonly conditioning?: readonly number[];
}
export interface PerformanceView {
  readonly stepMs: number;
  readonly detailed: number;
  readonly population: number;
  readonly paths: number;
  readonly expansions: number;
  readonly reactions: number;
  readonly inferencePending: number;
  readonly context?: { tokens: number; budget: number; compactions: number; truncated: boolean };
}
export interface RenderSnapshot {
  readonly creatureDebug?: readonly {
    id: number;
    intent: string;
    target: number;
    token: number;
    scores: readonly { intent: string; score: number }[];
    observation?: readonly number[];
  }[];
  readonly combatSettings: CombatSettings;
  readonly equipment: EquipmentView;
  readonly scene: ScenePresentation;
  readonly projectiles: readonly ProjectilePresentation[];
  readonly actors: readonly import('./presentation-contract').ActorPresentation[];
  readonly cues: readonly import('./presentation-contract').PresentationCue[];
  readonly ids: Uint32Array;
  readonly timeScale: number;
  readonly humanNeeds: readonly HumanView[];
  readonly carrion: readonly Carrion[];
  readonly supplies: readonly SettlementSupply[];
  readonly ecology: { readonly deaths: number; readonly births: number; readonly pending: number };
  readonly threats: readonly {
    readonly actor: number;
    readonly target: number;
    readonly cause: string;
    readonly from: WorldPosition;
    readonly to: WorldPosition;
  }[];
  readonly debugEnabled: boolean;
  readonly debugPaths: readonly DebugPath[];
  readonly session: string;
  readonly tick: number;
  readonly packed: Float32Array;
  readonly count: number;
  readonly elapsedSeconds: number;
  readonly day: number;
  readonly hour: number;
  readonly calendar: string;
  readonly season: number;
  readonly weather: WeatherState;
  readonly festival?: {
    readonly id: string;
    readonly name: string;
    readonly description: string;
    readonly village: string;
  } | null;
  readonly birthdaysToday?: readonly string[];
  readonly journal: readonly string[];
  readonly paused: readonly string[];
  readonly player: PlayerState;
  readonly inventory: InventoryState;
  readonly artifacts: readonly ArtifactView[];
  readonly placements: readonly ArtifactPlacement[];
  readonly creatures: readonly CreatureView[];
  readonly npcs: readonly (NpcState & {
    readonly memoryCounts?: { active: number; pending: number };
  })[];
  readonly events: readonly DomainEvent[];
  readonly drops: readonly GroundDrop[];
  readonly markers: readonly Marker[];
  readonly dialogue: DialogueState | null;
  readonly duel: number | null;
  readonly deltas: readonly WorldDelta[];
  readonly jobs: readonly InferenceJob[];
  readonly performance: PerformanceView;
}
export interface HumanView {
  readonly heightMeters: number;
  readonly massKg: number;
  readonly id: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly food: number;
  readonly water: number;
  readonly recreation: number;
  readonly cleanliness: number;
  readonly rest: number;
  readonly sleeping: boolean;
  readonly forcedRest: boolean;
  readonly nature: readonly string[];
  readonly elements: readonly string[];
}
export const ENTITY_STRIDE = 12;
export interface TerrainView {
  readonly size: number;
  readonly seed: number;
  readonly biome: Uint8Array;
  readonly elevation: Uint8Array;
  readonly fluid: Uint8Array;
  readonly flags: Uint8Array;
  readonly resource: Uint16Array;
  readonly quantity: Uint16Array;
  /** Optional authored presentation channel; legacy/procedural transports omit it. */
  readonly surface?: Uint8Array;
  readonly surfaceNames?: readonly string[];
  readonly ground?: Uint8Array;
  readonly groundNames?: readonly string[];
  readonly buildings: readonly Building[];
}
/** Diagnostic timestamps are local to their thread; only durations may be compared. */
export interface WorkTiming {
  name: string;
  start: number;
  end: number;
}
export interface WorkerTiming {
  requestId: string;
  received: number;
  serviceEnd: number;
  reply: number;
  recent: readonly WorkTiming[];
}
export type ToWorker = (
  | {
      type: 'artifactContent';
      requestId: string;
      artifactId: string;
      paintingPurpose?: 'display' | 'generation';
    }
  | {
      type: 'initialize';
      seed: number;
      origin: number;
      population?: number;
      worldSource?: 'authored';
      compiledWorld?: unknown;
    }
  | { type: 'command'; envelope: WorldCommand }
  | { type: 'checkpoint'; requestId: string }
  | { type: 'persistCheckpoint'; requestId: string }
  | { type: 'restore'; requestId: string; snapshot: unknown; compiledWorld?: unknown }
  | { type: 'recycle'; buffer: ArrayBuffer }
  | { type: 'dispose' }
) & { diagnostic?: boolean };
export type FromWorker = (
  | { type: 'artifactContent'; requestId: string; artifact: Artifact | null }
  | { type: 'ready'; terrain: TerrainView; frame: RenderSnapshot }
  | { type: 'frame'; frame: RenderSnapshot; terrain?: TerrainView }
  | { type: 'result'; result: CommandResult }
  | { type: 'checkpoint'; requestId: string; snapshot: unknown }
  | { type: 'checkpointSaved'; requestId: string }
  | { type: 'restored'; requestId: string; terrain: TerrainView; frame: RenderSnapshot }
  | { type: 'error'; message: string; requestId?: string }
) & { diagnostic?: WorkerTiming };
