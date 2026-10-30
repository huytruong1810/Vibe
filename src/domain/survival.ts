import { ITEMS, SPECIES, type ItemId } from '../content/definitions';
import { EntityStore, NatureRules, SleepSystem } from './entities';
import { moveOnTerrain, WellbeingPolicy, creatureTraversal, CreatureMode } from './creatures';
import { ResourceStore, ResourceLocator } from './resources';
import { NavigationService } from './navigation';
import { SurfaceRules, TileFlag, type ChunkStore } from './world';
import { CONFIG, clamp, distanceSquared, type WorldPosition } from './values';
import { SeededRandom } from './core';

type SurvivalTask = {
  kind: 'food' | 'water' | 'clean' | 'rest' | 'social';
  goal: WorldPosition;
  source?: number;
  pantry?: string;
  corpse?: number;
  item?: ItemId;
  until: number;
  revision: number;
};

/** Shared deterministic survival overrides schedules, plans, and following. No inventory
 * is created for NPCs: food is reserved and consumed at its actual source. */
export class SurvivalController {
  activity(id: number): SurvivalTask['kind'] | undefined {
    return this.tasks.get(id)?.kind;
  }
  private readonly tasks = new Map<number, SurvivalTask>();
  private readonly paths = new Map<number, readonly WorldPosition[]>();
  private readonly failedUntil = new Map<number, number>();
  constructor(
    private readonly s: EntityStore,
    private readonly world: ChunkStore,
    private readonly resources: ResourceStore,
    private readonly locator: ResourceLocator,
    private readonly navigation: NavigationService,
    private readonly homeFor: (id: number) => WorldPosition | undefined = () => undefined,
  ) {}

  decide(i: number, now: number, scheduledRest = false): boolean {
    const s = this.s,
      id = s.id(i);
    if (s.hp[i]! <= 0 || s.sleeping[i]) return true;
    const previous = this.tasks.get(id);
    if (
      previous &&
      previous.until > now &&
      previous.revision === this.world.revision &&
      !(
        (s.water[i]! < 0.08 && previous.kind !== 'water') ||
        (s.food[i]! < 0.08 && previous.kind !== 'food')
      )
    )
      return true;
    this.tasks.delete(id);
    if ((this.failedUntil.get(id) ?? 0) > now) return false;
    const position = s.position(i);
    let task: SurvivalTask | undefined;
    const base = { until: now + 12, revision: this.world.revision };
    if (s.water[i]! < 0.55) {
      const well = this.locator
        .find(position, ['freshwater'], id, now, 8)
        .find((c) => SurfaceRules.walkable(this.world, c.x, c.y, creatureTraversal(s, i)));
      if (well) task = { ...base, kind: 'water', goal: well, source: well.index };
    }
    if (!task && s.food[i]! < (s.definition(i).prey?.length ? 0.8 : 0.6)) {
      const corpse = this.resources.carrion
        .filter((c) =>
          NatureRules.canConsume(s, i, { id: 'meat', originSpecies: [c.species] }, c.remaining),
        )
        .sort((a, b) => distanceSquared(a, position) - distanceSquared(b, position))[0];
      if (corpse && distanceSquared(corpse, position) < 24 ** 2)
        task = { ...base, kind: 'food', goal: corpse, corpse: corpse.sourceId };
      const pantry = this.resources.supply(position);
      const item = s
        .diet(i)
        .find(
          (item) => NatureRules.canConsume(s, i, { id: item }) && (pantry?.stock[item] ?? 0) > 0,
        );
      const plant = this.locator
        .find(position, s.diet(i), id, now, 8)
        .find((c) => SurfaceRules.walkable(this.world, c.x, c.y, creatureTraversal(s, i)));
      if (
        !task &&
        pantry &&
        item &&
        (s.isHuman(i) || s.owner[i]! >= 0) &&
        (!plant || distanceSquared(pantry, position) < plant.score)
      )
        task = { ...base, kind: 'food', goal: pantry, pantry: pantry.id, item };
      if (!task && plant)
        task = {
          ...base,
          kind: 'food',
          goal: plant,
          source: plant.index,
          item: this.resources.item(plant.index)!,
        };
    }
    if (!task && (s.rest[i]! < 0.2 || scheduledRest || s.forcedRest[i])) {
      const humanOwner = s.isHuman(i) ? id : s.owner[i]!;
      const home = this.homeFor(humanOwner) ?? position;
      task = { ...base, kind: 'rest', goal: home };
    }
    if (!task && s.cleanliness[i]! < 0.45) {
      const bath = this.locator
        .find(position, [s.definition(i).bath], id, now, 8)
        .find((c) => SurfaceRules.walkable(this.world, c.x, c.y, creatureTraversal(s, i)));
      if (bath) task = { ...base, kind: 'clean', goal: bath, source: bath.index };
    }
    if (!task && s.recreation[i]! < 0.4) {
      task = { ...base, kind: 'social', goal: position };
    }
    if (!task) return false;
    this.tasks.set(id, task);
    if (task.source !== undefined) this.locator.reserve(task.source, id, now);
    s.mode[i] =
      task.kind === 'food'
        ? CreatureMode.Feed
        : task.kind === 'water'
          ? CreatureMode.Drink
          : task.kind === 'clean'
            ? CreatureMode.Bathe
            : task.kind === 'rest'
              ? CreatureMode.Rest
              : CreatureMode.Socialize;
    s.targetX[i] = task.goal.x;
    s.targetY[i] = task.goal.y;
    this.paths.delete(id);
    return true;
  }
  active(i: number): boolean {
    return !!this.s.sleeping[i] || this.tasks.has(this.s.id(i));
  }
  feeding(id: number): boolean {
    return this.tasks.get(id)?.kind === 'food';
  }
  move(i: number, dt: number, now: number): void {
    const s = this.s,
      id = s.id(i),
      task = this.tasks.get(id);
    if (!task || s.sleeping[i] || s.hp[i]! <= 0) return;
    if (task.revision !== this.world.revision) {
      this.tasks.delete(id);
      this.paths.delete(id);
      return;
    }
    const result = this.navigation.take(`survival:${id}`);
    if (result.status === 'found') this.paths.set(id, result.points);
    if (result.status === 'unreachable') {
      this.tasks.delete(id);
      this.paths.delete(id);
      this.failedUntil.set(id, now + 15);
      return;
    }
    if (distanceSquared(s.position(i), task.goal) < 1.3) {
      if (task.kind === 'food') {
        let food: {
          id: ItemId;
          originSpecies?: readonly import('../content/definitions').SpeciesId[];
        } | null = null;
        if (task.corpse !== undefined) {
          const corpse = this.resources.carrion.find((c) => c.sourceId === task.corpse);
          if (
            corpse &&
            NatureRules.canConsume(
              s,
              i,
              { id: 'meat', originSpecies: [corpse.species] },
              corpse.remaining,
            )
          )
            food = this.resources.takeCarrion(corpse.sourceId);
        } else if (task.item && NatureRules.canConsume(s, i, { id: task.item })) {
          if (
            task.pantry
              ? this.resources.consumeSupply(task.goal, task.item)
              : task.source !== undefined && this.resources.consume(task.source, now)
          )
            food = { id: task.item };
        }
        if (food) s.food[i] = clamp(s.food[i]! + (ITEMS[food.id].food ?? 0.35));
        this.finish(id, now);
      } else if (task.kind === 'water') {
        if (SurfaceRules.medium(this.world, task.source!) === 'freshwater')
          s.water[i] = clamp(s.water[i]! + dt * 0.35);
        if (s.water[i]! > 0.95) this.finish(id, now);
      } else if (task.kind === 'clean') {
        if (SurfaceRules.medium(this.world, task.source!) === s.definition(i).bath)
          s.cleanliness[i] = clamp(s.cleanliness[i]! + dt * 0.18);
        if (s.cleanliness[i]! > 0.95) this.finish(id, now);
      } else if (task.kind === 'rest') {
        SleepSystem.begin(s, i, !!s.forcedRest[i]);
        this.finish(id, now);
      } else {
        s.recreation[i] = clamp(s.recreation[i]! + dt * 0.035);
        if (s.recreation[i]! > 0.85) this.finish(id, now);
      }
      s.vx[i] = s.vy[i] = 0;
      return;
    }
    let path = this.paths.get(id) ?? [];
    while (path.length && distanceSquared(s.position(i), path[0]!) < 0.1) path = path.slice(1);
    this.paths.set(id, path);
    const goal = path[0] ?? task.goal,
      distance = Math.hypot(goal.x - s.x[i]!, goal.y - s.y[i]!);
    const step = Math.min(
      distance,
      dt * s.definition(i).speed * WellbeingPolicy.speed(s.wellbeing(i)),
    );
    const p = moveOnTerrain(
      this.world,
      s.position(i),
      ((goal.x - s.x[i]!) / distance) * step,
      ((goal.y - s.y[i]!) / distance) * step,
      creatureTraversal(s, i),
    );
    s.vx[i] = (p.x - s.x[i]!) / dt;
    s.vy[i] = (p.y - s.y[i]!) / dt;
    s.x[i] = p.x;
    s.y[i] = p.y;
    if (
      Math.hypot(s.vx[i]!, s.vy[i]!) < 0.02 &&
      this.navigation.pending < 64 &&
      (this.failedUntil.get(id) ?? 0) <= now
    ) {
      this.navigation.request({
        id: `survival:${id}`,
        start: p,
        goal: task.goal,
        traversal: creatureTraversal(s, i),
      });
      this.failedUntil.set(id, now + 5);
    }
  }
  private finish(id: number, now: number): void {
    const task = this.tasks.get(id);
    if (task?.source !== undefined) this.locator.release(task.source, id);
    this.tasks.delete(id);
    this.paths.delete(id);
    this.failedUntil.set(id, now + 0.5);
    this.navigation.cancel(`survival:${id}`);
  }
  pruneRetired(): void {
    for (const [id, task] of this.tasks)
      if (this.s.slot(id) === undefined) {
        if (task.source !== undefined) this.locator.release(task.source, id);
        this.tasks.delete(id);
        this.navigation.cancel(`survival:${id}`);
      }
    for (const map of [this.paths, this.failedUntil])
      for (const id of map.keys()) if (this.s.slot(id) === undefined) map.delete(id);
  }
  clear(): void {
    this.tasks.clear();
    this.paths.clear();
    this.failedUntil.clear();
  }
}

export interface Replacement {
  readonly species: number;
  readonly due: number;
  readonly sourceId: number;
}
export class EcologyService {
  readonly replacements: Replacement[] = [];
  target: number = CONFIG.population;
  deaths = 0;
  births = 0;
  constructor(
    private readonly s: EntityStore,
    private readonly world: ChunkStore,
    private readonly resources: ResourceStore,
    private readonly random: SeededRandom,
  ) {}
  resolveDeaths(now: number): void {
    for (let i = 0; i < this.s.count; i++)
      if (this.s.alive[i] && this.s.hp[i]! <= 0 && !this.s.protected(i) && !this.s.downed[i]) {
        const id = this.s.id(i),
          species = this.s.species[i]!;
        this.resources.addCarrion({
          sourceId: id,
          species: this.s.definition(i).id,
          ...this.s.position(i),
          remaining: 4,
          expiresAt: now + 300,
        });
        this.replacements.push({
          species,
          due: now + 120 + this.random.next() * 120,
          sourceId: id,
        });
        this.s.retire(i);
        this.deaths++;
      }
  }
  replenish(now: number): void {
    if (this.s.wildlifeCount >= this.target) return;
    // One new individual per second at most; actual habitat/resource availability bounds recovery.
    const vacancy = this.replacements.findIndex((r) => r.due <= now);
    if (vacancy < 0) return;
    const counts = new Array<number>(8).fill(0);
    for (let i = 0; i < this.s.count; i++) if (this.s.alive[i]) counts[this.s.species[i]!]!++;
    let species = this.replacements[vacancy]!.species;
    const predatorTarget = Math.floor(this.target * 0.02),
      herbivores = this.target - predatorTarget * 2;
    const targets = Array.from({ length: 8 }, (_, i) =>
      i >= 6 ? predatorTarget : Math.floor(herbivores / 6) + (i < herbivores % 6 ? 1 : 0),
    );
    if (counts[6]! < Math.floor(this.target * 0.02)) species = 6;
    else if (counts[7]! < Math.floor(this.target * 0.02)) species = 7;
    if (counts[species]! >= targets[species]!)
      species = targets
        .map((target, i) => ({ i, deficit: target - counts[i]! }))
        .sort((a, b) => b.deficit - a.deficit || a.i - b.i)[0]!.i;
    if (counts[species]! >= targets[species]!) return;
    const definition = SPECIES[species]!;
    for (let attempt = 0; attempt < 64; attempt++) {
      const x = 5 + this.random.int(this.world.size - 10),
        y = 5 + this.random.int(this.world.size - 10),
        tile = this.world.index(x, y);
      if (
        !definition.habitat.includes(this.world.biome[tile]!) ||
        this.world.flags[tile]! & TileFlag.Protected ||
        !SurfaceRules.walkable(this.world, x, y, {
          lava: definition.elements.includes('fire'),
          water: true,
        })
      )
        continue;
      // Local carrying capacity: at most 24 conspecifics in a 16-tile radius.
      let neighbors = 0,
        prey = 0;
      for (let i = 0; i < this.s.count; i++)
        if (this.s.alive[i] && distanceSquared(this.s.position(i), { x, y }) < 16 ** 2) {
          if (this.s.species[i] === species) neighbors++;
          if (
            !this.s.protected(i) &&
            this.s.hp[i]! > 0 &&
            definition.prey?.includes(this.s.definition(i).id)
          )
            prey++;
        }
      if (
        neighbors >= 24 ||
        (definition.prey?.length ? prey < 2 : !this.foodNearby(x, y, definition.diet))
      )
        continue;
      this.s.spawn(species, x + 0.5, y + 0.5);
      this.replacements.splice(vacancy, 1);
      this.births++;
      break;
    }
  }
  private foodNearby(x: number, y: number, diet: readonly ItemId[]): boolean {
    for (let dy = -8; dy <= 8; dy += 2)
      for (let dx = -8; dx <= 8; dx += 2) {
        if (!this.world.contains(x + dx, y + dy)) continue;
        const i = this.world.index(x + dx, y + dy);
        if (this.world.quantity[i] && diet.includes(this.resources.item(i)!)) return true;
      }
    return false;
  }
}
