import { SETTLEMENTS, VILLAGES, itemIds } from '../content/definitions';
import { ChunkStore, Fluid, SurfaceRules, TileFlag, type WorldDelta } from './world';
import { NavigationService } from './navigation';
import { ResourceStore, type GroundDrop, type Carrion } from './resources';
import type { ScenePresentation, ScenePropPresentation } from './presentation-contract';
import { CONFIG, distanceSquared, type WorldPosition } from './values';
import { EntityStore } from './entities';

export type SceneId = string & { readonly __scene: unique symbol };
export interface PortalDefinition extends WorldPosition {
  readonly id: string;
  readonly source: number;
  readonly target: number;
  readonly destination: WorldPosition;
  readonly name: string;
  readonly owner: number | null;
}
export interface SceneDefinition {
  readonly id: string;
  readonly code: number;
  readonly kind: 'overworld' | 'building' | 'cave';
  readonly width: number;
  readonly height: number;
  readonly village: number;
  readonly settlement: string | null;
  readonly owner: number | null;
  readonly props: readonly ScenePropPresentation[];
}
export interface SceneSnapshot {
  bindings: { code: number; id: string }[];
  states: { id: string; deltas: WorldDelta[]; drops: GroundDrop[]; carrion: Carrion[] }[];
  invitations: { owner: number; untilDay: number }[];
}
export interface SceneContext {
  readonly world: ChunkStore;
  readonly resources: ResourceStore;
  readonly navigation: NavigationService;
}
const buildingDimensions = (capital: boolean, local: number) =>
  capital || local === 1 ? { width: 16, height: 12 } : { width: 20, height: 14 };
const CAVE_DIMENSIONS = Object.freeze({ width: 48, height: 32 });
const SAVE_LAYOUTS = Object.freeze([
  Object.freeze({ id: 'overworld', width: CONFIG.worldSize, height: CONFIG.worldSize }),
  ...SETTLEMENTS.flatMap((settlement) =>
    Array.from({ length: settlement.capital ? 10 : 2 }, (_, local) =>
      Object.freeze({
        id: `${settlement.id}:home:${local}`,
        ...buildingDimensions(settlement.capital, local),
      }),
    ),
  ),
  ...VILLAGES.map((village) =>
    Object.freeze({ id: `cave:${village.name.toLowerCase()}`, ...CAVE_DIMENSIONS }),
  ),
]);
/** Canonical save bounds are metadata: validation never regenerates the overworld. */
export function sceneSaveLayouts(): readonly {
  readonly id: string;
  readonly width: number;
  readonly height: number;
}[] {
  return SAVE_LAYOUTS;
}

/** One registry of pocket scenes. Existing overworld geometry is never modified. */
export class SceneRegistry {
  readonly definitions: SceneDefinition[] = [];
  readonly portals: PortalDefinition[] = [];
  private readonly contexts = new Map<number, SceneContext>();
  private readonly invitations = new Map<number, number>();
  constructor(
    readonly overworld: ChunkStore,
    readonly supplies: ResourceStore,
  ) {
    this.definitions.push({
      id: 'overworld',
      code: 0,
      kind: 'overworld',
      width: overworld.size,
      height: overworld.size,
      village: 0,
      settlement: null,
      owner: null,
      props: [],
    });
    for (const building of overworld.buildings) {
      const settlement = SETTLEMENTS.find((s) => building.id.startsWith(`${s.id}:home:`))!;
      const local = Number(building.id.split(':').at(-1));
      const owner = settlement.capital ? settlement.village * 10 + local + 1 : null;
      const { width, height } = buildingDimensions(settlement.capital, local);
      const code = this.definitions.length;
      const props: ScenePropPresentation[] = [
        {
          id: `${building.id}:bed`,
          contentId: 'furniture_bed',
          x: 3.5,
          y: 3.5,
          layer: 'object',
          interaction: 'rest',
        },
        {
          id: `${building.id}:table`,
          contentId: 'furniture_table',
          x: width - 5.5,
          y: 4.5,
          layer: 'object',
        },
        {
          id: `${building.id}:bench`,
          contentId: 'furniture_workbench',
          x: width - 4.5,
          y: 2.5,
          layer: 'object',
          interaction: 'work',
        },
        {
          id: `${building.id}:pantry`,
          contentId: 'furniture_pantry',
          x: 3.5,
          y: 5.5,
          layer: 'object',
          interaction: 'eat',
        },
        {
          id: `${building.id}:basin`,
          contentId: 'furniture_basin',
          x: 5.5,
          y: 3.5,
          layer: 'object',
          interaction: 'wash',
        },
        {
          id: `${building.id}:wardrobe`,
          contentId: 'furniture_wardrobe',
          x: width - 3.5,
          y: 6.5,
          layer: 'object',
          interaction: 'equip',
        },
      ];
      this.definitions.push({
        id: building.id,
        code,
        kind: 'building',
        width,
        height,
        village: building.village,
        settlement: settlement.id,
        owner,
        props,
      });
      this.addPair(
        code,
        { x: building.x + 0.5, y: building.y + 1.5 },
        { x: Math.floor(width / 2) + 0.5, y: height - 3.5 },
        building.name,
        settlement.capital && local > 0 ? owner : null,
      );
    }
    for (let village = 0; village < 3; village++) {
      const code = this.definitions.length,
        center = VILLAGES[village]!;
      const entry = this.roadEntrance(center);
      this.definitions.push({
        id: `cave:${center.name.toLowerCase()}`,
        code,
        kind: 'cave',
        ...CAVE_DIMENSIONS,
        village,
        settlement: null,
        owner: null,
        props: [
          {
            id: `cave:${village}:rocks`,
            contentId: 'cave_rocks',
            x: 25.5,
            y: 15.5,
            layer: 'object',
          },
        ],
      });
      this.addPair(code, entry, { x: 24.5, y: 27.5 }, `${center.name} cave`, null);
    }
  }
  bindOverworldNavigation(navigation: NavigationService): void {
    this.contexts.set(0, { world: this.overworld, resources: this.supplies, navigation });
  }
  private roadEntrance(center: WorldPosition): WorldPosition {
    for (let radius = 20; radius < 80; radius++)
      for (const [dx, dy] of [
        [radius, 0],
        [-radius, 0],
        [0, radius],
        [0, -radius],
      ]) {
        const x = center.x + dx! + 0.5,
          y = center.y + dy! + 0.5;
        if (
          this.overworld.contains(x, y) &&
          this.overworld.flags[this.overworld.index(x, y)]! & TileFlag.Road &&
          SurfaceRules.walkable(this.overworld, x, y)
        )
          return { x, y };
      }
    return { x: center.x + 0.5, y: center.y + 3.5 };
  }
  private addPair(
    code: number,
    entrance: WorldPosition,
    exit: WorldPosition,
    name: string,
    owner: number | null,
  ): void {
    const id = this.definitions[code]!.id;
    this.portals.push({
      id: `enter:${id}`,
      source: 0,
      target: code,
      ...entrance,
      scene: 0,
      destination: exit,
      name,
      owner,
    });
    this.portals.push({
      id: `exit:${id}`,
      source: code,
      target: 0,
      ...exit,
      scene: code,
      destination: entrance,
      name: 'Return outside',
      owner: null,
    });
  }
  id(code: number): string {
    return this.definitions[code]?.id ?? 'overworld';
  }
  code(id: string): number {
    return this.definitions.find((d) => d.id === id)?.code ?? -1;
  }
  home(entityId: number): SceneDefinition | undefined {
    return this.definitions.find((d) => d.owner === entityId);
  }
  context(code: number): SceneContext {
    const cached = this.contexts.get(code);
    if (cached) return cached;
    if (code === 0) {
      const context = {
        world: this.overworld,
        resources: this.supplies,
        navigation: new NavigationService(this.overworld),
      };
      this.contexts.set(0, context);
      return context;
    }
    const definition = this.definitions[code];
    if (!definition) throw Error('Unknown scene');
    const size = 2 ** Math.ceil(Math.log2(Math.max(definition.width, definition.height)));
    const world = new ChunkStore(size, this.overworld.seed);
    world.flags.fill(TileFlag.Solid);
    world.biome.fill(
      definition.kind === 'building'
        ? 1
        : definition.village === 0
          ? 3
          : definition.village === 1
            ? 0
            : 4,
    );
    for (let y = 1; y < definition.height - 1; y++)
      for (let x = 1; x < definition.width - 1; x++) {
        const i = world.index(x, y);
        world.flags[i] = TileFlag.Protected;
        if (definition.kind === 'cave' && x % 5 === 0 && y % 4 === 0) {
          const kinds = ['berries', 'reeds', 'wheat', 'nectar', 'ashgrass', 'fungi'] as const;
          world.resource[i] = itemIds.indexOf(kinds[(x + y) % 6]!) + 1;
          world.quantity[i] = 8;
        }
      }
    // The approach cells remain open. Visual furniture never invents collision.
    for (const [x, y] of [
      [3, 2],
      [3, 3],
      [definition.width - 5, 4],
      [definition.width - 4, 4],
    ])
      world.flags[world.index(x!, y!)] = TileFlag.Solid | TileFlag.Protected;
    world.fluid[world.index(5, 3)] = Fluid.Freshwater;
    const resources = new ResourceStore(world);
    resources.supplies.length = 0;
    if (definition.settlement) {
      const account = this.supplies.supplies.find((s) => s.id === definition.settlement)!;
      resources.supplies.push({
        id: account.id,
        x: 3.5,
        y: 5.5,
        scene: code,
        stock: account.stock,
      });
    }
    const result = { world, resources, navigation: new NavigationService(world) };
    this.contexts.set(code, result);
    return result;
  }
  loaded(): readonly [number, SceneContext][] {
    return [...this.contexts.entries()];
  }
  allowed(portal: PortalDefinition, entityId: number, day: number): boolean {
    return (
      portal.owner === null ||
      portal.owner === entityId ||
      (entityId === 0 && (this.invitations.get(portal.owner) ?? -1) >= day)
    );
  }
  invite(owner: number, day: number): void {
    this.invitations.set(owner, day);
  }
  revoke(owner: number): void {
    this.invitations.delete(owner);
  }
  transfer(s: EntityStore, entityId: number, portalId: string, day: number): string | null {
    const slot = s.slot(entityId),
      portal = this.portals.find((p) => p.id === portalId);
    if (slot === undefined || !portal || s.scene[slot] !== portal.source)
      return 'That entrance is no longer available.';
    const permissionActor = s.owner[slot]! >= 0 ? s.owner[slot]! : entityId;
    if (!this.allowed(portal, permissionActor, day))
      return 'Ask the resident for an invitation first.';
    if (distanceSquared(s.position(slot), portal) > 2.25) return 'Move closer to the entrance.';
    if (s.hp[slot]! <= 0 || s.sleeping[slot]) return 'Wake and recover before entering.';
    const world = this.context(portal.target).world;
    if (
      !SurfaceRules.walkable(world, portal.destination.x, portal.destination.y, {
        water: true,
        lava: false,
      })
    )
      return 'The destination is obstructed.';
    s.scene[slot] = portal.target;
    s.x[slot] = s.targetX[slot] = portal.destination.x;
    s.y[slot] = s.targetY[slot] = portal.destination.y;
    s.vx[slot] = s.vy[slot] = 0;
    s.commitUntil[slot] = 0;
    return null;
  }
  presentation(code: number, entityId: number, day: number): ScenePresentation {
    const d = this.definitions[code]!;
    return {
      id: d.id,
      name:
        code === 0
          ? 'The elemental wilds'
          : (this.portals.find((p) => p.source === 0 && p.target === code)?.name ?? 'Interior'),
      kind: d.kind,
      width: d.width,
      height: d.height,
      outside: code === 0,
      floorContentId:
        code === 0
          ? undefined
          : `${d.kind === 'cave' ? 'cave' : 'interior'}_floor_${VILLAGES[d.village]!.name.toLowerCase()}`,
      sceneAssetIds: code === 0 ? [] : d.props.map((p) => p.contentId),
      props:
        code === 0
          ? this.portals
              .filter((p) => p.source === 0 && p.id.includes('cave:'))
              .map((p) => ({
                id: `visual:${p.id}`,
                contentId: 'cave_entrance',
                x: p.x,
                y: p.y - 1,
                layer: 'object' as const,
              }))
          : d.props,
      portals: this.portals
        .filter((p) => p.source === code)
        .map((p) => ({
          id: p.id,
          x: p.x,
          y: p.y,
          targetSceneId: this.id(p.target),
          name: p.name,
          allowed: this.allowed(p, entityId, day),
          reason: this.allowed(p, entityId, day) ? undefined : 'Private home — invitation required',
          assetContentIds: this.definitions[p.target]!.props.map((o) => o.contentId),
        })),
    };
  }
  snapshot(): SceneSnapshot {
    return {
      bindings: this.definitions.map((d) => ({ code: d.code, id: d.id })),
      states: [...this.contexts]
        .filter(([code]) => code !== 0)
        .map(([code, c]) => ({
          id: this.id(code),
          deltas: c.world.deltas(),
          drops: c.resources.drops,
          carrion: c.resources.carrion,
        })),
      invitations: [...this.invitations].map(([owner, untilDay]) => ({ owner, untilDay })),
    };
  }
  restore(snapshot: SceneSnapshot): void {
    for (const [code] of this.contexts) if (code !== 0) this.contexts.delete(code);
    this.invitations.clear();
    for (const invitation of snapshot.invitations)
      this.invitations.set(invitation.owner, invitation.untilDay);
    for (const state of snapshot.states) {
      const code = this.code(state.id);
      if (code <= 0) throw Error('Unknown saved pocket scene');
      const context = this.context(code);
      context.world.restore(state.deltas);
      context.resources.restore(state.drops.map((drop) => ({ ...drop, scene: code })));
      context.resources.carrion.push(
        ...state.carrion.map((body) => ({ ...structuredClone(body), scene: code })),
      );
    }
  }
  /** Existing numeric storage codes are remapped through saved stable scene IDs. */
  remap(saved: SceneSnapshot, code: number): number {
    const binding = saved.bindings.find((b) => b.code === code);
    const next = binding ? this.code(binding.id) : -1;
    if (next < 0) throw Error('Saved scene identity is missing');
    return next;
  }
}
