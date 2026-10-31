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
export const attackDefinition = (attack: AttackState): AttackDefinition =>
  (attack.moveId && WEAPON_ATTACKS[attack.moveId]) || ATTACKS[attack.kind];
export interface AttackState {
  kind: 'strike' | 'element';
  startedAt: number;
  hit: number[];
  moveId?: string;
  instanceId?: string;
  released?: boolean;
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
    if (player.attack || player.stamina < ATTACKS[kind].stamina || player.hp <= 0) return false;
    player.stamina -= ATTACKS[kind].stamina;
    player.attack = { kind, startedAt: tick, hit: [] };
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
  readonly projectiles = new ProjectileSystem();
  presentationGuard(id: number, tick: number): boolean {
    if (id === 0) return !!this.player.guarding;
    const slot = this.store.slot(id);
    return (
      slot !== undefined &&
      ((id === 0 && !!this.player.guarding) || this.active(id)) &&
      this.defense.defended(this.store.definition(slot), tick)
    );
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
  ) {
    this.encounters = new EncounterService(store, player, npcs);
  }
  attack(kind: 'strike' | 'element', tick: number): boolean {
    const i = this.store.slot(this.player.entityId);
    if (
      i === undefined ||
      this.store.sleeping[i] ||
      this.player.guarding ||
      this.player.attack ||
      this.player.hp <= 0
    )
      return false;
    const weapon = kind === 'strike' ? this.equipment?.held(0)[0]?.id : undefined;
    const moveId =
      weapon && ['sword', 'spear', 'bow'].includes(weapon)
        ? `${weapon}_${weapon === 'sword' ? 'slash' : weapon === 'spear' ? 'thrust' : 'shot'}`
        : kind;
    const definition = WEAPON_ATTACKS[moveId] ?? ATTACKS[kind],
      instanceId = `action:0:${tick}`;
    if (this.player.stamina < definition.stamina) return false;
    if (
      moveId === 'bow_shot' &&
      (this.projectiles.size >= 64 || !this.equipment?.reserve(0, instanceId))
    )
      return false;
    this.player.stamina -= definition.stamina;
    this.player.attack = { kind, startedAt: tick, hit: [], moveId, instanceId };
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
      if (s.id(i) === this.player.entityId || s.hp[i]! <= 0) continue;
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
    const attack = s.definition(a),
      defend = s.definition(b),
      elements = kind === 'strike' ? [] : attack.elements;
    const multiplier = elements.length
      ? elements.reduce((sum, e) => sum + ElementPolicy.against(e, defend.elements), 0) /
        elements.length
      : 1;
    const damage = DamagePolicy.damage(
      power,
      (attack.attack + (s.level[a]! - 1)) *
        PhysiquePolicy.attack(s.physique(a), PHYSIQUES[attack.id]),
      defend.defense * PhysiquePolicy.defense(s.physique(b), PHYSIQUES[defend.id]) +
        (this.equipment?.defense(target) ?? 0),
      multiplier,
      WellbeingPolicy.multiplier(s.wellbeing(a)),
      target === 0 ? !!this.player.guarding : this.defense.defended(defend, tick),
    );
    s.hp[b] = Math.max(0, s.hp[b]! - damage);
    s.lastDamageAt[b] = tick;
    const guarded = target === 0 ? !!this.player.guarding : this.defense.defended(defend, tick);
    const impulse = PhysiquePolicy.impact(s.physique(a), s.physique(b), guarded);
    const dx = s.x[b]! - s.x[a]!,
      dy = s.y[b]! - s.y[a]!,
      length = Math.hypot(dx, dy);
    const nx = length > 0.001 ? dx / length : s.facingX[a]!,
      ny = length > 0.001 ? dy / length : s.facingY[a]!;
    s.recoilX[b] = clamp(s.recoilX[b]! + nx * impulse, -4, 4);
    s.recoilY[b] = clamp(s.recoilY[b]! + ny * impulse, -4, 4);
    const reaction = clamp(((impulse * s.massKg[b]!) / s.massKg[a]!) * 0.12, 0, 0.5);
    s.recoilX[a] = clamp(s.recoilX[a]! - nx * reaction, -4, 4);
    s.recoilY[a] = clamp(s.recoilY[a]! - ny * reaction, -4, 4);
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
        text: `${attack.name} brought down ${defend.name}.`,
      });
  }
  advance(tick: number, spatial: SpatialIndex, now = 480 + tick / 30): CombatEvent[] {
    this.now = now;
    const events: CombatEvent[] = [],
      s = this.store,
      player = this.player;
    if (player.guarding) {
      player.stamina = Math.max(0, player.stamina - 0.45);
      if (player.stamina <= 0 || player.hp <= 0 || s.sleeping[s.require(0)])
        player.guarding = false;
    }
    for (const i of s.slots()) if (s.hp[i]! > 0) s.stamina[i] = Math.min(100, s.stamina[i]! + 0.3);
    if (tick % 30 === 0) this.autonomous(tick, spatial);
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
    const partner = new PartnershipService(s).partner,
      target = this.encounters.target;
    if (partner !== null && target !== null && s.slot(target) !== undefined && s.hp[partner]! > 0) {
      if (!this.pursuits.has(s.id(partner))) this.pursue(s.id(partner), target, 'assist', tick);
      const enemy = s.require(target);
      if (this.encounters.duel !== null && !this.pursuits.has(target))
        this.pursue(target, s.id(partner), 'duel', tick);
      else if (s.nature(enemy).response === 'retaliate' && !this.pursuits.has(target))
        this.pursue(target, s.id(partner), 'retaliate', tick);
    }
    for (const [id, p] of this.pursuits) {
      const a = s.slot(id),
        b = s.slot(p.target);
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
        this.attacks.delete(id);
        this.huntReservations.delete(p.target);
        this.failedHunts.set(id, tick + 150);
        if (a !== undefined) s.mode[a] = CreatureMode.Wander;
        continue;
      }
      if (s.scene[a] !== s.scene[b]) {
        const cancelled = this.attacks.get(id);
        if (cancelled?.instanceId) this.equipment?.cancel(cancelled.instanceId);
        this.attacks.delete(id);
        continue;
      }
      SleepSystem.interrupt(s, a, this.now);
      const flee = p.cause === 'retaliate' && s.nature(a).response === 'avoid';
      s.mode[a] = flee ? CreatureMode.Flee : CreatureMode.Combat;
      const delta = { x: s.x[b]! - s.x[a]!, y: s.y[b]! - s.y[a]! },
        distance = Math.hypot(delta.x, delta.y),
        move = CREATURE_MOVES[s.definition(a).id];
      s.facingX[a] = delta.x / Math.max(0.001, distance);
      s.facingY[a] = delta.y / Math.max(0.001, distance);
      const held = this.equipment?.held(id)[0]?.id;
      const usableWeapon =
        s.isHuman(a) &&
        held &&
        ['sword', 'spear', 'bow'].includes(held) &&
        (held !== 'bow' || (this.equipment!.held(id)[1]?.charges ?? 0) > 0);
      const moveId = usableWeapon
        ? `${held}_${held === 'sword' ? 'slash' : held === 'spear' ? 'thrust' : 'shot'}`
        : 'element';
      const weaponMove = WEAPON_ATTACKS[moveId],
        range = weaponMove?.range ?? move.range;
      s.targetX[a] = flee ? s.x[a]! - delta.x : s.x[b]!;
      s.targetY[a] = flee ? s.y[a]! - delta.y : s.y[b]!;
      const combatWorld = this.worldFor?.(s.scene[a]!) ?? this.world;
      if (id !== player.entityId && combatWorld && distance > (flee ? 0 : range * 0.85)) {
        const step =
          Math.min(
            distance,
            (s.definition(a).speed *
              WellbeingPolicy.speed(s.wellbeing(a)) *
              s.movementFactor(a) *
              (this.equipment?.movement(id) ?? 1)) /
              30,
          ) * (flee ? -1 : 1);
        const position = moveOnTerrain(
          combatWorld,
          s.position(a),
          (delta.x / Math.max(0.001, distance)) * step,
          (delta.y / Math.max(0.001, distance)) * step,
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
        distance <= range &&
        (this.nextAttack.get(id) ?? 0) <= tick &&
        s.stamina[a]! >= (weaponMove?.stamina ?? 5)
      ) {
        const instanceId = `action:${id}:${tick}`;
        if (
          moveId === 'bow_shot' &&
          (this.projectiles.size >= 64 || !this.equipment?.reserve(id, instanceId))
        )
          continue;
        attack = {
          kind: usableWeapon ? 'strike' : 'element',
          startedAt: tick,
          hit: [],
          moveId,
          instanceId,
        };
        this.attacks.set(id, attack);
        s.stamina[a]! -= weaponMove?.stamina ?? 5;
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
          this.attacks.delete(id);
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
        definition = attackDefinition(action);
      if (
        !this.pursuits.has(id) ||
        slot === undefined ||
        s.hp[slot]! <= 0 ||
        tick >= action.startedAt + definition.windup + definition.active + definition.recovery
      )
        this.cancelAction(id);
    }
    return events;
  }
  pruneRetired(): void {
    for (const [id, p] of this.pursuits)
      if (this.store.slot(id) === undefined || this.store.slot(p.target) === undefined)
        this.pursuits.delete(id);
    for (const map of [this.attacks, this.nextAttack, this.failedHunts, this.huntReservations])
      for (const id of map.keys()) if (this.store.slot(id) === undefined) map.delete(id);
    for (const id of this.attacks.keys()) if (!this.pursuits.has(id)) this.cancelAction(id);
    for (const id of this.hunting) if (this.store.slot(id) === undefined) this.hunting.delete(id);
  }
  snapshot(): CombatSnapshot {
    return {
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
    this.hunting.clear();
    for (const id of snapshot.hunting) this.hunting.add(id);
    for (const [id, pursuit] of this.pursuits)
      if (pursuit.cause === 'hunt')
        this.huntReservations.set(pursuit.target, { actor: id, until: pursuit.until });
  }
}
