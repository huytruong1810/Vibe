import type { AssetCatalog } from './assets/catalog';

/** Tileforge's fixed unsigned hash; never use simulation RNG for decoration. */
export function terrainCellHash(x: number, y: number): number {
  return (Math.imul(x + 13, 73856093) ^ Math.imul(y + 7, 19349663)) >>> 0;
}
export function fmix32(value: number): number {
  let h = value >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
export function terrainVariant(x: number, y: number, count: number): number {
  if (!Number.isSafeInteger(count) || count < 1) throw new Error('Invalid terrain variant count');
  return fmix32(terrainCellHash(x, y)) % count;
}
export function terrainMaskFamilies(
  material: string,
  layer: 'water' | 'paths' | 'ground',
): readonly string[] {
  const surface = material.replace(/^ground_/, '');
  return [layer === 'paths' ? `path_${surface}` : `shore_${surface}`, material, surface];
}

export function authoredGroundMaterial(
  ground: string | undefined,
  surface: string | undefined,
): string | undefined {
  if (ground && ground !== 'none') return `ground_${ground}`;
  return surface && !['none', 'shallow_water', 'deep_water'].includes(surface)
    ? `ground_${surface}`
    : undefined;
}

/** Index usable catalog identities once, outside tile drawing loops. */
export class TerrainArtIndex {
  private readonly ids: ReadonlySet<string>;
  private readonly allIds: readonly string[];
  private readonly families = new Map<string, readonly string[]>();
  private readonly maskTables = new Map<string, readonly (string | undefined)[]>();
  constructor(ids: Iterable<string>) {
    this.ids = new Set(ids);
    this.allIds = [...this.ids];
    for (const id of this.ids) {
      if (/_v\d+$/.test(id) || /_mask_\d+$/.test(id)) continue;
      const variants = [id];
      // A missing index is not silently replaced with a differently numbered variant.
      for (let k = 1; this.ids.has(`${id}_v${k}`); k++) variants.push(`${id}_v${k}`);
      this.families.set(id, variants);
    }
  }
  material(id: string, x: number, y: number): string {
    const variants = this.families.get(id);
    return variants ? variants[terrainVariant(x, y, variants.length)]! : id;
  }
  mask(
    material: string,
    layer: 'water' | 'paths' | 'ground',
    mask: number,
    x: number,
    y: number,
  ): string | undefined {
    if (!Number.isInteger(mask) || mask < 0 || mask > 15) throw new Error('Invalid terrain mask');
    if (mask === 0) return undefined;
    if (mask === 15) return this.material(material, x, y);
    return this.masks(material, layer)[mask - 1];
  }
  private masks(
    material: string,
    layer: 'water' | 'paths' | 'ground',
  ): readonly (string | undefined)[] {
    const key = `${layer}:${material}`;
    let table = this.maskTables.get(key);
    if (!table) {
      const families = terrainMaskFamilies(material, layer);
      table = Array.from({ length: 14 }, (_, i) =>
        families.map((f) => `${f}_mask_${i + 1}`).find((id) => this.ids.has(id)),
      );
      this.maskTables.set(key, table);
    }
    return table;
  }
  hasMasks(material: string, layer: 'water' | 'paths' | 'ground'): boolean {
    return this.masks(material, layer).some(Boolean);
  }
  get contentIds(): readonly string[] {
    return this.allIds;
  }
}

export function terrainTextureBudget(
  catalog: Pick<AssetCatalog, 'appearances' | 'frames' | 'pages'>,
) {
  const frameIds = new Set(
    catalog.appearances
      .filter(
        (a) =>
          a.kind === 'environment' &&
          a.stage !== 'proof' &&
          a.stage !== 'candidate' &&
          /^(ground_|shore_|path_|cliff_|ramp_|reedbed)/.test(a.contentId),
      )
      .map((a) => a.frameId),
  );
  const pageIds = new Set(catalog.frames.filter((f) => frameIds.has(f.id)).map((f) => f.pageId));
  const pages = catalog.pages.filter((p) => pageIds.has(p.id));
  const bytes = (resolution: number) =>
    [
      ...new Map(
        pages.flatMap((p) =>
          p.variants.filter((v) => v.resolution === resolution).map((v) => [v.url, v] as const),
        ),
      ).values(),
    ].reduce((n, v) => n + v.width * v.height * 4, 0);
  return { pageIds: [...pageIds].sort(), fullTextureBytes: bytes(1), halfTextureBytes: bytes(0.5) };
}
