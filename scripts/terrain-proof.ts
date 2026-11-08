/** Official packer fixture for integration review, isolated from production assets. */
import { AssetPack } from '@assetpack/core';
import { texturePacker } from '@assetpack/core/texture-packer';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, writeFile, copyFile } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { AssetCatalogSchema } from '../src/presentation/assets/catalog';

await mkdir('.cache', { recursive: true });
const folder = await mkdtemp(resolve('.cache/c11b-proof-'));
const input = join(folder, 'input/terrain{tps}');
await mkdir(input, { recursive: true });
const packet = 'art/review/tiles-aqualia-grass-water-1';
const review = JSON.parse(await readFile(join(packet, 'review.json'), 'utf8')) as {
  tiles: { file: string; runtimeId?: string; sha256: string }[];
};
for (const tile of review.tiles) {
  if (!tile.runtimeId) continue;
  const data = await readFile(join(packet, tile.file));
  if (createHash('sha256').update(data).digest('hex') !== tile.sha256)
    throw Error('Golden fixture hash changed');
  await writeFile(join(input, `c11b_${tile.runtimeId}.png`), data);
}
await new AssetPack({
  entry: join(folder, 'input'),
  output: join(folder, 'packed'),
  cache: false,
  strict: true,
  logLevel: 'warn',
  pipes: [
    texturePacker({
      texturePacker: {
        padding: 2,
        allowTrim: true,
        allowRotation: false,
        nameStyle: 'short',
        removeFileExtension: true,
        autodetectAnimations: false,
        sharpOptions: { resize: { kernel: 'nearest' } },
      },
      resolutionOptions: { resolutions: { full: 1, half: 0.5 }, maximumTextureSize: 2048 },
    }),
  ],
}).run();
type Atlas = {
  frames: Record<
    string,
    {
      frame: { x: number; y: number; w: number; h: number };
      sourceSize: { w: number; h: number };
      spriteSourceSize: { x: number; y: number; w: number; h: number };
      rotated: boolean;
    }
  >;
  meta: {
    image: string;
    size: { w: number; h: number };
    scale: string;
    related_multi_packs?: string[];
  };
};
const atlases: { name: string; data: Atlas }[] = [];
async function scan(path: string): Promise<void> {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = join(path, entry.name);
    if (entry.isDirectory()) await scan(file);
    else if (entry.name.endsWith('.json')) {
      const data = JSON.parse(await readFile(file, 'utf8')) as Atlas;
      if (!data.frames || !data.meta?.image) continue;
      delete data.meta.related_multi_packs;
      const image = basename(data.meta.image);
      data.meta.image = image;
      await copyFile(join(path, image), join(folder, image));
      await writeFile(join(folder, entry.name), JSON.stringify(data));
      atlases.push({ name: entry.name, data });
    }
  }
}
await scan(join(folder, 'packed'));
const catalog = AssetCatalogSchema.parse(
  JSON.parse(await readFile('public/assets/generated/catalog.json', 'utf8')),
);
for (const atlas of atlases.filter((a) => Number(a.data.meta.scale) === 1)) {
  const pageId = 'c11b_' + atlas.name;
  const linked = atlases.filter(
    (a) =>
      Number(a.data.meta.scale) === 0.5 &&
      Object.keys(a.data.frames).some((id) => id in atlas.data.frames),
  );
  const variants = [atlas, ...linked].map((a) => ({
    resolution: Number(a.data.meta.scale) as 1 | 0.5,
    url: `/assets/c11b/${a.name}`,
    imageUrl: `/assets/c11b/${a.data.meta.image}`,
    width: a.data.meta.size.w,
    height: a.data.meta.size.h,
  }));
  catalog.pages.push({
    id: pageId,
    url: `/assets/c11b/${atlas.name}`,
    imageUrl: `/assets/c11b/${atlas.data.meta.image}`,
    width: atlas.data.meta.size.w,
    height: atlas.data.meta.size.h,
    variants,
  });
  for (const [id, f] of Object.entries(atlas.data.frames)) {
    if (f.rotated) throw Error('Fixture rotation forbidden');
    const contentId = id.replace(/^c11b_/, '');
    catalog.frames.push({
      id,
      pageId,
      textureKey: id,
      rect: f.frame,
      sourceSize: f.sourceSize,
      trim: f.spriteSourceSize,
      anchor: { x: 0.5, y: 0.5 },
      anchorPx: { x: f.sourceSize.w / 2, y: f.sourceSize.h / 2 },
    });
    const previous = catalog.appearances.findIndex(
      (a) => a.kind === 'environment' && a.contentId === contentId,
    );
    const appearance = {
      id: previous >= 0 ? catalog.appearances[previous]!.id : id,
      kind: 'environment',
      contentId,
      quality: 'prototype',
      frameId: id,
      clipIds: [],
    } as const;
    if (previous >= 0) catalog.appearances[previous] = { ...appearance, clipIds: [] };
    else catalog.appearances.push({ ...appearance, clipIds: [] });
  }
}
AssetCatalogSchema.parse(catalog);
await writeFile(join(folder, 'catalog.json'), JSON.stringify(catalog));
const [runner, prefix] = spawnSync('uv', ['--version']).error
  ? [process.env.PYTHON ?? 'python', ['-m', 'uv']]
  : ['uv', []];
const rendered = spawnSync(
  runner,
  [
    ...prefix,
    'run',
    '--project',
    'art/source/forge',
    'python',
    '-B',
    'art/source/world/tools/worldlib/terrain_proof.py',
    folder,
  ],
  { stdio: 'inherit', timeout: 120000 },
);
if (rendered.status !== 0) throw Error('Worldforge terrain proof failed');
await writeFile('.cache/c11b-proof.json', JSON.stringify({ folder, fixtureOnly: true, packet }));
console.log(`Fixture only, no approval or production output: ${folder}`);
