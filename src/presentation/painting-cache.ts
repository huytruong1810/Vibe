/** Bounded residency shared by all visible painting hooks. */
export class PaintingTextureCache<T> {
  private readonly entries = new Map<string, T>();
  constructor(
    private readonly disposeValue: (value: T) => void,
    readonly limit = 32,
  ) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 32)
      throw Error('Painting texture limit must be1–32');
  }
  get size(): number {
    return this.entries.size;
  }
  get(key: string, create: () => T, pinned: ReadonlySet<string> = new Set()): T {
    if (this.entries.has(key)) {
      const value = this.entries.get(key)!;
      this.entries.delete(key);
      this.entries.set(key, value);
      return value;
    }
    const value = create();
    this.entries.set(key, value);
    if (this.entries.size > this.limit) {
      const oldest = [...this.entries.keys()].find((entry) => !pinned.has(entry)) ?? key;
      const removed = this.entries.get(oldest)!;
      this.entries.delete(oldest);
      this.disposeValue(removed);
      if (oldest === key) throw Error('Too many mounted painting textures');
    }
    return value;
  }
  clear(): void {
    for (const value of this.entries.values()) this.disposeValue(value);
    this.entries.clear();
  }
}
