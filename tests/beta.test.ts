import { afterEach, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { appUrl } from '../src/presentation/assets/url';
import { AssetManager } from '../src/presentation/assets/manager';
import { IndexedDbSaveRepository } from '../src/adapters/persistence';
import { BUILD } from '../src/adapters/build';
import {
  FallbackProvider,
  InferenceScheduler,
  OllamaAdapter,
  type InferenceReceipt,
} from '../src/adapters/inference';
import { SimulationHost } from '../src/domain/simulation';
import type { InferenceJob } from '../src/domain/agents';
import { readFile } from 'node:fs/promises';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it.each(['/', '/Vibe/'])(
  'resolves catalog transport and atlas dependencies at %s',
  async (base) => {
    vi.stubEnv('BASE_URL', base);
    const catalog = JSON.parse(await readFile('public/assets/generated/catalog.json', 'utf8'));
    const backend = {
      load: vi.fn(async () => ({
        textures: Object.fromEntries(
          catalog.frames.map((f: { textureKey: string }) => [f.textureKey, {}]),
        ),
      })),
      unload: vi.fn(async () => undefined),
    };
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json(catalog),
    );
    const manager = new AssetManager({ backend, fetcher });
    try {
      const loaded = await manager.loadCatalog();
      expect(fetcher.mock.calls[0]?.[0]).toBe(`${base}assets/generated/catalog.json`);
      const frame = loaded.frames[0]!;
      const lease = await manager.acquire([frame.id]);
      const variant = loaded.pages
        .find((p) => p.id === frame.pageId)!
        .variants.find((v) => v.resolution === 1)!;
      expect(backend.load).toHaveBeenCalledWith(`${base}${variant.url.slice(1)}`);
      expect(loaded.pages[0]!.imageUrl).toMatch(/^\/assets\//);
      lease.release();
    } finally {
      await manager.dispose();
    }
    expect(appUrl(`${base}assets/a.png`, base)).toBe(`${base}assets/a.png`);
    expect(appUrl('blob:test', base)).toBe('blob:test');
  },
);

it('stamps exports while preserving strict save v5 and accepting legacy exports', async () => {
  const repository = new IndexedDbSaveRepository('beta-exports', new IDBFactory());
  const save = new SimulationHost(42, 1, 0).snapshot();
  const exported = JSON.parse(repository.export(save));
  expect(exported.version).toBe(8);
  expect(exported.build).toEqual(BUILD);
  expect(repository.import(JSON.stringify(exported))).toEqual(save);
  expect(repository.import(JSON.stringify(save))).toEqual(save);
  expect(() => repository.import(JSON.stringify({ ...exported, build: { sha: 'x' } }))).toThrow();
  expect(() => repository.import(JSON.stringify({ ...exported, unexpected: true }))).toThrow();
  await repository.close();
});

it('delivers fallback failure receipts once, bounds queued work, and resets without network calls', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const receipts: InferenceReceipt[] = [];
  const scheduler = new InferenceScheduler(new FallbackProvider(), '', (r) => receipts.push(r));
  const job = (id: string): InferenceJob => ({
    id,
    session: 'offline',
    npcId: 'npc:vulkan',
    kind: 'dialogue',
    priority: 0,
    expectedRevision: 0,
    memoryRevision: 0,
    sourceIds: [],
    messages: [],
  });
  try {
    scheduler.enqueue(job('dialogue'));
    scheduler.enqueue(job('dialogue'));
    await vi.waitFor(() => expect(receipts).toHaveLength(1));
    expect(receipts[0]).toEqual({ jobId: 'dialogue', error: 'Playing without local AI' });
    expect(scheduler.usage.queued).toBe(0);
    for (let n = 0; n < 100; n++) scheduler.enqueue(job(`queued:${n}`));
    expect(scheduler.usage.queued).toBeLessThanOrEqual(17);
    scheduler.reset('restored');
    await Promise.resolve();
    expect(scheduler.usage.queued).toBe(0);
    expect(fetcher).not.toHaveBeenCalled();
  } finally {
    scheduler.dispose();
  }
});

it('gives actionable setup guidance without asserting a specific network failure cause', async () => {
  const adapter = new OllamaAdapter('http://127.0.0.1:11434', async () => {
    throw new TypeError('Failed to fetch');
  });
  await expect(adapter.models()).rejects.toThrow('OLLAMA_ORIGINS=https://huytruong1810.github.io');
  await expect(adapter.models()).rejects.toThrow('local-network access');
});

it('names the exact origin fix for an Ollama HTTP 403', async () => {
  const adapter = new OllamaAdapter(
    'http://127.0.0.1:11434',
    async () => new Response('', { status: 403 }),
  );
  await expect(adapter.models()).rejects.toThrow('OLLAMA_ORIGINS=https://huytruong1810.github.io');
});
