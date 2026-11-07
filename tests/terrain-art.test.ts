import { expect, it } from 'vitest';
import vectors from './fixtures/terrain-variants.json';
import {
  TerrainArtIndex,
  terrainVariant,
  terrainTextureBudget,
  authoredGroundMaterial,
} from '../src/presentation/terrain-art';
import type { AssetFrame } from '../src/presentation/assets/catalog';

it('matches tileforge unsigned variant selection across signs and chunk seams', () => {
  for (const v of vectors) expect(terrainVariant(v.x, v.y, v.count)).toBe(v.variant);
  for (const count of [0, -1, 1.5, NaN]) expect(() => terrainVariant(0, 0, count)).toThrow();
});
it('selects only existing contiguous variants and retains a usable base', () => {
  const ids = ['ground_grass', 'ground_grass_v1', 'ground_grass_v2', 'ground_grass_v4'];
  const index = new TerrainArtIndex(ids);
  for (const v of vectors) {
    const k = terrainVariant(v.x, v.y, 3);
    expect(index.material('ground_grass', v.x, v.y)).toBe(
      k ? `ground_grass_v${k}` : 'ground_grass',
    );
  }
  expect(index.material('ground_stone', 0, 0)).toBe('ground_stone');
  expect(new TerrainArtIndex(['ground_stone_v1']).material('ground_stone', 0, 0)).toBe(
    'ground_stone',
  );
});
it('resolves independent water, path and material mask families with explicit missing-art fallbacks', () => {
  const index = new TerrainArtIndex([
    'ground_freshwater',
    'shore_freshwater_mask_1',
    'path_stone_mask_2',
    'ground_mud_mask_4',
    'reedbed_mask_8',
  ]);
  expect(index.mask('ground_freshwater', 'water', 0, 0, 0)).toBeUndefined();
  expect(index.mask('ground_freshwater', 'water', 1, 0, 0)).toBe('shore_freshwater_mask_1');
  expect(index.mask('ground_stone', 'paths', 2, 0, 0)).toBe('path_stone_mask_2');
  expect(index.mask('ground_mud', 'water', 4, 0, 0)).toBe('ground_mud_mask_4');
  expect(index.mask('ground_reedbed', 'ground', 8, 0, 0)).toBe('reedbed_mask_8');
  expect(index.mask('ground_freshwater', 'water', 15, 0, 0)).toBe('ground_freshwater');
  expect(index.mask('ground_freshwater', 'water', 3, 0, 0)).toBeUndefined();
  expect(() => index.mask('ground_freshwater', 'water', 16, 0, 0)).toThrow();
  expect(index.hasMasks('ground_stone', 'paths')).toBe(true);
});

it('retains authored ground underneath surfaces and recognizes stone and mud', () => {
  expect(authoredGroundMaterial('reedbed', 'grass')).toBe('ground_reedbed');
  expect(authoredGroundMaterial('grass', 'boardwalk')).toBe('ground_grass');
  expect(authoredGroundMaterial(undefined, 'stone')).toBe('ground_stone');
  expect(authoredGroundMaterial(undefined, 'mud')).toBe('ground_mud');
  expect(authoredGroundMaterial(undefined, 'shallow_water')).toBeUndefined();
  expect(authoredGroundMaterial(undefined, undefined)).toBeUndefined();
});

it('counts shared terrain page residency once and excludes candidate appearances', () => {
  const frame = (id: string, pageId: string): AssetFrame => ({
    id,
    pageId,
    textureKey: id,
    rect: { x: 0, y: 0, w: 64, h: 64 },
    sourceSize: { w: 64, h: 64 },
    trim: { x: 0, y: 0, w: 64, h: 64 },
    anchor: { x: 0.5, y: 0.5 },
  });
  const page = (id: string) => ({
    id,
    url: `/assets/${id}.json`,
    imageUrl: `/assets/${id}.png`,
    width: 64,
    height: 64,
    variants: [
      {
        resolution: 1 as const,
        url: `/assets/${id}.json`,
        imageUrl: `/assets/${id}.png`,
        width: 64,
        height: 64,
      },
      {
        resolution: 0.5 as const,
        url: `/assets/${id}-half.json`,
        imageUrl: `/assets/${id}-half.png`,
        width: 32,
        height: 32,
      },
    ],
  });
  const budget = terrainTextureBudget({
    pages: [page('shared'), page('candidate')],
    frames: [frame('grass', 'shared'), frame('dirt', 'shared'), frame('lava', 'candidate')],
    appearances: [
      {
        id: 'grass',
        kind: 'environment',
        contentId: 'ground_grass',
        quality: 'prototype',
        frameId: 'grass',
        clipIds: [],
      },
      {
        id: 'dirt',
        kind: 'environment',
        contentId: 'ground_dirt',
        quality: 'prototype',
        frameId: 'dirt',
        clipIds: [],
      },
      {
        id: 'lava',
        kind: 'environment',
        contentId: 'ground_lava',
        quality: 'hd',
        stage: 'candidate',
        frameId: 'lava',
        clipIds: [],
      },
    ],
  });
  expect(budget).toEqual({
    pageIds: ['shared'],
    fullTextureBytes: 64 * 64 * 4,
    halfTextureBytes: 32 * 32 * 4,
  });
});
