import { AssetPack } from '@assetpack/core';
import { texturePacker } from '@assetpack/core/texture-packer';
import sharp from 'sharp';
import { buildUi } from './ui-build';
import { z } from 'zod';
import { format } from 'prettier';
import { mkdir, readFile, readdir, writeFile, copyFile, rm } from 'node:fs/promises';
import { resolve, relative, join, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { NPC_PROFILES } from '../src/content/definitions';
import {
  AssetCatalogSchema,
  ArtApprovalLedgerSchema,
  ArtApprovalRecordSchema,
  hasArtApproval,
  type AnimationClip,
  type AssetAppearance,
  type AssetCatalog,
  type Facing,
  type SourceDigest,
  type PortraitSet,
} from '../src/presentation/assets/catalog';
import {
  SourceManifestSchema,
  sourceFrameAnchor,
  sourceSubjectDependencies,
  completePortraitExpressions,
  canonicalSourceJson,
  type SourceFrame,
} from '../src/presentation/assets/source';
import { assetCoverage, canPublishAppearance } from '../src/presentation/assets/coverage';

const root = process.cwd(),
  cache = resolve(root, '.cache/asset-build'),
  output = resolve(root, 'public/assets/generated');
if (
  !cache.startsWith(resolve(root, '.cache') + '\\') &&
  !cache.startsWith(resolve(root, '.cache') + '/')
)
  throw new Error('Unsafe asset cache path');
await rm(cache, { recursive: true, force: true });
await mkdir(join(cache, 'input/bundle{tps}'), { recursive: true });
await mkdir(output, { recursive: true });
const json = async <T>(path: string): Promise<T> => JSON.parse(await readFile(path, 'utf8')) as T;
const checkedPaths = new Set<string>();
type LegacyFrame = {
  frame: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  image: string;
};
type LegacySprite = {
  path: string;
  width: number;
  height: number;
  anchor: { x: number; y: number };
};
const legacy = await json<{
  frames: Record<string, LegacyFrame>;
  animations: Record<string, string[]>;
}>('public/assets/spritesheets/atlas.json');
const staticManifest = await json<{ categories: Record<string, Record<string, LegacySprite>> }>(
  'public/assets/sprites/manifest.json',
);
const bindings = await json<Record<'species' | 'npc' | 'origin' | 'item', Record<string, string>>>(
  'art/source/legacy-bindings.json',
);
const source = SourceManifestSchema.parse(await json('art/source/manifest.json'));
const sourceV2 = source.schemaVersion === 2 ? source : undefined;
const approvalLedger = ArtApprovalLedgerSchema.parse(await json('docs/art/approvals.json'));
const sourceDigests: SourceDigest[] = [];
const sourceFileHashes = new Map<string, string>();
const subjects: { kind: SourceDigest['subjectKind']; id: string }[] = [
  ...source.appearances.map((a) => ({ kind: 'appearance' as const, id: a.id })),
  ...(sourceV2?.portraitSets ?? []).map((s) => ({ kind: 'portrait-set' as const, id: s.id })),
  ...(sourceV2?.layerSets ?? []).map((s) => ({ kind: 'layer-set' as const, id: s.id })),
  ...(sourceV2?.recipes ?? []).map((s) => ({ kind: 'recipe' as const, id: s.id })),
  ...(sourceV2?.effects ?? []).map((s) => ({ kind: 'effect' as const, id: s.id })),
  ...(sourceV2?.furniture ?? []).map((s) => ({ kind: 'furniture' as const, id: s.id })),
  ...(sourceV2?.sceneAssets ?? []).map((s) => ({ kind: 'scene' as const, id: s.id })),
];
for (const subject of subjects) {
  const dependencies = sourceSubjectDependencies(source, subject.kind, subject.id);
  const files: { path: string; sha256: string }[] = [];
  for (const path of dependencies.paths) {
    if (!sourceFileHashes.has(path)) {
      const input = resolve(root, 'art/source', path);
      await exactPath(input);
      sourceFileHashes.set(
        path,
        createHash('sha256')
          .update(await readFile(input))
          .digest('hex'),
      );
    }
    for (const p of sourceV2?.authoringProvenance ?? [])
      for (const dependency of p.inputs)
        if (dependency.path === path && dependency.sha256 !== sourceFileHashes.get(path))
          throw new Error(
            `Authoring dependency hash changed: ${p.id}/${path}; update provenance and request review`,
          );
    files.push({ path, sha256: sourceFileHashes.get(path)! });
  }
  sourceDigests.push({
    subjectKind: subject.kind,
    subjectId: subject.id,
    digest: createHash('sha256')
      .update(
        canonicalSourceJson({
          contractVersion: 2,
          subject,
          metadata: dependencies.metadata,
          files,
        }),
      )
      .digest('hex'),
  });
}
const digestFor = (kind: SourceDigest['subjectKind'], id: string) =>
  sourceDigests.find((d) => d.subjectKind === kind && d.subjectId === id)?.digest;
const approved = (kind: SourceDigest['subjectKind'], id: string) =>
  hasArtApproval(kind, id, digestFor(kind, id), approvalLedger.records);
const appearances: AssetAppearance[] = [],
  clips: AnimationClip[] = [];
const frameSources = new Map<
  string,
  { path?: string; legacy?: LegacyFrame; anchor: { x: number; y: number }; source?: SourceFrame }
>();
const addFrame = (
  id: string,
  value: { path?: string; legacy?: LegacyFrame; anchor: { x: number; y: number } },
) => {
  if (frameSources.has(id)) return;
  frameSources.set(id, value);
};
for (const [kind, identities] of Object.entries(bindings) as [
  keyof typeof bindings,
  Record<string, string>,
][]) {
  for (const [contentId, prefix] of Object.entries(identities)) {
    const appearanceId = `${kind}:${contentId}`,
      clipIds: string[] = [];
    const category = kind === 'species' ? 'creatures' : kind === 'item' ? 'items' : 'characters';
    const sprite = staticManifest.categories[category]?.[prefix];
    if (!sprite) throw new Error(`Unknown authored legacy binding: ${appearanceId} -> ${prefix}`);
    const staticId = `legacy_static_${prefix}`;
    addFrame(staticId, { path: sprite.path, anchor: sprite.anchor });
    for (const [name, frames] of Object.entries(legacy.animations)) {
      if (!name.startsWith(prefix + '_')) continue;
      const suffix = name.slice(prefix.length + 1);
      let state: AnimationClip['state'],
        facing: Facing = 's';
      if (suffix === 'idle') state = 'idle';
      else if (suffix === 'attack') state = 'attack';
      else if (suffix === 'sleep') state = 'sleep';
      else if (suffix === 'walk_down') state = 'walk';
      else if (suffix === 'walk_up') {
        state = 'walk';
        facing = 'n';
      } else if (suffix === 'walk_side') {
        state = 'walk';
        facing = 'e';
      } else continue;
      const clipId = `${appearanceId}:${suffix}`;
      const frameIds = frames.map((id) => {
        if (!legacy.frames[id]) throw new Error(`Missing legacy rectangle: ${id}`);
        addFrame(id, { legacy: legacy.frames[id], anchor: sprite.anchor });
        return id;
      });
      clips.push({
        id: clipId,
        appearanceId,
        state,
        facing,
        frameIds,
        fps: state === 'walk' ? 10 : 6,
        playback: state === 'walk' ? 'distance' : 'loop',
        ...(state === 'walk' ? { stride: 1 } : {}),
      });
      clipIds.push(clipId);
    }
    appearances.push({
      id: appearanceId,
      kind,
      contentId,
      quality: 'prototype',
      clipIds,
      frameId: staticId,
    });
  }
}
appearances.push({
  id: 'fallback:human',
  kind: 'fallback',
  contentId: 'human',
  quality: 'prototype',
  clipIds: [],
});
for (const p of NPC_PROFILES)
  if (!appearances.some((a) => a.kind === 'npc' && a.contentId === p.id))
    appearances.push({
      id: `npc:${p.id}`,
      kind: 'npc',
      contentId: p.id,
      quality: 'prototype',
      clipIds: [],
      fallbackId: 'fallback:human',
    });
for (const category of ['environment', 'furniture', 'vfx'])
  for (const [contentId, sprite] of Object.entries(staticManifest.categories[category] ?? {})) {
    const frameId = `legacy_static_${contentId}`;
    addFrame(frameId, { path: sprite.path, anchor: sprite.anchor });
    appearances.push({
      id: `environment:${contentId}`,
      kind: 'environment',
      contentId,
      quality: 'prototype',
      clipIds: [],
      frameId,
    });
  }
const reviewAppearances: AssetAppearance[] = [],
  reviewClips: AnimationClip[] = [];
const sourceGraph = { ...sourceV2, appearances: source.appearances, clips: source.clips };
const runtimeArtifact = <T extends { id: string; stage: 'proof' | 'candidate' }>(
  kind: SourceDigest['subjectKind'],
  artifact: T,
) => ({
  ...artifact,
  stage: (artifact.stage === 'proof'
    ? 'proof'
    : approved(kind, artifact.id)
      ? 'approved'
      : 'candidate') as 'proof' | 'candidate' | 'approved',
  sourceDigest: digestFor(kind, artifact.id),
});
// Partial actors and proof art stay review-only, preserving their existing gameplay fallback.
for (const authored of source.appearances) {
  const a: AssetAppearance = authored;
  const recipe = sourceV2?.recipes?.find((r) => r.id === a.recipeId);
  const requiredLayers =
    recipe?.layers
      .filter((p) => p.required)
      .map((p) => sourceV2?.layerSets?.find((l) => l.id === p.layerSetId)) ?? [];
  const dependenciesApproved =
    !recipe ||
    (recipe.stage === 'candidate' &&
      approved('recipe', recipe.id) &&
      requiredLayers.every(
        (layer) =>
          layer?.stage === 'candidate' &&
          sourceV2?.appearances.find((a) => a.id === layer.appearanceId)?.stage === 'candidate' &&
          approved('layer-set', layer.id) &&
          approved('appearance', layer.appearanceId),
      ));
  const provenancePresent =
    !!a.provenanceId && !!sourceV2?.authoringProvenance?.some((p) => p.id === a.provenanceId);
  const publish =
    canPublishAppearance(sourceGraph, a) &&
    (source.schemaVersion === 1 ||
      (a.stage === 'candidate' &&
        approved('appearance', a.id) &&
        dependenciesApproved &&
        provenancePresent));
  if (!publish) {
    reviewAppearances.push({
      ...a,
      stage: a.stage === 'proof' ? 'proof' : 'candidate',
      sourceDigest: digestFor('appearance', a.id),
    });
    reviewClips.push(...source.clips.filter((c) => c.appearanceId === a.id));
    continue;
  }
  const index = appearances.findIndex(
    (existing) => existing.kind === a.kind && existing.contentId === a.contentId,
  );
  if (index >= 0) {
    const oldId = appearances[index]!.id;
    for (let i = clips.length - 1; i >= 0; i--)
      if (clips[i]!.appearanceId === oldId) clips.splice(i, 1);
    appearances.splice(index, 1);
  }
  appearances.push({
    ...a,
    ...(source.schemaVersion === 2
      ? { stage: 'approved' as const, sourceDigest: digestFor('appearance', a.id) }
      : {}),
  });
  clips.push(...source.clips.filter((c) => c.appearanceId === a.id));
}
for (const frame of source.frames) {
  if (frameSources.has(frame.id))
    throw new Error(`Source frame ID collides with legacy frame: ${frame.id}`);
  frameSources.set(frame.id, {
    path: resolve(root, 'art/source', frame.path),
    anchor: sourceFrameAnchor(frame),
    source: frame,
  });
}
const referenced = new Set([
  ...appearances.flatMap((a) => (a.frameId ? [a.frameId] : [])),
  ...clips.flatMap((c) => c.frameIds),
  ...reviewAppearances.flatMap((a) => (a.frameId ? [a.frameId] : [])),
  ...reviewClips.flatMap((c) => c.frameIds),
]);
for (const id of frameSources.keys()) if (!referenced.has(id)) frameSources.delete(id);
for (const id of referenced)
  if (!frameSources.has(id)) throw new Error(`Missing source frame ${id}`);
async function exactPath(path: string): Promise<void> {
  const absolute = resolve(path);
  if (checkedPaths.has(absolute)) return;
  if (!absolute.startsWith(root + '\\') && !absolute.startsWith(root + '/'))
    throw new Error(`Asset path outside workspace: ${path}`);
  const parts = relative(root, absolute).split(/[\\/]/);
  let current = root;
  for (const part of parts) {
    if (!(await readdir(current)).includes(part))
      throw new Error(`Wrong filename case or missing file: ${path}`);
    current = join(current, part);
  }
  checkedPaths.add(absolute);
}
const sizeById = new Map<string, { w: number; h: number }>();
for (const [id, frame] of [...frameSources].sort(([a], [b]) => a.localeCompare(b))) {
  const input = frame.legacy
    ? resolve(root, 'public', frame.legacy.image.slice(1))
    : frame.path!.startsWith('/assets/')
      ? resolve(root, 'public', frame.path!.slice(1))
      : frame.path!;
  await exactPath(input);
  let image = sharp(input).ensureAlpha();
  if (frame.legacy) {
    const { x: left, y: top, w: width, h: height } = frame.legacy.frame;
    image = image.extract({ left, top, width, height });
    // Legacy catalog's rectangles are untrimmed in the audited source export.
    if (
      frame.legacy.sourceSize.w !== width ||
      frame.legacy.sourceSize.h !== height ||
      frame.legacy.spriteSourceSize.x !== 0 ||
      frame.legacy.spriteSourceSize.y !== 0
    )
      throw new Error(`Unsupported legacy trim; export an untrimmed source instead: ${id}`);
  }
  const { data, info } = await image.png().toBuffer({ resolveWithObject: true });
  if (
    frame.source &&
    'sourceSize' in frame.source &&
    (info.width !== frame.source.sourceSize.w || info.height !== frame.source.sourceSize.h)
  )
    throw new Error(`Declared untrimmed dimensions differ from PNG: ${id}`);
  if (info.width > 2044 || info.height > 2044)
    throw new Error(`Frame exceeds padded 2048 page: ${id}`);
  const stats = await sharp(data).stats();
  if ((stats.channels[3]?.max ?? 0) === 0) throw new Error(`Empty transparent frame: ${id}`);
  sizeById.set(id, { w: info.width, h: info.height });
  await writeFile(join(cache, 'input/bundle{tps}', `${id}.png`), data);
}
await new AssetPack({
  entry: join(cache, 'input'),
  output: join(cache, 'packed'),
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
const atlases: { filename: string; json: Atlas; resolution: 1 | 0.5 }[] = [];
async function walk(path: string): Promise<void> {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const file = join(path, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (entry.name.endsWith('.json')) {
      const atlas = await json<Atlas>(file);
      if (!atlas.frames || !atlas.meta?.image) continue;
      const resolution = Number(atlas.meta.scale) as 1 | 0.5;
      if (resolution !== 1 && resolution !== 0.5)
        throw new Error(`Unexpected atlas resolution: ${file}`);
      // Every page loads independently. Cross-page animation lookup belongs to the typed catalog.
      delete atlas.meta.related_multi_packs;
      const imageName = basename(atlas.meta.image);
      atlas.meta.image = imageName;
      await copyFile(join(path, imageName), join(output, imageName));
      await writeFile(join(output, entry.name), JSON.stringify(atlas));
      atlases.push({ filename: entry.name, json: atlas, resolution });
    }
  }
}
await walk(join(cache, 'packed'));
atlases.sort((a, b) => a.filename.localeCompare(b.filename));
const lowByFrame = new Map(
  atlases
    .filter((a) => a.resolution === 0.5)
    .flatMap((a) => Object.keys(a.json.frames).map((id) => [id, a] as const)),
);
const catalog: AssetCatalog = {
  schemaVersion: 2,
  contentVersion: 'hd-contract-2',
  pages: [],
  frames: [],
  clips,
  appearances,
  portraits: [],
  rigs: sourceV2?.rigs ?? [],
  buildProfiles: sourceV2?.buildProfiles ?? [],
  layerSets: (sourceV2?.layerSets ?? []).map((a) => runtimeArtifact('layer-set', a)),
  recipes: (sourceV2?.recipes ?? []).map((a) => runtimeArtifact('recipe', a)),
  effects: (sourceV2?.effects ?? []).map((a) => runtimeArtifact('effect', a)),
  furniture: (sourceV2?.furniture ?? []).map((a) => runtimeArtifact('furniture', a)),
  sceneAssets: (sourceV2?.sceneAssets ?? []).map((a) => runtimeArtifact('scene', a)),
  portraitSets: [],
  sourceDigests,
  approvals: approvalLedger.records,
  reviewAppearances,
  reviewClips,
  authoringProvenance: sourceV2?.authoringProvenance ?? [],
};
for (const atlas of atlases.filter((a) => a.resolution === 1)) {
  const pageId = atlas.filename.replace(/\.json$/, ''),
    size = atlas.json.meta.size;
  const variants = new Map<string, (typeof catalog.pages)[number]['variants'][number]>();
  const addVariant = (a: typeof atlas) =>
    variants.set(a.filename, {
      resolution: a.resolution,
      url: `/assets/generated/${a.filename}`,
      imageUrl: `/assets/generated/${a.json.meta.image}`,
      width: a.json.meta.size.w,
      height: a.json.meta.size.h,
    });
  addVariant(atlas);
  for (const [id, f] of Object.entries(atlas.json.frames)) {
    const source = frameSources.get(id);
    if (!source) throw new Error(`Unexpected packed frame: ${id}`);
    if (f.rotated) throw new Error(`Rotation forbidden: ${id}`);
    const low = lowByFrame.get(id);
    if (!low) throw new Error(`Missing half-resolution frame: ${id}`);
    addVariant(low);
    catalog.frames.push({
      id,
      pageId,
      textureKey: id,
      rect: f.frame,
      sourceSize: sizeById.get(id)!,
      trim: f.spriteSourceSize,
      anchor: source.anchor,
      ...(source.source && 'anchorPx' in source.source
        ? {
            anchorPx: source.source.anchorPx,
            rigId: source.source.rigId,
            sockets: source.source.sockets,
          }
        : {}),
    });
  }
  catalog.pages.push({
    id: pageId,
    url: `/assets/generated/${atlas.filename}`,
    imageUrl: `/assets/generated/${atlas.json.meta.image}`,
    width: size.w,
    height: size.h,
    variants: [...variants.values()],
  });
}
const legacyPortraits = await json<
  Record<string, Record<string, { hud_96: string; hud_128: string }>>
>('art/source/legacy-portraits.json');
for (const [kind, identities] of Object.entries(bindings))
  if (kind !== 'item')
    for (const [contentId, prefix] of Object.entries(identities)) {
      const p = legacyPortraits[kind === 'species' ? 'creatures' : 'characters']?.[prefix];
      if (p)
        catalog.portraits.push({
          kind: kind as 'species' | 'npc' | 'origin',
          contentId,
          hud96: p.hud_96,
          hud128: p.hud_128,
        });
    }
for (const p of source.schemaVersion === 1 ? (source.portraits ?? []) : []) {
  const urls: Record<string, string> = {};
  for (const tier of ['hud96', 'hud128'] as const) {
    const path = resolve(root, 'art/source', p[tier]);
    if (
      !path.startsWith(resolve(root, 'art/source') + '\\') &&
      !path.startsWith(resolve(root, 'art/source') + '/')
    )
      throw new Error('Portrait source must stay within art/source');
    await exactPath(path);
    const size = tier === 'hud96' ? 96 : 128,
      meta = await sharp(path).metadata();
    if (meta.width !== size || meta.height !== size || !meta.hasAlpha)
      throw new Error(`Portrait must be transparent ${size}×${size}: ${path}`);
    const name = `portrait_${p.kind}_${p.contentId.replace(/[^A-Za-z0-9_-]/g, '_')}_${size}.png`;
    await copyFile(path, join(output, name));
    urls[tier] = `/assets/generated/${name}`;
  }
  const index = catalog.portraits.findIndex(
    (existing) => existing.kind === p.kind && existing.contentId === p.contentId,
  );
  if (index >= 0) catalog.portraits.splice(index, 1);
  catalog.portraits.push({
    kind: p.kind,
    contentId: p.contentId,
    hud96: urls.hud96!,
    hud128: urls.hud128!,
  });
}
for (const authored of sourceV2?.portraitSets ?? []) {
  const expressions: PortraitSet['expressions'] = {};
  for (const [emotion, pair] of Object.entries(authored.expressions)) {
    if (!pair) continue;
    const urls: Record<string, string> = {};
    for (const tier of ['hud96', 'hud128'] as const) {
      const path = resolve(root, 'art/source', pair[tier]);
      await exactPath(path);
      const size = tier === 'hud96' ? 96 : 128,
        meta = await sharp(path).metadata();
      if (meta.width !== size || meta.height !== size || !meta.hasAlpha)
        throw new Error(
          `Portrait expression must be transparent ${size}×${size}: ${authored.id}/${emotion}`,
        );
      const name = `portrait_${authored.id.replace(/[^A-Za-z0-9_-]/g, '_')}_${createHash('sha256').update(authored.id).digest('hex').slice(0, 12)}_${emotion}_${size}.png`;
      await copyFile(path, join(output, name));
      urls[tier] = `/assets/generated/${name}`;
    }
    expressions[emotion as keyof typeof expressions] = { hud96: urls.hud96!, hud128: urls.hud128! };
  }
  const stage =
    authored.stage === 'proof'
      ? 'proof'
      : approved('portrait-set', authored.id) &&
          completePortraitExpressions(authored) &&
          authored.provenanceId &&
          sourceV2?.authoringProvenance?.some((p) => p.id === authored.provenanceId)
        ? 'approved'
        : 'candidate';
  const set: PortraitSet = {
    ...authored,
    expressions,
    stage,
    sourceDigest: digestFor('portrait-set', authored.id),
  };
  catalog.portraitSets!.push(set);
  if (stage === 'approved' && expressions.neutral) {
    const index = catalog.portraits.findIndex(
      (p) => p.kind === authored.kind && p.contentId === authored.contentId,
    );
    if (index >= 0) catalog.portraits.splice(index, 1);
    catalog.portraits.push({
      kind: authored.kind,
      contentId: authored.contentId,
      ...expressions.neutral,
    });
  }
}
const activeSourceIds = new Set(
  catalog.appearances.filter((a) => a.stage === 'approved').map((a) => a.id),
);
for (const layer of catalog.layerSets ?? [])
  if (layer.stage === 'approved' && !activeSourceIds.has(layer.appearanceId))
    layer.stage = 'candidate';
for (const recipe of catalog.recipes ?? [])
  if (
    recipe.stage === 'approved' &&
    recipe.layers.some(
      (p) =>
        p.required &&
        !catalog.layerSets?.some((l) => l.id === p.layerSetId && l.stage === 'approved'),
    )
  )
    recipe.stage = 'candidate';
for (const effect of catalog.effects ?? [])
  if (
    effect.stage === 'approved' &&
    !catalog.clips.some((c) => c.id === effect.clipId && activeSourceIds.has(c.appearanceId))
  )
    effect.stage = 'candidate';
for (const artifact of [...(catalog.furniture ?? []), ...(catalog.sceneAssets ?? [])])
  if (artifact.stage === 'approved' && !activeSourceIds.has(artifact.appearanceId))
    artifact.stage = 'candidate';
AssetCatalogSchema.parse(catalog);
await writeFile(join(output, 'catalog.json'), JSON.stringify(catalog));
await mkdir('docs/art', { recursive: true });
await writeFile(
  'docs/art/asset-catalog.schema.json',
  await format(JSON.stringify(z.toJSONSchema(AssetCatalogSchema)), {
    parser: 'json',
    printWidth: 100,
  }),
);
await writeFile(
  'docs/art/source-manifest.schema.json',
  await format(JSON.stringify(z.toJSONSchema(SourceManifestSchema)), {
    parser: 'json',
    printWidth: 100,
  }),
);
await writeFile(
  'docs/art/art-approval-record.schema.json',
  await format(JSON.stringify(z.toJSONSchema(ArtApprovalRecordSchema)), {
    parser: 'json',
    printWidth: 100,
  }),
);
await writeFile(
  'docs/art/candidates.json',
  await format(
    JSON.stringify(
      sourceDigests.map((entry) => {
        const collection =
          entry.subjectKind === 'appearance'
            ? [...catalog.appearances, ...(catalog.reviewAppearances ?? [])]
            : entry.subjectKind === 'portrait-set'
              ? catalog.portraitSets
              : entry.subjectKind === 'layer-set'
                ? catalog.layerSets
                : entry.subjectKind === 'recipe'
                  ? catalog.recipes
                  : entry.subjectKind === 'effect'
                    ? catalog.effects
                    : entry.subjectKind === 'furniture'
                      ? catalog.furniture
                      : catalog.sceneAssets;
        const artifact = collection?.find(
          (a) => a.id === entry.subjectId && a.sourceDigest === entry.digest,
        );
        return {
          ...entry,
          approvalMatches: approved(entry.subjectKind, entry.subjectId),
          runtimeStage: artifact?.stage ?? 'legacy-adapter',
        };
      }),
    ),
    { parser: 'json', printWidth: 100 },
  ),
);
const report = assetCoverage(catalog);
await writeFile(
  'docs/art/coverage.json',
  await format(JSON.stringify(report), { parser: 'json', printWidth: 100 }),
);
await writeFile(
  'docs/art/coverage.md',
  await format(
    `# Aqualia asset coverage\n\nGenerated by \`npm run assets:build\`; details: [coverage.json](coverage.json). Status: **${report.status}**. Structural validity is separate from visual approval.\n\n| Scope | Actors | Declared HD | Complete animation | Approved actors | Neutral pairs | Complete expression sets | Approved expression sets |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n| Aqualia | ${report.requiredAppearances} | ${report.declaredHdAppearances} | ${report.completeAnimationAppearances} | ${report.approvedAppearances} | ${report.portraitPairs} | ${report.completePortraitSets} | ${report.approvedPortraitSets} |\n| Full world | ${report.fullWorld.requiredAppearances} | ${report.fullWorld.declaredHdAppearances} | ${report.fullWorld.completeAnimationAppearances} | ${report.fullWorld.approvedAppearances} | ${report.fullWorld.portraitPairs} | ${report.fullWorld.completePortraitSets} | ${report.fullWorld.approvedPortraitSets} |\n\n- Referenced frames: ${catalog.frames.length}; active clips: ${clips.length}; review appearances: ${report.reviewAppearanceCount}; independent full pages: ${catalog.pages.length}.\n- Decoded atlas memory: ${(report.fullTextureBytes / 1048576).toFixed(2)} MiB full / ${(report.halfTextureBytes / 1048576).toFixed(2)} MiB half. PNG bytes and residency are distinct measurements.\n- Missing active Aqualia sprite identities: ${report.missingIdentities.map((id) => `\`${id}\``).join(', ') || 'none'}.\n- Unmet Aqualia actor/detail/clip/portrait requirements: ${report.gaps.length}.\n- Unapproved or missing required environment assets: ${report.environmentGaps.length}.\n\nProofs and partial candidates cannot replace working gameplay appearances. An HD declaration, frame count, or successful rebuild is not production approval. The Aqualia release gate is 19 actors; the separate full-world report is 41 actors. Neutral portrait pairs are not nine-expression sets. See [contract v2](contract-v2.md) and [candidate digests](candidates.json).\n\nRun \`npm run check:assets\` for structural validation and \`npm run check:assets:hd\` for the Aqualia HD gate. Multiple 2048-square pages are supported within the 512/256/128 MiB quality-tier residency budgets.\n\nEnvironment gaps: ${report.environmentGaps.map((id) => `\`${id}\``).join(', ') || 'none'}.\n`,
    { parser: 'markdown', printWidth: 100 },
  ),
);
console.log(
  `AssetPack: ${catalog.frames.length} frames, ${catalog.pages.length} full pages, ${clips.length} active clips. Aqualia: ${report.declaredHdAppearances}/${report.requiredAppearances} declared HD, ${report.completeAnimationAppearances} complete animation, ${report.approvedAppearances} approved; full world ${report.fullWorld.approvedAppearances}/${report.fullWorld.requiredAppearances} approved.`,
);
await buildUi();
