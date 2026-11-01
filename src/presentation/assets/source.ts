import { z } from 'zod';
import { ITEMS, NPC_PROFILES, SPECIES, VILLAGES } from '../../content/definitions';
import { DIALOGUE_EMOTIONS, DialogueEmotionSchema } from '../../domain/dialogue';
import {
  AnimationClipSchema,
  AssetAppearanceSchema,
  RigDefinitionSchema,
  BuildProfileSchema,
  LayerSetSchema,
  AppearanceRecipeSchema,
  EffectDefinitionSchema,
  FurnitureDefinitionSchema,
  SceneAssetSchema,
  PixelPointSchema,
  AuthoringProvenanceSchema,
  normalizedAnchor,
  validateV2Graph,
} from './catalog';

const Id = z.string().min(1).max(160);
const SourcePath = z
  .string()
  .regex(/^[A-Za-z0-9_./ -]+\.png$/)
  .refine(
    (p) => !p.startsWith('/') && !p.split('/').includes('..'),
    'Source path must stay within art/source',
  );
const Size = z.object({ w: z.number().int().positive(), h: z.number().int().positive() }).strict();
const Anchor = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict();
export const SourceArtStageSchema = z.enum(['proof', 'candidate']);
const SourceFrameV1Schema = z
  .object({ id: z.string().regex(/^[A-Za-z0-9_-]+$/), path: SourcePath, anchor: Anchor })
  .strict();
export const SourceFrameV2Schema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]+$/),
    path: SourcePath,
    sourceSize: Size,
    anchorPx: PixelPointSchema,
    rigId: Id.optional(),
    sockets: z.record(Id, PixelPointSchema).optional(),
    stage: SourceArtStageSchema,
  })
  .strict()
  .superRefine((f, ctx) => {
    if (f.anchorPx.x > f.sourceSize.w || f.anchorPx.y > f.sourceSize.h)
      ctx.addIssue({ code: 'custom', message: `Pixel anchor outside untrimmed source: ${f.id}` });
    for (const [id, socket] of Object.entries(f.sockets ?? {}))
      if (socket.x > f.sourceSize.w || socket.y > f.sourceSize.h)
        ctx.addIssue({ code: 'custom', message: `Socket outside untrimmed source: ${f.id}/${id}` });
  });
const SourceAppearanceV1Schema = AssetAppearanceSchema.omit({
  stage: true,
  sourceDigest: true,
  recipeId: true,
  provenanceId: true,
});
/**
 * C3f: V1 rows carried inside a V2 manifest, unchanged. Normalized anchors are kept exactly
 * (never rounded to pixels) and the rows keep V1 runtime behaviour (no approval gate).
 * Native V2 rows stay integer-strict.
 */
export const SourceFrameLegacySchema = SourceFrameV1Schema.extend({
  legacy: z.literal(true),
}).strict();
export const SourceAppearanceLegacySchema = SourceAppearanceV1Schema.extend({
  legacy: z.literal(true),
}).strict();
export const SourceAppearanceV2Schema = AssetAppearanceSchema.omit({ sourceDigest: true })
  .extend({ stage: SourceArtStageSchema })
  .strict();
const SourcePortraitPair = z
  .object({
    kind: z.enum(['species', 'npc', 'origin']),
    contentId: Id,
    hud96: SourcePath,
    hud128: SourcePath,
  })
  .strict();
export const SourcePortraitSetSchema = z
  .object({
    id: Id,
    kind: z.enum(['species', 'npc', 'origin']),
    contentId: Id,
    expressions: z.partialRecord(
      DialogueEmotionSchema,
      z.object({ hud96: SourcePath, hud128: SourcePath }).strict(),
    ),
    stage: SourceArtStageSchema,
    provenanceId: Id.optional(),
  })
  .strict()
  .superRefine((set, ctx) => {
    if (!Object.keys(set.expressions).length)
      ctx.addIssue({
        code: 'custom',
        message: `Portrait set has no expression sources: ${set.id}`,
      });
  });
const SourceLayerSet = LayerSetSchema.omit({ sourceDigest: true })
  .extend({ stage: SourceArtStageSchema })
  .strict();
const SourceRecipe = AppearanceRecipeSchema.omit({ sourceDigest: true })
  .extend({ stage: SourceArtStageSchema })
  .strict();
const SourceEffect = EffectDefinitionSchema.omit({ sourceDigest: true })
  .extend({ stage: SourceArtStageSchema })
  .strict();
const SourceFurniture = FurnitureDefinitionSchema.omit({ sourceDigest: true })
  .extend({ stage: SourceArtStageSchema })
  .strict();
const SourceScene = SceneAssetSchema.omit({ sourceDigest: true })
  .extend({ stage: SourceArtStageSchema })
  .strict();
const V1 = z
  .object({
    schemaVersion: z.literal(1),
    frames: z.array(SourceFrameV1Schema),
    appearances: z.array(SourceAppearanceV1Schema),
    clips: z.array(AnimationClipSchema),
    portraits: z.array(SourcePortraitPair).optional(),
  })
  .strict();
const V2 = z
  .object({
    schemaVersion: z.literal(2),
    frames: z.array(z.union([SourceFrameV2Schema, SourceFrameLegacySchema])),
    appearances: z.array(z.union([SourceAppearanceV2Schema, SourceAppearanceLegacySchema])),
    clips: z.array(AnimationClipSchema),
    /** Legacy V1 portrait pairs; native portraits use `portraitSets`. */
    portraits: z.array(SourcePortraitPair).optional(),
    rigs: z.array(RigDefinitionSchema).optional(),
    buildProfiles: z.array(BuildProfileSchema).optional(),
    layerSets: z.array(SourceLayerSet).optional(),
    recipes: z.array(SourceRecipe).optional(),
    portraitSets: z.array(SourcePortraitSetSchema).optional(),
    effects: z.array(SourceEffect).optional(),
    furniture: z.array(SourceFurniture).optional(),
    sceneAssets: z.array(SourceScene).optional(),
    authoringProvenance: z.array(AuthoringProvenanceSchema).optional(),
  })
  .strict();

/** Source files can propose candidates, never their own approval records or runtime URLs. */
export const SourceManifestSchema = z
  .discriminatedUnion('schemaVersion', [V1, V2])
  .superRefine((source, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    for (const [kind, rows] of [
      ['frame', source.frames],
      ['clip', source.clips],
      ['appearance', source.appearances],
    ] as const) {
      const seen = new Set<string>();
      for (const row of rows) {
        if (seen.has(row.id)) issue(`Duplicate source ${kind} ID: ${row.id}`);
        seen.add(row.id);
      }
    }
    const frames = new Map(source.frames.map((f) => [f.id, f])),
      clips = new Map(source.clips.map((c) => [c.id, c])),
      appearances = new Map(source.appearances.map((a) => [a.id, a]));
    const canonical: Record<string, Set<string>> = {
      npc: new Set(NPC_PROFILES.map((p) => p.id)),
      species: new Set(SPECIES.filter((s) => s.id !== 'human').map((s) => s.id)),
      origin: new Set(VILLAGES.map((v) => v.name.toLowerCase())),
      item: new Set(Object.keys(ITEMS)),
    };
    const bindings = new Set<string>(),
      clipBindings = new Set<string>();
    for (const a of source.appearances) {
      const key = `${a.kind}:${a.contentId}`;
      if (bindings.has(key)) issue(`Duplicate source identity: ${key}`);
      bindings.add(key);
      if (canonical[a.kind] && !canonical[a.kind]!.has(a.contentId))
        issue(`Unknown source identity: ${key}`);
      if (a.frameId && !frames.has(a.frameId)) issue(`Missing source static frame: ${a.id}`);
      for (const id of a.clipIds)
        if (clips.get(id)?.appearanceId !== a.id)
          issue(`Invalid source clip ownership: ${a.id}/${id}`);
      if (a.fallbackId)
        issue(`Source candidates must not redefine generic legacy fallbacks: ${a.id}`);
    }
    for (const c of source.clips) {
      if (!appearances.has(c.appearanceId)) issue(`Missing source clip appearance: ${c.id}`);
      const key = `${c.appearanceId}:${c.state}:${c.facing}:${c.moveId ?? ''}`;
      if (clipBindings.has(key)) issue(`Duplicate source clip binding: ${key}`);
      clipBindings.add(key);
      for (const id of c.frameIds)
        if (!frames.has(id)) issue(`Missing source clip frame: ${c.id}/${id}`);
    }
    const pairs = new Set<string>();
    for (const p of source.portraits ?? []) {
      const key = `${p.kind}:${p.contentId}`;
      if (pairs.has(key)) issue(`Duplicate source portrait: ${key}`);
      pairs.add(key);
      if (!canonical[p.kind]?.has(p.contentId)) issue(`Unknown source portrait identity: ${key}`);
    }
    if (source.schemaVersion === 2) {
      for (const a of source.appearances)
        if (isLegacySource(a))
          for (const id of [
            ...(a.frameId ? [a.frameId] : []),
            ...a.clipIds.flatMap((c) => clips.get(c)?.frameIds ?? []),
          ])
            if (frames.get(id) && !isLegacySource(frames.get(id)!))
              issue(`Legacy appearance references a native V2 frame: ${a.id}/${id}`);
      validateV2Graph(source, issue);
      const provenanceIds = new Set<string>();
      for (const p of source.authoringProvenance ?? []) {
        if (provenanceIds.has(p.id)) issue(`Duplicate source authoring provenance: ${p.id}`);
        provenanceIds.add(p.id);
      }
      for (const artifact of [...source.appearances, ...(source.portraitSets ?? [])])
        if (
          'provenanceId' in artifact &&
          artifact.provenanceId &&
          !provenanceIds.has(artifact.provenanceId)
        )
          issue(`Missing source authoring provenance: ${artifact.id}`);
      const setIds = new Set<string>(),
        setBindings = new Set<string>();
      for (const set of source.portraitSets ?? []) {
        const key = `${set.kind}:${set.contentId}`;
        if (setIds.has(set.id) || setBindings.has(key))
          issue(`Duplicate source portrait set: ${set.id}`);
        setIds.add(set.id);
        setBindings.add(key);
        if (!canonical[set.kind]?.has(set.contentId))
          issue(`Unknown source portrait-set identity: ${set.id}`);
      }
      for (const a of source.appearances) {
        if (!('stage' in a) || a.stage !== 'candidate') continue;
        const ids = [
          ...(a.frameId ? [a.frameId] : []),
          ...a.clipIds.flatMap((id) => clips.get(id)?.frameIds ?? []),
        ];
        for (const id of ids) {
          const frame = frames.get(id);
          if (frame && 'stage' in frame && frame.stage === 'proof')
            issue(`Candidate appearance references a proof-only frame: ${a.id}/${id}`);
        }
      }
    }
  });
export type SourceManifest = z.infer<typeof SourceManifestSchema>;
export type SourceManifestV2 = Extract<SourceManifest, { schemaVersion: 2 }>;
export type SourceFrame = SourceManifest['frames'][number];
export type SourceAppearance = SourceManifest['appearances'][number];
export type SourceFrameV2 = z.infer<typeof SourceFrameV2Schema>;
export type SourceAppearanceV2 = z.infer<typeof SourceAppearanceV2Schema>;
export function sourceStage(a: SourceAppearance | undefined): 'proof' | 'candidate' | undefined {
  return a && 'stage' in a ? a.stage : undefined;
}
/** True for V1-compatible rows carried in a V2 manifest (C3f). */
export function isLegacySource(row: object): boolean {
  return 'legacy' in row && (row as { legacy?: unknown }).legacy === true;
}
export function sourceFrameAnchor(frame: SourceFrame): { x: number; y: number } {
  return 'anchorPx' in frame ? normalizedAnchor(frame.anchorPx, frame.sourceSize) : frame.anchor;
}
export function completePortraitExpressions(set: {
  expressions: Partial<Record<(typeof DIALOGUE_EMOTIONS)[number], unknown>>;
}): boolean {
  if (!DIALOGUE_EMOTIONS.every((emotion) => !!set.expressions[emotion])) return false;
  for (const tier of ['hud96', 'hud128']) {
    const paths = DIALOGUE_EMOTIONS.map(
      (emotion) => (set.expressions[emotion] as Record<string, unknown>)[tier],
    );
    if (
      paths.some((p) => typeof p !== 'string') ||
      new Set(paths).size !== DIALOGUE_EMOTIONS.length
    )
      return false;
  }
  return true;
}

/** Stable metadata encoding for source digests; arrays retain authored ordering. */
export function canonicalSourceJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalSourceJson).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonicalSourceJson(v)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}

/** Complete dependency closure used for per-artifact approval digests, without browser/Node IO. */
export function sourceSubjectDependencies(
  source: SourceManifest,
  kind: 'appearance' | 'portrait-set' | 'layer-set' | 'recipe' | 'effect' | 'furniture' | 'scene',
  id: string,
): { metadata: readonly { key: string; value: unknown }[]; paths: readonly string[] } {
  const metadata = new Map<string, unknown>(),
    paths = new Set<string>();
  const v2 = source.schemaVersion === 2 ? source : undefined;
  const add = (key: string, value: unknown): boolean => {
    if (metadata.has(key)) return false;
    if (!value) throw new Error(`Missing source digest dependency: ${key}`);
    // The C3f storage marker is not identity: a migrated V1 row keeps its V1 digest.
    if (typeof value === 'object' && isLegacySource(value)) {
      const { legacy: _legacy, ...row } = value as { legacy?: true };
      value = row;
    }
    metadata.set(key, value);
    return true;
  };
  const provenance = (provenanceId: string | undefined) => {
    if (!provenanceId) return;
    const p = v2?.authoringProvenance?.find((p) => p.id === provenanceId);
    if (add(`provenance:${provenanceId}`, p)) for (const input of p!.inputs) paths.add(input.path);
  };
  const frame = (frameId: string) => {
    const f = source.frames.find((f) => f.id === frameId);
    if (add(`frame:${frameId}`, f)) {
      paths.add(f!.path);
      if (f && 'rigId' in f && f.rigId) rig(f.rigId);
    }
  };
  const rig = (rigId: string) => {
    add(
      `rig:${rigId}`,
      v2?.rigs?.find((r) => r.id === rigId),
    );
  };
  const profile = (profileId: string) => {
    const p = v2?.buildProfiles?.find((p) => p.id === profileId);
    if (add(`build-profile:${profileId}`, p)) rig(p!.rigId);
  };
  const clip = (clipId: string) => {
    const c = source.clips.find((c) => c.id === clipId);
    if (add(`clip:${clipId}`, c)) for (const id of c!.frameIds) frame(id);
  };
  const appearance = (appearanceId: string) => {
    const a = source.appearances.find((a) => a.id === appearanceId);
    if (!add(`appearance:${appearanceId}`, a)) return;
    if ('provenanceId' in a! && typeof a!.provenanceId === 'string') provenance(a!.provenanceId);
    if (a!.frameId) frame(a!.frameId);
    for (const id of a!.clipIds) clip(id);
    if ('recipeId' in a! && typeof a!.recipeId === 'string') recipe(a!.recipeId);
  };
  const layer = (layerId: string) => {
    const l = v2?.layerSets?.find((l) => l.id === layerId);
    if (!add(`layer-set:${layerId}`, l)) return;
    rig(l!.rigId);
    for (const id of l!.buildProfileIds) profile(id);
    appearance(l!.appearanceId);
  };
  const recipe = (recipeId: string) => {
    const r = v2?.recipes?.find((r) => r.id === recipeId);
    if (!add(`recipe:${recipeId}`, r)) return;
    rig(r!.rigId);
    profile(r!.buildProfileId);
    for (const p of r!.layers) layer(p.layerSetId);
  };
  if (kind === 'appearance') appearance(id);
  else if (kind === 'layer-set') layer(id);
  else if (kind === 'recipe') recipe(id);
  else if (kind === 'portrait-set') {
    const set = v2?.portraitSets?.find((s) => s.id === id);
    add(`portrait-set:${id}`, set);
    provenance(set!.provenanceId);
    for (const pair of Object.values(set!.expressions))
      if (pair) {
        paths.add(pair.hud96);
        paths.add(pair.hud128);
      }
  } else if (kind === 'effect') {
    const effect = v2?.effects?.find((e) => e.id === id);
    add(`effect:${id}`, effect);
    clip(effect!.clipId);
    const owner = source.clips.find((c) => c.id === effect!.clipId)?.appearanceId;
    if (owner) appearance(owner);
    if (effect!.rigId) rig(effect!.rigId);
  } else if (kind === 'furniture') {
    const f = v2?.furniture?.find((f) => f.id === id);
    add(`furniture:${id}`, f);
    appearance(f!.appearanceId);
  } else {
    const s = v2?.sceneAssets?.find((s) => s.id === id);
    add(`scene:${id}`, s);
    appearance(s!.appearanceId);
  }
  return {
    metadata: [...metadata]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => ({ key, value })),
    paths: [...paths].sort(),
  };
}
