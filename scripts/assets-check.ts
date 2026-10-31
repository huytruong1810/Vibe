import { readFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { AssetCatalogSchema, ArtApprovalLedgerSchema } from '../src/presentation/assets/catalog';
import {
  SourceManifestSchema,
  sourceSubjectDependencies,
  canonicalSourceJson,
} from '../src/presentation/assets/source';
import { assetCoverage } from '../src/presentation/assets/coverage';
import { ITEMS, NPC_PROFILES, SPECIES, VILLAGES } from '../src/content/definitions';

const root = resolve('public');
async function file(url: string): Promise<string> {
  const parts = url.replace(/^\//, '').split('/');
  let path = root;
  for (const part of parts) {
    if (part === '..' || part === '.') throw new Error(`Unsafe asset path ${url}`);
    if (!(await readdir(path)).includes(part))
      throw new Error(`Missing asset or incorrect filename case: ${url}`);
    path = join(path, part);
  }
  return path;
}
type Atlas = {
  frames: Record<
    string,
    {
      frame: { x: number; y: number; w: number; h: number };
      sourceSize: { w: number; h: number };
      spriteSourceSize: { x: number; y: number; w: number; h: number };
      rotated?: boolean;
    }
  >;
  meta: {
    image: string;
    size: { w: number; h: number };
    scale: string;
    related_multi_packs?: string[];
  };
};
const catalog = AssetCatalogSchema.parse(
  JSON.parse(await readFile('public/assets/generated/catalog.json', 'utf8')),
);
const source = SourceManifestSchema.parse(
  JSON.parse(await readFile('art/source/manifest.json', 'utf8')),
);
const ledger = ArtApprovalLedgerSchema.parse(
  JSON.parse(await readFile('docs/art/approvals.json', 'utf8')),
);
if (catalog.schemaVersion === 2) {
  if (canonicalSourceJson(catalog.approvals ?? []) !== canonicalSourceJson(ledger.records))
    throw new Error('Runtime art approvals differ from engineering ledger; rebuild assets');
  const expectedCount =
    source.appearances.length +
    (source.schemaVersion === 2
      ? (source.layerSets?.length ?? 0) +
        (source.recipes?.length ?? 0) +
        (source.portraitSets?.length ?? 0) +
        (source.effects?.length ?? 0) +
        (source.furniture?.length ?? 0) +
        (source.sceneAssets?.length ?? 0)
      : 0);
  if ((catalog.sourceDigests?.length ?? 0) !== expectedCount)
    throw new Error('Runtime source digest index is incomplete; rebuild assets');
  const hashes = new Map<string, string>();
  for (const d of catalog.sourceDigests ?? []) {
    const dependencies = sourceSubjectDependencies(source, d.subjectKind, d.subjectId),
      files: { path: string; sha256: string }[] = [];
    for (const path of dependencies.paths) {
      if (!hashes.has(path))
        hashes.set(
          path,
          createHash('sha256')
            .update(await readFile(resolve('art/source', path)))
            .digest('hex'),
        );
      if (source.schemaVersion === 2)
        for (const p of source.authoringProvenance ?? [])
          for (const input of p.inputs)
            if (input.path === path && input.sha256 !== hashes.get(path))
              throw new Error(`Stale authoring dependency hash: ${p.id}/${path}`);
      files.push({ path, sha256: hashes.get(path)! });
    }
    const digest = createHash('sha256')
      .update(
        canonicalSourceJson({
          contractVersion: 2,
          subject: { kind: d.subjectKind, id: d.subjectId },
          metadata: dependencies.metadata,
          files,
        }),
      )
      .digest('hex');
    if (digest !== d.digest)
      throw new Error(
        `Stale source digest: ${d.subjectKind}/${d.subjectId}; rebuild and review changed sources`,
      );
  }
}
const atlasByUrl = new Map<string, Atlas>();
for (const page of catalog.pages)
  for (const variant of page.variants) {
    if (atlasByUrl.has(variant.url)) continue;
    const atlas = JSON.parse(await readFile(await file(variant.url), 'utf8')) as Atlas;
    const image = await sharp(await file(variant.imageUrl)).metadata();
    if (
      !image.hasAlpha ||
      image.width !== variant.width ||
      image.height !== variant.height ||
      image.width > 2048 ||
      image.height > 2048
    )
      throw new Error(`Wrong texture dimensions/format: ${variant.imageUrl}`);
    if (
      atlas.meta.image !== variant.imageUrl.split('/').at(-1) ||
      Number(atlas.meta.scale) !== variant.resolution ||
      atlas.meta.size.w !== image.width ||
      atlas.meta.size.h !== image.height ||
      atlas.meta.related_multi_packs?.length
    )
      throw new Error(`Atlas page must be independently loadable: ${variant.url}`);
    for (const [id, f] of Object.entries(atlas.frames)) {
      if (
        f.rotated ||
        f.frame.x < 0 ||
        f.frame.y < 0 ||
        f.frame.w <= 0 ||
        f.frame.h <= 0 ||
        f.frame.x + f.frame.w > image.width ||
        f.frame.y + f.frame.h > image.height
      )
        throw new Error(`Out-of-bounds/rotated atlas frame ${id}`);
      if (
        f.spriteSourceSize.x + f.spriteSourceSize.w > f.sourceSize.w ||
        f.spriteSourceSize.y + f.spriteSourceSize.h > f.sourceSize.h
      )
        throw new Error(`Broken atlas trim registration: ${id}`);
    }
    atlasByUrl.set(variant.url, atlas);
  }
for (const frame of catalog.frames) {
  const page = catalog.pages.find((p) => p.id === frame.pageId)!;
  const full = atlasByUrl.get(page.url)?.frames[frame.textureKey];
  if (
    !full ||
    JSON.stringify(full.frame) !== JSON.stringify(frame.rect) ||
    JSON.stringify(full.sourceSize) !== JSON.stringify(frame.sourceSize) ||
    JSON.stringify(full.spriteSourceSize) !== JSON.stringify(frame.trim)
  )
    throw new Error(`Catalog/atlas registration mismatch: ${frame.id}`);
  for (const resolution of [1, 0.5])
    if (
      !page.variants.some(
        (v) => v.resolution === resolution && atlasByUrl.get(v.url)?.frames[frame.textureKey],
      )
    )
      throw new Error(`Missing ${resolution}× frame: ${frame.id}`);
}
const valid: Record<string, Set<string>> = {
  species: new Set(SPECIES.filter((s) => s.id !== 'human').map((s) => s.id)),
  npc: new Set(NPC_PROFILES.map((p) => p.id)),
  origin: new Set(VILLAGES.map((v) => v.name.toLowerCase())),
  item: new Set(Object.keys(ITEMS)),
};
for (const a of catalog.appearances) {
  if (valid[a.kind] && !valid[a.kind]!.has(a.contentId))
    throw new Error(`Unknown canonical ${a.kind} identity: ${a.contentId}`);
  if (a.quality === 'hd' && ['npc', 'origin', 'species'].includes(a.kind)) {
    const ids = new Set(
      a.clipIds.flatMap((id) => catalog.clips.find((c) => c.id === id)?.frameIds ?? []),
    );
    for (const id of ids) {
      const f = catalog.frames.find((frame) => frame.id === id)!;
      if (
        f.trim.x < 1 ||
        f.trim.y < 1 ||
        f.trim.x + f.trim.w >= f.sourceSize.w ||
        f.trim.y + f.trim.h >= f.sourceSize.h
      )
        throw new Error(`HD actor requires a transparent registration margin on each side: ${id}`);
    }
  }
}
for (const portrait of catalog.portraits)
  for (const [key, size] of [
    ['hud96', 96],
    ['hud128', 128],
  ] as const) {
    const meta = await sharp(await file(portrait[key])).metadata();
    if (meta.width !== size || meta.height !== size || !meta.hasAlpha)
      throw new Error(`Wrong portrait tier: ${portrait[key]}`);
  }
for (const set of catalog.portraitSets ?? [])
  for (const [emotion, pair] of Object.entries(set.expressions)) {
    if (!pair) continue;
    for (const [tier, size] of [
      ['hud96', 96],
      ['hud128', 128],
    ] as const) {
      const path = await file(pair[tier]),
        meta = await sharp(path).metadata(),
        stats = await sharp(path).stats();
      if (
        meta.width !== size ||
        meta.height !== size ||
        !meta.hasAlpha ||
        stats.channels[3]?.min !== 0 ||
        !(stats.channels[3]?.max ?? 0)
      )
        throw new Error(
          `Portrait expression needs a transparent ${size}×${size} cutout: ${set.id}/${emotion}/${tier}`,
        );
    }
  }
const coverage = assetCoverage(catalog);
console.log(
  `Asset validation passed: ${catalog.frames.length} frames; ${catalog.pages.length} full pages; decoded ${(coverage.fullTextureBytes / 1048576).toFixed(2)} MiB full / ${(coverage.halfTextureBytes / 1048576).toFixed(2)} MiB half. Aqualia declared HD ${coverage.declaredHdAppearances}/${coverage.requiredAppearances}, complete animation ${coverage.completeAnimationAppearances}, approved ${coverage.approvedAppearances}; full world ${coverage.fullWorld.approvedAppearances}/${coverage.fullWorld.requiredAppearances} approved; ${coverage.gaps.length} slice gaps.`,
);
if (process.argv.includes('--require-hd') && coverage.status !== 'hd-ready')
  throw new Error(
    `HD slice incomplete: ${coverage.gaps.length} requirements, missing identities ${coverage.missingIdentities.join(', ')}. See docs/art/coverage.json.`,
  );
if (
  process.argv.includes('--require-full-world') &&
  (coverage.fullWorld.approvedAppearances !== 41 || coverage.fullWorld.approvedPortraitSets !== 41)
)
  throw new Error('Full-world art production incomplete; see coverage.fullWorld');
