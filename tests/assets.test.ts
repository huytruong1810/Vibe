import { describe, expect, it, vi } from 'vitest';
import {
  AssetCatalogSchema,
  AppearanceResolver,
  type AssetCatalog,
} from '../src/presentation/assets/catalog';
import { AssetManager, type AssetBackend } from '../src/presentation/assets/manager';
import { assetCoverage } from '../src/presentation/assets/coverage';
import { SourceManifestSchema } from '../src/presentation/assets/source';

function catalog(): AssetCatalog {
  return {
    schemaVersion: 1,
    contentVersion: 'test',
    pages: [
      {
        id: 'a',
        url: '/assets/a.json',
        imageUrl: '/assets/a.png',
        width: 16,
        height: 16,
        variants: [
          {
            resolution: 1,
            url: '/assets/a.json',
            imageUrl: '/assets/a.png',
            width: 16,
            height: 16,
          },
          {
            resolution: 0.5,
            url: '/assets/a-half.json',
            imageUrl: '/assets/a-half.png',
            width: 8,
            height: 8,
          },
        ],
      },
      {
        id: 'b',
        url: '/assets/b.json',
        imageUrl: '/assets/b.png',
        width: 16,
        height: 16,
        variants: [
          {
            resolution: 1,
            url: '/assets/b.json',
            imageUrl: '/assets/b.png',
            width: 16,
            height: 16,
          },
        ],
      },
    ],
    frames: [
      {
        id: 'one',
        pageId: 'a',
        textureKey: 'one',
        rect: { x: 2, y: 2, w: 8, h: 8 },
        sourceSize: { w: 12, h: 12 },
        trim: { x: 2, y: 2, w: 8, h: 8 },
        anchor: { x: 0.5, y: 1 },
      },
      {
        id: 'two',
        pageId: 'b',
        textureKey: 'two',
        rect: { x: 2, y: 2, w: 8, h: 8 },
        sourceSize: { w: 12, h: 12 },
        trim: { x: 2, y: 2, w: 8, h: 8 },
        anchor: { x: 0.5, y: 1 },
      },
    ],
    clips: [
      {
        id: 'idle',
        appearanceId: 'species:rivallie',
        state: 'idle',
        facing: 's',
        frameIds: ['one', 'two'],
        fps: 6,
        playback: 'loop',
      },
    ],
    appearances: [
      {
        id: 'species:rivallie',
        kind: 'species',
        contentId: 'rivallie',
        quality: 'prototype',
        clipIds: ['idle'],
      },
    ],
    portraits: [],
  };
}
function harness(value = catalog(), budgetBytes = 4096) {
  const backend: AssetBackend<string> = {
    load: vi.fn(async (url: string) => ({
      textures: url.includes('/b.')
        ? { two: `two:${url}` }
        : ({ one: `one:${url}` } as Record<string, string>),
    })),
    unload: vi.fn(async () => undefined),
  };
  const fetcher = vi.fn(async () => new Response(JSON.stringify(value))) as unknown as typeof fetch;
  return { manager: new AssetManager<string>({ budgetBytes, backend, fetcher }), backend };
}
describe('asset boundary and identity', () => {
  it('validates cross-page clips and preserved trim/ground registration', () => {
    expect(AssetCatalogSchema.parse(catalog()).clips[0]!.frameIds).toEqual(['one', 'two']);
  });
  it('rejects duplicate IDs, missing frames, out-of-bounds trim, unsafe URLs and invalid anchors', () => {
    const mutations = [
      (c: AssetCatalog) => c.frames.push(c.frames[0]!),
      (c: AssetCatalog) => {
        c.clips[0]!.frameIds = ['missing'];
      },
      (c: AssetCatalog) => {
        c.frames[0]!.trim.x = 9;
      },
      (c: AssetCatalog) => {
        c.frames[0]!.anchor.y = 1.2;
      },
      (c: AssetCatalog) => {
        c.pages[0]!.url = '/assets/../secret.json';
      },
    ];
    for (const mutate of mutations) {
      const c = catalog();
      mutate(c);
      expect(AssetCatalogSchema.safeParse(c).success).toBe(false);
    }
  });
  it('does not substitute a different named villager for a missing identity', () => {
    const resolver = new AppearanceResolver(catalog());
    expect(resolver.resolve('npc', 'npc:neris')).toBeUndefined();
    expect(resolver.portrait('npc', 'npc:neris')).toBeUndefined();
    expect(assetCoverage(catalog()).missingIdentities).toContain('npc:neris');
  });
  it('resolves explicit prototype cardinal poses but never invents HD diagonal coverage', () => {
    const c = catalog(),
      resolver = new AppearanceResolver(c),
      a = c.appearances[0]!;
    expect(resolver.clip(a, 'idle', 'ne')?.id).toBe('idle');
    a.quality = 'hd';
    expect(resolver.clip(a, 'idle', 'ne')).toBeUndefined();
    expect(assetCoverage(c).status).toBe('prototype-only');
  });
  it('rejects source path escapes', () => {
    expect(
      SourceManifestSchema.safeParse({
        schemaVersion: 1,
        frames: [{ id: 'x', path: '../secret.png', anchor: { x: 0.5, y: 1 } }],
        appearances: [],
        clips: [],
      }).success,
    ).toBe(false);
  });
});
describe('asset lifetime', () => {
  it('awaits loads, loads each page once, references leases and disposes cached pages', async () => {
    const { manager, backend } = harness();
    await manager.loadCatalog();
    expect(manager.texture('one')).toBeUndefined();
    const [first, second] = await Promise.all([
      manager.acquire(['one', 'two']),
      manager.acquire(['one']),
    ]);
    expect(backend.load).toHaveBeenCalledTimes(2);
    expect(manager.texture('one')).toBe('one:/assets/a.json');
    first.release();
    first.release();
    expect(manager.texture('two')).toBeUndefined();
    expect(manager.texture('one')).toBeDefined();
    second.release();
    expect(manager.texture('one')).toBeUndefined();
    await manager.dispose();
    expect(backend.unload).toHaveBeenCalledTimes(2);
    expect(manager.stats.residentBytes).toBe(0);
  });
  it('uses half variants and rejects over-budget live pages without unloading them', async () => {
    const { manager, backend } = harness(catalog(), 1024);
    await manager.loadCatalog();
    const lease = await manager.acquire(['one']);
    await expect(manager.acquire(['two'])).rejects.toThrow('budget');
    expect(backend.unload).not.toHaveBeenCalled();
    lease.release();
    const half = await manager.acquire(['one'], 0.5);
    expect(manager.texture('one')).toBe('one:/assets/a-half.json');
    expect(manager.stats.residentBytes).toBe(256);
    half.release();
    await manager.dispose();
  });
  it('reports unavailable catalog and failed atlas loads without publishing textures', async () => {
    const { manager, backend } = harness();
    await manager.loadCatalog();
    vi.mocked(backend.load).mockRejectedValueOnce(new Error('offline'));
    await expect(manager.acquire(['one'])).rejects.toThrow('offline');
    expect(manager.texture('one')).toBeUndefined();
    expect(manager.stats.references).toBe(0);
    const bad = new AssetManager({
      fetcher: (async () => new Response('', { status: 404 })) as typeof fetch,
    });
    await expect(bad.loadCatalog()).rejects.toThrow('HTTP 404');
    await manager.dispose();
    await bad.dispose();
  });
  it('cancels an obsolete load without canceling a second lease for the same page', async () => {
    const { manager, backend } = harness();
    await manager.loadCatalog();
    let finish!: (value: { textures: Record<string, string> }) => void;
    vi.mocked(backend.load).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const abort = new AbortController();
    const old = manager.acquire(['one'], 1, abort.signal);
    const rejected = expect(old).rejects.toMatchObject({ name: 'AbortError' });
    const active = manager.acquire(['one']);
    await vi.waitFor(() => expect(backend.load).toHaveBeenCalledTimes(1));
    abort.abort();
    await rejected;
    expect(manager.texture('one')).toBeUndefined();
    finish({ textures: { one: 'current' } });
    const lease = await active;
    expect(manager.texture('one')).toBe('current');
    lease.release();
    await manager.dispose();
  });
  it('rejects stale catalog callbacks', async () => {
    const callbacks: ((r: Response) => void)[] = [];
    const manager = new AssetManager<string>({
      fetcher: (() => new Promise<Response>((resolve) => callbacks.push(resolve))) as typeof fetch,
      backend: { load: async () => ({ textures: {} }), unload: async () => undefined },
    });
    const a = manager.loadCatalog(),
      rejected = expect(a).rejects.toMatchObject({ name: 'AbortError' });
    const b = manager.loadCatalog();
    await vi.waitFor(() => expect(callbacks).toHaveLength(2));
    callbacks[1]!(new Response(JSON.stringify(catalog())));
    await b;
    callbacks[0]!(new Response(JSON.stringify(catalog())));
    await rejected;
    expect(manager.catalog?.contentVersion).toBe('test');
    await manager.dispose();
  });
});
