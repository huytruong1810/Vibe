import { Assets, type Texture } from 'pixi.js';
import { AssetCatalogSchema, type AssetCatalog, type AssetFrame } from './catalog';

export interface AssetBackend<T = Texture> {
  load(url: string): Promise<{ textures: Record<string, T> }>;
  unload(url: string): Promise<void>;
}
export interface AssetLease {
  release(): void;
}
interface Page<T> {
  readonly url: string;
  readonly bytes: number;
  readonly promise: Promise<void>;
  refs: number;
  textures: Record<string, T> | null;
}
const abortError = () => new DOMException('Asset request canceled', 'AbortError');
const pixiBackend: AssetBackend = {
  async load(url) {
    return Assets.load(url);
  },
  async unload(url) {
    await Assets.unload(url);
  },
};

/** Owns atlas residency, not simulation state. All texture access follows an awaited lease. */
export class AssetManager<T = Texture> {
  private current: AssetCatalog | null = null;
  private epoch = 0;
  private disposed = false;
  private readonly pages = new Map<string, Page<T>>();
  private readonly frames = new Map<string, AssetFrame>();
  private readonly frameLeases = new Map<string, Map<string, number>>();
  private reservation: Promise<void> = Promise.resolve();
  private readonly backend: AssetBackend<T>;
  private readonly fetcher: typeof fetch;
  private budget: number;
  constructor(
    options: { budgetBytes?: number; backend?: AssetBackend<T>; fetcher?: typeof fetch } = {},
  ) {
    this.budget = options.budgetBytes ?? 256 * 1024 * 1024;
    if (!Number.isFinite(this.budget) || this.budget <= 0)
      throw new Error('Texture budget must be positive');
    this.backend = options.backend ?? (pixiBackend as unknown as AssetBackend<T>);
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  }
  get catalog(): AssetCatalog | null {
    return this.current;
  }
  get budgetBytes(): number {
    return this.budget;
  }
  setBudget(bytes: number): void {
    if (!Number.isFinite(bytes) || bytes <= 0) throw new Error('Texture budget must be positive');
    this.budget = bytes;
  }
  get stats(): Readonly<{
    residentBytes: number;
    pendingBytes: number;
    pages: number;
    references: number;
  }> {
    let residentBytes = 0,
      pendingBytes = 0,
      references = 0;
    for (const p of this.pages.values()) {
      if (p.textures) residentBytes += p.bytes;
      else pendingBytes += p.bytes;
      references += p.refs;
    }
    return { residentBytes, pendingBytes, pages: this.pages.size, references };
  }
  async loadCatalog(
    url = '/assets/generated/catalog.json',
    signal?: AbortSignal,
  ): Promise<AssetCatalog> {
    if (this.disposed) throw new Error('AssetManager disposed');
    const epoch = ++this.epoch;
    this.current = null;
    await this.clearPages();
    const response = await this.fetcher(url, { signal });
    if (!response.ok) throw new Error(`Asset catalog HTTP ${response.status}: ${url}`);
    const catalog = AssetCatalogSchema.parse(await response.json());
    if (signal?.aborted || this.disposed || this.epoch !== epoch) throw abortError();
    this.current = catalog;
    this.frames.clear();
    for (const frame of catalog.frames) this.frames.set(frame.id, frame);
    return catalog;
  }
  async acquire(
    frameIds: readonly string[],
    resolution: 1 | 0.5 = 1,
    signal?: AbortSignal,
  ): Promise<AssetLease> {
    if (this.disposed || !this.current)
      throw new Error('Load an asset catalog before acquiring textures');
    if (signal?.aborted) throw abortError();
    const epoch = this.epoch,
      catalog = this.current;
    const frameSet = [...new Set(frameIds)],
      requested = new Map<string, { bytes: number }>();
    const framePages = new Map<string, Set<string>>();
    for (const id of frameSet) {
      const frame = this.frames.get(id);
      if (!frame) throw new Error(`Unknown frame: ${id}`);
      const page = catalog.pages.find((p) => p.id === frame.pageId)!;
      const variants = page.variants.filter((v) => v.resolution === resolution);
      if (!variants.length) throw new Error(`Missing ${resolution}× texture variant: ${page.id}`);
      const urls = new Set<string>();
      for (const v of variants) {
        requested.set(v.url, { bytes: v.width * v.height * 4 });
        urls.add(v.url);
      }
      framePages.set(id, urls);
    }
    const acquired: Page<T>[] = [];
    const previousReservation = this.reservation;
    let unlock!: () => void;
    this.reservation = new Promise<void>((resolve) => {
      unlock = resolve;
    });
    await previousReservation;
    try {
      const incomingBytes = [...requested].reduce(
        (n, [url, v]) => n + (this.pages.has(url) ? 0 : v.bytes),
        0,
      );
      const currentBytes = this.stats.residentBytes + this.stats.pendingBytes;
      if (currentBytes + incomingBytes > this.budgetBytes) {
        for (const [url, page] of this.pages) {
          if (page.refs !== 0 || requested.has(url)) continue;
          await page.promise.catch(() => undefined);
          if (page.refs !== 0) continue;
          // Keep the entry while unloading so a concurrent acquisition cannot publish an unloaded texture.
          await this.backend.unload(url);
          if (page.refs === 0) this.pages.delete(url);
        }
        const stats = this.stats;
        if (stats.residentBytes + stats.pendingBytes + incomingBytes > this.budgetBytes)
          throw new Error(`Texture budget exceeded (${this.budgetBytes} bytes)`);
      }
      if (this.disposed || epoch !== this.epoch || signal?.aborted) throw abortError();
      for (const [url, { bytes }] of requested) {
        let record = this.pages.get(url);
        if (!record) {
          const page: Page<T> = { url, bytes, refs: 0, textures: null, promise: Promise.resolve() };
          const promise = Promise.resolve()
            .then(() => this.backend.load(url))
            .then(
              (sheet) => {
                page.textures = sheet.textures;
              },
              (error) => {
                if (this.pages.get(url) === page) this.pages.delete(url);
                throw error;
              },
            );
          record = Object.assign(page, { promise });
          this.pages.set(url, record);
        }
        record.refs++;
        acquired.push(record);
      }
    } finally {
      unlock();
    }
    let released = false,
      published = false;
    const release = () => {
      if (released) return;
      released = true;
      for (const page of acquired) page.refs = Math.max(0, page.refs - 1);
      if (published)
        for (const id of frameSet) {
          const entry = this.frameLeases.get(id);
          if (entry) {
            for (const url of framePages.get(id)!) {
              const count = (entry.get(url) ?? 1) - 1;
              if (count <= 0) entry.delete(url);
              else entry.set(url, count);
            }
            if (!entry.size) this.frameLeases.delete(id);
          }
        }
    };
    try {
      const load = Promise.all(acquired.map((p) => p.promise));
      if (signal) {
        await new Promise<void>((resolve, reject) => {
          const abort = () => reject(abortError());
          signal.addEventListener('abort', abort, { once: true });
          void load.then(
            () => {
              signal.removeEventListener('abort', abort);
              resolve();
            },
            (error) => {
              signal.removeEventListener('abort', abort);
              reject(error);
            },
          );
        });
      } else await load;
      if (released || this.disposed || epoch !== this.epoch || signal?.aborted) throw abortError();
      for (const id of frameSet) {
        const frame = this.frames.get(id)!;
        const urls = framePages.get(id)!;
        if (![...urls].some((url) => this.pages.get(url)?.textures?.[frame.textureKey]))
          throw new Error(`Loaded atlas has no frame: ${frame.textureKey}`);
      }
      published = true;
      for (const id of frameSet) {
        const prior = this.frameLeases.get(id) ?? new Map<string, number>();
        for (const url of framePages.get(id)!) prior.set(url, (prior.get(url) ?? 0) + 1);
        this.frameLeases.set(id, prior);
      }
      return { release };
    } catch (error) {
      release();
      throw error;
    }
  }
  texture(frameId: string): T | undefined {
    const frame = this.frames.get(frameId),
      lease = this.frameLeases.get(frameId);
    if (!frame || !lease || this.disposed) return undefined;
    for (const url of lease.keys()) {
      const texture = this.pages.get(url)?.textures?.[frame.textureKey];
      if (texture) return texture;
    }
    return undefined;
  }
  private async clearPages(): Promise<void> {
    await this.reservation;
    const pages = [...this.pages.values()];
    this.frameLeases.clear();
    await Promise.all(
      pages.map(async (p) => {
        await p.promise.catch(() => undefined);
        await this.backend.unload(p.url);
      }),
    );
    for (const p of pages) if (this.pages.get(p.url) === p) this.pages.delete(p.url);
  }
  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.epoch++;
    this.current = null;
    this.frames.clear();
    await this.clearPages();
  }
}
