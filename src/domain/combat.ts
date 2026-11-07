import { CreatureMinds, type MindSnapshot } from './creature-minds';
import { CREATURE_MOVES, type CreatureDefinition } from '../content/definitions';
import type { NpcState } from './agents';
import { CreatureMode, PartnershipService, WellbeingPolicy } from './creatures';
import { EntityStore, NatureRules, SleepSystem } from './entities';
import { moveOnTerrain, creatureTraversal } from './creatures';
import type { ChunkStore } from './world';
import { SpatialIndex } from './navigation';
import { clamp, distanceSquared, type Element, type WorldPosition } from './values';
import { EquipmentService } from './equipment';
import { ProjectileSystem, type ProjectileSnapshot } from './projectiles';
import { PHYSIQUES, PhysiquePolicy } from './physique';
import {
  CombatDirector,
  CombatSettingsSchema,
  COMBAT_VIEW,
  type AttackCategory,
  type DirectorSnapshot,
} from './combat-director';

export interface AttackDefinition {
  readonly id: string;
  readonly windup: number;
  readonly active: number;
  readonly recovery: number;
  readonly power: number;
  readonly stamina: number;
  readonly range: number;
}
export const ATTACKS: Readonly<Record<'strike' | 'element', AttackDefinition>> = {
  strike: { id: 'strike', windup: 4, active: 2, recovery: 9, power: 11, stamina: 5, range: 2.2 },
  element: {
    id: 'element',
    windup: 7,
    active: 3,
    recovery: 16,
    power: 17,
    stamina: 16,
    range: 3.5,
  },
};
export const COMBO_ATTACKS: Readonly<
  Record<'strike', readonly [AttackDefinition, AttackDefinition, AttackDefinition]>
> = {
  strike: [
    // Hit 1: quick jab
    { id: 'strike', windup: 4, active: 2, recovery: 9, power: 10, stamina: 4, range: 2.2 },
    // Hit 2: wider sweep
    { id: 'strike', windup: 4, active: 2, recovery: 8, power: 14, stamina: 5, range: 2.3 },
    // Hit 3: heavier finisher with knockback
    { id: 'strike', windup: 6, active: 3, recovery: 11, power: 20, stamina: 7, range: 2.5 },
  ],
};
export const WEAPON_ATTACKS: Readonly<Record<string, AttackDefinition>> = {
  sword_slash: {
    id: 'sword_slash',
    windup: 6,
    active: 3,
    recovery: 12,
    power: 14,
    stamina: 8,
    range: 2.4,
  },
  spear_thrust: {
    id: 'spear_thrust',
    windup: 8,
    active: 2,
    recovery: 14,
    power: 16,
    stamina: 10,
    range: 3.2,
  },
  bow_shot: {
    id: 'bow_shot',
    windup: 12,
    active: 1,
    recovery: 12,
    power: 12,
    stamina: 8,
    range: 12,
  },
};
export const attackDefinition = (attack: AttackState): AttackDefinition => {
  if (
    attack.kind === 'strike' &&
    attack.chainIndex !== undefined &&
    (!attack.moveId || attack.moveId === 'strike')
  ) {
    return COMBO_ATTACKS.strike[attack.chainIndex] ?? ATTACKS.strike;
  }
  return (attack.moveId && WEAPON_ATTACKS[attack.moveId]) || ATTACKS[attack.kind];
};
export interface AttackState {
  kind: 'strike' | 'element';
  category?: AttackCategory;
  startedAt: number;
  hit: number[];
  moveId?: string;
  instanceId?: string;
  released?: boolean;
  chainIndex?: 0 | 1 | 2;
}
export interface PlayerState extends WorldPosition {
  guarding?: boolean;
  readonly entityId: number;
  x: number;
  y: number;
  facingX: number;
  facingY: number;
  hp: number;
  maxHp: number;
  stamina: number;
  experience: number;
  level: number;
  origin: number;
  dashUntil: number;
  dashReadyAt: number;
  attack: AttackState | null;
  invulnerableUntil: number;
}
export interface Encounter {
  readonly id: number;
  readonly target: number;
  readonly npcIndex: number | null;
  resolved: boolean;
  readonly startedAt: number;
}
export interface CombatSnapshot {
  minds?: MindSnapshot;
  failedHunts?: [number, number][];
  director?: DirectorSnapshot;
  projectiles?: ProjectileSnapshot;
  hunting: number[];
  serial: number;
  encounters: Encounter[];
  nextAttack: [number, number][];
  duel: number | null;
  target: number | null;
  pursuits: [number, Pursuit][];
  attacks: [number, AttackState][];
  assaults: [number, number][];
}

export class ElementPolicy {
  static against(attack: Element | null, defend: readonly Element[]): number {
    if (attack === null || !defend.length) return 1;
    const beats: Readonly<Record<Element, Element>> = {
      water: 'fire',
      fire: 'wind',
      wind: 'water',
    };
    return (
      defend.reduce(
        (total, element) =>
          total + (attack === element ? 1 : beats[attack] === element ? 1.5 : 0.75),
        0,
      ) / defend.length
    );
  }
}
export class DamagePolicy {
  static damage(
    power: number,
    attack: number,
    defense: number,
    element: number,
    wellbeing = 1,
    guarded = false,
  ): number {
    return Math.max(
      1,
      Math.floor(
        ((power + attack * 0.6) * element * Math.max(0.25, wellbeing) * (guarded ? 0.5 : 1) * 20) /
          (20 + defense),
      ),
    );
  }
}
export class ProgressionService {
  static reward(ourLevel: number, opponentLevel: number): number {
    return Math.round(clamp(24 * 2 ** (clamp(opponentLevel - ourLevel, -4, 4) / 2), 3, 96));
  }
  static level(experience: number): number {
    return Math.min(50, 1 + Math.floor(Math.sqrt(Math.max(0, experience) / 25)));
  }
}
export class CombatStateMachine {
  start(player: PlayerState, kind: 'strike' | 'element', tick: number): boolean {
    if (player.attack) {
      if (kind === 'strike' && this.phase(player, tick) === 'recovery') {
        const nextIndex = ((player.attack.chainIndex ?? 0) + 1) as 1 | 2;
        if (nextIndex <= 2) {
          const nextDef = COMBO_ATTACKS.strike[nextIndex]!;
          if (player.stamina < nextDef.stamina || player.hp <= 0) return false;
          player.stamina -= nextDef.stamina;
          player.attack = { kind, startedAt: tick, hit: [], chainIndex: nextIndex };
          return true;
        }
      }
      return false;
    }
    const def = kind === 'strike' ? COMBO_ATTACKS.strike[0]! : ATTACKS[kind];
    if (player.stamina < def.stamina || player.hp <= 0) return false;
    player.stamina -= def.stamina;
    player.attack = { kind, startedAt: tick, hit: [], chainIndex: 0 };
    return true;
  }
  phase(player: PlayerState, tick: number): 'idle' | 'windup' | 'active' | 'recovery' {
    if (!player.attack) return 'idle';
    const definition = attackDefinition(player.attack),
      elapsed = tick - player.attack.startedAt;
    if (elapsed < definition.windup) return 'windup';
    if (elapsed < definition.windup + definition.active) return 'active';
    if (elapsed < definition.windup + definition.active + definition.recovery) return 'recovery';
    player.attack = null;
    return 'idle';
  }
}

export interface Pursuit {
  readonly target: number;
  readonly cause: 'hunt' | 'retaliate' | 'territory' | 'duel' | 'assist';
  readonly until: number;
}
export class EncounterService {
  readonly encounters: Encounter[] = [];
  private serial = 0;
  duel: number | null = null;
  target: number | null = null;
  constructor(
    private readonly store: EntityStore,
    private readonly player: PlayerState,
    private readonly npcs: readonly NpcState[],
  ) {}
  startBattle(npcIndex: number, day: number, tick: number): string {
    const npc = this.npcs[npcIndex],
      partner = new PartnershipService(this.store).partner;
    if (!npc || npc.partner === null) return 'This villager does not have a battle partner.';
    if (this.duel !== null) return 'Finish the current battle first.';
    if (partner === null) return 'Form a creature partnership before challenging a villager.';
    if (npc.lastBattleDay === day) return 'This villager has already battled today.';
    const opponent = this.store.slot(npc.partner);
    if (
      opponent === undefined ||
      distanceSquared(npc, this.player) > 16 ||
      distanceSquared(this.store.position(opponent), this.player) > 16 ||
      distanceSquared(this.store.position(partner), this.player) > 16 ||
      this.store.hp[opponent]! <= 0 ||
      this.store.hp[partner]! <= 0
    )
      return 'The villager and partners must be nearby and ready.';
    npc.lastBattleDay = day;
    npc.revision++;
    this.duel = npcIndex;
    this.open(npc.partner, npcIndex, tick);
    return 'The friendly partner battle has begun. Strike, dash, and watch your companion!';
  }
  open(target: number, npcIndex: number | null, tick: number): Encounter {
    const existing = this.encounters.find((e) => e.target === target && !e.resolved);
    if (existing) return existing;
    const encounter = { id: ++this.serial, target, npcIndex, resolved: false, startedAt: tick };
    this.encounters.push(encounter);
    if (this.encounters.length > 256) this.encounters.shift();
    this.target = target;
    return encounter;
  }
  resolve(target: number, _tick: number): number {
    const encounter = this.encounters.find((e) => e.target === target && !e.resolved);
    if (!encounter) return 0;
    encounter.resolved = true;
    const slot = this.store.slot(target);
    const reward =
      slot === undefined || this.store.isHuman(slot)
        ? 0
        : ProgressionService.reward(this.player.level, this.store.level[slot]!);
    this.player.experience += reward;
    this.player.level = ProgressionService.level(this.player.experience);
    const partner = new PartnershipService(this.store).partner;
    if (partner !== null) {
      this.store.experience[partner]! += reward;
      this.store.level[partner] = ProgressionService.level(this.store.experience[partner]!);
    }
    if (this.duel !== null && encounter.npcIndex === this.duel) this.duel = null;
    if (slot !== undefined) this.store.mode[slot] = CreatureMode.Rest;
    if (this.target === target) this.target = null;
    return reward;
  }
  retreat(): void {
    for (const e of this.encounters) e.resolved = true;
    this.duel = null;
    this.target = null;
  }
  snapshot(): Pick<CombatSnapshot, 'serial' | 'encounters' | 'duel' | 'target'> {
    return {
      serial: this.serial,
      encounters: this.encounters.map((e) => ({ ...e })),
      duel: this.duel,
      target: this.target,
    };
  }
  restore(state: CombatSnapshot): void {
    this.serial = state.serial;
    this.encounters.splice(0, this.encounters.length, ...state.encounters);
    this.duel = state.duel;
    this.target = state.target;
  }
}
export class PartnerCombatController {
  defended(definition: CreatureDefinition, tick: number): boolean {
    const move = CREATURE_MOVES[definition.id];
    return tick % move.defensePeriod < move.defenseTicks;
  }
}
export class HitDetectionSystem {
  targets(store: EntityStore, player: PlayerState, spatial: SpatialIndex, range: number): number[] {
    return spatial.query(player.x, player.y, range, 128, player.scene ?? 0).filter((i) => {
      const dx = store.x[i]! - player.x,
        dy = store.y[i]! - player.y;
      return (
        dx * dx + dy * dy <= range * range && dx * player.facingX + dy * player.facingY > -0.35
      );
    });
  }
}
export interface CombatEvent {
  readonly impact?: number;
  readonly type: 'hit' | 'victory' | 'rescue' | 'assault' | 'hunt';
  readonly text: string;
  readonly target: number | null;
  readonly actor?: number;
}
/** Combat, threats and hit windows operate on stable entity IDs for every controller. */
export class CombatSystem {
  readonly director: CombatDirector;
  readonly minds: CreatureMinds;
  private preparedTick = -1;
  directorMs = 0;
  private expectedDamage(
    a: number,
    b: number,
    kind: 'strike' | 'element',
    power: number,
    guarded: boolean,
    potential = false,
  ): number {
    const s = this.store,
      attack = s.definition(a),
      defend = s.definition(b);
    const elements = kind === 'strike' ? [] : attack.elements;
    const multiplier = elements.length
      ? elements.reduce((sum, e) => sum + ElementPolicy.against(e, defend.elements), 0) /
        elements.length
      : 1;
    return DamagePolicy.damage(
      power,
      (attack.attack + (s.level[a]! - 1)) *
        PhysiquePolicy.attack(s.physique(a), PHYSIQUES[attack.id]),
      defend.defense * PhysiquePolicy.defense(s.physique(b), PHYSIQUES[defend.id]) +
        (this.equipment?.defense(s.id(b)) ?? 0),
      multiplier,
      potential ? 1 : WellbeingPolicy.multiplier(s.wellbeing(a)),
      guarded,
    );
  }
  telegraph(
    id: number,
    tick: number,
  ): import('./presentation-contract').AttackTelegraph | undefined {
    const s = this.store,
      a = s.slot(id),
      p = this.pursuits.get(id),
      attack = this.attacks.get(id);
    const b = p ? s.slot(p.target) : undefined;
    if (
      a === undefined ||
      b === undefined ||
      !attack ||
      s.hp[a]! <= 0 ||
      s.hp[b]! <= 0 ||
      s.scene[a] !== s.scene[b]
    )
      return;
    const timing = this.presentation(id, tick);
    if (!timing || tick < timing.startedAt || tick >= timing.recoveryAt) return;
    const move = CREATURE_MOVES[s.definition(a).id],
      weapon = WEAPON_ATTACKS[attack.moveId ?? ''];
    const predator = !s.isHuman(a) && s.definition(a).diet.includes('meat');
    if (
      !predator &&
      this.expectedDamage(a, b, attack.kind, weapon?.power ?? move.power, false, true) <=
        s.maxHp(b) * 0.15
    )
      return;
    return {
      kind: this.category(a, attack) === 'melee' ? 'ground' : 'glint',
      target: p!.target,
      range: weapon?.range ?? move.range,
      facingX: s.facingX[a]!,
      facingY: s.facingY[a]!,
      phase: tick < timing.activeAt ? 'windup' : 'active',
      predator,
    };
  }
  configure(settings: unknown): boolean {
    const parsed = CombatSettingsSchema.safeParse(settings);
    if (!parsed.success) return false;
    this.director.settings = parsed.data;
    return true;
  }
  partnerIntent(id: number, _tick: number): import('./creature-minds').CreatureIntent {
    const i = this.store.slot(id);
    return i === undefined ? 'follow' : this.minds.active(i) ? this.minds.intent(i) : 'follow';
  }
  cooldown(id: number, tick: number): number {
    return Math.max(0, (this.nextAttack.get(id) ?? 0) - tick);
  }
  pressure(i: number): number {
    const target = this.minds.state.target[i]!,
      s = this.store,
      b = s.slot(target);
    if (b === undefined) return 0;
    const settings = this.director.settings,
      pool =
        target === 0
          ? settings.player
          : s.isHuman(b)
            ? settings.villager
            : s.owner[b]! >= 0
              ? settings.partner
              : settings.wild;
    return this.director.pressure(b, pool.melee + pool.ranged);
  }
  grantedKind(i: number): 'strike' | 'element' {
    return this.director.selectedCategory[i] === 1 ? 'strike' : 'element';
  }
  private category(slot: number, attack?: AttackState): AttackCategory {
    if (attack)
      return (
        attack.category ??
        (attack.moveId === 'bow_shot'
          ? 'ranged'
          : attack.moveId && attack.moveId !== 'element'
            ? 'melee'
            : CREATURE_MOVES[this.store.definition(slot).id].category)
      );
    if (!this.store.isHuman(slot) && this.minds.ids[slot]! >= 0) {
      const kind = this.minds.state.request[slot] === 7 ? 'element' : 'strike';
      return kind === 'strike' ? 'melee' : 'ranged';
    }
    const weapon = this.weaponMove(this.store.id(slot), slot);
    return weapon === 'bow_shot'
      ? 'ranged'
      : weapon && weapon !== 'element'
        ? 'melee'
        : CREATURE_MOVES[this.store.definition(slot).id].category;
  }
  private weaponMove(id: number, slot: number): string {
    const held = this.equipment?.held(id)[0]?.id;
    return this.store.isHuman(slot) &&
      held &&
      ['sword', 'spear', 'bow'].includes(held) &&
      (held !== 'bow' || (this.equipment!.held(id)[1]?.charges ?? 0) > 0)
      ? `${held}_${held === 'sword' ? 'slash' : held === 'spear' ? 'thrust' : 'shot'}`
      : 'element';
  }
  /** Collect and rank before movement; a selection permits closing but is not a token hold. */
  prepareDirector(tick: number): void {
    const s = this.store,
      d = this.director;
    d.begin();
    for (const [id, p] of this.pursuits) {
      const a = s.slot(id),
        b = s.slot(p.target);
      if (a !== undefined) d.touch(a, id);
      if (b !== undefined) d.touch(b, p.target);
    }
    for (let n = 0; n < d.trackedCount; n++) {
      const slot = d.trackedSlots[n]!;
      const id = d.ids[slot]!;
      if (id < 0) continue;
      if (id === this.player.entityId) continue;
      if (d.targets[slot] === -1 && !this.attacks.has(id) && s.slot(id) === slot) continue;
      const p = this.pursuits.get(id),
        b = p ? s.slot(p.target) : undefined;
      const attack = this.attacks.get(id);
      if (
        s.slot(id) !== slot ||
        !p ||
        b === undefined ||
        s.hp[slot]! <= 0 ||
        s.hp[b]! <= 0 ||
        s.scene[slot] !== s.scene[b] ||
        p.until <= tick ||
        (d.targets[slot]! >= 0 && d.targets[slot] !== p.target) ||
        (attack && this.actionPhase(id, tick) === 0)
      ) {
        this.cancelAction(id);
        d.release(slot);
        if (s.slot(id) !== slot) d.ids[slot] = -1;
      }
    }
    for (const [id, attack] of this.attacks) {
      const a = s.slot(id),
        p = this.pursuits.get(id),
        b = p ? s.slot(p.target) : undefined;
      if (a === undefined || b === undefined) continue;
      d.targets[a] = p!.target;
      d.held[a] = this.category(a, attack) === 'melee' ? 1 : 2;
      d.occupied(b, d.held[a]!);
    }
    for (const [id, p] of this.pursuits) {
      const a = s.slot(id),
        b = s.slot(p.target);
      if (
        a === undefined ||
        b === undefined ||
        id === 0 ||
        !this.sceneLoaded(s.scene[a]!) ||
        this.attacks.has(id) ||
        (!s.isHuman(a) && this.minds.state.engage[a] !== 2) ||
        s.hp[a]! <= 0 ||
        s.hp[b]! <= 0 ||
        s.scene[a] !== s.scene[b] ||
        p.until <= tick ||
        (p.cause === 'retaliate' && s.nature(a).response === 'avoid') ||
        (p.cause === 'hunt' && (!this.hunting.has(id) || !NatureRules.canHunt(s, a, b, true)))
      )
        continue;
      const distance = Math.hypot(s.x[a]! - s.x[b]!, s.y[a]! - s.y[b]!);
      const move = CREATURE_MOVES[s.definition(a).id],
        weapon = s.isHuman(a) ? WEAPON_ATTACKS[this.weaponMove(id, a)] : undefined;
      if (weapon?.id === 'bow_shot' && this.projectiles.size >= 64) continue;
      if (
        distance > 12 ||
        (this.nextAttack.get(id) ?? 0) > tick ||
        s.stamina[a]! <
          (weapon?.stamina ?? (!s.isHuman(a) && this.minds.state.request[a] === 7 ? 16 : 5))
      )
        continue;
      if (
        p.target === 0 &&
        (Math.abs(s.x[a]! - this.player.x) > COMBAT_VIEW.width / 2 - COMBAT_VIEW.inset ||
          Math.abs(s.y[a]! - this.player.y) > COMBAT_VIEW.height / 2 - COMBAT_VIEW.inset)
      )
        continue;
      const category = this.category(a),
        settings = d.settings;
      const pool =
        p.target === 0
          ? settings.player
          : s.isHuman(b)
            ? settings.villager
            : s.owner[b]! >= 0
              ? settings.partner
              : settings.wild;
      d.consider(a, p.target, b, category, tick, move.aggression, distance, pool[category]);
    }
    while (d.next(tick) >= 0) {
      /* selected slots close or start below */
    }
  }
  readonly projectiles = new ProjectileSystem();
  presentationGuard(id: number, tick: number): boolean {
    if (id === 0) return !!this.player.guarding;
    const slot = this.store.slot(id);
    return (
      slot !== undefined &&
      ((id === 0 && !!this.player.guarding) || this.active(id)) &&
      (this.store.isHuman(slot)
        ? this.defense.defended(this.store.definition(slot), tick)
        : this.minds.intent(slot) === 'guard')
    );
  }
  /** Allocation-free timing facts for the perception/execution pipeline. */
  actionPhase(id: number, tick: number): number {
    const attack = id === 0 ? this.player.attack : this.attacks.get(id);
    if (!attack) return 0;
    const definition = attackDefinition(attack),
      elapsed = tick - attack.startedAt;
    return elapsed < 0 || elapsed >= definition.windup + definition.active + definition.recovery
      ? 0
      : elapsed < definition.windup
        ? 1
        : elapsed < definition.windup + definition.active
          ? 2
          : 3;
  }
  actionStarted(id: number): number {
    return (id === 0 ? this.player.attack : this.attacks.get(id))?.startedAt ?? -1;
  }
  actionWindup(id: number): number {
    const a = id === 0 ? this.player.attack : this.attacks.get(id);
    return a ? attackDefinition(a).windup : 1;
  }
  actionMove(id: number): string {
    const a = id === 0 ? this.player.attack : this.attacks.get(id);
    return a?.moveId ?? a?.kind ?? '';
  }
  /** Pure projection: unlike advancing a combat state machine this never expires attacks. */
  presentation(id: number, tick: number): import('./presentation-contract').ActionTiming | null {
    const attack = id === 0 ? this.player.attack : this.attacks.get(id);
    if (!attack) return null;
    const definition = attackDefinition(attack);
    const activeAt = attack.startedAt + definition.windup;
    const recoveryAt = activeAt + definition.active;
    const endsAt = recoveryAt + definition.recovery;
    return tick >= endsAt
      ? null
      : {
          move: attack.moveId ?? attack.kind,
          instanceId: attack.instanceId ?? `action:${id}:${attack.startedAt}`,
          startedAt: attack.startedAt,
          activeAt,
          recoveryAt,
          endsAt,
        };
  }
  readonly stateMachine = new CombatStateMachine();
  readonly encounters: EncounterService;
  readonly pursuits = new Map<number, Pursuit>();
  private readonly attacks = new Map<number, AttackState>();
  private readonly nextAttack = new Map<number, number>();
  private readonly assaults = new Map<number, number>();
  private readonly huntReservations = new Map<number, { actor: number; until: number }>();
  private readonly failedHunts = new Map<number, number>();
  private readonly hunting = new Set<number>();
  private readonly hitDetection = new HitDetectionSystem();
  private readonly defense = new PartnerCombatController();
  private now = 480;
  constructor(
    private readonly store: EntityStore,
    private readonly player: PlayerState,
    private readonly npcs: readonly NpcState[],
    private readonly world?: ChunkStore,
    private readonly foodAvailable: (id: number) => boolean = () => false,
    private readonly equipment?: EquipmentService,
    private readonly worldFor?: (scene: number) => ChunkStore,
    private readonly sceneLoaded: (scene: number) => boolean = () => true,
  ) {
    this.director = new CombatDirector(store.capacity);
    this.minds = new CreatureMinds(
      store,
      this,
      (scene) => this.worldFor?.(scene) ?? this.world,
      this.sceneLoaded,
      this.world?.seed ?? 0,
    );
    this.encounters = new EncounterService(store, player, npcs);
    this.minds.sync();
  }
  attack(kind: 'strike' | 'element', tick: number): boolean {
    const i = this.store.slot(this.player.entityId);
    if (i === undefined || this.store.sleeping[i] || this.player.guarding || this.player.hp <= 0)
      return false;

    let chainIndex: 0 | 1 | 2 = 0;
    if (this.player.attack) {
      const currentPhase = this.stateMachine.phase(this.player, tick);
      if (
        kind === 'strike' &&
        this.player.attack.kind === 'strike' &&
        currentPhase === 'recovery' &&
        (this.player.attack.chainIndex ?? 0) < 2
      ) {
        chainIndex = ((this.player.attack.chainIndex ?? 0) + 1) as 1 | 2;
        if (this.player.attack.instanceId) this.equipment?.cancel(this.player.attack.instanceId);
      } else {
        return false;
      }
    }

    const weapon = kind === 'strike' ? this.equipment?.held(0)[0]?.id : undefined;
    const moveId =
      weapon && ['sword', 'spear', 'bow'].includes(weapon)
        ? `${weapon}_${weapon === 'sword' ? 'slash' : weapon === 'spear' ? 'thrust' : 'shot'}`
        : kind;
    const definition =
      kind === 'strike' && (!weapon || moveId === 'strike')
        ? COMBO_ATTACKS.strike[chainIndex]!
        : (WEAPON_ATTACKS[moveId] ?? ATTACKS[kind]);
    const instanceId = `action:0:${tick}`;
    if (this.player.stamina < definition.stamina) return false;
    if (
      moveId === 'bow_shot' &&
      (this.projectiles.size >= 64 || !this.equipment?.reserve(0, instanceId))
    )
      return false;
    this.player.stamina -= definition.stamina;
    this.player.attack = { kind, startedAt: tick, hit: [], moveId, instanceId, chainIndex };
    return true;
  }
  active(id: number): boolean {
    return this.pursuits.has(id) || [...this.pursuits.values()].some((p) => p.target === id);
  }
  cancelAction(id: number): void {
    const action = id === 0 ? this.player.attack : this.attacks.get(id);
    if (action?.instanceId) this.equipment?.cancel(action.instanceId);
    if (id === 0) this.player.attack = null;
    else this.attacks.delete(id);
    const slot = this.store.slot(id);
    if (slot !== undefined) this.director.release(slot);
  }
  danger(id: number, radius = 6): boolean {
    const s = this.store,
      i = s.slot(id);
    if (i === undefined) return false;
    if (this.active(id)) return true;
    for (const [actor, p] of this.pursuits) {
      const other = s.slot(actor);
      if (
        other !== undefined &&
        distanceSquared(s.position(i), s.position(other)) < radius ** 2 &&
        (p.target === id || s.nature(other).aggression.some((r) => r.target === s.definition(i).id))
      )
        return true;
    }
    return false;
  }
  private pursue(actor: number, target: number, cause: Pursuit['cause'], tick: number): void {
    this.pursuits.set(actor, { target, cause, until: tick + (cause === 'hunt' ? 600 : 450) });
  }
  private autonomous(tick: number, spatial: SpatialIndex): void {
    const s = this.store;
    for (const i of s.slots()) {
      if (s.id(i) === this.player.entityId || s.hp[i]! <= 0 || !this.sceneLoaded(s.scene[i]!))
        continue;
      const id = s.id(i),
        definition = s.definition(i);
      if (s.food[i]! < 0.4) this.hunting.add(id);
      else if (s.food[i]! > 0.8) this.hunting.delete(id);
      if (this.pursuits.has(id) || s.sleeping[i]) continue;
      const prey =
        !!definition.prey?.length &&
        this.hunting.has(id) &&
        !this.foodAvailable(id) &&
        (this.failedHunts.get(id) ?? 0) <= tick;
      const aggression = s.nature(i).aggression;
      if (!prey && !aggression.length) continue;
      const nearby = spatial
        .query(s.x[i]!, s.y[i]!, Math.max(6, ...aggression.map((r) => r.radius)), 128, s.scene[i]!)
        .filter((j) => j !== i && s.alive[j] && s.hp[j]! > 0)
        .sort(
          (a, b) =>
            distanceSquared(s.position(i), s.position(a)) -
              distanceSquared(s.position(i), s.position(b)) || s.id(a) - s.id(b),
        );
      for (const j of nearby) {
        const other = s.id(j),
          distance = distanceSquared(s.position(i), s.position(j));
        if (!s.isHuman(i) && !this.minds.sees(i, j)) continue;
        if (prey && distance <= 36 && NatureRules.canHunt(s, i, j, this.hunting.has(id))) {
          const reserved = this.huntReservations.get(other);
          if (reserved && reserved.until > tick && reserved.actor !== id) continue;
          this.huntReservations.set(other, { actor: id, until: tick + 600 });
          this.pursue(id, other, 'hunt', tick);
          break;
        }
        if (
          aggression.some(
            (r) =>
              (r.target === s.definition(j).id || (r.target === 'nonhuman' && !s.isHuman(j))) &&
              distance <= r.radius ** 2,
          )
        ) {
          this.pursue(id, other, 'territory', tick);
          break;
        }
      }
    }
  }
  private hit(
    actor: number,
    target: number,
    kind: 'strike' | 'element',
    power: number,
    tick: number,
    events: CombatEvent[],
    attackScene?: number,
  ): void {
    const s = this.store,
      a = s.slot(actor),
      b = s.slot(target);
    if (
      a === undefined ||
      b === undefined ||
      s.scene[b] !== (attackScene ?? s.scene[a]) ||
      !NatureRules.canAttack(s, a, b)
    )
      return;
    if (
      target === this.player.entityId &&
      (tick < this.player.invulnerableUntil || tick < this.player.dashUntil)
    )
      return;
    const defend = s.definition(b);
    const damage = this.expectedDamage(
      a,
      b,
      kind,
      power,
      target === 0 ? !!this.player.guarding : this.presentationGuard(target, tick),
    );
    s.hp[b] = Math.max(0, s.hp[b]! - damage);
    s.lastDamageAt[b] = tick;
    this.minds.landed(actor, tick);
    if (!s.isHuman(b)) {
      this.minds.alert(b, actor, tick);
      this.minds.reaction(b, tick);
    }
    const guarded = target === 0 ? !!this.player.guarding : this.presentationGuard(target, tick);
    const comboMultiplier =
      actor === 0 && this.player.attack?.chainIndex !== undefined
        ? this.player.attack.chainIndex === 2
          ? 2.5
          : this.player.attack.chainIndex === 1
            ? 1.0
            : 0.75
        : 1.0;
    const impulse = PhysiquePolicy.impact(s.physique(a), s.physique(b), guarded) * comboMultiplier;
    const dx = s.x[b]! - s.x[a]!,
      dy = s.y[b]! - s.y[a]!,
      length = Math.hypot(dx, dy);
    const nx = length > 0.001 ? dx / length : s.facingX[a]!,
      ny = length > 0.001 ? dy / length : s.facingY[a]!;
    s.recoilX[b] = clamp(s.recoilX[b]! + nx * impulse, -8, 8);
    s.recoilY[b] = clamp(s.recoilY[b]! + ny * impulse, -8, 8);
    const reaction = clamp(((impulse * s.massKg[b]!) / s.massKg[a]!) * 0.12, 0, 0.5);
    s.recoilX[a] = clamp(s.recoilX[a]! - nx * reaction, -8, 8);
    s.recoilY[a] = clamp(s.recoilY[a]! - ny * reaction, -8, 8);
    SleepSystem.interrupt(s, b, this.now);
    if (s.hp[b]! <= 0 && s.protected(b)) {
      s.downed[b] = 1;
      s.recoverAt[b] = this.now + 60;
    }
    if (target === this.player.entityId) this.player.invulnerableUntil = tick + 20;
    // Preserve an existing hunt/duel against the same attacker; Nature chooses flight or retaliation.
    if (this.pursuits.get(target)?.target !== actor) this.pursue(target, actor, 'retaliate', tick);
    if (actor === this.player.entityId && s.isHuman(b)) {
      if ((this.assaults.get(target) ?? -Infinity) + 2700 <= tick) {
        this.assaults.set(target, tick);
        const npc = this.npcs.find((n) => n.entityId === target);
        if (npc) {
          npc.affinity = clamp(npc.affinity - 10, -100, 100);
          npc.revision++;
        }
        events.push({
          type: 'assault',
          actor,
          target,
          text: 'The traveler attacked a villager. The assault was nonlethal and will be remembered.',
        });
      }
    } else if (
      actor === this.player.entityId &&
      !s.isHuman(b) &&
      (s.owner[b] === -1 ||
        (this.encounters.duel !== null && this.npcs[this.encounters.duel]?.partner === target))
    ) {
      const duel =
        this.encounters.duel !== null && this.npcs[this.encounters.duel]?.partner === target
          ? this.encounters.duel
          : null;
      this.encounters.open(target, duel, tick);
    }
    events.push({
      type: 'hit',
      actor,
      target,
      impact: impulse,
      text: `${defend.name} took ${damage} damage.`,
    });
    if (s.hp[b]! <= 0 && this.pursuits.get(actor)?.cause === 'hunt')
      events.push({
        type: 'hunt',
        actor,
        target,
        text: `${s.definition(a).name} brought down ${defend.name}.`,
      });
  }
  prepareTick(tick: number, spatial: SpatialIndex, now = 480 + tick / 30): void {
    if (this.preparedTick === tick) return;
    this.preparedTick = tick;
    this.now = this.minds.now = now;
    const s = this.store;
    if (this.player.guarding) {
      this.player.stamina = Math.max(0, this.player.stamina - 0.45);
      if (this.player.stamina <= 0 || this.player.hp <= 0 || s.sleeping[s.require(0)])
        this.player.guarding = false;
    }
    for (const i of s.slots()) if (s.hp[i]! > 0) s.stamina[i] = Math.min(100, s.stamina[i]! + 0.3);
    this.minds.sync();
    this.minds.grid.rebuild();
    if (tick % 30 === 0) this.autonomous(tick, spatial);
    const partner = new PartnershipService(s).partner,
      target = this.encounters.target;
    if (
      partner !== null &&
      target !== null &&
      s.slot(target) !== undefined &&
      s.hp[partner]! > 0 &&
      this.minds.state.command[partner] !== 2
    ) {
      if (!this.pursuits.has(s.id(partner))) this.pursue(s.id(partner), target, 'assist', tick);
      const enemy = s.require(target);
      if (this.encounters.duel !== null && !this.pursuits.has(target))
        this.pursue(target, s.id(partner), 'duel', tick);
      else if (s.nature(enemy).response === 'retaliate' && !this.pursuits.has(target))
        this.pursue(target, s.id(partner), 'retaliate', tick);
    }
    this.minds.engage(tick);
    const started = performance.now();
    this.prepareDirector(tick);
    this.directorMs = performance.now() - started;
    this.minds.decide(tick);
  }
  advance(tick: number, spatial: SpatialIndex, now = 480 + tick / 30): CombatEvent[] {
    this.now = now;
    const events: CombatEvent[] = [],
      s = this.store,
      player = this.player;
    this.prepareTick(tick, spatial, now);
    this.minds.execute(tick);
    const previousAttack = player.attack;
    if (player.hp <= 0 || s.sleeping[s.require(0)]) player.attack = null;
    const phase = this.stateMachine.phase(player, tick);
    if (previousAttack && !player.attack && previousAttack.instanceId)
      this.equipment?.cancel(previousAttack.instanceId);
    if (phase === 'active' && player.attack) {
      const move = attackDefinition(player.attack);
      if (player.attack.moveId === 'bow_shot') {
        if (!player.attack.released) {
          player.attack.released = true;
          if (this.equipment?.release(player.attack.instanceId!))
            this.projectiles.spawn(
              0,
              s.scene[s.require(0)]!,
              player.x,
              player.y,
              player.facingX,
              player.facingY,
              tick,
              move.power,
            );
        }
      } else
        for (const i of this.hitDetection.targets(s, player, spatial, move.range)) {
          const id = s.id(i);
          if (
            id === player.entityId ||
            s.owner[i] === player.entityId ||
            player.attack.hit.includes(id)
          )
            continue;
          const dx = s.x[i]! - player.x,
            dy = s.y[i]! - player.y;
          const forward = dx * player.facingX + dy * player.facingY;
          if (player.attack.moveId === 'sword_slash' && forward < Math.hypot(dx, dy) * Math.SQRT1_2)
            continue;
          if (
            player.attack.moveId === 'spear_thrust' &&
            (forward < 0 || Math.abs(dx * player.facingY - dy * player.facingX) > 0.45)
          )
            continue;
          player.attack.hit.push(id);
          this.hit(player.entityId, id, player.attack.kind, move.power, tick, events);
        }
    }
    for (const [id, p] of this.pursuits) {
      const a = s.slot(id),
        b = s.slot(p.target);
      if (a !== undefined && !this.sceneLoaded(s.scene[a]!)) continue;
      if (
        a === undefined ||
        b === undefined ||
        s.hp[a]! <= 0 ||
        s.hp[b]! <= 0 ||
        p.until <= tick ||
        (s.scene[a] === s.scene[b] && distanceSquared(s.position(a), s.position(b)) > 144) ||
        (p.cause === 'hunt' &&
          (!NatureRules.canHunt(s, a, b, this.hunting.has(id)) || !this.hunting.has(id)))
      ) {
        this.pursuits.delete(id);
        const cancelled = this.attacks.get(id);
        if (cancelled?.instanceId) this.equipment?.cancel(cancelled.instanceId);
        this.cancelAction(id);
        this.huntReservations.delete(p.target);
        this.failedHunts.set(id, tick + 150);
        if (a !== undefined) s.mode[a] = CreatureMode.Wander;
        continue;
      }
      if (s.scene[a] !== s.scene[b]) {
        const cancelled = this.attacks.get(id);
        if (cancelled?.instanceId) this.equipment?.cancel(cancelled.instanceId);
        this.cancelAction(id);
        continue;
      }
      SleepSystem.interrupt(s, a, this.now);
      const flee = p.cause === 'retaliate' && s.nature(a).response === 'avoid';
      if (s.isHuman(a)) s.mode[a] = flee ? CreatureMode.Flee : CreatureMode.Combat;
      const delta = { x: s.x[b]! - s.x[a]!, y: s.y[b]! - s.y[a]! },
        distance = Math.hypot(delta.x, delta.y),
        move = CREATURE_MOVES[s.definition(a).id];
      if (s.isHuman(a)) {
        s.facingX[a] = delta.x / Math.max(0.001, distance);
        s.facingY[a] = delta.y / Math.max(0.001, distance);
      }
      const held = this.equipment?.held(id)[0]?.id;
      const usableWeapon =
        s.isHuman(a) &&
        held &&
        ['sword', 'spear', 'bow'].includes(held) &&
        (held !== 'bow' || (this.equipment!.held(id)[1]?.charges ?? 0) > 0);
      const creatureKind = !s.isHuman(a) ? this.minds.attackKind(a) : 'element';
      const moveId = usableWeapon
        ? `${held}_${held === 'sword' ? 'slash' : held === 'spear' ? 'thrust' : 'shot'}`
        : creatureKind;
      const weaponMove = WEAPON_ATTACKS[moveId],
        range = weaponMove?.range ?? move.range;
      if (s.isHuman(a)) {
        s.targetX[a] = flee ? s.x[a]! - delta.x : s.x[b]!;
        s.targetY[a] = flee ? s.y[a]! - delta.y : s.y[b]!;
      }
      const waiting = !flee && !this.attacks.has(id) && !this.director.selected[a];
      const ring = Math.max(range + 1.5, move.kiteRange);
      if (waiting && s.isHuman(a)) {
        const radial = Math.max(-1, Math.min(1, distance - ring));
        const side = id % 2 ? 1 : -1;
        const nx = distance > 0.001 ? delta.x / distance : side,
          ny = distance > 0.001 ? delta.y / distance : 0;
        delta.x = nx * radial - ny * 0.25 * side;
        delta.y = ny * radial + nx * 0.25 * side;
        s.targetX[a] = s.x[a]! + delta.x;
        s.targetY[a] = s.y[a]! + delta.y;
      }
      const combatWorld = this.worldFor?.(s.scene[a]!) ?? this.world;
      if (
        id !== player.entityId &&
        s.isHuman(a) &&
        combatWorld &&
        (waiting || distance > (flee ? 0 : range * 0.85))
      ) {
        const moveDistance = Math.max(0.001, Math.hypot(delta.x, delta.y));
        const step =
          Math.min(
            moveDistance,
            (s.definition(a).speed *
              WellbeingPolicy.speed(s.wellbeing(a)) *
              s.movementFactor(a) *
              (this.equipment?.movement(id) ?? 1)) /
              30,
          ) * (flee ? -1 : 1);
        const position = moveOnTerrain(
          combatWorld,
          s.position(a),
          (delta.x / moveDistance) * step,
          (delta.y / moveDistance) * step,
          creatureTraversal(s, a),
        );
        s.vx[a] = (position.x - s.x[a]!) * 30;
        s.vy[a] = (position.y - s.y[a]!) * 30;
        s.x[a] = position.x;
        s.y[a] = position.y;
      }
      if (flee || id === player.entityId) continue;
      let attack = this.attacks.get(id);
      if (
        !attack &&
        this.director.selected[a] &&
        (s.isHuman(a) || this.minds.canStart(a)) &&
        distance <= range &&
        (this.nextAttack.get(id) ?? 0) <= tick &&
        s.stamina[a]! >=
          (weaponMove?.stamina ?? (!s.isHuman(a) && creatureKind === 'element' ? 16 : 5))
      ) {
        const instanceId = `action:${id}:${tick}`;
        if (
          moveId === 'bow_shot' &&
          (this.projectiles.size >= 64 || !this.equipment?.reserve(id, instanceId))
        )
          continue;
        attack = {
          kind: usableWeapon ? 'strike' : creatureKind,
          ...(!s.isHuman(a)
            ? { category: creatureKind === 'strike' ? ('melee' as const) : ('ranged' as const) }
            : {}),
          startedAt: tick,
          hit: [],
          moveId,
          instanceId,
        };
        this.attacks.set(id, attack);
        if (!s.isHuman(a)) this.minds.started(a, tick);
        this.director.commit(a, b, this.category(a, attack), tick);
        s.stamina[a]! -= weaponMove?.stamina ?? (creatureKind === 'element' ? 16 : 5);
        this.nextAttack.set(
          id,
          tick +
            Math.max(
              move.cooldownTicks,
              weaponMove ? weaponMove.windup + weaponMove.active + weaponMove.recovery : 26,
            ),
        );
      }
      if (attack) {
        const elapsed = tick - attack.startedAt;
        const definition = attackDefinition(attack);
        if (attack.moveId === 'bow_shot' && elapsed >= definition.windup && !attack.released) {
          attack.released = true;
          if (this.equipment?.release(attack.instanceId!))
            this.projectiles.spawn(
              id,
              s.scene[a]!,
              s.x[a]!,
              s.y[a]!,
              s.facingX[a]!,
              s.facingY[a]!,
              tick,
              definition.power,
            );
        }
        if (
          attack.moveId !== 'bow_shot' &&
          elapsed >= definition.windup &&
          elapsed < definition.windup + definition.active &&
          !attack.hit.includes(p.target) &&
          distance <= (weaponMove?.range ?? move.range)
        ) {
          attack.hit.push(p.target);
          this.hit(id, p.target, attack.kind, weaponMove?.power ?? move.power, tick, events);
        }
        if (elapsed >= definition.windup + definition.active + definition.recovery) {
          this.equipment?.cancel(attack.instanceId!);
          this.cancelAction(id);
        }
      }
    }
    if (this.worldFor || this.world)
      this.projectiles.advance(
        tick,
        s,
        spatial,
        (scene) => this.worldFor?.(scene) ?? this.world!,
        (actor, target, power, scene) =>
          this.hit(actor, target, 'strike', power, tick, events, scene),
      );
    for (const encounter of this.encounters.encounters) {
      if (encounter.resolved) continue;
      const targetSlot = s.slot(encounter.target);
      if (targetSlot !== undefined && s.hp[targetSlot]! <= 0) {
        const reward = this.encounters.resolve(encounter.target, tick);
        events.push({
          type: 'victory',
          target: encounter.target,
          actor: player.entityId,
          text: `Encounter complete · +${reward} experience.`,
        });
      } else if (
        targetSlot === undefined ||
        distanceSquared(s.position(targetSlot), player) > 20 ** 2
      ) {
        encounter.resolved = true;
        if (this.encounters.target === encounter.target) this.encounters.retreat();
      }
    }
    if (player.hp <= 0) {
      this.encounters.retreat();
      for (const [id, p] of this.pursuits)
        if (id === player.entityId || p.target === player.entityId) this.pursuits.delete(id);
      events.push({
        type: 'rescue',
        target: null,
        text: 'A village scout brought you home to recover. Your belongings are safe.',
      });
    }
    if (this.failedHunts.size > 4096)
      for (const [id, until] of this.failedHunts)
        if (until <= tick || s.slot(id) === undefined) this.failedHunts.delete(id);
    for (const [id, r] of this.huntReservations)
      if (r.until <= tick) this.huntReservations.delete(id);
    for (const [id, action] of this.attacks) {
      const slot = s.slot(id),
        targetSlot = s.slot(this.pursuits.get(id)?.target ?? -1),
        definition = attackDefinition(action);
      if (
        !this.pursuits.has(id) ||
        slot === undefined ||
        targetSlot === undefined ||
        s.hp[targetSlot]! <= 0 ||
        (slot !== undefined && s.scene[slot] !== s.scene[targetSlot]) ||
        s.hp[slot]! <= 0 ||
        tick >= action.startedAt + definition.windup + definition.active + definition.recovery
      )
        this.cancelAction(id);
    }
    this.minds.sync();
    return events;
  }
  pruneRetired(): void {
    this.minds.sync();
    for (const [id, p] of this.pursuits)
      if (this.store.slot(id) === undefined || this.store.slot(p.target) === undefined)
        this.pursuits.delete(id);
    for (const map of [this.attacks, this.nextAttack, this.failedHunts, this.huntReservations])
      for (const id of map.keys()) if (this.store.slot(id) === undefined) map.delete(id);
    for (const id of this.attacks.keys()) if (!this.pursuits.has(id)) this.cancelAction(id);
    for (const id of this.hunting) if (this.store.slot(id) === undefined) this.hunting.delete(id);
    for (let slot = 0; slot < this.director.capacity; slot++) {
      const id = this.director.ids[slot]!;
      if (id >= 0 && (this.store.slot(id) !== slot || !this.pursuits.has(id))) {
        this.director.release(slot);
        if (this.store.slot(id) !== slot) this.director.ids[slot] = -1;
      }
    }
  }
  snapshot(): CombatSnapshot {
    return {
      minds: this.minds.snapshot(),
      failedHunts: [...this.failedHunts],
      director: this.director.snapshot(),
      projectiles: this.projectiles.snapshot(),
      hunting: [...this.hunting],
      ...this.encounters.snapshot(),
      nextAttack: [...this.nextAttack],
      pursuits: [...this.pursuits],
      attacks: [...this.attacks],
      assaults: [...this.assaults],
    };
  }
  restore(snapshot: CombatSnapshot): void {
    this.preparedTick = -1;
    this.minds.restore(snapshot.minds);
    this.director.reset();
    if (snapshot.director) {
      this.director.settings = structuredClone(snapshot.director.settings);
      for (const slot of this.store.slots()) this.director.touch(slot, this.store.id(slot));
      for (const [id, target, category] of snapshot.director.holds) {
        const slot = this.store.slot(id);
        if (slot === undefined || !snapshot.attacks.some(([actor]) => actor === id)) continue;
        this.director.targets[slot] = target;
        this.director.held[slot] = category === 'melee' ? 1 : 2;
      }
      for (const [id, target, since] of snapshot.director.waiting) {
        const slot = this.store.slot(id);
        if (slot === undefined) continue;
        this.director.targets[slot] = target;
        this.director.since[slot] = since;
      }
      for (const [id, tick] of snapshot.director.grants) {
        const slot = this.store.slot(id);
        if (slot !== undefined) this.director.lastGrant[slot] = tick;
      }
    }
    this.projectiles.restore(snapshot.projectiles ?? { serial: 0, arrows: [] });
    this.encounters.restore(snapshot);
    for (const [map, entries] of [
      [this.nextAttack, snapshot.nextAttack],
      [this.pursuits, snapshot.pursuits],
      [this.attacks, snapshot.attacks],
      [this.assaults, snapshot.assaults],
    ] as const) {
      map.clear();
      for (const [id, value] of entries) (map as Map<number, unknown>).set(id, value);
    }
    this.huntReservations.clear();
    this.failedHunts.clear();
    for (const [id, until] of snapshot.failedHunts ?? []) this.failedHunts.set(id, until);
    this.hunting.clear();
    for (const id of snapshot.hunting) this.hunting.add(id);
    for (const [id, pursuit] of this.pursuits)
      if (pursuit.cause === 'hunt')
        this.huntReservations.set(pursuit.target, { actor: id, until: pursuit.until });
  }
}
