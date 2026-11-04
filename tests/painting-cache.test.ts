import { expect, it, vi } from 'vitest';
import { PaintingTextureCache } from '../src/presentation/painting-cache';
it('keeps32 textures, refreshes recent use and disposes each evicted value once', () => {
  const dispose = vi.fn(),
    cache = new PaintingTextureCache<{ id: number }>(dispose);
  for (let n = 0; n < 32; n++) cache.get(String(n), () => ({ id: n }));
  const reused = cache.get('0', () => {
    throw Error('Unexpected recreation');
  });
  cache.get('32', () => ({ id: 32 }));
  expect(cache.size).toBe(32);
  expect(dispose.mock.calls).toEqual([[{ id: 1 }]]);
  expect(cache.get('0', () => ({ id: -1 }))).toBe(reused);
  cache.clear();
  expect(cache.size).toBe(0);
  expect(dispose).toHaveBeenCalledTimes(33);
  expect(new Set(dispose.mock.calls.map(([value]) => value.id)).size).toBe(33);
});
it('evicts an offscreen texture rather than a still mounted painting', () => {
  const dispose = vi.fn(),
    cache = new PaintingTextureCache<number>(dispose);
  for (let n = 0; n < 32; n++) cache.get(String(n), () => n);
  const pinned = new Set([...Array.from({ length: 31 }, (_, n) => String(n)), '32']);
  cache.get('32', () => 32, pinned);
  expect(dispose.mock.calls).toEqual([[31]]);
  expect(
    cache.get('0', () => {
      throw Error('Mounted texture was evicted');
    }),
  ).toBe(0);
  expect(cache.size).toBe(32);
});
