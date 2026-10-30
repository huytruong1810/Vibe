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
        invulnerableUntil: 0,
      } as PlayerState,
      this.entities,
      0,
    );
    this.navigation = new NavigationService(this.world);
    this.resources = new ResourceStore(this.world);
    this.locator = new ResourceLocator(this.resources);
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
    this.query = new WorldQuery(this.npcs, this.creatures, this.calendar, this.resources);
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
    this.schedules = new ScheduleExecutor(this.world, this.navigation, this.entities);
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
    );
    this.ecology = new EcologyService(
      this.entities,
      this.world,
      this.resources,
      this.ecologyRandom,
    );
    this.ecology.target = population;
    this.combat = new CombatSystem(this.creatures, this.player, this.npcs, this.world, (id) =>
      this.survival.feeding(id),
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
    ];
    if (this.pauses.paused && !allowedPaused.includes(c.type))
      return {
        id: envelope.id,
        ok: false,
        message: 'Close the conversation or menu before acting.',
      };
    const playerSlot = this.entities.require(this.player.entityId);
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
      case 'sleep':
        if (this.combat.danger(this.player.entityId)) {
          ok = false;
          message = 'Find safety before resting.';
        } else {
          ok = SleepSystem.begin(this.entities, playerSlot);
          this.movement = { x: 0, y: 0 };
          this.player.attack = null;
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
        const supply = this.resources.supply(this.player);
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
          if (!item || !this.resources.consumeSupply(supply, item)) {
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
          this.reactions.enqueue({
            index: this.world.index(
              this.player.x + this.player.facingX * 2,
              this.player.y + this.player.facingY * 2,
            ),
            type: (['fire', 'freeze', 'shock'] as const)[this.player.origin]!,
            remaining: 2,
          });
        break;
      case 'harvest': {
        const result = this.harvest.harvest(
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
          !this.resources.drop(
            item.id,
            {
              x: this.player.x + this.player.facingX * 0.6,
              y: this.player.y + this.player.facingY * 0.6,
            },
            item.originSpecies,
          )
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
          this.world,
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
        ok = this.reactions.enqueue({
          index: this.world.index(x, y),
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
          this.creatures.x[partner] = this.player.x + 1;
          this.creatures.y[partner] = this.player.y;
        }
        message = `The waystone carries you to ${destination.name}.`;
        this.emit('travel', message, this.player, ['player'], 4);
        break;
      }
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
      this.dialogue.lines.push({ speaker: 'npc', text: parsed.data.dialogue });
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
    if (npc.revision === dialogue.revision)
      for (const action of dialogue.staged) {
        const receipt = this.validator.execute(npc, action, {
          calendar: this.calendar,
          world: this.world,
          resources: this.resources,
          locator: this.locator,
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
        this.spatial.insert(i, this.creatures.x[i]!, this.creatures.y[i]!);
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
    this.navigation.advance(800);
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
    const tile = this.world.index(this.player.x, this.player.y),
      swimming = this.world.fluid[tile] === 1 || this.world.fluid[tile] === 2;
    const speed =
      (dash ? 12 : 4.2) *
      WellbeingPolicy.speed(this.entities.wellbeing(playerSlot)) *
      (swimming ? (this.player.origin === 1 ? 0.9 : 0.65) : 1);
    const moved = moveOnTerrain(
      this.world,
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
          this.survival.decide(i, now, scheduled);
        SleepSystem.update(s, i, 0, now, this.combat.danger(s.id(i)));
      }
    for (const i of this.tiers.detailed) {
      if (this.combat.active(s.id(i))) continue;
      if (this.survival.active(i)) this.survival.move(i, dt, now);
      else {
        if (this.tick % 30 === i % 30) this.decisions.decide(i, now, this.player);
        this.decisions.move(i, dt, now, this.spatial);
      }
    }
    for (let i = 0; i < this.npcs.length; i++) {
      const npc = this.npcs[i]!,
        body = s.require(npc.entityId);
      if (s.hp[body]! > 0 && !this.combat.active(npc.entityId)) {
        if (this.survival.active(body)) {
          this.survival.move(body, dt, now);
          npc.activity = s.sleeping[body] ? 'Sleeping' : `Seeking ${CreatureMode[s.mode[body]!]}`;
        } else if (this.combat.encounters.duel !== i)
          this.schedules.advance(npc, i, this.calendar, this.player, dt);
      }
      const partner = npc.partner === null ? undefined : s.slot(npc.partner);
      if (
        partner !== undefined &&
        s.hp[partner]! > 0 &&
        !this.combat.active(s.id(partner)) &&
        !this.survival.active(partner)
      ) {
        s.mode[partner] = CreatureMode.Follow;
        s.targetX[partner] = npc.x + 0.6;
        s.targetY[partner] = npc.y + 0.6;
        if (!s.tier[partner]) this.decisions.move(partner, dt, now, this.spatial);
      }
    }
    if (this.tick % 30 === 0)
      for (let i = 0; i < s.count; i++)
        if (s.alive[i] && !s.tier[i] && !this.combat.active(s.id(i))) {
          if (this.survival.active(i)) this.survival.move(i, 1, now);
        }
    for (const event of this.combat.advance(this.tick, this.spatial, now)) {
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
      if (this.world.flags[this.world.index(this.player.x, this.player.y)]! & 32) {
        this.player.hp = Math.max(0, this.player.hp - (this.player.origin === 0 ? 0.5 : 1));
        SleepSystem.interrupt(s, playerSlot, now);
        s.lastDamageAt[playerSlot] = this.tick;
      }
      this.regrowth.advance(now, this.calendar.season);
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
          subjects: [social.a, social.b],
          importance: 3,
        });
      }
    }
    for (const index of this.reactions.advance(now))
      for (const i of this.spatial.query(
        index % this.world.size,
        Math.floor(index / this.world.size),
        1.5,
        16,
      )) {
        if (
          distanceSquared(s.position(i), {
            x: index % this.world.size,
            y: Math.floor(index / this.world.size),
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
      this.survival.pruneRetired();
      this.decisions.pruneRetired();
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
    this.player.attack = null;
    const body = this.entities.require(0);
    this.entities.downed[body] = 0;
    this.entities.recoverAt[body] = 0;
    this.entities.food[body] = Math.max(0.5, this.entities.food[body]!);
    this.entities.water[body] = Math.max(0.5, this.entities.water[body]!);
    this.acceleration = 1;
    this.movement = { x: 0, y: 0 };
    const partner = this.partnership.partner;
    if (partner !== null) {
      this.creatures.x[partner] = this.player.x + 1;
      this.creatures.y[partner] = this.player.y;
      this.creatures.hp[partner] = this.creatures.maxHp(partner) * 0.65;
      this.creatures.mode[partner] = CreatureMode.Follow;
    }
  }
  terrain(): TerrainView {
    return {
      size: this.world.size,
      seed: this.seed,
      biome: this.world.biome.slice(),
      elevation: this.world.elevation.slice(),
      fluid: this.world.fluid.slice(),
      flags: this.world.flags.slice(),
      resource: this.world.resource.slice(),
      quantity: this.world.quantity.slice(),
      buildings: this.world.buildings.map((b) => ({ ...b })),
    };
  }
  frame(buffer?: ArrayBuffer): RenderSnapshot {
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
      ids[count] = id;
      const at = count++ * ENTITY_STRIDE,
        elevation = this.world.elevation[this.world.index(x, y)] ?? 0;
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
      if (s.alive[i]) {
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
    const deltas = this.world.deltas().filter((delta) => {
      const signature = `${delta.quantity}:${delta.flags}:${delta.fluid}`;
      if (this.sentDeltas.get(delta.index) === signature) return false;
      this.sentDeltas.set(delta.index, signature);
      return true;
    });
    const jobs = this.outgoingJobs.splice(0).filter((job) => this.pendingJobs.has(job.id));
    return {
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
        })),
      carrion: this.resources.carrion.map((c) => ({ ...c })),
      supplies: this.resources.supplies.map((p) => ({ ...p, stock: { ...p.stock } })),
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
      npcs: this.npcs.map((n) =>
        structuredClone({
          ...n,
          memory: { ...n.memory, records: n.memory.records.slice(-12) },
          heard: [],
        }),
      ),
      events: [...this.events.values()].slice(-18),
      drops: this.resources.drops.slice(),
      markers: this.markers.slice(),
      dialogue: this.dialogue ? structuredClone(this.dialogue) : null,
      duel: this.combat.encounters.duel,
      deltas,
      jobs,
      performance: {
        stepMs: this.stepMs,
        detailed: this.tiers.detailed.length,
        population: s.wildlifeCount,
        paths: this.navigation.pending,
        expansions: this.navigation.expansions,
        reactions: this.reactions.pending,
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
        const { x, y, facingX, facingY, hp, maxHp, stamina, experience, level, ...metadata } =
          n as NpcState & PlayerState;
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
    this.markers.splice(0, this.markers.length, ...structuredClone(save.markers));
    this.reactions.restore(save.reactions);
    this.combat.restore(save.combat);
    this.events.clear();
    for (const event of save.events) this.events.push(event);
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
