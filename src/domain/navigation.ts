import { BinaryHeap } from './core';
import { ChunkStore, PLAYER_TRAVERSAL, TerrainNavigation, type Traversal } from './world';
import { CONFIG, type WorldPosition } from './values';

export interface PathRequest {
  readonly id: string;
  readonly start: WorldPosition;
  readonly goal: WorldPosition;
  readonly traversal?: Traversal;
}
export interface PathResult {
  readonly status: 'pending' | 'found' | 'unreachable' | 'cancelled';
  readonly points: readonly WorldPosition[];
}
interface Search {
  readonly request: PathRequest;
  readonly revision: number;
  readonly open: BinaryHeap<number>;
  readonly g: Map<number, number>;
  readonly parent: Map<number, number>;
  readonly closed: Set<number>;
  readonly target: number;
  expanded: number;
}

/** Incremental cardinal A*, shared per-tick expansion budget and bounded result cache. */
export class NavigationService {
  private readonly searches = new Map<string, Search>();
  private readonly results = new Map<string, PathResult>();
  private readonly cache = new Map<string, readonly WorldPosition[]>();
  private readonly terrain: TerrainNavigation;
  private observedRevision: number;
  expansions = 0;
  constructor(readonly world: ChunkStore) {
    this.terrain = new TerrainNavigation(world);
    this.observedRevision = world.revision;
  }
  request(request: PathRequest): void {
    this.cancel(request.id);
    this.results.delete(request.id);
    const start = this.world.index(request.start.x, request.start.y),
      target = this.world.index(request.goal.x, request.goal.y);
    const key = this.key(start, target, request.traversal ?? PLAYER_TRAVERSAL);
    const cached = this.cache.get(key);
    if (cached) {
      this.results.set(request.id, { status: 'found', points: cached });
      return;
    }
    if (this.searches.size >= 64) {
      this.results.set(request.id, { status: 'unreachable', points: [] });
      return;
    }
    const open = new BinaryHeap<number>();
    open.push(start, 0);
    this.searches.set(request.id, {
      request,
      revision: this.world.revision,
      open,
      g: new Map([[start, 0]]),
      parent: new Map(),
      closed: new Set(),
      target,
      expanded: 0,
    });
  }
  private key(start: number, target: number, traversal: Traversal): string {
    return `${this.world.revision}:${start}:${target}:${+traversal.lava}:${+traversal.water}`;
  }
  advance(budget = 1000): void {
    this.expansions = 0;
    if (this.observedRevision !== this.world.revision) this.invalidate();
    // Round robin one expansion per search avoids a long route starving local work.
    while (budget > 0 && this.searches.size > 0)
      for (const [id, search] of this.searches) {
        if (budget-- <= 0) break;
        const current = search.open.pop();
        if (current === undefined || search.expanded > 16000) {
          this.complete(id, { status: 'unreachable', points: [] });
          continue;
        }
        if (search.closed.has(current)) continue;
        search.closed.add(current);
        search.expanded++;
        this.expansions++;
        if (current === search.target) {
          const points: WorldPosition[] = [];
          let at = current;
          while (search.parent.has(at)) {
            points.push({
              x: (at % this.world.size) + 0.5,
              y: Math.floor(at / this.world.size) + 0.5,
            });
            at = search.parent.get(at)!;
          }
          points.reverse();
          this.cache.set(
            this.key(
              this.world.index(search.request.start.x, search.request.start.y),
              search.target,
              search.request.traversal ?? PLAYER_TRAVERSAL,
            ),
            points,
          );
          if (this.cache.size > 128) this.cache.delete(this.cache.keys().next().value!);
          this.complete(id, { status: 'found', points });
          continue;
        }
        for (const neighbor of this.terrain.neighbors(
          current,
          search.request.traversal ?? PLAYER_TRAVERSAL,
        )) {
          if (search.closed.has(neighbor)) continue;
          const cost = search.g.get(current)! + 1;
          if (cost >= (search.g.get(neighbor) ?? Infinity)) continue;
          search.g.set(neighbor, cost);
          search.parent.set(neighbor, current);
          const h =
            Math.abs((neighbor % this.world.size) - (search.target % this.world.size)) +
            Math.abs(
              Math.floor(neighbor / this.world.size) - Math.floor(search.target / this.world.size),
            );
          search.open.push(neighbor, cost + h);
        }
      }
  }
  result(id: string): PathResult {
    return this.results.get(id) ?? { status: 'pending', points: [] };
  }
  take(id: string): PathResult {
    const result = this.result(id);
    if (result.status !== 'pending') this.results.delete(id);
    return result;
  }
  cancel(id: string): void {
    this.searches.delete(id);
    this.results.delete(id);
  }
  private complete(id: string, result: PathResult): void {
    this.searches.delete(id);
    this.results.set(id, result);
    if (this.results.size > 512) this.results.delete(this.results.keys().next().value!);
  }
  invalidate(): void {
    this.cache.clear();
    this.results.clear();
    this.observedRevision = this.world.revision;
    const retry = [...this.searches.values()].map((s) => s.request);
    this.searches.clear();
    for (const request of retry) this.request(request);
  }
  get pending(): number {
    return this.searches.size;
  }
  /** Flood fill is used by generator tests and POI validation, not per creature. */
  connected(start: WorldPosition, goals: readonly WorldPosition[]): boolean {
    const visited = new Uint8Array(this.world.size ** 2),
      queue = new Int32Array(visited.length);
    let head = 0,
      tail = 0;
    const index = this.world.index(start.x, start.y);
    visited[index] = 1;
    queue[tail++] = index;
    const targets = new Set(goals.map((g) => this.world.index(g.x, g.y)));
    while (head < tail && targets.size > 0) {
      const i = queue[head++]!;
      targets.delete(i);
      for (const n of this.terrain.neighbors(i, PLAYER_TRAVERSAL))
        if (!visited[n]) {
          visited[n] = 1;
          queue[tail++] = n;
        }
    }
    return targets.size === 0;
  }
}

/** Uniform grid, O(n) rebuild and O(cells + local occupancy) queries. */
export class SpatialIndex {
  private readonly cells = new Map<number, number[]>();
  private readonly columns: number;
  constructor(
    readonly cellSize = 8,
    readonly worldSize = CONFIG.worldSize,
  ) {
    this.columns = Math.ceil(worldSize / cellSize);
  }
  clear(): void {
    for (const cell of this.cells.values()) cell.length = 0;
  }
  insert(id: number, x: number, y: number): void {
    const key = Math.floor(y / this.cellSize) * this.columns + Math.floor(x / this.cellSize);
    let cell = this.cells.get(key);
    if (!cell) {
      cell = [];
      this.cells.set(key, cell);
    }
    cell.push(id);
  }
  query(x: number, y: number, radius: number, limit = 64): number[] {
    const found: number[] = [];
    for (
      let cy = Math.max(0, Math.floor((y - radius) / this.cellSize));
      cy <= Math.min(this.columns - 1, Math.floor((y + radius) / this.cellSize));
      cy++
    ) {
      for (
        let cx = Math.max(0, Math.floor((x - radius) / this.cellSize));
        cx <= Math.min(this.columns - 1, Math.floor((x + radius) / this.cellSize));
        cx++
      ) {
        for (const id of this.cells.get(cy * this.columns + cx) ?? []) {
          found.push(id);
          if (found.length >= limit) return found;
        }
      }
    }
    return found;
  }
}
