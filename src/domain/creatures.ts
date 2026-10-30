import { ITEMS, SPECIES, itemIds } from '../content/definitions';
import { SeededRandom } from './core';
import { SpatialIndex, NavigationService } from './navigation';
import { ResourceLocator, ResourceStore } from './resources';
import { ChunkStore, SurfaceRules, TileFlag, type Traversal } from './world';
import { CONFIG, clamp, normalize, type WorldPosition } from './values';
import { TwoSlotInventory } from './inventory';

export enum CreatureMode {
  Wander,
  Feed,
  Drink,
  Bathe,
  Socialize,
  Follow,
  Combat,
  Rest,
  Flee,
}
export { EntityStore as CreatureStateStore } from './entities';
import { EntityStore as CreatureStateStore, SleepSystem, NatureRules } from './entities';
export class WellbeingPolicy {
  static multiplier(score: number): number {
    return score > 0.75 ? 1 : score > 0.5 ? 0.75 : score > 0.25 ? 0.5 : score > 0 ? 0.25 : 0;
  }
  static speed(score: number): number {
    return Math.max(0.25, this.multiplier(score));
  }
  static wildness(current: number, wellbeing: number, dt: number): number {
    const stress = Math.max(0, 0.6 - wellbeing) * 0.003;
    const recovery = wellbeing >= 0.75 ? 0.001 : 0;
    return clamp(current + (stress - recovery) * dt, 0, 1.01);
  }
}
export class NeedsSystem {
  advance(
    store: CreatureStateStore,
    dt: number,
    now: number,
    player: WorldPosition,
    moving: boolean,
  ): number[] {
    const lost: number[] = [];
    for (const i of store.slots()) {
      if (!store.alive[i]) continue;
      if (store.hp[i]! <= 0) {
        store.sleeping[i] = 0;
        if (!store.protected(i) && !store.downed[i]) continue;
        if (!store.recoverAt[i]) store.recoverAt[i] = now + 60;
        if (store.recoverAt[i]! <= now) {
          store.hp[i] = store.maxHp(i) * 0.65;
          store.recoverAt[i] = 0;
          store.downed[i] = 0;
          store.food[i] = Math.max(0.5, store.food[i]!);
          store.water[i] = Math.max(0.5, store.water[i]!);
        }
        continue;
      }
      SleepSystem.update(store, i, dt, now);
      const metabolism = SleepSystem.metabolism(store.rest[i]!, !!store.sleeping[i]);
      store.food[i] = clamp(store.food[i]! - (dt * metabolism) / 1800);
      store.water[i] = clamp(store.water[i]! - (dt * metabolism) / 1400);
      store.cleanliness[i] = clamp(store.cleanliness[i]! - dt / 2100);
      const close = Math.hypot(store.x[i]! - player.x, store.y[i]! - player.y) < 8;
      store.recreation[i] = clamp(
        store.recreation[i]! +
          (store.owner[i] === 0
            ? close && moving
              ? 0.002
              : -1 / 1700
            : store.mode[i] === CreatureMode.Socialize
              ? 0.001
              : -1 / 3500) *
            dt,
      );
      if (store.food[i]! <= 0 || store.water[i]! <= 0)
        store.hp[i] = Math.max(0, store.hp[i]! - dt * 0.25);
      else if (store.wellbeing(i) >= 0.75)
        store.hp[i] = Math.min(store.maxHp(i), store.hp[i]! + dt * 0.04);
      if (store.owner[i] === 0) {
        store.wildness[i] = WellbeingPolicy.wildness(store.wildness[i]!, store.wellbeing(i), dt);
        if (store.wildness[i]! > 1) {
          store.owner[i] = -1;
          store.mode[i] = CreatureMode.Wander;
          store.trust[i] = 0.25;
          lost.push(i);
        }
      }
    }
    return lost;
  }
}

export class SimulationTierManager {
  readonly detailed: number[] = [];
  update(store: CreatureStateStore, player: WorldPosition): void {
    const eligible: { i: number; distance: number }[] = [];
    for (let i = 0; i < store.count; i++) {
      if (!store.alive[i]) continue;
      const distance = Math.hypot(store.x[i]! - player.x, store.y[i]! - player.y);
      const owned = store.owner[i] === 0;
      if (owned || distance < (store.tier[i] ? 28 : 23))
        eligible.push({ i, distance: owned ? -1 : distance });
      store.tier[i] = 0;
    }
    eligible.sort((a, b) => a.distance - b.distance || a.i - b.i);
    this.detailed.length = 0;
    for (const { i } of eligible.slice(0, CONFIG.detailedCreatures)) {
      store.tier[i] = 1;
      this.detailed.push(i);
    }
  }
}

export class SteeringSystem {
  vector(i: number, store: CreatureStateStore, index: SpatialIndex): WorldPosition {
    let sx = 0,
      sy = 0,
      ax = 0,
      ay = 0,
      cx = 0,
      cy = 0,
      count = 0;
    for (const other of index.query(store.x[i]!, store.y[i]!, 4, 32)) {
      if (
        other === i ||
        store.isHuman(other) ||
        store.herd[other] !== store.herd[i] ||
        !store.alive[other]
      )
        continue;
      const dx = store.x[i]! - store.x[other]!,
        dy = store.y[i]! - store.y[other]!,
        d2 = dx * dx + dy * dy;
      if (d2 > 16 || d2 < 0.0001) continue;
      if (d2 < 1.8) {
        sx += dx / d2;
        sy += dy / d2;
      }
      ax += store.vx[other]!;
      ay += store.vy[other]!;
      cx += store.x[other]!;
      cy += store.y[other]!;
      count++;
    }
    if (!count) return { x: 0, y: 0 };
    return {
      x: sx * 0.7 + (ax / count) * 0.08 + (cx / count - store.x[i]!) * 0.04,
      y: sy * 0.7 + (ay / count) * 0.08 + (cy / count - store.y[i]!) * 0.04,
    };
  }
}

export function creatureTraversal(store: CreatureStateStore, i: number): Traversal {
  return { lava: store.definition(i).elements.includes('fire'), water: true };
}
export function moveOnTerrain(
  world: ChunkStore,
  position: WorldPosition,
  dx: number,
  dy: number,
  traversal: Traversal,
): WorldPosition {
  let x = position.x,
    y = position.y;
  // Substeps prevent tunneling through a tile when dashing or when a coarse update runs.
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.2));
  for (let s = 0; s < steps; s++) {
    if (SurfaceRules.canStep(world, { x, y }, { x: x + dx / steps, y }, traversal)) x += dx / steps;
    if (SurfaceRules.canStep(world, { x, y }, { x, y: y + dy / steps }, traversal)) y += dy / steps;
  }
  return { x, y };
}

export class CreatureDecisionSystem {
  private readonly steering = new SteeringSystem();
  private readonly paths = new Map<number, readonly WorldPosition[]>();
  private readonly failures = new Map<number, number>();
  private observedRevision = -1;
  constructor(
    private readonly store: CreatureStateStore,
    private readonly world: ChunkStore,
    private readonly resources: ResourceStore,
    private readonly locator: ResourceLocator,
    private readonly navigation: NavigationService,
    private readonly random: SeededRandom,
  ) {}
  decide(i: number, now: number, player: WorldPosition): void {
    const s = this.store;
    if (s.hp[i]! <= 0 || s.sleeping[i] || s.mode[i] === CreatureMode.Combat) return;
    if (s.owner[i] !== -1) {
      if (s.owner[i] === 0) {
        s.mode[i] = CreatureMode.Follow;
        s.targetX[i] = player.x - 1;
        s.targetY[i] = player.y + 0.7;
      }
      return;
    }
    if (s.commitUntil[i]! > now && s.food[i]! > 0.12 && s.water[i]! > 0.12) return;
    const scores = [
      0.18,
      1 - s.food[i]!,
      1 - s.water[i]!,
      (1 - s.cleanliness[i]!) * 0.8,
      (1 - s.recreation[i]!) * 0.6,
    ];
    let mode = CreatureMode.Wander;
    for (let m = 1; m < scores.length; m++) if (scores[m]! > scores[mode]! + 0.08) mode = m;
    s.mode[i] = mode;
    s.commitUntil[i] = now + 4;
    const kinds =
      mode === CreatureMode.Feed
        ? s.definition(i).diet
        : mode === CreatureMode.Drink
          ? ['freshwater' as const]
          : mode === CreatureMode.Bathe
            ? [s.definition(i).bath]
            : [];
    const candidates = kinds.length ? this.locator.find(s.position(i), kinds, s.id(i), now) : [];
    const target = candidates.find((c) =>
      SurfaceRules.walkable(this.world, c.x, c.y, creatureTraversal(s, i)),
    );
    if (target && (this.failures.get(s.id(i)) ?? 0) <= now) {
      s.targetX[i] = target.x;
      s.targetY[i] = target.y;
      this.locator.reserve(target.index, s.id(i), now);
      this.navigation.request({
        id: `entity:${s.id(i)}`,
        start: s.position(i),
        goal: target,
        traversal: creatureTraversal(s, i),
      });
    } else if (mode === CreatureMode.Wander || !target) {
      const angle = this.random.next() * Math.PI * 2,
        radius = 2 + this.random.next() * 4;
      s.targetX[i] = clamp(s.x[i]! + Math.cos(angle) * radius, 2, this.world.size - 3);
      s.targetY[i] = clamp(s.y[i]! + Math.sin(angle) * radius, 2, this.world.size - 3);
    }
  }
  move(i: number, dt: number, now: number, spatial: SpatialIndex): void {
    if (this.observedRevision !== this.world.revision) {
      this.clearDerived();
      this.observedRevision = this.world.revision;
    }
    const s = this.store;
    if (s.hp[i]! <= 0 || s.sleeping[i]) return;
    const result = this.navigation.take(`entity:${s.id(i)}`);
    if (result.status === 'found') this.paths.set(s.id(i), result.points);
    else if (result.status === 'unreachable') {
      this.paths.delete(s.id(i));
      this.failures.set(s.id(i), now + 15);
      s.commitUntil[i] = now + 3;
    }
    let goal: WorldPosition = { x: s.targetX[i]!, y: s.targetY[i]! };
    const path = this.paths.get(s.id(i));
    if (path?.length) {
      let skip = 0;
      while (
        skip < path.length &&
        Math.hypot(path[skip]!.x - s.x[i]!, path[skip]!.y - s.y[i]!) < 0.25
      )
        skip++;
      if (skip) this.paths.set(s.id(i), path.slice(skip));
      goal = this.paths.get(s.id(i))?.[0] ?? goal;
    }
    const d = Math.hypot(goal.x - s.x[i]!, goal.y - s.y[i]!);
    if (d < 0.8) {
      const index = this.world.index(goal.x, goal.y);
      if (
        s.mode[i] === CreatureMode.Feed &&
        this.resources.item(index) &&
        s.definition(i).diet.includes(this.resources.item(index)!)
      ) {
        if (this.resources.consume(index, now)) s.food[i] = clamp(s.food[i]! + 0.45);
        s.commitUntil[i] = 0;
      }
      if (
        s.mode[i] === CreatureMode.Drink &&
        SurfaceRules.medium(this.world, index) === 'freshwater'
      )
        s.water[i] = clamp(s.water[i]! + dt * 0.2);
      if (
        s.mode[i] === CreatureMode.Bathe &&
        SurfaceRules.medium(this.world, index) === s.definition(i).bath
      )
        s.cleanliness[i] = clamp(s.cleanliness[i]! + dt * 0.12);
      s.vx[i] = s.vy[i] = 0;
      return;
    }
    const steer = s.owner[i] === -1 ? this.steering.vector(i, s, spatial) : { x: 0, y: 0 };
    const desired = normalize((goal.x - s.x[i]!) / d + steer.x, (goal.y - s.y[i]!) / d + steer.y);
    const speed =
      s.definition(i).speed *
      WellbeingPolicy.speed(s.wellbeing(i)) *
      (s.mode[i] === CreatureMode.Wander ? 0.5 : 1);
    const before = s.position(i),
      after = moveOnTerrain(
        this.world,
        before,
        desired.x * speed * dt,
        desired.y * speed * dt,
        creatureTraversal(s, i),
      );
    s.vx[i] = (after.x - before.x) / dt;
    s.vy[i] = (after.y - before.y) / dt;
    s.x[i] = after.x;
    s.y[i] = after.y;
    if (
      Math.hypot(s.vx[i]!, s.vy[i]!) < 0.05 &&
      !this.paths.get(s.id(i))?.length &&
      (this.failures.get(s.id(i)) ?? 0) <= now
    ) {
      this.navigation.request({
        id: `entity:${s.id(i)}`,
        start: after,
        goal,
        traversal: creatureTraversal(s, i),
      });
      this.failures.set(s.id(i), now + 5);
    }
  }
  clearDerived(): void {
    this.paths.clear();
    this.failures.clear();
  }
  debugPaths(observer: WorldPosition): { actor: string; points: readonly WorldPosition[] }[] {
    return [...this.paths]
      .filter(
        ([, points]) =>
          points[0] && Math.hypot(points[0].x - observer.x, points[0].y - observer.y) < 40,
      )
      .slice(0, 12)
      .map(([id, points]) => ({ actor: `creature:${id}`, points: points.slice(0, 48) }));
  }
}

export class CareInteractionSystem {
  constructor(private readonly store: CreatureStateStore) {}
  interact(
    i: number,
    action: 'feed' | 'water' | 'pet' | 'bathe' | 'heal',
    inventory: TwoSlotInventory,
    position: WorldPosition,
    world: ChunkStore,
  ): string {
    const s = this.store;
    if (
      i < 0 ||
      i >= s.count ||
      !s.alive[i] ||
      Math.hypot(s.x[i]! - position.x, s.y[i]! - position.y) > 3
    )
      return 'Move closer to a creature first.';
    const definition = s.definition(i);

    if (action === 'feed' || action === 'water' || action === 'heal') {
      const slot = inventory.state.findIndex(
        (item) =>
          item &&
          (action === 'feed'
            ? NatureRules.canConsume(s, i, item)
            : action === 'water'
              ? !!ITEMS[item.id].water
              : item.id === 'poultice'),
      );
      if (slot < 0)
        return action === 'feed'
          ? `${definition.name} eats ${definition.diet.map((id) => ITEMS[id].name).join(' or ')}.`
          : action === 'water'
            ? 'Carry spring water to offer a drink.'
            : 'You need a herbal poultice.';
      const item = inventory.remove(slot as 0 | 1)!;
      if (action === 'feed') {
        s.food[i] = clamp(s.food[i]! + (ITEMS[item.id].food ?? 0));
        s.trust[i] = clamp(s.trust[i]! + 0.3);
      }
      if (action === 'water') {
        s.water[i] = clamp(s.water[i]! + 0.45);
        s.trust[i] = clamp(s.trust[i]! + 0.18);
      }
      if (action === 'heal') {
        s.hp[i] = Math.min(s.maxHp(i), s.hp[i]! + 35);
        s.recoverAt[i] = 0;
      }
      s.recreation[i] = clamp(s.recreation[i]! + 0.1);
      s.wildness[i] = Math.max(0, s.wildness[i]! - 0.08);
      return `${definition.name} ${action === 'feed' ? 'enjoyed the meal' : action === 'water' ? 'enjoyed a cool drink' : 'feels better'}.`;
    }
    if (action === 'pet') {
      s.recreation[i] = clamp(s.recreation[i]! + 0.15);
      if (s.trust[i]! >= 0.2) s.trust[i] = clamp(s.trust[i]! + 0.08);
      s.wildness[i] = Math.max(0, s.wildness[i]! - 0.03);
      return `${definition.name} leans into your hand.`;
    }
    if (SurfaceRules.medium(world, world.index(s.x[i]!, s.y[i]!)) !== definition.bath)
      return `${definition.name} bathes in ${definition.bath}. Guide it to the right place.`;
    s.cleanliness[i] = 1;
    s.wildness[i] = Math.max(0, s.wildness[i]! - 0.1);
    return `${definition.name} is clean and content.`;
  }
}
export class PartnershipService {
  constructor(private readonly store: CreatureStateStore) {}
  get partner(): number | null {
    for (let i = 0; i < this.store.count; i++) if (this.store.owner[i] === 0) return i;
    return null;
  }
  tame(i: number, player: WorldPosition): string {
    if (this.partner !== null)
      return 'You already have a companion. Release it before forming another bond.';
    const s = this.store;
    if (
      i < 0 ||
      i >= s.count ||
      !s.alive[i] ||
      s.owner[i] !== -1 ||
      s.hp[i]! <= 0 ||
      Math.hypot(s.x[i]! - player.x, s.y[i]! - player.y) > 3
    )
      return 'That creature cannot form a bond here.';
    if (s.trust[i]! < 0.5)
      return 'Build trust with the right food, fresh water, and gentle care first.';
    s.owner[i] = 0;
    s.mode[i] = CreatureMode.Follow;
    s.wildness[i] = 0;
    s.commitUntil[i] = 0;
    return `${s.definition(i).name} is now your companion.`;
  }
  release(): string {
    const i = this.partner;
    if (i === null) return 'You do not have a companion.';
    this.store.owner[i] = -1;
    this.store.mode[i] = CreatureMode.Wander;
    this.store.wildness[i] = 0;
    return `${this.store.definition(i).name} returns to the wild, remembering your kindness.`;
  }
}

export class PopulationDirector {
  private readonly herds: HerdController;
  constructor(
    private readonly world: ChunkStore,
    private readonly random: SeededRandom,
    locator?: ResourceLocator,
  ) {
    this.herds = new HerdController(locator);
  }
  seed(store: CreatureStateStore, target: number): void {
    let center: WorldPosition | null = null;
    while (store.count < target) {
      const species =
        store.count % 50 < 2 ? 6 + (store.count % 2) : Math.floor(store.count / 6) % 6;
      let placed = false;
      if (store.count % 6 === 0) center = null;
      if (center) {
        const x = center.x + (this.random.next() - 0.5) * 4,
          y = center.y + (this.random.next() - 0.5) * 4;
        if (
          SurfaceRules.walkable(this.world, x, y, {
            lava: SPECIES[species]!.elements.includes('fire'),
            water: true,
          })
        ) {
          store.spawn(species, x, y);
          continue;
        }
      }
      for (let attempt = 0; attempt < 150; attempt++) {
        const x = 5 + this.random.int(this.world.size - 10),
          y = 5 + this.random.int(this.world.size - 10),
          index = this.world.index(x, y);
        if (
          !SPECIES[species]!.habitat.includes(this.world.biome[index]!) ||
          this.world.flags[index]! & TileFlag.Protected ||
          !SurfaceRules.walkable(this.world, x, y, {
            lava: SPECIES[species]!.elements.includes('fire'),
            water: true,
          })
        )
          continue;
        store.spawn(species, x + 0.5, y + 0.5);
        center = { x: x + 0.5, y: y + 0.5 };
        placed = true;
        break;
      }
      if (!placed)
        store.spawn(
          species,
          VILLAGE_FALLBACK.x + this.random.next() * 4,
          VILLAGE_FALLBACK.y + this.random.next() * 4,
        );
    }
  }
  migrate(store: CreatureStateStore, season: number, dt: number, now = 0): void {
    this.herds.chooseGoals(store, now, season);
    // Distant migration follows local traversable terrain; it never teleports through barriers.
    for (let i = 0; i < store.count; i++)
      if (
        store.alive[i] &&
        !store.tier[i] &&
        store.owner[i] === -1 &&
        store.hp[i]! > 0 &&
        !store.sleeping[i] &&
        store.mode[i] === CreatureMode.Wander
      ) {
        const angle = store.herd[i]! * 2.399963 + (season * Math.PI) / 2,
          goal = this.herds.goal(store.herd[i]!);
        const direction = goal
          ? normalize(goal.x - store.x[i]!, goal.y - store.y[i]!)
          : { x: Math.cos(angle), y: Math.sin(angle) };
        const p = moveOnTerrain(
          this.world,
          store.position(i),
          direction.x * dt * 0.12,
          direction.y * dt * 0.12,
          creatureTraversal(store, i),
        );
        store.x[i] = p.x;
        store.y[i] = p.y;
        // Coarse habitat consumption is bounded by available resources, not free need refills.
        const index = this.world.index(p.x, p.y),
          item = itemIdsForStore(this.world, index);
        if (
          item &&
          store.definition(i).diet.includes(item) &&
          this.world.quantity[index] &&
          store.food[i]! < 0.8
        ) {
          this.world.quantity[index]!--;
          store.food[i] = clamp(store.food[i]! + 0.35);
          if (!this.world.quantity[index]) this.world.regrowAt[index] = now + 180;
          this.world.touch(index);
        }
        const medium = SurfaceRules.medium(this.world, index);
        if (medium === 'freshwater') store.water[i] = clamp(store.water[i]! + dt * 0.15);
        if (medium === store.definition(i).bath)
          store.cleanliness[i] = clamp(store.cleanliness[i]! + dt * 0.1);
      }
  }
}
const VILLAGE_FALLBACK = { x: 260, y: 286 };
function itemIdsForStore(world: ChunkStore, index: number) {
  return itemIds[world.resource[index]! - 1];
}

export class HerdController {
  private readonly goals = new Map<
    number,
    { point: WorldPosition; until: number; season: number }
  >();
  private cursor = 0;
  constructor(private readonly locator?: ResourceLocator) {}
  chooseGoals(store: CreatureStateStore, now: number, season: number): void {
    if (!this.locator || !store.count) return;
    // At most eight herd decisions per second. Local collision remains authoritative.
    for (let count = 0; count < 8; count++) {
      const i = this.cursor++ % store.count;
      if (!store.alive[i] || store.owner[i] !== -1) continue;
      const herd = store.herd[i]!,
        current = this.goals.get(herd);
      if (current && current.until > now && current.season === season) continue;
      const kinds =
        store.water[i]! < store.food[i]! ? ['freshwater' as const] : store.definition(i).diet;
      const candidate = this.locator.find(store.position(i), kinds, i, now, 1)[0];
      if (candidate) this.goals.set(herd, { point: candidate, until: now + 90, season });
    }
  }
  goal(herd: number): WorldPosition | null {
    return this.goals.get(herd)?.point ?? null;
  }
}
