import {
  SPECIES,
  VILLAGES,
  type CreatureDefinition,
  type SpeciesId,
  type ItemId,
} from '../content/definitions';
import { CONFIG, clamp, type WorldPosition } from './values';
import { PHYSIQUES, PhysiquePolicy, validatePhysique, type Physique } from './physique';

export interface AggressionRule {
  readonly target: SpeciesId | 'nonhuman';
  readonly radius: number;
}
export interface NaturePolicy {
  readonly response: 'avoid' | 'retaliate';
  readonly aggression: readonly AggressionRule[];
}
export const PASSIVE: NaturePolicy = Object.freeze({ response: 'avoid', aggression: [] });
export const NEUTRAL: NaturePolicy = Object.freeze({ response: 'retaliate', aggression: [] });

export const FLOAT_COLUMNS = [
  'x',
  'y',
  'vx',
  'vy',
  'hp',
  'food',
  'water',
  'recreation',
  'cleanliness',
  'rest',
  'stamina',
  'wildness',
  'trust',
  'targetX',
  'targetY',
  'commitUntil',
  'recoverAt',
  'experience',
  'facingX',
  'facingY',
  'emergencyUntil',
  'lastDamageAt',
] as const;
export const BYTE_COLUMNS = [
  'species',
  'alive',
  'mode',
  'tier',
  'level',
  'sleeping',
  'forcedRest',
  'voluntaryRest',
  'downed',
  'affinity',
] as const;
type FloatColumn = (typeof FLOAT_COLUMNS)[number];
type ByteColumn = (typeof BYTE_COLUMNS)[number];
export type EntityRecord = Record<FloatColumn | ByteColumn, number> & {
  id: number;
  slot: number;
  owner: number;
  herd: number;
  scene: number;
  heightMeters: number;
  massKg: number;
  recoilX: number;
  recoilY: number;
  nature: NaturePolicy;
  preferences: readonly ItemId[];
  restrictions: readonly ItemId[];
};
export interface EntitySnapshot {
  count: number;
  nextId: number;
  records: EntityRecord[];
}

const humans: readonly CreatureDefinition[] = VILLAGES.map((v) => ({
  id: 'human',
  name: 'Human',
  elements: [v.element],
  color: v.color,
  diet: ['berries', 'wheat', 'nectar', 'fungi', 'meat', 'meal'],
  bath: 'freshwater',
  hp: 100,
  attack: 8,
  defense: 8,
  speed: 4.2,
  habitat: [],
  description: 'A human with individual preferences, memories, and elemental affinity.',
}));

/** One authoritative body store. Wildlife and human slot ranges are allocation details,
 * never identities. Retired wildlife slots can be reused; persistent uint32 IDs cannot. */
export class EntityStore {
  readonly x!: Float32Array;
  readonly y!: Float32Array;
  readonly vx!: Float32Array;
  readonly vy!: Float32Array;
  readonly hp!: Float32Array;
  readonly food!: Float32Array;
  readonly water!: Float32Array;
  readonly recreation!: Float32Array;
  readonly cleanliness!: Float32Array;
  readonly rest!: Float32Array;
  readonly stamina!: Float32Array;
  readonly wildness!: Float32Array;
  readonly trust!: Float32Array;
  readonly targetX!: Float32Array;
  readonly targetY!: Float32Array;
  readonly commitUntil!: Float32Array;
  readonly recoverAt!: Float32Array;
  readonly facingX!: Float32Array;
  readonly facingY!: Float32Array;
  readonly emergencyUntil!: Float32Array;
  readonly lastDamageAt!: Float32Array;
  readonly experience!: Float64Array;
  readonly species!: Uint8Array;
  readonly alive!: Uint8Array;
  readonly mode!: Uint8Array;
  readonly tier!: Uint8Array;
  readonly level!: Uint8Array;
  readonly sleeping!: Uint8Array;
  readonly forcedRest!: Uint8Array;
  readonly voluntaryRest!: Uint8Array;
  readonly downed!: Uint8Array;
  readonly affinity!: Uint8Array;
  readonly ids: Uint32Array;
  readonly owner: Int32Array;
  readonly herd: Uint16Array;
  readonly scene: Uint16Array;
  readonly heightMeters: Float32Array;
  readonly massKg: Float32Array;
  readonly recoilX: Float32Array;
  readonly recoilY: Float32Array;
  private readonly byId = new Map<number, number>();
  private readonly policies = new Map<number, NaturePolicy>();
  private readonly restrictions = new Map<number, readonly ItemId[]>();
  private readonly preferences = new Map<number, readonly ItemId[]>();
  private nextId = 100;
  private humanCount = 0;
  count = 0;
  readonly capacity: number;
  constructor(readonly wildlifeCapacity: number = CONFIG.creatureCapacity) {
    this.capacity = wildlifeCapacity + 31;
    for (const k of FLOAT_COLUMNS)
      Object.defineProperty(this, k, {
        value:
          k === 'experience' ? new Float64Array(this.capacity) : new Float32Array(this.capacity),
      });
    for (const k of BYTE_COLUMNS)
      Object.defineProperty(this, k, { value: new Uint8Array(this.capacity) });
    this.ids = new Uint32Array(this.capacity);
    this.owner = new Int32Array(this.capacity);
    this.owner.fill(-1);
    this.herd = new Uint16Array(this.capacity);
    this.scene = new Uint16Array(this.capacity);
    this.heightMeters = new Float32Array(this.capacity);
    this.massKg = new Float32Array(this.capacity);
    this.recoilX = new Float32Array(this.capacity);
    this.recoilY = new Float32Array(this.capacity);
  }
  private initialize(
    slot: number,
    id: number,
    species: number,
    x: number,
    y: number,
    owner: number,
  ): void {
    for (const k of FLOAT_COLUMNS) this[k][slot] = 0;
    for (const k of BYTE_COLUMNS) this[k][slot] = 0;
    this.ids[slot] = id;
    this.scene[slot] = 0;
    this.byId.set(id, slot);
    this.species[slot] = species;
    this.owner[slot] = owner;
    this.alive[slot] = 1;
    this.x[slot] = this.targetX[slot] = x;
    this.y[slot] = this.targetY[slot] = y;
    this.level[slot] = 1;
    this.facingY[slot] = 1;
    this.stamina[slot] = 100;
    this.food[slot] =
      this.water[slot] =
      this.recreation[slot] =
      this.cleanliness[slot] =
      this.rest[slot] =
        0.85;
    this.hp[slot] = this.definition(slot).hp;
    const physique = PHYSIQUES[this.definition(slot).id];
    this.heightMeters[slot] = physique.heightMeters;
    this.massKg[slot] = physique.massKg;
    this.recoilX[slot] = this.recoilY[slot] = 0;
    this.herd[slot] = Math.floor(slot / 6);
    this.policies.set(id, species === 2 || species === 4 ? PASSIVE : NEUTRAL);
    if (owner >= 0) this.policies.set(id, NEUTRAL);
  }
  spawn(species: number, x: number, y: number, owner = -1): number {
    let slot = 0;
    while (slot < this.count && this.alive[slot]) slot++;
    if (slot >= this.wildlifeCapacity || this.nextId >= 0xffffffff)
      throw new Error('Entity capacity or identity space exhausted');
    this.count = Math.max(this.count, slot + 1);
    this.initialize(slot, this.nextId++, species, x, y, owner);
    return slot;
  }
  spawnHuman(id: number, affinity: number, x: number, y: number): number {
    if (!Number.isInteger(id) || id < 0 || id > 30 || this.byId.has(id))
      throw new Error('Invalid human identity');
    const slot = this.wildlifeCapacity + id;
    this.initialize(slot, id, 8, x, y, -1);
    this.humanCount++;
    this.affinity[slot] = affinity;
    this.policies.set(id, NEUTRAL);
    return slot;
  }
  retire(slot: number): void {
    if (!this.alive[slot]) return;
    if (this.isHuman(slot)) throw new Error('Authored human identities cannot be retired');
    const id = this.ids[slot]!;
    this.alive[slot] = 0;
    this.sleeping[slot] = 0;
    this.byId.delete(id);
    this.policies.delete(id);
    this.restrictions.delete(id);
    this.preferences.delete(id);
  }
  slot(id: number): number | undefined {
    return this.byId.get(id);
  }
  require(id: number): number {
    const slot = this.slot(id);
    if (slot === undefined) throw new Error(`Unknown entity ${id}`);
    return slot;
  }
  id(slot: number): number {
    return this.ids[slot]!;
  }
  *slots(): Iterable<number> {
    for (let i = 0; i < this.count; i++) if (this.alive[i]) yield i;
    for (let i = this.wildlifeCapacity; i < this.capacity; i++) if (this.alive[i]) yield i;
  }
  get livingCount(): number {
    return this.byId.size;
  }
  get wildlifeCount(): number {
    return this.byId.size - this.humanCount;
  }
  isHuman(slot: number): boolean {
    return this.species[slot] === 8;
  }
  protected(slot: number): boolean {
    return this.isHuman(slot) || this.owner[slot]! >= 0;
  }
  definition(slot: number): CreatureDefinition {
    return this.isHuman(slot) ? humans[this.affinity[slot]!]! : SPECIES[this.species[slot]!]!;
  }
  physique(slot: number): Physique {
    return { heightMeters: this.heightMeters[slot]!, massKg: this.massKg[slot]! };
  }
  setPhysique(slot: number, body: Physique): void {
    validatePhysique(body);
    this.heightMeters[slot] = body.heightMeters;
    this.massKg[slot] = body.massKg;
  }
  movementFactor(slot: number): number {
    return PhysiquePolicy.movement(this.physique(slot), PHYSIQUES[this.definition(slot).id]);
  }
  position(slot: number): WorldPosition {
    return { x: this.x[slot]!, y: this.y[slot]!, scene: this.scene[slot]! };
  }
  wellbeing(slot: number): number {
    return (
      (this.food[slot]! +
        this.water[slot]! +
        this.recreation[slot]! +
        this.cleanliness[slot]! +
        this.rest[slot]!) /
      5
    );
  }
  maxHp(slot: number): number {
    return this.definition(slot).hp + (this.level[slot]! - 1) * 5;
  }
  nature(slot: number): NaturePolicy {
    return this.policies.get(this.id(slot)) ?? NEUTRAL;
  }
  setNature(slot: number, policy: NaturePolicy): void {
    this.policies.set(this.id(slot), structuredClone(policy));
  }
  restrictDiet(slot: number, items: readonly ItemId[]): void {
    this.restrictions.set(this.id(slot), [...items]);
  }
  preferDiet(slot: number, items: readonly ItemId[]): void {
    this.preferences.set(this.id(slot), [...items]);
  }
  diet(slot: number): readonly ItemId[] {
    const eligible = this.definition(slot).diet.filter(
      (item) => !this.restrictions.get(this.id(slot))?.includes(item),
    );
    const preferences = this.preferences.get(this.id(slot)) ?? [];
    return eligible.sort(
      (a, b) => (preferences.includes(b) ? 1 : 0) - (preferences.includes(a) ? 1 : 0),
    );
  }
  displayNature(slot: number): readonly string[] {
    const policy = this.nature(slot),
      targets = [...policy.aggression.map((r) => r.target), ...(this.definition(slot).prey ?? [])];
    return policy.response === 'avoid' && !targets.length
      ? ['Passive']
      : [
          ...(policy.response === 'retaliate' ? ['Neutral'] : []),
          ...new Set(targets.map((t) => `Hostile-${t}`)),
        ];
  }
  snapshot(): EntitySnapshot {
    return {
      count: this.count,
      nextId: this.nextId,
      records: [...this.slots()].map(
        (slot) =>
          ({
            ...Object.fromEntries(
              [...FLOAT_COLUMNS, ...BYTE_COLUMNS].map((k) => [k, this[k][slot]!]),
            ),
            slot,
            id: this.id(slot),
            owner: this.owner[slot]!,
            herd: this.herd[slot]!,
            scene: this.scene[slot]!,
            heightMeters: this.heightMeters[slot]!,
            massKg: this.massKg[slot]!,
            recoilX: this.recoilX[slot]!,
            recoilY: this.recoilY[slot]!,
            nature: this.nature(slot),
            preferences: this.preferences.get(this.id(slot)) ?? [],
            restrictions: this.restrictions.get(this.id(slot)) ?? [],
          }) as EntityRecord,
      ),
    };
  }
  restore(snapshot: EntitySnapshot): void {
    for (const k of [...FLOAT_COLUMNS, ...BYTE_COLUMNS]) this[k].fill(0);
    this.owner.fill(-1);
    this.scene.fill(0);
    this.byId.clear();
    this.policies.clear();
    this.restrictions.clear();
    this.preferences.clear();
    this.count = snapshot.count;
    this.humanCount = snapshot.records.filter((r) => r.species === 8).length;
    this.nextId = snapshot.nextId;
    for (const r of snapshot.records) {
      for (const k of [...FLOAT_COLUMNS, ...BYTE_COLUMNS]) this[k][r.slot] = r[k];
      this.ids[r.slot] = r.id;
      this.owner[r.slot] = r.owner;
      this.herd[r.slot] = r.herd;
      this.scene[r.slot] = r.scene ?? 0;
      const baseline = PHYSIQUES[this.definition(r.slot).id];
      this.heightMeters[r.slot] = r.heightMeters ?? baseline.heightMeters;
      this.massKg[r.slot] = r.massKg ?? baseline.massKg;
      this.recoilX[r.slot] = r.recoilX ?? 0;
      this.recoilY[r.slot] = r.recoilY ?? 0;
      this.byId.set(r.id, r.slot);
      this.policies.set(r.id, r.nature);
      this.preferences.set(r.id, r.preferences);
      this.restrictions.set(r.id, r.restrictions);
    }
    this.validate();
  }
  validate(): void {
    let partners = 0;
    for (const i of this.slots()) {
      if (this.owner[i] === 0) partners++;
      if (!this.definition(i)) throw new Error('Missing entity definition');
      validatePhysique(this.physique(i));
      if (!Number.isFinite(this.recoilX[i]) || !Number.isFinite(this.recoilY[i]))
        throw Error('Invalid recoil');
      for (const k of FLOAT_COLUMNS)
        if (!Number.isFinite(this[k][i]))
          throw new Error(`Non-finite ${k} for entity ${this.id(i)}`);
      if (this.hp[i]! < 0 || this.hp[i]! > this.maxHp(i) + 0.01)
        throw new Error('Invalid entity HP');
      for (const k of ['food', 'water', 'recreation', 'cleanliness', 'rest', 'trust'] as const)
        if (this[k][i]! < 0 || this[k][i]! > 1.0001) throw new Error(`Invalid ${k}`);
    }
    if (partners > 1) throw new Error('Multiple player companions');
  }
}

/** Accessor adapters preserve ergonomic actor APIs without a second copy of body state. */
export function bindBody<T extends object>(target: T, store: EntityStore, id: number): T {
  const slot = store.require(id);
  for (const key of [
    'x',
    'y',
    'hp',
    'stamina',
    'experience',
    'level',
    'facingX',
    'facingY',
    'scene',
  ] as const)
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: true,
      get: () => store[key][slot],
      set: (value: number) => {
        store[key][slot] = value;
      },
    });
  Object.defineProperty(target, 'maxHp', {
    configurable: true,
    enumerable: true,
    get: () => store.maxHp(slot),
  });
  return target;
}

export class NatureRules {
  static canAttack(s: EntityStore, actor: number, target: number): boolean {
    return (
      actor !== target &&
      !!s.alive[actor] &&
      !!s.alive[target] &&
      s.hp[actor]! > 0 &&
      s.hp[target]! > 0 &&
      !s.sleeping[actor]
    );
  }
  static canHunt(s: EntityStore, actor: number, target: number, continuing = false): boolean {
    return (
      this.canAttack(s, actor, target) &&
      (s.food[actor]! < 0.4 || (continuing && s.food[actor]! <= 0.8)) &&
      !s.protected(target) &&
      s.definition(actor).id !== s.definition(target).id &&
      !!s.definition(actor).prey?.includes(s.definition(target).id)
    );
  }
  static canConsume(
    s: EntityStore,
    actor: number,
    food: { id: ItemId; originSpecies?: readonly SpeciesId[] },
    remaining = 1,
  ): boolean {
    const origins = food.originSpecies ?? [];
    return (
      !!s.alive[actor] &&
      s.hp[actor]! > 0 &&
      !s.sleeping[actor] &&
      remaining > 0 &&
      s.diet(actor).includes(food.id) &&
      ((food.id !== 'meat' && food.id !== 'meal') || origins.length > 0) &&
      !origins.includes('human') &&
      !origins.includes(s.definition(actor).id) &&
      (!s.definition(actor).prey?.length ||
        origins.every((origin) => s.definition(actor).prey!.includes(origin)))
    );
  }
}

export class SleepSystem {
  static begin(s: EntityStore, i: number, forced = false): boolean {
    if (!s.alive[i] || s.hp[i]! <= 0 || s.downed[i]) return false;
    if (forced) s.forcedRest[i] = 1;
    else s.voluntaryRest[i] = 1;
    s.sleeping[i] = 1;
    s.vx[i] = s.vy[i] = 0;
    s.mode[i] = 7;
    return true;
  }
  static interrupt(s: EntityStore, i: number, now: number): void {
    s.sleeping[i] = 0;
    s.voluntaryRest[i] = 0;
    s.emergencyUntil[i] = Math.max(s.emergencyUntil[i]!, now + 5);
  }
  static update(s: EntityStore, i: number, dt: number, now: number, danger = false): void {
    if (!s.alive[i] || s.hp[i]! <= 0 || s.downed[i]) {
      s.sleeping[i] = 0;
      return;
    }
    const emergency =
      danger || s.food[i]! < 0.08 || s.water[i]! < 0.08 || now < s.emergencyUntil[i]!;
    if (emergency && s.sleeping[i]) this.interrupt(s, i, now);
    if (s.rest[i]! <= 0) s.forcedRest[i] = 1;
    if (s.forcedRest[i] && s.rest[i]! >= 0.5) {
      s.forcedRest[i] = s.sleeping[i] = s.voluntaryRest[i] = 0;
    }
    if (s.forcedRest[i] && !emergency) this.begin(s, i, true);
    s.rest[i] = clamp(s.rest[i]! + dt * (s.sleeping[i] ? 1 / 480 : -1 / 960));
    if (s.rest[i]! <= 0) {
      s.forcedRest[i] = 1;
      if (!emergency) this.begin(s, i, true);
    }
    if (
      s.sleeping[i] &&
      ((s.forcedRest[i] && s.rest[i]! >= 0.5) || (!s.forcedRest[i] && s.rest[i]! >= 1))
    ) {
      s.sleeping[i] = s.forcedRest[i] = s.voluntaryRest[i] = 0;
    }
  }
  static metabolism(rest: number, sleeping: boolean): number {
    return sleeping ? 0.5 : 1 + 0.25 * (1 - clamp(rest));
  }
}
