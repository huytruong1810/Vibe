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

const npc = z.enum(NPC_PROFILES.map((n) => n.id) as [NpcId, ...NpcId[]]);
const slot = z.union([z.literal(0), z.literal(1)]);
export const CommandPayloadSchema = z.discriminatedUnion('type', [
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
      type: z.literal('care'),
      creature: z.number().int().nonnegative(),
      action: z.enum(['feed', 'water', 'pet', 'bathe', 'heal']),
    })
    .strict(),
  z.object({ type: z.literal('tame'), creature: z.number().int().nonnegative() }).strict(),
  z.object({ type: z.literal('release') }).strict(),
  z.object({ type: z.literal('interact'), npcId: npc }).strict(),
  z.object({ type: z.literal('dialogue'), text: z.string().trim().min(1).max(1200) }).strict(),
  z.object({ type: z.literal('closeDialogue') }).strict(),
  z.object({ type: z.literal('battle'), npcId: npc }).strict(),
  z
    .object({ type: z.literal('agentResult'), jobId: z.string().max(200), output: z.unknown() })
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
}
export interface DialogueState {
  readonly npcId: NpcId;
  readonly revision: number;
  readonly lines: { speaker: 'player' | 'npc' | 'system'; text: string }[];
  readonly staged: AgentAction[];
  pendingJob: string | null;
}
export interface CreatureView {
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
}
export interface PerformanceView {
  readonly stepMs: number;
  readonly detailed: number;
  readonly population: number;
  readonly paths: number;
  readonly expansions: number;
  readonly reactions: number;
  readonly inferencePending: number;
}
export interface RenderSnapshot {
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
  readonly journal: readonly string[];
  readonly paused: readonly string[];
  readonly player: PlayerState;
  readonly inventory: InventoryState;
  readonly creatures: readonly CreatureView[];
  readonly npcs: readonly NpcState[];
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
  readonly buildings: readonly Building[];
}
export type ToWorker =
  | { type: 'initialize'; seed: number; origin: number; population?: number }
  | { type: 'command'; envelope: WorldCommand }
  | { type: 'checkpoint'; requestId: string }
  | { type: 'restore'; requestId: string; snapshot: unknown }
  | { type: 'recycle'; buffer: ArrayBuffer }
  | { type: 'dispose' };
export type FromWorker =
  | { type: 'ready'; terrain: TerrainView; frame: RenderSnapshot }
  | { type: 'frame'; frame: RenderSnapshot }
  | { type: 'result'; result: CommandResult }
  | { type: 'checkpoint'; requestId: string; snapshot: unknown }
  | { type: 'restored'; requestId: string; terrain: TerrainView; frame: RenderSnapshot }
  | { type: 'error'; message: string; requestId?: string };
