import type { CommandPayload, CommandResult } from '../../domain/contracts';
import type { NpcId } from '../../domain/values';
import type { ScenePropPresentation } from '../../domain/presentation-contract';

export type FurnitureView = Pick<
  ScenePropPresentation,
  'id' | 'contentId' | 'x' | 'y' | 'interaction'
>;
export const FURNITURE_ACTION_LABELS = {
  rest: 'Rest',
  work: 'Work',
  wash: 'Wash',
  eat: 'Eat',
  equip: 'Equipment',
} as const;

export interface PortalView {
  readonly id: string;
  readonly targetSceneId: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly allowed: boolean;
  readonly reason?: string;
  readonly assetContentIds: readonly string[];
}
export interface InteractionFrame {
  readonly session: string;
  readonly player: { readonly x: number; readonly y: number };
  readonly npcs: readonly {
    readonly entityId: number;
    readonly profileId: NpcId;
    readonly x: number;
    readonly y: number;
  }[];
  readonly scene: {
    readonly id: string;
    readonly portals: readonly PortalView[];
    readonly props: readonly FurnitureView[];
  };
}
export type NearbyInteraction =
  | { readonly kind: 'portal'; readonly portal: PortalView }
  | { readonly kind: 'npc'; readonly npc: InteractionFrame['npcs'][number] }
  | {
      readonly kind: 'furniture';
      readonly prop: FurnitureView & {
        readonly interaction: NonNullable<FurnitureView['interaction']>;
      };
    }
  | { readonly kind: 'gather' };

/** Prompt and E use the same nearest eligible interaction, with deterministic ID tie breaking. */
export function nearestInteraction(frame: InteractionFrame): NearbyInteraction {
  const distance = (point: { x: number; y: number }): number =>
    Math.hypot(point.x - frame.player.x, point.y - frame.player.y);
  let selected: NearbyInteraction = { kind: 'gather' };
  let locked: PortalView | undefined;
  let lockedRange = Infinity;
  let nearest = Infinity,
    priority = Infinity,
    identity = '',
    numericId = Infinity;
  const offer = (
    candidate: NearbyInteraction,
    range: number,
    rank: number,
    id: string,
    entityId = 0,
  ): void => {
    if (
      range < nearest ||
      (range === nearest &&
        (rank < priority ||
          (rank === priority &&
            (entityId < numericId || (entityId === numericId && id < identity)))))
    ) {
      selected = candidate;
      nearest = range;
      priority = rank;
      identity = id;
      numericId = entityId;
    }
  };
  for (const portal of frame.scene.portals) {
    const range = distance(portal);
    if (portal.allowed && range <= 1.5) offer({ kind: 'portal', portal }, range, 0, portal.id);
    else if (
      !portal.allowed &&
      range <= 1.5 &&
      (range < lockedRange || (range === lockedRange && portal.id < (locked?.id ?? '')))
    ) {
      locked = portal;
      lockedRange = range;
    }
  }
  for (const prop of frame.scene.props) {
    const range = distance(prop);
    if (prop.interaction && range <= 1.5)
      offer(
        { kind: 'furniture', prop: { ...prop, interaction: prop.interaction } },
        range,
        1,
        prop.id,
      );
  }
  for (const npc of frame.npcs) {
    const range = distance(npc);
    if (range <= 3) offer({ kind: 'npc', npc }, range, 2, npc.profileId, npc.entityId);
  }
  return selected.kind === 'gather' && locked ? { kind: 'portal', portal: locked } : selected;
}

export type PortalEntryOutcome = 'entered' | 'stale' | 'unavailable' | 'pending';

/** Loading never pauses or shields the actor. The worker rechecks the final command too. */
export class PortalEntryController {
  private pending = false;
  private disposed = false;
  constructor(
    private readonly current: () => InteractionFrame | null,
    private readonly prepare: (assetContentIds: readonly string[]) => Promise<void>,
    private readonly submit: (command: CommandPayload) => Promise<CommandResult>,
  ) {}
  async enter(portalId: string): Promise<PortalEntryOutcome> {
    if (this.disposed) return 'stale';
    if (this.pending) return 'pending';
    const before = this.current();
    const initial = before?.scene.portals.find((portal) => portal.id === portalId);
    if (
      !before ||
      !initial?.allowed ||
      Math.hypot(initial.x - before.player.x, initial.y - before.player.y) > 1.5
    )
      return 'unavailable';
    this.pending = true;
    try {
      await this.prepare(initial.assetContentIds);
      const now = this.current();
      if (
        this.disposed ||
        !now ||
        now.session !== before.session ||
        now.scene.id !== before.scene.id
      )
        return 'stale';
      const portal = now.scene.portals.find((entry) => entry.id === portalId);
      if (
        !portal?.allowed ||
        portal.targetSceneId !== initial.targetSceneId ||
        Math.hypot(portal.x - now.player.x, portal.y - now.player.y) > 1.5
      )
        return 'stale';
      const result = await this.submit({
        type: 'enterPortal',
        portalId,
        expectedScene: before.scene.id,
      });
      return result.ok ? 'entered' : 'unavailable';
    } finally {
      this.pending = false;
    }
  }
  dispose(): void {
    this.disposed = true;
  }
}
