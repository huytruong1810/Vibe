import {
  NPC_PROFILES,
  SPECIES,
  SETTLEMENTS,
  VILLAGES,
  ITEMS,
  ContentRegistry,
} from '../content/definitions';
import {
  AgentActionValidator,
  DialogueResponseSchema,
  MemoryRepository,
  NpcProfileRegistry,
  PerceptionSystem,
  PlanResponseSchema,
  PlanService,
  ReflectionResponseSchema,
  ReflectionService,
  ScheduleExecutor,
  SocialEncounterSystem,
  fallbackDialogue,
  type DomainEvent,
  type InferenceJob,
  type Marker,
  type NpcState,
} from './agents';
import { CombatSystem, type PlayerState } from './combat';
import {
  CommandDispatcher,
  PauseController,
  RingBuffer,
  SeededRandom,
  SeasonSystem,
  WorldCalendar,
} from './core';
import {
  CareInteractionSystem,
  CreatureDecisionSystem,
  CreatureMode,
  NeedsSystem,
  WellbeingPolicy,
  PartnershipService,
  PopulationDirector,
  SimulationTierManager,
  moveOnTerrain,
} from './creatures';
import {
  ENTITY_STRIDE,
  WorldCommandSchema,
  type CommandResult,
  type CreatureView,
  type DialogueState,
  type RenderSnapshot,
  type TerrainView,
  type WorldCommand,
} from './contracts';
import { CraftingService, TwoSlotInventory } from './inventory';
import { NavigationService, SpatialIndex } from './navigation';
import {
  EnvironmentalReactionSystem,
  HarvestSystem,
  RegrowthSystem,
  ResourceLocator,
  ResourceStore,
} from './resources';
import {
  SettlementPlanner,
  WorldGenerator,
  SurfaceRules,
  type ChunkStore,
  nearestSettlement,
} from './world';
import { CONFIG, clamp, distanceSquared, normalize, type WorldPosition } from './values';
import { migrateSave, type GameSave } from './save-schema';
import { WorldQuery } from './query';
import { EntityStore, bindBody, NatureRules, SleepSystem } from './entities';
import { SurvivalController, EcologyService } from './survival';
import type { ActorPresentation, PresentationCue } from './presentation-contract';
import { EquipmentService } from './equipment';
import { SceneRegistry } from './scenes';
import { PhysiquePolicy } from './physique';

interface SceneSystems {
  world: ChunkStore;
  resources: ResourceStore;
  locator: ResourceLocator;
  navigation: NavigationService;
  survival: SurvivalController;
  decisions: CreatureDecisionSystem;
  harvest: HarvestSystem;
  regrowth: RegrowthSystem;
  reactions: EnvironmentalReactionSystem;
}

export class SimulationHost {
  readonly world: ChunkStore;
  readonly calendar = new WorldCalendar();
  readonly pauses = new PauseController();
  readonly dispatcher: CommandDispatcher;
  readonly entities = new EntityStore();
  /** Nonhuman-system compatibility alias; shares the same arrays and identities. */
  readonly creatures = this.entities;
  readonly survival: SurvivalController;
  readonly ecology: EcologyService;
  private acceleration = 1;
  get timeScale(): number {
    return this.acceleration;
  }
  readonly inventory = new TwoSlotInventory();
  readonly equipment = new EquipmentService(this.inventory);
  readonly scenes: SceneRegistry;
  private readonly sceneSystems = new Map<number, SceneSystems>();
  private readonly portalPaths = new Map<
    number,
    { scene: number; goal: string; points: readonly WorldPosition[] }
  >();
  private readonly motion = new Map<
    number,
    { x: number; y: number; scene: number; distance: number; discontinuity: number }
  >();
  readonly resources: ResourceStore;
  readonly locator: ResourceLocator;
  readonly navigation: NavigationService;
  readonly spatial = new SpatialIndex();
  readonly tiers = new SimulationTierManager();
  readonly player: PlayerState;
  readonly npcs: NpcState[];
  readonly combat: CombatSystem;
  readonly memories = new MemoryRepository();
  readonly markers: Marker[] = [];
  readonly journal = new Set<string>();
  readonly query: WorldQuery;
  readonly events = new RingBuffer<DomainEvent>(CONFIG.eventLimit);
  private readonly ecologyRandom: SeededRandom;
  private readonly combatRandom: SeededRandom;
  private readonly population: PopulationDirector;
  private readonly decisions: CreatureDecisionSystem;
  private readonly needs = new NeedsSystem();
  private readonly care: CareInteractionSystem;
  private readonly partnership: PartnershipService;
  private readonly harvest: HarvestSystem;
  private readonly regrowth: RegrowthSystem;
  readonly reactions: EnvironmentalReactionSystem;
  private readonly crafting = new CraftingService();
  private readonly schedules: ScheduleExecutor;
  private readonly perception = new PerceptionSystem(this.memories);
  private readonly social = new SocialEncounterSystem(this.memories);
  private readonly plans = new PlanService(this.memories, (id) => this.query.perceivedFacts(id));
  private readonly reflections = new ReflectionService(this.memories);
  private readonly validator = new AgentActionValidator();
  private readonly pendingJobs = new Map<string, InferenceJob>();
  private readonly outgoingJobs: InferenceJob[] = [];
  private readonly deferredResults: WorldCommand[] = [];
  private readonly deferredConversations: DialogueState[] = [];
  private readonly sentDeltas = new Map<number, string>();
  private movement = { x: 0, y: 0 };
  private debugEnabled = false;
  private eventSerial = 0;
  private cueSerial = 0;
  private readonly presentationCues = new RingBuffer<PresentationCue>(64);
  private readonly presentationPositions = new Map<
    number,
    { x: number; y: number; moving: boolean; tick: number; hp: number; recoveryUntil: number }
  >();
  private readonly presentationActions = new Map<
    number,
    { pose: ActorPresentation['pose']; until: number }
  >();
  tick = 0;
  dialogue: DialogueState | null = null;
  stepMs = 0;
  disposed = false;
  constructor(
    readonly seed = 42,
    origin = 1,
    population: number = CONFIG.population,
    session = `world:${Date.now()}:${seed}`,
  ) {
    new ContentRegistry().validate();
    if (!Number.isInteger(origin) || origin < 0 || origin > 2 || !Number.isInteger(seed))
      throw new Error('Invalid world origin or seed');
    if (!Number.isInteger(population) || population < 0 || population > CONFIG.creatureCapacity)
      throw new Error('Invalid population');
    this.dispatcher = new CommandDispatcher(session);
    this.world = new WorldGenerator().generate(seed);
    const root = new SeededRandom(seed);
    this.ecologyRandom = root.fork('ecology');
    this.combatRandom = root.fork('combat');
    this.entities.spawnHuman(0, origin, VILLAGES[origin]!.x + 0.5, VILLAGES[origin]!.y + 2.5);
    this.player = bindBody(
      {
        entityId: 0,
        x: VILLAGES[origin]!.x + 0.5,
        y: VILLAGES[origin]!.y + 2.5,
        facingX: 0,
        facingY: 1,
        hp: 100,
        stamina: 100,
        experience: 0,
        level: 1,
        origin,
        dashUntil: 0,
        dashReadyAt: 0,
        attack: null,
        guarding: false,
        invulnerableUntil: 0,
      } as PlayerState,
      this.entities,
      0,
    );
    this.navigation = new NavigationService(this.world);
    this.resources = new ResourceStore(this.world);
    this.locator = new ResourceLocator(this.resources);
    this.scenes = new SceneRegistry(this.world, this.resources);
    this.scenes.bindOverworldNavigation(this.navigation);
    this.population = new PopulationDirector(this.world, this.ecologyRandom, this.locator);
    this.population.seed(
      this.creatures,
      Math.max(
        0,
        population - NPC_PROFILES.filter((p) => p.partner).length - (population > 0 ? 6 : 0),
      ),
    );
    // Visible first encounters make the complete care loop discoverable at every origin.
    for (let v = 0; v < VILLAGES.length; v++)
      for (let s = 0; s < 2; s++) {
        if (population > 0)
          this.creatures.spawn(
            (v + s) % SPECIES.length,
            VILLAGES[v]!.x + 5 + s * 2,
            VILLAGES[v]!.y + 4,
          );
      }
    this.npcs = new NpcProfileRegistry().create();
    for (let i = 0; i < this.npcs.length; i++) {
      const npc = this.npcs[i]!;
      this.entities.spawnHuman(npc.entityId, NPC_PROFILES[i]!.village, npc.x, npc.y);
      const profile = NPC_PROFILES[i]!,
        body = this.entities.require(npc.entityId);
      this.entities.preferDiet(
        body,
        profile.dietPreferences ?? [(['wheat', 'fungi', 'berries'] as const)[i % 3]!],
      );
      this.entities.restrictDiet(body, profile.dietRestrictions ?? []);
      bindBody(npc, this.entities, npc.entityId);
    }
    this.query = new WorldQuery(
      this.npcs,
      this.creatures,
      this.calendar,
      this.resources,
      (scene) => this.systems(scene).resources,
    );
    for (let i = 0; i < this.npcs.length; i++) {
      const profile = NPC_PROFILES[i]!,
        npc = this.npcs[i]!;
      npc.affinity = profile.village === origin ? 5 : 0;
      if (profile.partner)
        npc.partner = this.creatures.id(
          this.creatures.spawn(
            SPECIES.findIndex((s) => s.id === profile.partner),
            npc.x + 0.6,
            npc.y + 0.6,
            npc.entityId,
          ),
        );
    }
    this.decisions = new CreatureDecisionSystem(
      this.creatures,
      this.world,
      this.resources,
      this.locator,
      this.navigation,
      this.ecologyRandom,
    );
    this.care = new CareInteractionSystem(this.creatures);
    this.partnership = new PartnershipService(this.creatures);
    this.harvest = new HarvestSystem(this.resources);
    this.regrowth = new RegrowthSystem(this.world);
    this.reactions = new EnvironmentalReactionSystem(this.world);
    this.schedules = new ScheduleExecutor(this.world, this.navigation, this.entities, (id) =>
      this.equipment.movement(id),
    );
    const homes = new Map(
      this.npcs.map((npc, index) => [npc.entityId, new SettlementPlanner().locations(index).home]),
    );
    this.survival = new SurvivalController(
      this.entities,
      this.world,
      this.resources,
      this.locator,
      this.navigation,
      (id) => homes.get(id),
      (id) => this.equipment.movement(id),
    );
    this.ecology = new EcologyService(
      this.entities,
      this.world,
      this.resources,
      this.ecologyRandom,
      (scene) => this.systems(scene).resources,
      (slot) => this.allocateCaveHabitat(slot),
    );
    this.ecology.target = population;
    this.sceneSystems.set(0, {
      world: this.world,
      resources: this.resources,
      locator: this.locator,
      navigation: this.navigation,
      survival: this.survival,
      decisions: this.decisions,
      harvest: this.harvest,
      regrowth: this.regrowth,
      reactions: this.reactions,
    });
    this.equipment.initialize(origin);
    if (population > 0)
      for (const i of this.entities.slots())
        if (!this.entities.protected(i)) this.allocateCaveHabitat(i);
    this.combat = new CombatSystem(
      this.creatures,
      this.player,
      this.npcs,
      this.world,
      (id) => this.systems(this.entities.scene[this.entities.require(id)]!).survival.feeding(id),
      this.equipment,
      (scene) => this.scenes.context(scene).world,
    );
    this.rebuildSpatial();
    this.tiers.update(this.creatures, this.player);
    this.emit(
      'arrival',
      `You arrived in ${VILLAGES[origin]!.name}. A whole little world is waking up.`,
      this.player,
      ['player'],
      5,
    );
  }
  get session(): string {
    return this.dispatcher.session;
  }
  get sceneId(): string {
    return this.scenes.id(this.entities.scene[this.entities.require(0)]!);
  }
  private allocateCaveHabitat(i: number): void {
    const s = this.entities;
    if (this.ecologyRandom.next() > 0.04 || s.protected(i)) return;
    for (const cave of this.scenes.definitions.filter((d) => d.kind === 'cave')) {
      let residents = 0,
        prey = 0;
      for (const j of s.slots())
        if (s.scene[j] === cave.code) {
          residents++;
          if (s.definition(i).prey?.includes(s.definition(j).id)) prey++;
        }
      if (residents >= 8 || (s.definition(i).prey?.length && prey < 2)) continue;
      const context = this.systems(cave.code),
        world = context.world,
        definition = s.definition(i);
      if (!definition.habitat.includes(world.biome[world.index(10, 10)]!)) continue;
      const candidate = context.locator
        .find({ x: 24.5, y: 16.5 }, s.diet(i), s.id(i), this.calendar.elapsedSeconds, 8)
        .find((p) =>
          SurfaceRules.walkable(world, p.x, p.y, {
            water: true,
            lava: definition.elements.includes('fire'),
          }),
        );
      if (!candidate && !definition.prey?.length) continue;
      const point = candidate ?? { x: 24.5, y: 16.5 };
      s.scene[i] = cave.code;
      s.x[i] = s.targetX[i] = point.x;
      s.y[i] = s.targetY[i] = point.y;
      return;
    }
  }
  private systems(scene: number): SceneSystems {
    const cached = this.sceneSystems.get(scene);
    if (cached) return cached;
    const context = this.scenes.context(scene),
      locator = new ResourceLocator(context.resources);
    const system = {
      ...context,
      locator,
      survival: new SurvivalController(
        this.entities,
        context.world,
        context.resources,
        locator,
        context.navigation,
        () => ({ x: 3.5, y: 4.5 }),
        (id) => this.equipment.movement(id),
      ),
      decisions: new CreatureDecisionSystem(
        this.entities,
        context.world,
        context.resources,
        locator,
        context.navigation,
        this.ecologyRandom,
      ),
      harvest: new HarvestSystem(context.resources),
      regrowth: new RegrowthSystem(context.world),
      reactions: new EnvironmentalReactionSystem(context.world),
    };
    this.sceneSystems.set(scene, system);
    return system;
  }
  private transfer(entityId: number, portalId: string): string | null {
    const i = this.entities.require(entityId),
      oldScene = this.entities.scene[i]!;
    const result = this.scenes.transfer(this.entities, entityId, portalId, this.calendar.day);
    if (result) return result;
    this.combat.cancelAction(entityId);
    this.systems(oldScene).survival.cancel(entityId);
    this.portalPaths.delete(entityId);
    if (entityId === 0) {
      this.movement = { x: 0, y: 0 };
      this.player.guarding = false;
      this.acceleration = 1;
      this.sentDeltas.clear();
    }
    this.systems(this.entities.scene[i]!);
    this.rebuildSpatial();
    return null;
  }
  private followPortal(i: number, targetScene: number, dt: number): boolean {
    const s = this.entities,
      id = s.id(i),
      scene = s.scene[i]!;
    if (scene === targetScene) return false;
    const portal = this.scenes.portals.find(
      (p) => p.source === scene && (scene === 0 ? p.target === targetScene : p.target === 0),
    );
    if (
      !portal ||
      !this.scenes.allowed(portal, s.owner[i]! >= 0 ? s.owner[i]! : id, this.calendar.day)
    )
      return true;
    if (distanceSquared(s.position(i), portal) <= 1) {
      this.transfer(id, portal.id);
      return true;
    }
    const context = this.systems(scene),
      key = `portal:${id}`;
    let cached = this.portalPaths.get(id);
    if (!cached || cached.scene !== scene || cached.goal !== portal.id) {
      cached = { scene, goal: portal.id, points: [] };
      this.portalPaths.set(id, cached);
      context.navigation.request({ id: key, start: s.position(i), goal: portal });
    }
    const result = context.navigation.take(key);
    if (result.status === 'found') cached.points = result.points;
    while (cached.points[0] && distanceSquared(s.position(i), cached.points[0]) < 0.12)
      cached.points = cached.points.slice(1);
    const goal = cached.points[0];
    if (!goal) return true;
    const dx = goal.x - s.x[i]!,
      dy = goal.y - s.y[i]!,
      length = Math.hypot(dx, dy),
      step = Math.min(
        length,
        dt *
          s.definition(i).speed *
          Math.max(
            0.25,
            WellbeingPolicy.speed(s.wellbeing(i)) *
              s.movementFactor(i) *
              this.equipment.movement(id),
          ),
      );
    const p = moveOnTerrain(
      context.world,
      s.position(i),
      (dx / Math.max(0.001, length)) * step,
      (dy / Math.max(0.001, length)) * step,
      { water: true, lava: false },
    );
    s.x[i] = p.x;
    s.y[i] = p.y;
    s.facingX[i] = dx / Math.max(0.001, length);
    s.facingY[i] = dy / Math.max(0.001, length);
    return true;
  }
  submit(input: WorldCommand): CommandResult {
    const parsed = WorldCommandSchema.safeParse(input);
    if (!parsed.success)
      return {
        id: typeof input?.id === 'string' ? input.id : 'invalid',
        ok: false,
        message: 'Invalid command payload.',
      };
    const envelope = parsed.data;
    const duplicate = this.dispatcher.accept(envelope.id, envelope.session);
    if (duplicate) return { id: envelope.id, ok: false, message: duplicate };
    const c = envelope.command;
    const allowedPaused = [
      'debug',
      'move',
      'dialogue',
      'closeDialogue',
      'battle',
      'agentResult',
      'agentFailure',
      'pause',
      'resume',
      'invite',
      'guard',
    ];
    if (this.pauses.paused && !allowedPaused.includes(c.type))
      return {
        id: envelope.id,
        ok: false,
        message: 'Close the conversation or menu before acting.',
      };
    const playerSlot = this.entities.require(this.player.entityId);
    const current = this.systems(this.entities.scene[playerSlot]!);
    if (c.type === 'dash' && (this.player.attack || this.player.guarding))
      return {
        id: envelope.id,
        ok: false,
        message: 'Finish the attack or release guard before dashing.',
      };
    if (c.type === 'guard' && c.active && this.pauses.paused)
      return { id: envelope.id, ok: false, message: 'Close the menu before guarding.' };
    if (
      ['equip', 'unequip', 'combine', 'drop', 'swap', 'use', 'enterPortal'].includes(c.type) &&
      (this.player.attack || this.equipment.hasReservation(0))
    )
      return {
        id: envelope.id,
        ok: false,
        message: 'Finish the current attack before changing equipment or entering.',
      };
    if (
      (this.entities.sleeping[playerSlot] || this.player.hp <= 0) &&
      [
        'move',
        'attack',
        'dash',
        'harvest',
        'travel',
        'interact',
        'care',
        'tame',
        'use',
        'service',
        'equip',
        'unequip',
        'enterPortal',
        'furniture',
        'reaction',
      ].includes(c.type)
    )
      return {
        id: envelope.id,
        ok: false,
        message: 'You are asleep or recovering. Wake when safe, or wait for an emergency.',
      };
    if ((c.type === 'agentResult' || c.type === 'agentFailure') && envelope.issuer !== 'inference')
      return { id: envelope.id, ok: false, message: 'Inference receipt required.' };
    let message = '',
      ok = true;
    switch (c.type) {
      case 'furniture': {
        const prop = this.scenes.definitions[this.entities.scene[playerSlot]!]!.props.find(
          (p) => p.id === c.propId,
        );
        if (
          !prop?.interaction ||
          distanceSquared(this.player, prop) > 2.25 ||
          this.combat.active(0)
        ) {
          ok = false;
          message = 'Move closer to an available furnishing.';
          break;
        }
        if (prop.interaction === 'rest') {
          if (this.combat.danger(0)) {
            ok = false;
            message = 'Find safety before resting.';
          } else {
            ok = SleepSystem.begin(this.entities, playerSlot);
            message = ok ? 'You settle down to rest.' : 'Recover before resting.';
          }
        } else if (prop.interaction === 'work') {
          message = this.crafting.combine(this.inventory);
          ok = message.startsWith('Crafted');
          if (ok) this.presentationActions.set(0, { pose: 'work', until: this.tick + 30 });
        } else if (prop.interaction === 'wash') {
          this.entities.cleanliness[playerSlot] = 1;
          message = 'You wash at the basin.';
          this.presentationActions.set(0, { pose: 'bathe', until: this.tick + 24 });
        } else if (prop.interaction === 'eat') {
          const pantry = current.resources.supply(this.player),
            item =
              pantry &&
              this.entities
                .diet(playerSlot)
                .find(
                  (id) =>
                    NatureRules.canConsume(this.entities, playerSlot, { id }) &&
                    (pantry.stock[id] ?? 0) > 0,
                );
          if (!pantry || !item || !current.resources.consumeSupply(pantry, item)) {
            ok = false;
            message = 'The pantry has no suitable food.';
          } else {
            this.entities.food[playerSlot] = clamp(
              this.entities.food[playerSlot]! + (ITEMS[item].food ?? 0),
            );
            message = 'You eat from the finite settlement supply.';
            this.presentationActions.set(0, { pose: 'eat', until: this.tick + 24 });
          }
        } else
          message =
            'Use the equipment panel to change carried garments; this wardrobe has no storage.';
        break;
      }
      case 'guard':
        if (
          c.active &&
          (this.player.attack ||
            this.player.hp <= 0 ||
            this.entities.sleeping[playerSlot] ||
            this.player.stamina <= 0)
        ) {
          ok = false;
          message = 'Recover before guarding.';
        } else this.player.guarding = c.active;
        break;
      case 'equip':
        message = this.equipment.equip(c.slot);
        ok = message.startsWith('Equipped');
        break;
      case 'unequip':
        message = this.equipment.unequip(
          c.slot,
          c.drop ? (item) => current.resources.dropItem(item, this.player) : undefined,
        );
        ok = message.startsWith('Unequipped');
        break;
      case 'enterPortal': {
        if (c.expectedScene !== this.sceneId) {
          ok = false;
          message = 'That entrance belongs to an obsolete scene.';
          break;
        }
        const portal = this.scenes.portals.find((p) => p.id === c.portalId);
        const companions = [...this.entities.slots()].filter(
          (i) =>
            this.entities.owner[i] === 0 &&
            portal &&
            distanceSquared(this.entities.position(i), portal) <= 2.25,
        );
        const failure = this.transfer(0, c.portalId);
        if (failure) {
          ok = false;
          message = failure;
          break;
        }
        if (portal) for (const i of companions) this.transfer(this.entities.id(i), portal.id);
        message = `Entered ${this.scenes.definitions[this.entities.scene[playerSlot]!]!.id}.`;
        break;
      }
      case 'invite': {
        const npc = this.npcs.find((n) => n.profileId === c.npcId);
        if (
          !npc ||
          this.dialogue?.npcId !== c.npcId ||
          distanceSquared(npc, this.player) > 9 ||
          npc.affinity < 5 ||
          this.combat.active(npc.entityId)
        ) {
          ok = false;
          message = 'Ask a nearby trusted resident while talking with them.';
        } else {
          this.dialogue.invitePending = true;
          message = 'Your visit request will be checked when the conversation closes.';
        }
        break;
      }
      case 'sleep':
        if (this.combat.danger(this.player.entityId)) {
          ok = false;
          message = 'Find safety before resting.';
        } else {
          ok = SleepSystem.begin(this.entities, playerSlot);
          this.movement = { x: 0, y: 0 };
          this.combat.cancelAction(0);
          this.player.guarding = false;
          message = 'You settle down to rest.';
        }
        break;
      case 'wake':
        if (this.entities.forcedRest[playerSlot]) {
          ok = false;
          message = 'Exhaustion requires 50% Rest before waking.';
        } else {
          this.entities.sleeping[playerSlot] = this.entities.voluntaryRest[playerSlot] = 0;
          this.acceleration = 1;
        }
        break;
      case 'accelerate':
        if (!this.entities.sleeping[playerSlot] || this.combat.danger(this.player.entityId)) {
          ok = false;
          message = 'Sleep safely before accelerating the world.';
        } else this.acceleration = c.factor;
        break;
      case 'service': {
        const supply = current.resources.supply(this.player);
        if (!supply || distanceSquared(supply, this.player) > 9) {
          ok = false;
          message = 'Move to a settlement service point by the waystone.';
          break;
        }
        if (c.action === 'eat') {
          const item = this.entities
            .diet(playerSlot)
            .find(
              (id) =>
                NatureRules.canConsume(this.entities, playerSlot, { id }) &&
                (supply.stock[id] ?? 0) > 0,
            );
          if (!item || !current.resources.consumeSupply(supply, item)) {
            ok = false;
            message = 'The pantry is empty.';
          } else {
            this.entities.food[playerSlot] = clamp(
              this.entities.food[playerSlot]! + (ITEMS[item].food ?? 0),
            );
            message = 'You ate from the finite settlement pantry.';
          }
        } else if (c.action === 'drink') {
          this.entities.water[playerSlot] = 1;
          message = 'You drink at the settlement spring.';
        } else {
          this.entities.cleanliness[playerSlot] = 1;
          message = 'You wash at the settlement spring.';
        }
        break;
      }
      case 'debug':
        this.debugEnabled = c.enabled;
        break;
      case 'move':
        this.movement = { x: c.x, y: c.y };
        break;
      case 'pause':
        this.pauses.acquire(c.token);
        this.acceleration = 1;
        this.movement = { x: 0, y: 0 };
        break;
      case 'resume':
        this.pauses.release(c.token);
        break;
      case 'dash':
        if (this.player.stamina < 22 || this.player.dashReadyAt > this.tick) {
          ok = false;
          message = 'Catch your breath before dashing again.';
        } else {
          this.player.stamina -= 22;
          this.player.dashUntil = this.tick + 7;
          this.player.dashReadyAt = this.tick + (this.player.origin === 2 ? 25 : 35);
        }
        break;
      case 'attack':
        ok = this.combat.attack(c.kind, this.tick);
        if (ok && c.kind === 'element')
          current.reactions.enqueue({
            index: current.world.index(
              this.player.x + this.player.facingX * 2,
              this.player.y + this.player.facingY * 2,
            ),
            type: (['fire', 'freeze', 'shock'] as const)[this.player.origin]!,
            remaining: 2,
          });
        break;
      case 'harvest': {
        const result = current.harvest.harvest(
          this.player,
          this.inventory,
          this.calendar.elapsedSeconds,
        );
        message = result.message;
        ok = result.ok;
        if (ok) this.emit('gather', message, this.player, ['player'], 2);
        break;
      }
      case 'combine':
        message = this.crafting.combine(this.inventory);
        ok = message.startsWith('Crafted');
        if (ok) this.emit('craft', message, this.player, ['player'], 4);
        break;
      case 'swap':
        this.inventory.swap();
        break;
      case 'drop': {
        const item = this.inventory.state[c.slot];
        if (
          !item ||
          !current.resources.dropItem(item, {
            x: this.player.x + this.player.facingX * 0.6,
            y: this.player.y + this.player.facingY * 0.6,
            scene: this.entities.scene[playerSlot]!,
          })
        ) {
          ok = false;
          message = 'Nothing can be dropped here.';
        } else {
          this.inventory.remove(c.slot);
          message = `Dropped ${ITEMS[item.id].name}.`;
        }
        break;
      }
      case 'use': {
        const item = this.inventory.state[c.slot];
        if (!item) {
          ok = false;
          message = 'That hand is empty.';
          break;
        }
        if (ITEMS[item.id].garment) {
          message = this.equipment.equip(c.slot);
          ok = message.startsWith('Equipped');
          break;
        }
        if (
          item.id === 'poultice' ||
          ITEMS[item.id].water ||
          NatureRules.canConsume(this.entities, playerSlot, item)
        ) {
          this.inventory.remove(c.slot);
          this.player.hp = Math.min(
            this.player.maxHp,
            this.player.hp + (item.id === 'poultice' ? 35 : 8),
          );
          this.entities.food[playerSlot] = clamp(
            this.entities.food[playerSlot]! + (ITEMS[item.id].food ?? 0),
          );
          this.entities.water[playerSlot] = clamp(
            this.entities.water[playerSlot]! + (ITEMS[item.id].water ?? 0),
          );
          this.player.stamina = Math.min(100, this.player.stamina + 15);
          this.presentationActions.set(0, {
            pose: ITEMS[item.id].water ? 'drink' : 'eat',
            until: this.tick + 24,
          });
          message = `Used ${ITEMS[item.id].name}.`;
        } else {
          ok = false;
          message = 'Hold tools while gathering; combine ingredients with your other hand.';
        }
        break;
      }
      case 'care':
        message = this.care.interact(
          this.entities.slot(c.creature) ?? -1,
          c.action,
          this.inventory,
          this.player,
          current.world,
        );
        ok = /enjoyed|feels better|leans into|clean and content/.test(message);
        if (ok) this.emit('care', message, this.player, ['player', `entity:${c.creature}`], 4);
        break;
      case 'tame': {
        const before = this.partnership.partner;
        message = this.partnership.tame(this.entities.slot(c.creature) ?? -1, this.player);
        ok = before === null && this.creatures.owner[this.entities.slot(c.creature) ?? -1] === 0;
        if (ok)
          this.emit('partnership', message, this.player, ['player', `entity:${c.creature}`], 8);
        break;
      }
      case 'release':
        message = this.partnership.release();
        break;
      case 'interact': {
        const npc = this.npcs.find((n) => n.profileId === c.npcId);
        if (
          !npc ||
          distanceSquared(npc, this.player) > 3 ** 2 ||
          this.dialogue ||
          this.combat.encounters.duel !== null ||
          this.combat.active(this.player.entityId) ||
          (npc && this.combat.active(npc.entityId))
        ) {
          ok = false;
          message = 'Move closer to an available villager.';
          break;
        }
        this.movement = { x: 0, y: 0 };
        this.pauses.acquire('dialogue');
        npc.facingX = this.player.x - npc.x;
        npc.facingY = this.player.y - npc.y;
        this.dialogue = {
          npcId: npc.profileId,
          revision: npc.revision,
          lines: [
            {
              speaker: 'npc',
              text: `${NPC_PROFILES.find((p) => p.id === npc.profileId)!.name} turns to greet you. The world rests while you talk.`,
              emotion: 'neutral',
            },
          ],
          staged: [],
          pendingJob: null,
        };
        break;
      }
      case 'dialogue': {
        if (!this.dialogue || this.dialogue.pendingJob) {
          ok = false;
          message = 'Wait for the villager’s response.';
          break;
        }
        if (this.dialogue.lines.length >= 31) {
          ok = false;
          message = 'Finish this conversation before starting a new one.';
          break;
        }
        const npc = this.npcs.find((n) => n.profileId === this.dialogue!.npcId)!;
        if (
          !this.memories.append(npc, {
            kind: 'conversation',
            text: `Player said: ${c.text}`,
            tick: this.tick,
            day: this.calendar.day,
            importance: 5,
            subjects: ['player'],
            sourceIds: [],
          })
        ) {
          ok = false;
          message = 'Memory storage is full. Let consolidation finish before continuing.';
          break;
        }
        this.dialogue.lines.push({ speaker: 'player', text: c.text });
        const job = this.plans.job(
          npc,
          NPC_PROFILES.find((p) => p.id === npc.profileId)!,
          this.session,
          this.tick,
          'dialogue',
          c.text,
        );
        this.dialogue.pendingJob = job.id;
        this.queueJob(job);
        break;
      }
      case 'closeDialogue':
        message = this.closeDialogue();
        break;
      case 'battle': {
        if (this.dialogue) this.closeDialogue();
        if (this.pauses.paused || this.combat.active(0)) {
          ok = false;
          message = 'Finish active combat and close other menus before agreeing to a duel.';
          break;
        }
        message = this.combat.encounters.startBattle(
          this.npcs.findIndex((n) => n.profileId === c.npcId),
          this.calendar.day,
          this.tick,
        );
        ok = message.startsWith('The friendly');
        if (ok) this.emit('battle', message, this.player, ['player', c.npcId], 6);
        break;
      }
      case 'agentFailure': {
        const job = this.pendingJobs.get(c.jobId);
        if (job?.kind === 'dialogue' && this.dialogue?.pendingJob === job.id) {
          const profile = NPC_PROFILES.find((p) => p.id === job.npcId)!;
          const lastLine =
            this.dialogue.lines.filter((l) => l.speaker === 'player').at(-1)?.text ?? '';
          this.acceptInference(job.id, fallbackDialogue(profile, lastLine));
          message = `Local AI unavailable (${c.reason}). A deterministic response kept the conversation playable.`;
        } else {
          this.pendingJobs.delete(c.jobId);
          message = 'Background inference postponed.';
        }
        break;
      }
      case 'agentResult': {
        const job = this.pendingJobs.get(c.jobId);
        if ((this.pauses.paused || this.acceleration > 1) && job && job.kind !== 'dialogue') {
          if (
            !this.deferredResults.some(
              (e) => e.command.type === 'agentResult' && e.command.jobId === c.jobId,
            )
          )
            this.deferredResults.push(envelope);
          message = 'Background proposal waits for simulation resume.';
        } else {
          const result = this.acceptInference(c.jobId, c.output);
          message = result.message;
          ok = result.ok;
        }
        break;
      }
      case 'reaction': {
        const x = Math.floor(this.player.x + this.player.facingX * 2),
          y = Math.floor(this.player.y + this.player.facingY * 2);
        ok = current.reactions.enqueue({
          index: current.world.index(x, y),
          type: c.reaction,
          remaining: c.reaction === 'shock' ? 3 : 2,
        });
        message = `${c.reaction} directed at the ground ahead.`;
        break;
      }
      case 'travel': {
        const destination = SETTLEMENTS.find((s) => s.id === c.settlementId)!,
          nearest = nearestSettlement(this.player);
        if (
          this.entities.scene[playerSlot] !== 0 ||
          distanceSquared(nearest, this.player) > 6 ** 2 ||
          this.combat.encounters.target !== null
        ) {
          ok = false;
          message = 'Return to a village or outpost waystone before traveling.';
          break;
        }
        this.player.x = destination.x + 0.5;
        this.player.y = destination.y + 2.5;
        this.movement = { x: 0, y: 0 };
        const partner = this.partnership.partner;
        if (partner !== null) {
          this.creatures.scene[partner] = 0;
          this.creatures.x[partner] = this.player.x + 1;
          this.creatures.y[partner] = this.player.y;
        }
        message = `The waystone carries you to ${destination.name}.`;
        this.emit('travel', message, this.player, ['player'], 4);
        break;
      }
    }
    if (ok) {
      const pose: ActorPresentation['pose'] | null =
        c.type === 'service'
          ? c.action === 'wash'
            ? 'bathe'
            : c.action
          : c.type === 'harvest' || c.type === 'combine'
            ? 'work'
            : c.type === 'care'
              ? 'social'
              : null;
      if (pose) this.presentationActions.set(0, { pose, until: this.tick + 24 });
    }
    return { id: envelope.id, ok, message };
  }
  private queueJob(job: InferenceJob): void {
    if (this.pendingJobs.size >= 16) {
      const oldest = [...this.pendingJobs.values()].find((j) => j.kind !== 'dialogue');
      if (oldest) this.pendingJobs.delete(oldest.id);
    }
    this.pendingJobs.set(job.id, job);
    this.outgoingJobs.push(job);
  }
  private acceptInference(id: string, output: unknown): { ok: boolean; message: string } {
    const job = this.pendingJobs.get(id);
    if (!job || job.session !== this.session)
      return { ok: false, message: 'Obsolete inference result ignored.' };
    this.pendingJobs.delete(id);
    const npc = this.npcs.find((n) => n.profileId === job.npcId)!;
    if (job.expectedRevision !== npc.revision)
      return this.failedDialogue(job, 'The villager’s state changed before the response arrived.');
    if (job.kind === 'dialogue') {
      if (!this.dialogue || this.dialogue.npcId !== job.npcId || this.dialogue.pendingJob !== id)
        return { ok: false, message: 'Conversation ended before response arrived.' };
      const parsed = DialogueResponseSchema.safeParse(output);
      this.dialogue.pendingJob = null;
      if (!parsed.success) {
        this.dialogue.lines.push({
          speaker: 'system',
          text: 'The local model returned an invalid response. Please try again.',
        });
        return { ok: false, message: 'Invalid structured dialogue rejected.' };
      }
      this.dialogue.lines.push({
        speaker: 'npc',
        text: parsed.data.dialogue,
        emotion: parsed.data.emotion,
      });
      this.memories.append(npc, {
        kind: 'conversation',
        text: `${NPC_PROFILES.find((p) => p.id === npc.profileId)!.name} said: ${parsed.data.dialogue} (proposed action: ${parsed.data.action.type}; not yet executed)`,
        tick: this.tick,
        day: this.calendar.day,
        importance: 5,
        subjects: ['player', npc.profileId],
        sourceIds: [],
      });
      if (parsed.data.action.type !== 'NONE') this.dialogue.staged.push(parsed.data.action);
      return {
        ok: true,
        message:
          parsed.data.action.type === 'NONE' ? '' : 'An offer is staged until you finish talking.',
      };
    }
    if (job.kind === 'plan') {
      const parsed = PlanResponseSchema.safeParse(output);
      if (
        !parsed.success ||
        parsed.data.sourceIds.some((source) => !job.sourceIds.includes(source))
      )
        return { ok: false, message: 'Ungrounded personal plan rejected.' };
      const index = this.npcs.indexOf(npc),
        point = new SettlementPlanner().locations(index)[parsed.data.location];
      if (!SurfaceRules.walkable(this.world, point.x, point.y))
        return { ok: false, message: 'Personal plan destination is blocked.' };
      // Authored sleeping hours and urgent following commitments take precedence.
      if (
        this.calendar.hour < 6 ||
        this.calendar.hour >= 22 ||
        npc.followingUntil > this.calendar.elapsedSeconds
      )
        return { ok: false, message: 'Personal plan deferred for an existing obligation.' };
      npc.override = {
        location: parsed.data.location,
        until: this.calendar.elapsedSeconds + parsed.data.durationSeconds,
        activity: parsed.data.activity,
      };
      npc.revision++;
      return { ok: true, message: '' };
    }
    const parsed = ReflectionResponseSchema.safeParse(output);
    if (!parsed.success) return { ok: false, message: 'Invalid memory synthesis rejected.' };
    const committed =
      job.kind === 'compaction'
        ? this.memories.compact(npc, job.memoryRevision, job.sourceIds, parsed.data)
        : this.reflections.commit(
            npc,
            job,
            parsed.data,
            this.tick,
            this.calendar.day,
            this.calendar.elapsedSeconds,
          );
    return {
      ok: committed,
      message: committed ? '' : 'Memory revision changed; source records were retained.',
    };
  }
  private failedDialogue(job: InferenceJob, reason: string): { ok: boolean; message: string } {
    if (this.dialogue?.pendingJob === job.id) {
      this.dialogue.pendingJob = null;
      this.dialogue.lines.push({ speaker: 'system', text: reason });
    }
    return { ok: false, message: reason };
  }
  private closeDialogue(): string {
    if (!this.dialogue) return '';
    const dialogue = this.dialogue;
    if (dialogue.pendingJob) this.pendingJobs.delete(dialogue.pendingJob);
    this.dialogue = null;
    this.pauses.release('dialogue');
    if (this.pauses.paused) {
      this.deferredConversations.push(dialogue);
      return 'Your offers will be checked when the world resumes.';
    }
    return this.commitConversation(dialogue);
  }
  private commitConversation(dialogue: DialogueState): string {
    const npc = this.npcs.find((n) => n.profileId === dialogue.npcId)!;
    const receipts: string[] = [];
    const local = this.systems(this.entities.scene[this.entities.require(npc.entityId)]!);
    if (dialogue.invitePending) {
      if (
        npc.revision === dialogue.revision &&
        npc.affinity >= 5 &&
        distanceSquared(npc, this.player) <= 9 &&
        !this.combat.active(npc.entityId)
      ) {
        this.scenes.invite(npc.entityId, this.calendar.day);
        receipts.push('Your visit is welcome until the end of today.');
      } else receipts.push('The visit invitation could not be confirmed.');
    }
    if (npc.revision === dialogue.revision)
      for (const action of dialogue.staged) {
        const receipt = this.validator.execute(npc, action, {
          calendar: this.calendar,
          world: local.world,
          resources: local.resources,
          locator: local.locator,
          npcs: this.npcs,
          player: this.player,
          markers: this.markers,
          sourceIds: npc.memory.records
            .filter((m) => m.kind === 'conversation')
            .slice(-4)
            .map((m) => m.id),
        });
        receipts.push(receipt.message);
        this.emit(
          receipt.ok ? 'commitment' : 'action-rejected',
          receipt.message,
          npc,
          [npc.profileId, 'player'],
          receipt.ok ? 5 : 2,
        );
      }
    npc.affinity = clamp(npc.affinity + 1, -100, 100);
    const body = this.entities.require(npc.entityId),
      playerBody = this.entities.require(0);
    this.entities.recreation[body] = clamp(this.entities.recreation[body]! + 0.15);
    this.entities.recreation[playerBody] = clamp(this.entities.recreation[playerBody]! + 0.15);
    this.journal.add('conversation');
    return receipts.join(' ') || 'The world stirs again. Your conversation is remembered.';
  }
  private emit(
    type: string,
    text: string,
    at: WorldPosition,
    subjects: readonly string[],
    importance: number,
  ): void {
    this.journal.add(type);
    const event: DomainEvent = {
      id: `${this.session}:e${++this.eventSerial}`,
      type,
      text,
      x: at.x,
      y: at.y,
      scene: at.scene ?? 0,
      tick: this.tick,
      day: this.calendar.day,
      subjects,
      importance,
    };
    this.events.push(event);
    this.perception.observe(this.npcs, event);
  }
  private rebuildSpatial(): void {
    this.spatial.clear();
    for (const i of this.entities.slots())
      if (this.creatures.alive[i])
        this.spatial.insert(
          i,
          this.creatures.x[i]!,
          this.creatures.y[i]!,
          this.creatures.scene[i]!,
        );
  }
  step(): void {
    if (this.disposed || this.pauses.paused) return;
    const started = performance.now(),
      dt = 1 / CONFIG.tickRate;
    for (const conversation of this.deferredConversations.splice(0))
      this.commitConversation(conversation);
    for (const envelope of this.acceleration === 1 ? this.deferredResults.splice(0) : [])
      if (envelope.command.type === 'agentResult')
        this.acceptInference(envelope.command.jobId, envelope.command.output);
    this.tick++;
    this.calendar.advance(dt);
    for (const system of this.sceneSystems.values())
      system.navigation.advance(Math.max(16, Math.floor(800 / this.sceneSystems.size)));
    const input = normalize(this.movement.x, this.movement.y),
      dash = this.player.dashUntil > this.tick;
    if (input.x || input.y) {
      this.player.facingX = input.x;
      this.player.facingY = input.y;
    }
    const playerSlot = this.entities.require(0);
    const direction =
      this.entities.sleeping[playerSlot] || this.player.hp <= 0
        ? { x: 0, y: 0 }
        : dash
          ? { x: this.player.facingX, y: this.player.facingY }
          : input;
    const active = this.systems(this.entities.scene[playerSlot]!),
      tile = active.world.index(this.player.x, this.player.y),
      swimming = active.world.fluid[tile] === 1 || active.world.fluid[tile] === 2;
    const speed =
      (dash ? 12 : 4.2) *
      Math.max(
        0.25,
        WellbeingPolicy.speed(this.entities.wellbeing(playerSlot)) *
          this.entities.movementFactor(playerSlot) *
          this.equipment.movement(0),
      ) *
      (this.player.guarding ? 0.5 : 1) *
      (swimming ? (this.player.origin === 1 ? 0.9 : 0.65) : 1);
    const moved = moveOnTerrain(
      active.world,
      this.player,
      direction.x * speed * dt,
      direction.y * speed * dt,
      { lava: false, water: true },
    );
    this.player.x = moved.x;
    this.player.y = moved.y;
    if (this.tick % 10 === 0) {
      this.rebuildSpatial();
      this.tiers.update(this.creatures, this.player);
    }
    const s = this.creatures,
      now = this.calendar.elapsedSeconds;
    // Universal survival runs on simulation time; tactical combat preempts ordinary plans.
    if (this.tick % 30 === 0)
      for (const i of s.slots()) {
        if (s.id(i) === 0) continue;
        const scheduled = s.isHuman(i) && (this.calendar.hour < 6 || this.calendar.hour >= 22);
        if (!this.combat.active(s.id(i)) || s.water[i]! < 0.08 || s.food[i]! < 0.08)
          this.systems(s.scene[i]!).survival.decide(i, now, scheduled);
        SleepSystem.update(s, i, 0, now, this.combat.danger(s.id(i)));
      }
    for (const i of this.tiers.detailed) {
      if (this.combat.active(s.id(i))) continue;
      if (s.owner[i] === 0 && s.scene[i] !== s.scene[playerSlot]) {
        this.followPortal(i, s.scene[playerSlot]!, dt);
        continue;
      }
      const system = this.systems(s.scene[i]!);
      if (system.survival.active(i)) system.survival.move(i, dt, now);
      else {
        if (this.tick % 30 === i % 30) system.decisions.decide(i, now, this.player);
        system.decisions.move(i, dt, now, this.spatial);
      }
    }
    for (let i = 0; i < this.npcs.length; i++) {
      const npc = this.npcs[i]!,
        body = s.require(npc.entityId);
      const pursuit = this.combat.pursuits.get(npc.entityId),
        target = pursuit && s.slot(pursuit.target);
      const home = this.scenes.home(npc.entityId);
      const rest =
        (this.calendar.hour < 6 ||
          this.calendar.hour >= 22 ||
          s.rest[body]! < 0.2 ||
          !!s.forcedRest[body]) &&
        s.food[body]! > 0.12 &&
        s.water[body]! > 0.12;
      const desired =
        typeof target === 'number'
          ? s.scene[target]!
          : npc.followingUntil > now
            ? s.scene[playerSlot]!
            : rest
              ? (home?.code ?? 0)
              : 0;
      const routing = s.hp[body]! > 0 && !s.sleeping[body] && this.followPortal(body, desired, dt);
      if (s.hp[body]! > 0 && !this.combat.active(npc.entityId)) {
        const system = this.systems(s.scene[body]!);
        if (routing) npc.activity = rest ? 'Returning home to rest' : 'Walking through an entrance';
        else if (system.survival.active(body)) {
          system.survival.move(body, dt, now);
          npc.activity = s.sleeping[body] ? 'Sleeping' : `Seeking ${CreatureMode[s.mode[body]!]}`;
        } else if (s.scene[body] !== 0) npc.activity = 'Resting at home';
        else if (this.combat.encounters.duel !== i)
          this.schedules.advance(npc, i, this.calendar, this.player, dt);
      }
      if (this.tick % 300 === 0 && s.hp[body]! > 0) {
        const account = this.systems(s.scene[body]!).resources;
        const supply = account.supply(npc);
        if (supply && distanceSquared(npc, supply) < 9)
          this.equipment.resupply(npc.entityId, () =>
            account.consumeSupply(supply, 'arrow-bundle'),
          );
      }
      const partner = npc.partner === null ? undefined : s.slot(npc.partner);
      if (
        partner !== undefined &&
        s.hp[partner]! > 0 &&
        !this.combat.active(s.id(partner)) &&
        !this.systems(s.scene[partner]!).survival.active(partner)
      ) {
        if (s.scene[partner] !== s.scene[body]) {
          this.followPortal(partner, s.scene[body]!, dt);
          continue;
        }
        s.mode[partner] = CreatureMode.Follow;
        s.targetX[partner] = npc.x + 0.6;
        s.targetY[partner] = npc.y + 0.6;
        if (!s.tier[partner])
          this.systems(s.scene[partner]!).decisions.move(partner, dt, now, this.spatial);
      }
    }
    if (this.tick % 30 === 0)
      for (let i = 0; i < s.count; i++)
        if (s.alive[i] && !s.tier[i] && !this.combat.active(s.id(i))) {
          const system = this.systems(s.scene[i]!);
          if (s.owner[i] === 0 && s.scene[i] !== s.scene[playerSlot])
            this.followPortal(i, s.scene[playerSlot]!, 1);
          else if (s.owner[i] === -1 && this.scenes.definitions[s.scene[i]!]!.kind === 'building')
            this.followPortal(i, 0, 1);
          else if (system.survival.active(i)) system.survival.move(i, 1, now);
          else if (s.scene[i] !== 0) {
            this.systems(s.scene[i]!).decisions.decide(i, now, s.position(i));
            this.systems(s.scene[i]!).decisions.move(i, 1, now, this.spatial);
          }
        }
    this.rebuildSpatial();
    for (const event of this.combat.advance(this.tick, this.spatial, now)) {
      if (
        event.type === 'hit' ||
        event.type === 'assault' ||
        event.type === 'hunt' ||
        event.type === 'victory'
      )
        this.presentationCues.push({
          sequence: ++this.cueSerial,
          tick: this.tick,
          actor: event.actor ?? 0,
          target: event.target,
          kind: event.type === 'hit' || event.type === 'assault' ? 'hit' : 'defeat',
          strength: event.impact,
        });
      this.emit(
        event.type,
        event.text,
        event.target !== null && s.slot(event.target) !== undefined
          ? s.position(s.require(event.target))
          : this.player,
        [
          event.actor === 0 ? 'player' : `entity:${event.actor ?? 0}`,
          ...(event.target === null
            ? []
            : [
                this.npcs.find((n) => n.entityId === event.target)?.profileId ??
                  `entity:${event.target}`,
              ]),
        ],
        event.type === 'victory' ? 7 : 2,
      );
      if (event.type === 'rescue') this.rescue();
      if (event.type === 'assault' && event.target !== null) this.scenes.revoke(event.target);
    }
    // Recoil is a short, collision-constrained impulse, never a teleport through terrain.
    for (const i of s.slots()) {
      const rx = s.recoilX[i]!,
        ry = s.recoilY[i]!;
      if (Math.abs(rx) + Math.abs(ry) < 0.01) {
        s.recoilX[i] = s.recoilY[i] = 0;
        continue;
      }
      const world = this.systems(s.scene[i]!).world;
      const moved = moveOnTerrain(world, s.position(i), rx * dt, ry * dt, {
        water: true,
        lava: s.definition(i).elements.includes('fire'),
      });
      s.x[i] = moved.x;
      s.y[i] = moved.y;
      s.recoilX[i] = rx * Math.exp(-12 * dt);
      s.recoilY[i] = ry * Math.exp(-12 * dt);
    }
    if (this.tick % 30 === 0) {
      for (const i of this.needs.advance(s, 1, now, this.player, !!(input.x || input.y)))
        this.emit(
          'partnership-lost',
          `${s.definition(i).name} has returned to the wild. Care can earn its trust again.`,
          s.position(i),
          ['player', `entity:${s.id(i)}`],
          8,
        );
      // Coarse ecology keeps identity and uses the same resource quantities.
      this.population.migrate(s, this.calendar.season, 1, now);
      if (this.tick % 300 === 0) this.resources.replenish(this.locator, now);
      this.ecology.replenish(now);
      if (active.world.flags[active.world.index(this.player.x, this.player.y)]! & 32) {
        this.player.hp = Math.max(0, this.player.hp - (this.player.origin === 0 ? 0.5 : 1));
        SleepSystem.interrupt(s, playerSlot, now);
        s.lastDamageAt[playerSlot] = this.tick;
      }
      for (const [scene, system] of this.sceneSystems) {
        system.regrowth.advance(
          now,
          this.calendar.season,
          Math.max(1, Math.floor(64 / this.sceneSystems.size)),
        );
        if (scene !== 0)
          for (let j = system.resources.carrion.length - 1; j >= 0; j--)
            if (
              system.resources.carrion[j]!.expiresAt <= now ||
              system.resources.carrion[j]!.remaining <= 0
            )
              system.resources.carrion.splice(j, 1);
      }
      const social = this.social.advance(this.npcs, now, this.tick, this.calendar.day);
      if (social) {
        // Social speech is already attributed in memory; do not broadcast it as an omniscient fact.
        const a = this.npcs.find((n) => n.profileId === social.a)!;
        this.events.push({
          id: `${this.session}:e${++this.eventSerial}`,
          tick: this.tick,
          day: this.calendar.day,
          type: 'social',
          text: social.text,
          x: a.x,
          y: a.y,
          scene: a.scene ?? 0,
          subjects: [social.a, social.b],
          importance: 3,
        });
      }
    }
    for (const [scene, system] of this.sceneSystems)
      for (const index of system.reactions.advance(
        now,
        Math.max(1, Math.floor(64 / this.sceneSystems.size)),
      ))
        for (const i of this.spatial.query(
          index % system.world.size,
          Math.floor(index / system.world.size),
          1.5,
          16,
          scene,
        )) {
          if (
            distanceSquared(s.position(i), {
              x: index % system.world.size,
              y: Math.floor(index / system.world.size),
              scene,
            }) < 3
          )
            s.hp[i] = Math.max(0, s.hp[i]! - 2);
        }
    for (const i of s.slots())
      if (s.hp[i]! <= 0) {
        s.sleeping[i] = 0;
        if (s.protected(i)) s.downed[i] = 1;
      }
    this.ecology.resolveDeaths(now);
    if (this.tick % 30 === 0) {
      for (const system of this.sceneSystems.values()) {
        system.survival.pruneRetired();
        system.decisions.pruneRetired();
      }
    }
    this.combat.pruneRetired();
    SleepSystem.update(s, playerSlot, 0, now, this.combat.danger(0));
    if (
      !s.sleeping[playerSlot] ||
      s.food[playerSlot]! < 0.12 ||
      s.water[playerSlot]! < 0.12 ||
      this.combat.danger(0) ||
      s.lastDamageAt[playerSlot] === this.tick
    )
      this.acceleration = 1;
    if (this.acceleration === 1 && this.tick % 900 === 0 && this.pendingJobs.size < 4) {
      const job = this.plans.background(this.npcs, this.session, this.tick, now);
      if (job) this.queueJob(job);
    }
    this.stepMs = performance.now() - started;
    for (const i of s.slots()) {
      const id = s.id(i),
        before = this.motion.get(id),
        scene = s.scene[i]!,
        d = before ? Math.hypot(s.x[i]! - before.x, s.y[i]! - before.y) : 0;
      this.motion.set(id, {
        x: s.x[i]!,
        y: s.y[i]!,
        scene,
        distance: (before?.distance ?? 0) + (before?.scene === scene && d < 4 ? d : 0),
        discontinuity:
          (before?.discontinuity ?? 0) + (before && (before.scene !== scene || d >= 4) ? 1 : 0),
      });
    }
    for (const id of this.motion.keys()) if (s.slot(id) === undefined) this.motion.delete(id);
  }
  advance(ticks: number): void {
    for (let i = 0; i < ticks; i++) this.step();
  }
  private rescue(): void {
    const v = VILLAGES[this.player.origin]!;
    this.player.x = v.x + 0.5;
    this.player.y = v.y + 2.5;
    this.player.hp = this.player.maxHp;
    this.player.stamina = 100;
    this.combat.cancelAction(0);
    const body = this.entities.require(0);
    this.entities.scene[body] = 0;
    this.player.guarding = false;
    this.sentDeltas.clear();
    this.entities.downed[body] = 0;
    this.entities.recoverAt[body] = 0;
    this.entities.food[body] = Math.max(0.5, this.entities.food[body]!);
    this.entities.water[body] = Math.max(0.5, this.entities.water[body]!);
    this.acceleration = 1;
    this.movement = { x: 0, y: 0 };
    const partner = this.partnership.partner;
    if (partner !== null) {
      this.creatures.scene[partner] = 0;
      this.creatures.x[partner] = this.player.x + 1;
      this.creatures.y[partner] = this.player.y;
      this.creatures.hp[partner] = this.creatures.maxHp(partner) * 0.65;
      this.creatures.mode[partner] = CreatureMode.Follow;
    }
  }
  terrain(): TerrainView {
    const world = this.systems(this.entities.scene[this.entities.require(0)]!).world;
    return {
      size: world.size,
      seed: this.seed,
      biome: world.biome.slice(),
      elevation: world.elevation.slice(),
      fluid: world.fluid.slice(),
      flags: world.flags.slice(),
      resource: world.resource.slice(),
      quantity: world.quantity.slice(),
      buildings: world.buildings.map((b) => ({ ...b })),
    };
  }
  frame(buffer?: ArrayBuffer): RenderSnapshot {
    const activeScene = this.entities.scene[this.entities.require(0)]!,
      local = this.systems(activeScene);
    const capacity = (1 + this.npcs.length + this.creatures.count) * ENTITY_STRIDE;
    const byteLength = capacity * 4 + (capacity / ENTITY_STRIDE) * 4;
    const transport =
      buffer && buffer.byteLength >= byteLength ? buffer : new ArrayBuffer(byteLength);
    const packed = new Float32Array(transport, 0, capacity);
    const ids = new Uint32Array(transport, capacity * 4, capacity / ENTITY_STRIDE);
    let count = 0;
    const pack = (
      id: number,
      kind: number,
      x: number,
      y: number,
      color: number,
      hp: number,
      profile: number,
      flags: number,
      mode: number,
      vx: number,
      vy: number,
    ): void => {
      const slot = this.entities.slot(id);
      if (slot === undefined || this.entities.scene[slot] !== activeScene) return;
      ids[count] = id;
      const at = count++ * ENTITY_STRIDE,
        elevation = local.world.elevation[local.world.index(x, y)] ?? 0;
      packed.set([0, kind, x, y, elevation, color, hp, profile, flags, mode, vx, vy], at);
    };
    pack(
      0,
      0,
      this.player.x,
      this.player.y,
      0xe9d7b0,
      this.player.hp / this.player.maxHp,
      this.player.origin,
      this.player.dashUntil > this.tick ? 1 : 0,
      this.player.attack ? 1 : 0,
      this.player.facingX,
      this.player.facingY,
    );
    for (let i = 0; i < this.npcs.length; i++) {
      const n = this.npcs[i]!;
      pack(
        n.entityId,
        1,
        n.x,
        n.y,
        VILLAGES[NPC_PROFILES[i]!.village]!.color,
        this.entities.hp[this.entities.require(n.entityId)]! /
          this.entities.maxHp(this.entities.require(n.entityId)),
        NPC_PROFILES[i]!.village,
        0,
        0,
        n.facingX,
        n.facingY,
      );
    }
    const visible: CreatureView[] = [],
      s = this.creatures;
    for (let i = 0; i < s.count; i++)
      if (s.alive[i] && s.scene[i] === activeScene) {
        const gesture =
          s.owner[i]! > 0 &&
          (this.npcs.find((n) => n.entityId === s.owner[i])?.gestureUntil ?? 0) >
            this.calendar.elapsedSeconds
            ? 4
            : 0;
        pack(
          s.id(i),
          2,
          s.x[i]!,
          s.y[i]!,
          s.definition(i).color,
          s.hp[i]! / s.maxHp(i),
          s.species[i]!,
          (s.owner[i] === 0 ? 1 : s.owner[i]! > 0 ? 2 : 0) | gesture,
          s.mode[i]!,
          s.vx[i]!,
          s.vy[i]!,
        );
        if (s.owner[i] === 0 || distanceSquared(s.position(i), this.player) < 30 ** 2)
          visible.push({
            goal: { x: s.targetX[i]!, y: s.targetY[i]! },
            commitUntil: s.commitUntil[i]!,
            id: s.id(i),
            name: s.definition(i).name,
            species: s.definition(i).id,
            heightMeters: s.heightMeters[i]!,
            massKg: s.massKg[i]!,
            elements: s.definition(i).elements,
            owner: s.owner[i]!,
            hp: s.hp[i]!,
            maxHp: s.maxHp(i),
            level: s.level[i]!,
            experience: s.experience[i]!,
            attack: s.definition(i).attack,
            defense: s.definition(i).defense,
            speed: s.definition(i).speed,
            rest: s.rest[i]!,
            sleeping: !!s.sleeping[i],
            forcedRest: !!s.forcedRest[i],
            nature: s.displayNature(i),
            kind: s.isHuman(i) ? 'human' : 'nonhuman',
            food: s.food[i]!,
            water: s.water[i]!,
            recreation: s.recreation[i]!,
            cleanliness: s.cleanliness[i]!,
            wildness: s.wildness[i]!,
            trust: s.trust[i]!,
            mode: CreatureMode[s.mode[i]!] ?? 'Wander',
            x: s.x[i]!,
            y: s.y[i]!,
          });
      }
    const deltas = local.world.deltas().filter((delta) => {
      const signature = `${delta.quantity}:${delta.flags}:${delta.fluid}`;
      if (this.sentDeltas.get(delta.index) === signature) return false;
      this.sentDeltas.set(delta.index, signature);
      return true;
    });
    const jobs = this.outgoingJobs.splice(0).filter((job) => this.pendingJobs.has(job.id));
    const actors: ActorPresentation[] = [];
    for (const slot of s.slots()) {
      if (s.scene[slot] !== activeScene) continue;
      if (distanceSquared(s.position(slot), this.player) > 36 ** 2 && s.owner[slot] !== 0) continue;
      const id = s.id(slot),
        npc = this.npcs.find((n) => n.entityId === id),
        x = s.x[slot]!,
        y = s.y[slot]!;
      const previous = this.presentationPositions.get(id);
      const moving =
        previous?.tick === this.tick
          ? previous.moving
          : !!previous && Math.hypot(x - previous.x, y - previous.y) > 0.001;
      const recoveryUntil =
        previous && previous.hp <= 0 && s.hp[slot]! > 0
          ? this.tick + 24
          : (previous?.recoveryUntil ?? 0);
      this.presentationPositions.set(id, {
        x,
        y,
        moving,
        tick: this.tick,
        hp: s.hp[slot]!,
        recoveryUntil,
      });
      const task = local.survival.activity(id),
        action = this.combat.presentation(id, this.tick);
      const mode = s.mode[slot],
        recent = this.presentationActions.get(id);
      if (recent && recent.until <= this.tick) this.presentationActions.delete(id);
      const atGoal =
        distanceSquared(s.position(slot), { x: s.targetX[slot]!, y: s.targetY[slot]! }) < 1;
      const pose: ActorPresentation['pose'] =
        s.hp[slot]! <= 0
          ? 'downed'
          : action
            ? 'attack'
            : id === 0 && this.player.dashUntil > this.tick
              ? 'dash'
              : s.sleeping[slot]
                ? 'sleep'
                : recoveryUntil > this.tick
                  ? 'recovery'
                  : this.combat.presentationGuard(id, this.tick)
                    ? 'guard'
                    : moving
                      ? 'walk'
                      : task === 'food' || (mode === CreatureMode.Feed && atGoal)
                        ? 'eat'
                        : task === 'water' || (mode === CreatureMode.Drink && atGoal)
                          ? 'drink'
                          : task === 'clean' || (mode === CreatureMode.Bathe && atGoal)
                            ? 'bathe'
                            : task === 'social' || (mode === CreatureMode.Socialize && atGoal)
                              ? 'social'
                              : recent && recent.until > this.tick
                                ? recent.pose
                                : npc
                                  ? this.schedules.presentation(
                                      npc,
                                      this.npcs.indexOf(npc),
                                      this.calendar,
                                    )
                                  : 'idle';
      actors.push({
        physique: {
          ...s.physique(slot),
          strideTiles: PhysiquePolicy.stride(s.physique(slot)),
          grounded: s.definition(slot).id !== 'cindermoth',
        },
        activityInstanceId: recent ? `${id}:${recent.pose}:${recent.until}` : undefined,
        activityVariant: npc ? NPC_PROFILES.find((p) => p.id === npc.profileId)?.role : undefined,
        sceneId: this.scenes.id(activeScene),
        rigId: s.isHuman(slot) ? 'human_standard_v1' : s.definition(slot).id,
        appearanceRevision: JSON.stringify(this.equipment.view(id).worn)
          .split('')
          .reduce((hash, c) => (Math.imul(hash, 31) + c.charCodeAt(0)) >>> 0, 0),
        equipment: Object.fromEntries(
          Object.entries(this.equipment.view(id).worn).map(([key, value]) => [
            key,
            value?.id ?? null,
          ]),
        ),
        held: this.equipment.held(id).map((item) => item?.id ?? null) as [
          string | null,
          string | null,
        ],
        locomotion: {
          gait: 'walk',
          distance: this.motion.get(id)?.distance ?? 0,
          discontinuity: this.motion.get(id)?.discontinuity ?? 0,
        },
        reaction:
          s.lastDamageAt[slot]! > 0 && this.tick - s.lastDamageAt[slot]! < 5
            ? {
                id: `hit:${id}:${s.lastDamageAt[slot]}`,
                startedAt: s.lastDamageAt[slot]!,
                endsAt: s.lastDamageAt[slot]! + 5,
              }
            : undefined,
        id,
        appearanceKind: id === 0 ? 'origin' : npc ? 'npc' : 'species',
        appearanceId:
          id === 0
            ? ['pyrador', 'aqualia', 'zephyria'][this.player.origin]!
            : (npc?.profileId ?? s.definition(slot).id),
        x,
        y,
        elevation: local.world.elevation[local.world.index(x, y)] ?? 0,
        facingX: id === 0 ? this.player.facingX : (npc?.facingX ?? s.vx[slot]!),
        facingY: id === 0 ? this.player.facingY : (npc?.facingY ?? s.vy[slot]!),
        pose,
        protected: s.isHuman(slot) || s.owner[slot]! >= 0,
        action,
      });
    }
    const presentIds = new Set(actors.map((a) => a.id));
    for (const id of this.presentationPositions.keys())
      if (!presentIds.has(id)) this.presentationPositions.delete(id);
    return {
      equipment: this.equipment.view(),
      scene: this.scenes.presentation(activeScene, 0, this.calendar.day),
      projectiles: this.combat.projectiles
        .snapshot()
        .arrows.filter((a) => a.scene === activeScene)
        .map((a) => ({
          id: a.id,
          sceneId: this.scenes.id(a.scene),
          x: a.x,
          y: a.y,
          facingX: a.vx / Math.hypot(a.vx, a.vy),
          facingY: a.vy / Math.hypot(a.vx, a.vy),
          kind: 'arrow' as const,
        })),
      actors,
      cues: [...this.presentationCues.values()],
      debugEnabled: this.debugEnabled,
      debugPaths: this.debugEnabled
        ? [...this.schedules.debugPaths(this.player), ...this.decisions.debugPaths(this.player)]
        : [],
      session: this.session,
      tick: this.tick,
      packed,
      ids,
      timeScale: this.acceleration,
      humanNeeds: [...s.slots()]
        .filter((i) => s.isHuman(i))
        .map((i) => ({
          id: s.id(i),
          hp: s.hp[i]!,
          maxHp: s.maxHp(i),
          food: s.food[i]!,
          water: s.water[i]!,
          recreation: s.recreation[i]!,
          cleanliness: s.cleanliness[i]!,
          rest: s.rest[i]!,
          sleeping: !!s.sleeping[i],
          forcedRest: !!s.forcedRest[i],
          nature: s.displayNature(i),
          elements: s.definition(i).elements,
          heightMeters: s.heightMeters[i]!,
          massKg: s.massKg[i]!,
        })),
      carrion: local.resources.carrion.map((c) => ({ ...c })),
      supplies: local.resources.supplies.map((p) => ({ ...p, stock: { ...p.stock } })),
      ecology: {
        deaths: this.ecology.deaths,
        births: this.ecology.births,
        pending: this.ecology.replacements.length,
      },
      threats: this.debugEnabled
        ? [...this.combat.pursuits]
            .flatMap(([actor, pursuit]) => {
              const a = s.slot(actor),
                b = s.slot(pursuit.target);
              return a !== undefined &&
                b !== undefined &&
                distanceSquared(s.position(a), this.player) < 40 ** 2
                ? [
                    {
                      actor,
                      target: pursuit.target,
                      cause: pursuit.cause,
                      from: s.position(a),
                      to: s.position(b),
                    },
                  ]
                : [];
            })
            .slice(0, 64)
        : [],
      count,
      elapsedSeconds: this.calendar.elapsedSeconds,
      day: this.calendar.day,
      hour: this.calendar.hour,
      calendar: this.calendar.label,
      season: this.calendar.season,
      paused: this.pauses.reasons,
      weather: new SeasonSystem().weather(this.calendar),
      journal: [...this.journal],
      player: {
        ...this.player,
        attack: this.player.attack
          ? { ...this.player.attack, hit: [...this.player.attack.hit] }
          : null,
      },
      inventory: this.inventory.state,
      creatures: visible,
      npcs: this.npcs
        .filter((n) => this.entities.scene[this.entities.require(n.entityId)] === activeScene)
        .map((n) =>
          structuredClone({
            ...n,
            memory: { ...n.memory, records: n.memory.records.slice(-12) },
            heard: [],
          }),
        ),
      events: [...this.events.values()].slice(-18),
      drops: local.resources.drops.slice(),
      markers: this.markers.filter((m) => (m.scene ?? 0) === activeScene),
      dialogue: this.dialogue ? structuredClone(this.dialogue) : null,
      duel: this.combat.encounters.duel,
      deltas,
      jobs,
      performance: {
        stepMs: this.stepMs,
        detailed: this.tiers.detailed.length,
        population: s.wildlifeCount,
        paths: [...this.sceneSystems.values()].reduce(
          (sum, system) => sum + system.navigation.pending,
          0,
        ),
        expansions: [...this.sceneSystems.values()].reduce(
          (sum, system) => sum + system.navigation.expansions,
          0,
        ),
        reactions: [...this.sceneSystems.values()].reduce(
          (sum, system) => sum + system.reactions.pending,
          0,
        ),
        inferencePending: this.pendingJobs.size,
      },
    };
  }
  snapshot(): GameSave {
    return structuredClone({
      version: CONFIG.saveVersion,
      generatorVersion: CONFIG.generatorVersion,
      contentVersion: CONFIG.contentVersion,
      seed: this.seed,
      tick: this.tick,
      elapsedSeconds: this.calendar.elapsedSeconds,
      random: { ecology: this.ecologyRandom.state, combat: this.combatRandom.state },
      player: {
        entityId: 0,
        origin: this.player.origin,
        dashUntil: this.player.dashUntil,
        dashReadyAt: this.player.dashReadyAt,
        attack: this.player.attack,
        invulnerableUntil: this.player.invulnerableUntil,
      },
      inventory: this.inventory.state,
      inventorySerial: this.inventory.serial,
      equipment: this.equipment.snapshot(),
      scenes: this.scenes.snapshot(),
      entities: this.entities.snapshot(),
      supplies: this.resources.supplies,
      carrion: this.resources.carrion,
      ecology: {
        target: this.ecology.target,
        deaths: this.ecology.deaths,
        births: this.ecology.births,
        replacements: this.ecology.replacements,
      },
      npcs: this.npcs.map((n) => {
        const {
          x,
          y,
          scene,
          facingX,
          facingY,
          hp,
          maxHp,
          stamina,
          experience,
          level,
          ...metadata
        } = n as NpcState & PlayerState;
        return metadata;
      }),
      worldDeltas: this.world.deltas(),
      drops: this.resources.drops,
      markers: this.markers,
      reactions: this.reactions.snapshot(),
      combat: this.combat.snapshot(),
      events: [...this.events.values()],
      eventSerial: this.eventSerial,
      journal: [...this.journal],
    }) as unknown as GameSave;
  }
  restore(save: GameSave): void {
    this.presentationCues.clear();
    this.cueSerial = 0;
    this.presentationPositions.clear();
    this.presentationActions.clear();
    save = migrateSave(save);
    if (save.seed !== this.seed)
      throw new Error('Restore requires a host generated with the saved seed');
    this.tick = save.tick;
    this.calendar.elapsedSeconds = save.elapsedSeconds;
    this.ecologyRandom.state = save.random.ecology;
    this.combatRandom.state = save.random.combat;
    Object.assign(this.player, save.player);
    this.player.attack = save.player.attack
      ? { ...save.player.attack, hit: [...save.player.attack.hit] }
      : null;
    this.inventory.restore(save.inventory, save.inventorySerial);
    this.equipment.restore(save.equipment);
    this.entities.restore(save.entities);
    for (let i = 0; i < this.npcs.length; i++)
      Object.assign(this.npcs[i]!, structuredClone(save.npcs[i]));
    this.resources.supplies.splice(
      0,
      this.resources.supplies.length,
      ...structuredClone(save.supplies),
    );
    this.resources.carrion.splice(
      0,
      this.resources.carrion.length,
      ...structuredClone(save.carrion),
    );
    this.ecology.target = save.ecology.target;
    this.ecology.deaths = save.ecology.deaths;
    this.ecology.births = save.ecology.births;
    this.ecology.replacements.splice(
      0,
      this.ecology.replacements.length,
      ...structuredClone(save.ecology.replacements),
    );
    this.survival.clear();
    this.acceleration = 1;
    this.world.restore(save.worldDeltas);
    this.resources.restore(save.drops);
    for (const [code, system] of this.sceneSystems) {
      system.survival.clear();
      if (code !== 0) this.sceneSystems.delete(code);
    }
    this.scenes.restore(save.scenes);
    for (const i of this.entities.slots())
      this.entities.scene[i] = this.scenes.remap(save.scenes, this.entities.scene[i]!);
    this.portalPaths.clear();
    this.motion.clear();
    this.player.guarding = false;
    this.markers.splice(
      0,
      this.markers.length,
      ...save.markers.map((m) => ({
        ...structuredClone(m),
        scene: this.scenes.remap(save.scenes, m.scene ?? 0),
      })),
    );
    this.reactions.restore(save.reactions);
    this.combat.restore({
      ...save.combat,
      projectiles: {
        ...save.combat.projectiles,
        arrows: save.combat.projectiles.arrows.map((a) => ({
          ...a,
          scene: this.scenes.remap(save.scenes, a.scene),
        })),
      },
    });
    this.events.clear();
    for (const event of save.events)
      this.events.push({ ...event, scene: this.scenes.remap(save.scenes, event.scene ?? 0) });
    this.eventSerial = save.eventSerial;
    this.journal.clear();
    for (const event of save.journal) this.journal.add(event);
    this.pendingJobs.clear();
    this.outgoingJobs.length = 0;
    this.deferredResults.length = 0;
    this.deferredConversations.length = 0;
    this.dialogue = null;
    this.pauses.clear();
    this.movement = { x: 0, y: 0 };
    this.navigation.invalidate();
    this.decisions.clearDerived();
    this.schedules.clearDerived();
    this.sentDeltas.clear();
    this.rebuildSpatial();
    this.tiers.update(this.creatures, this.player);
    this.creatures.validate();
  }
  dispose(): void {
    this.disposed = true;
    this.pendingJobs.clear();
    this.outgoingJobs.length = 0;
    this.deferredConversations.length = 0;
    this.pauses.clear();
  }
}
