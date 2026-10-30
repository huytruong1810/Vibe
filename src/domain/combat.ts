import { CREATURE_MOVES, type CreatureDefinition } from '../content/definitions';
import type { NpcState } from './agents';
import { CreatureMode, PartnershipService, WellbeingPolicy } from './creatures';
import { EntityStore, NatureRules, SleepSystem } from './entities';
import { moveOnTerrain, creatureTraversal } from './creatures';
import type { ChunkStore } from './world';
import { SpatialIndex } from './navigation';
import { clamp, distanceSquared, type Element, type WorldPosition } from './values';

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
export interface AttackState {
  kind: 'strike' | 'element';
  startedAt: number;
  hit: number[];
}
export interface PlayerState extends WorldPosition {
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
    const definition = ATTACKS[player.attack.kind],
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
    return spatial.query(player.x, player.y, range, 128).filter((i) => {
      const dx = store.x[i]! - player.x,
        dy = store.y[i]! - player.y;
      return (
        dx * dx + dy * dy <= range * range && dx * player.facingX + dy * player.facingY > -0.35
      );
    });
  }
}
export interface CombatEvent {
  readonly type: 'hit' | 'victory' | 'rescue' | 'assault' | 'hunt';
  readonly text: string;
  readonly target: number | null;
  readonly actor?: number;
}
/** Combat, threats and hit windows operate on stable entity IDs for every controller. */
export class CombatSystem {
  presentationGuard(id: number, tick: number): boolean {
    const slot = this.store.slot(id);
    return (
      slot !== undefined &&
      this.active(id) &&
      this.defense.defended(this.store.definition(slot), tick)
    );
  }
  /** Pure projection: unlike advancing a combat state machine this never expires attacks. */
  presentation(id: number, tick: number): import('./presentation-contract').ActionTiming | null {
    const attack = id === 0 ? this.player.attack : this.attacks.get(id);
    if (!attack) return null;
    const definition = ATTACKS[attack.kind];
    const activeAt = attack.startedAt + definition.windup;
    const recoveryAt = activeAt + definition.active;
    const endsAt = recoveryAt + definition.recovery;
    return tick >= endsAt
      ? null
      : { move: attack.kind, startedAt: attack.startedAt, activeAt, recoveryAt, endsAt };
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
  ) {
    this.encounters = new EncounterService(store, player, npcs);
  }
  attack(kind: 'strike' | 'element', tick: number): boolean {
    const i = this.store.slot(this.player.entityId);
    return (
      i !== undefined && !this.store.sleeping[i] && this.stateMachine.start(this.player, kind, tick)
    );
  }
  active(id: number): boolean {
    return this.pursuits.has(id) || [...this.pursuits.values()].some((p) => p.target === id);
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
        .query(s.x[i]!, s.y[i]!, Math.max(6, ...aggression.map((r) => r.radius)), 128)
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
  ): void {
    const s = this.store,
      a = s.slot(actor),
      b = s.slot(target);
    if (a === undefined || b === undefined || !NatureRules.canAttack(s, a, b)) return;
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
      attack.attack + (s.level[a]! - 1),
      defend.defense,
      multiplier,
      WellbeingPolicy.multiplier(s.wellbeing(a)),
      this.defense.defended(defend, tick),
    );
    s.hp[b] = Math.max(0, s.hp[b]! - damage);
    s.lastDamageAt[b] = tick;
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
    events.push({ type: 'hit', actor, target, text: `${defend.name} took ${damage} damage.` });
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
    for (const i of s.slots()) if (s.hp[i]! > 0) s.stamina[i] = Math.min(100, s.stamina[i]! + 0.3);
    if (tick % 30 === 0) this.autonomous(tick, spatial);
    const phase = this.stateMachine.phase(player, tick);
    if (phase === 'active' && player.attack) {
      const move = ATTACKS[player.attack.kind];
      for (const i of this.hitDetection.targets(s, player, spatial, move.range)) {
        const id = s.id(i);
        if (
          id === player.entityId ||
          s.owner[i] === player.entityId ||
          player.attack.hit.includes(id)
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
        distanceSquared(s.position(a), s.position(b)) > 144 ||
        (p.cause === 'hunt' &&
          (!NatureRules.canHunt(s, a, b, this.hunting.has(id)) || !this.hunting.has(id)))
      ) {
        this.pursuits.delete(id);
        this.attacks.delete(id);
        this.huntReservations.delete(p.target);
        this.failedHunts.set(id, tick + 150);
        if (a !== undefined) s.mode[a] = CreatureMode.Wander;
        continue;
      }
      SleepSystem.interrupt(s, a, this.now);
      const flee = p.cause === 'retaliate' && s.nature(a).response === 'avoid';
      s.mode[a] = flee ? CreatureMode.Flee : CreatureMode.Combat;
      const delta = { x: s.x[b]! - s.x[a]!, y: s.y[b]! - s.y[a]! },
        distance = Math.hypot(delta.x, delta.y),
        move = CREATURE_MOVES[s.definition(a).id];
      s.targetX[a] = flee ? s.x[a]! - delta.x : s.x[b]!;
      s.targetY[a] = flee ? s.y[a]! - delta.y : s.y[b]!;
      if (id !== player.entityId && this.world && distance > (flee ? 0 : move.range * 0.85)) {
        const step =
          Math.min(distance, (s.definition(a).speed * WellbeingPolicy.speed(s.wellbeing(a))) / 30) *
          (flee ? -1 : 1);
        const position = moveOnTerrain(
          this.world,
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
        distance <= move.range &&
        (this.nextAttack.get(id) ?? 0) <= tick &&
        s.stamina[a]! >= 5
      ) {
        attack = { kind: 'element', startedAt: tick, hit: [] };
        this.attacks.set(id, attack);
        s.stamina[a]! -= 5;
        this.nextAttack.set(id, tick + move.cooldownTicks);
      }
      if (attack) {
        const elapsed = tick - attack.startedAt;
        if (
          elapsed >= 7 &&
          elapsed < 10 &&
          !attack.hit.includes(p.target) &&
          distance <= move.range
        ) {
          attack.hit.push(p.target);
          this.hit(id, p.target, 'element', move.power, tick, events);
        }
        if (elapsed >= 26) this.attacks.delete(id);
      }
    }
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
    return events;
  }
  pruneRetired(): void {
    for (const [id, p] of this.pursuits)
      if (this.store.slot(id) === undefined || this.store.slot(p.target) === undefined)
        this.pursuits.delete(id);
    for (const map of [this.attacks, this.nextAttack, this.failedHunts, this.huntReservations])
      for (const id of map.keys()) if (this.store.slot(id) === undefined) map.delete(id);
    for (const id of this.hunting) if (this.store.slot(id) === undefined) this.hunting.delete(id);
  }
  snapshot(): CombatSnapshot {
    return {
      hunting: [...this.hunting],
      ...this.encounters.snapshot(),
      nextAttack: [...this.nextAttack],
      pursuits: [...this.pursuits],
      attacks: [...this.attacks],
      assaults: [...this.assaults],
    };
  }
  restore(snapshot: CombatSnapshot): void {
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
