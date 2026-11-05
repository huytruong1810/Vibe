import { describe, expect, it } from 'vitest';
import { resolveAssetUrl } from '../src/presentation/assets/url';
import { AssetManager } from '../src/presentation/assets/manager';

describe('resolveAssetUrl', () => {
  it('leaves root-hosted urls unchanged', () => {
    expect(resolveAssetUrl('/assets/generated/catalog.json', '/')).toBe(
      '/assets/generated/catalog.json',
    );
  });
  it('prefixes absolute paths with a sub-path base', () => {
    expect(resolveAssetUrl('/assets/generated/catalog.json', '/Vibe/')).toBe(
      '/Vibe/assets/generated/catalog.json',
    );
    expect(resolveAssetUrl('/assets/a.png', '/Vibe')).toBe('/Vibe/assets/a.png');
  });
  it('is idempotent and keeps external, blob and data urls', () => {
    expect(resolveAssetUrl('/Vibe/assets/a.png', '/Vibe/')).toBe('/Vibe/assets/a.png');
    expect(resolveAssetUrl('https://x.test/a.png', '/Vibe/')).toBe('https://x.test/a.png');
    expect(resolveAssetUrl('blob:abc', '/Vibe/')).toBe('blob:abc');
    expect(resolveAssetUrl('assets/a.png', '/Vibe/')).toBe('assets/a.png');
  });
  it('asset manager fetches the catalog through the base', async () => {
    const seen: string[] = [];
    const manager = new AssetManager({
      base: '/Vibe/',
      fetcher: (async (u: string) => {
        seen.push(u);
        return { ok: false, status: 404 };
      }) as unknown as typeof fetch,
      backend: { load: async () => ({ textures: {} }), unload: async () => {} },
    });
    await expect(manager.loadCatalog()).rejects.toThrow();
    expect(seen).toEqual(['/Vibe/assets/generated/catalog.json']);
  });
});
