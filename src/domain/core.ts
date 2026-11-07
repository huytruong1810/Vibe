import { CONFIG } from './values';

/** Mulberry32: stable, serializable streams independent of iteration timing. */
export class SeededRandom {
  constructor(public state: number) {
    this.state >>>= 0;
  }
  next(): number {
    let t = (this.state = (this.state + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(max: number): number {
    return Math.floor(this.next() * max);
  }
  fork(label: string): SeededRandom {
    return new SeededRandom(hashString(`${this.state}:${label}`));
  }
}
export function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return h >>> 0;
}

export class PauseController {
  private readonly tokens = new Set<string>();
  acquire(token: string): void {
    this.tokens.add(token);
  }
  release(token: string): void {
    this.tokens.delete(token);
  }
  get paused(): boolean {
    return this.tokens.size > 0;
  }
  get reasons(): readonly string[] {
    return [...this.tokens];
  }
  clear(): void {
    this.tokens.clear();
  }
}

export class FixedStepClock {
  private accumulator = 0;
  readonly stepMs = 1000 / CONFIG.tickRate;
  consume(elapsedMs: number, paused: boolean, step: () => void): number {
    if (paused) {
      this.accumulator = 0;
      return 0;
    }
    this.accumulator += Math.min(Math.max(elapsedMs, 0), 250);
    let steps = 0;
    while (this.accumulator >= this.stepMs && steps < 5) {
      step();
      this.accumulator -= this.stepMs;
      steps++;
    }
    if (steps === 5) this.accumulator = Math.min(this.accumulator, this.stepMs);
    return this.accumulator / this.stepMs;
  }
}

export class WorldCalendar {
  constructor(public elapsedSeconds = CONFIG.daySeconds / 3) {}
  get day(): number {
    return Math.floor(this.elapsedSeconds / CONFIG.daySeconds);
  }
  get weekday(): number {
    return this.day % 7;
  }
  get season(): number {
    return Math.floor(this.day / CONFIG.seasonDays) % 4;
  }
  get hour(): number {
    return ((this.elapsedSeconds % CONFIG.daySeconds) / CONFIG.daySeconds) * 24;
  }
  get label(): string {
    const minute = Math.floor(this.hour * 60);
    return `${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][this.weekday]} · ${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
  }
  advance(seconds: number): void {
    this.elapsedSeconds += seconds;
  }
}

export interface WeatherState {
  readonly kind: 'petals' | 'clear' | 'leaves' | 'snow' | 'rain';
  readonly intensity: number;
  readonly wind: number;
}
export class SeasonSystem {
  weather(calendar: WorldCalendar): WeatherState {
    const rain = calendar.day % 3 === 1 && calendar.season !== 3;
    return {
      kind: rain ? 'rain' : (['petals', 'clear', 'leaves', 'snow'] as const)[calendar.season]!,
      intensity: rain ? 0.7 : calendar.season === 3 ? 0.6 : 0.25,
      wind: Math.sin(calendar.day * 0.73) * 0.6,
    };
  }
}

export interface HeapEntry<T> {
  priority: number;
  value: T;
}
/** Stable binary min heap, O(log n) insertion/removal. */
export class BinaryHeap<T> {
  private readonly entries: (HeapEntry<T> & { order: number })[] = [];
  private sequence = 0;
  get size(): number {
    return this.entries.length;
  }
  private less(a: HeapEntry<T> & { order: number }, b: HeapEntry<T> & { order: number }): boolean {
    return a.priority < b.priority || (a.priority === b.priority && a.order < b.order);
  }
  push(value: T, priority: number): void {
    const entry = { value, priority, order: this.sequence++ };
    this.entries.push(entry);
    let i = this.entries.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!this.less(entry, this.entries[parent]!)) break;
      this.entries[i] = this.entries[parent]!;
      i = parent;
    }
    this.entries[i] = entry;
  }
  pop(): T | undefined {
    const first = this.entries[0];
    const last = this.entries.pop();
    if (!first || !last || this.entries.length === 0) return first?.value;
    let i = 0;
    while (i * 2 + 1 < this.entries.length) {
      let child = i * 2 + 1;
      if (
        child + 1 < this.entries.length &&
        this.less(this.entries[child + 1]!, this.entries[child]!)
      )
        child++;
      if (!this.less(this.entries[child]!, last)) break;
      this.entries[i] = this.entries[child]!;
      i = child;
    }
    this.entries[i] = last;
    return first.value;
  }
}

export class RingBuffer<T> {
  private readonly items: T[] = [];
  constructor(readonly capacity: number) {
    if (capacity < 1) throw new RangeError('Positive capacity required');
  }
  push(item: T): void {
    if (this.items.length === this.capacity) this.items.shift();
    this.items.push(item);
  }
  values(): readonly T[] {
    return this.items;
  }
  clear(): void {
    this.items.length = 0;
  }
}

/** Idempotency is scoped to a world session. IDs are bounded, not a forever-growing log. */
export class CommandDispatcher {
  private readonly seen = new Set<string>();
  constructor(public session: string) {}
  accept(id: string, session: string): string | null {
    if (session !== this.session) return 'Obsolete world session';
    if (this.seen.has(id)) return 'Command already processed';
    this.seen.add(id);
    if (this.seen.size > 4096) this.seen.delete(this.seen.values().next().value!);
    return null;
  }
}
