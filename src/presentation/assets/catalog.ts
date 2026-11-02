import { z } from 'zod';
import { ITEMS, NPC_PROFILES, SPECIES, VILLAGES } from '../../content/definitions';
import {
  DIALOGUE_EMOTIONS,
  DialogueEmotionSchema,
  type DialogueEmotion,
} from '../../domain/dialogue';

export const FACINGS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
export const FacingSchema = z.enum(FACINGS);
export type Facing = z.infer<typeof FacingSchema>;
export const ANIMATION_STATES = [
  'idle',
  'walk',
  'run',
  'attack',
  'guard',
  'hit',
  'dash',
  'eat',
  'drink',
  'bathe',
  'work',
  'social',
  'sleep',
  'downed',
  'recovery',
] as const;
export type AnimationState = (typeof ANIMATION_STATES)[number];
const Id = z.string().min(1).max(160);
const Size = z.object({ w: z.number().int().positive(), h: z.number().int().positive() }).strict();
const Rect = z
  .object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative(),
    w: z.number().int().positive(),
    h: z.number().int().positive(),
  })
  .strict();
const Anchor = z.object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) }).strict();
export const PixelPointSchema = z
  .object({ x: z.number().int().nonnegative(), y: z.number().int().nonnegative() })
  .strict();
export const ArtStageSchema = z.enum(['proof', 'candidate', 'approved']);
export const ArtSubjectKindSchema = z.enum([
  'appearance',
  'portrait-set',
  'layer-set',
  'recipe',
  'effect',
  'furniture',
  'scene',
]);
const Digest = z.string().regex(/^[a-f0-9]{64}$/);
const SourceDependencyPath = z
  .string()
  .regex(/^[A-Za-z0-9_./ -]+$/)
  .refine(
    (p) => !p.startsWith('/') && !p.split('/').includes('..'),
    'Authoring input must stay within art/source',
  );
export const AuthoringProvenanceSchema = z
  .object({
    id: Id,
    method: z.enum(['pillow', 'blender-bake', 'master-ingestion']),
    inputs: z
      .array(
        z
          .object({
            path: SourceDependencyPath,
            sha256: Digest,
            role: z.enum([
              'master',
              'model',
              'script',
              'material',
              'pose-config',
              'palette',
              'dependency-lock',
              'bake',
            ]),
          })
          .strict(),
      )
      .min(1),
    toolchain: z
      .array(
        z
          .object({
            name: Id,
            version: z.string().regex(/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/),
            binarySha256: Digest.optional(),
          })
          .strict(),
      )
      .min(1),
    command: z.string().min(1).max(2000),
    settings: z.record(Id, z.union([z.string().max(500), z.number(), z.boolean()])).optional(),
  })
  .strict()
  .superRefine((record, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (new Set(record.inputs.map((i) => i.path)).size !== record.inputs.length)
      issue(`Duplicate authoring dependency: ${record.id}`);
    if (new Set(record.toolchain.map((t) => t.name.toLowerCase())).size !== record.toolchain.length)
      issue(`Duplicate toolchain pin: ${record.id}`);
    if (!record.inputs.some((i) => i.role === 'script' && i.path.endsWith('.py')))
      issue(`Authoring pipeline needs its pinned Python script: ${record.id}`);
    if (record.method === 'blender-bake') {
      if (!record.inputs.some((i) => i.role === 'model' && i.path.endsWith('.blend')))
        issue(`Blender bake provenance requires the actual .blend model: ${record.id}`);
      if (!record.toolchain.some((t) => t.name.toLowerCase() === 'blender'))
        issue(`Blender version must be pinned: ${record.id}`);
    } else {
      if (!record.inputs.some((i) => i.role === 'dependency-lock'))
        issue(`Ingestion needs a dependency lock input: ${record.id}`);
      for (const name of ['python', 'pillow'])
        if (!record.toolchain.some((t) => t.name.toLowerCase() === name))
          issue(`Ingestion toolchain must pin ${name}: ${record.id}`);
      if (record.method === 'master-ingestion' && !record.inputs.some((i) => i.role === 'master'))
        issue(`Master ingestion requires an authored master input: ${record.id}`);
    }
  });
export type AuthoringProvenance = z.infer<typeof AuthoringProvenanceSchema>;
const Url = z
  .string()
  .regex(/^\/assets\/[A-Za-z0-9_./@+-]+$/)
  .refine((s) => !s.includes('..'), 'Asset URLs must stay inside /assets');
/** C9b: the held item's grip bucket (clockwise screen angle from up / 45 deg) and whether the
 * hand is behind the body, per body frame and hand socket. */
export const HeldPoseSchema = z
  .object({ bucket: z.number().int().min(0).max(7), behind: z.boolean() })
  .strict();
export type HeldPose = z.infer<typeof HeldPoseSchema>;
export const AssetFrameSchema = z
  .object({
    id: Id,
    pageId: Id,
    textureKey: Id,
    rect: Rect,
    sourceSize: Size,
    trim: Rect,
    anchor: Anchor,
    anchorPx: PixelPointSchema.optional(),
    rigId: Id.optional(),
    sockets: z.record(Id, PixelPointSchema).optional(),
    held: z.record(Id, HeldPoseSchema).optional(),
  })
  .strict();
export const AnimationClipSchema = z
  .object({
    id: Id,
    appearanceId: Id,
    state: z.enum(ANIMATION_STATES),
    facing: FacingSchema,
    frameIds: z.array(Id).min(1).max(256),
    fps: z.number().positive().max(120),
    playback: z.enum(['loop', 'once', 'distance', 'combat']),
    stride: z.number().positive().optional(),
    moveId: Id.optional(),
    phases: z
      .object({
        windup: z.tuple([z.number().int().nonnegative(), z.number().int().positive()]),
        active: z.tuple([z.number().int().nonnegative(), z.number().int().positive()]),
        recovery: z.tuple([z.number().int().nonnegative(), z.number().int().positive()]),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((clip, ctx) => {
    if (clip.playback === 'distance' && !clip.stride)
      ctx.addIssue({ code: 'custom', message: 'Distance playback requires stride in world tiles' });
    if (clip.playback === 'combat' && (!clip.phases || !clip.moveId))
      ctx.addIssue({
        code: 'custom',
        message: 'Combat playback requires move identity and frame phase ranges',
      });
    if (clip.phases) {
      const ranges = [clip.phases.windup, clip.phases.active, clip.phases.recovery];
      if (
        ranges.some(([a, b]) => a >= b || b > clip.frameIds.length) ||
        ranges[0]![0] !== 0 ||
        ranges[0]![1] !== ranges[1]![0] ||
        ranges[1]![1] !== ranges[2]![0] ||
        ranges[2]![1] !== clip.frameIds.length
      )
        ctx.addIssue({
          code: 'custom',
          message: 'Phase frame ranges must partition the clip, using exclusive end indices',
        });
    }
  });
export const AssetAppearanceSchema = z
  .object({
    id: Id,
    kind: z.enum(['species', 'npc', 'origin', 'item', 'environment', 'fallback', 'layer']),
    contentId: Id,
    quality: z.enum(['prototype', 'hd']),
    clipIds: z.array(Id),
    frameId: Id.optional(),
    fallbackId: Id.optional(),
    recipeId: Id.optional(),
    stage: ArtStageSchema.optional(),
    sourceDigest: Digest.optional(),
    provenanceId: Id.optional(),
  })
  .strict();

export const RigRegistrationSchema = z
  .object({ canvas: Size, anchorPx: PixelPointSchema })
  .strict();
export type RigRegistration = z.infer<typeof RigRegistrationSchema>;
export const RigDefinitionSchema = RigRegistrationSchema.extend({
  id: Id,
  socketIds: z.array(Id),
  registrations: z.array(RigRegistrationSchema).min(1).max(64).optional(),
}).strict();
export const BuildProfileSchema = z
  .object({ id: Id, rigId: Id, label: z.string().min(1).max(100) })
  .strict();
export const LayerSetSchema = z
  .object({
    id: Id,
    rigId: Id,
    buildProfileIds: z.array(Id).min(1),
    slot: z.enum(['body', 'hair', 'face', 'garment', 'held', 'overlay']),
    appearanceId: Id,
    stage: ArtStageSchema.optional(),
    sourceDigest: Digest.optional(),
  })
  .strict();
export const AppearanceRecipeSchema = z
  .object({
    id: Id,
    rigId: Id,
    buildProfileId: Id,
    layers: z
      .array(
        z
          .object({
            layerSetId: Id,
            z: z.number().int().min(-100).max(100),
            required: z.boolean(),
            gearSlot: Id.optional(),
            heldSlot: z.union([z.literal(0), z.literal(1)]).optional(),
            itemId: Id.optional(),
            socketId: Id.optional(),
          })
          .strict(),
      )
      .min(1)
      .max(16),
    stage: ArtStageSchema.optional(),
    sourceDigest: Digest.optional(),
  })
  .strict();
const PortraitIdentity = { kind: z.enum(['species', 'npc', 'origin']), contentId: Id } as const;
export const PortraitExpressionSchema = z.object({ hud96: Url, hud128: Url }).strict();
export const PortraitSetSchema = z
  .object({
    id: Id,
    ...PortraitIdentity,
    expressions: z.partialRecord(DialogueEmotionSchema, PortraitExpressionSchema),
    stage: ArtStageSchema,
    sourceDigest: Digest.optional(),
    provenanceId: Id.optional(),
  })
  .strict()
  .superRefine((set, ctx) => {
    if (!Object.keys(set.expressions).length)
      ctx.addIssue({ code: 'custom', message: `Portrait set has no expressions: ${set.id}` });
    if (set.stage === 'approved' && DIALOGUE_EMOTIONS.some((emotion) => !set.expressions[emotion]))
      ctx.addIssue({
        code: 'custom',
        message: `Approved portrait set requires all nine expressions: ${set.id}`,
      });
    if (set.stage === 'approved')
      for (const tier of ['hud96', 'hud128'] as const)
        if (new Set(DIALOGUE_EMOTIONS.map((e) => set.expressions[e]?.[tier])).size !== 9)
          ctx.addIssue({
            code: 'custom',
            message: `Approved portrait expressions require distinct exports: ${set.id}/${tier}`,
          });
  });
export const EffectDefinitionSchema = z
  .object({
    id: Id,
    clipId: Id,
    trigger: z.enum(['attack', 'hit', 'heal', 'weather', 'ambient']),
    moveId: Id.optional(),
    attachment: z.enum(['world', 'actor', 'socket']),
    rigId: Id.optional(),
    socketId: Id.optional(),
    lifetimeTicks: z.number().int().positive().max(1800),
    maxInstances: z.number().int().positive().max(256),
    essential: z.boolean(),
    blendMode: z.enum(['normal', 'add']),
    stage: ArtStageSchema.optional(),
    sourceDigest: Digest.optional(),
  })
  .strict();
export const FurnitureDefinitionSchema = z
  .object({
    id: Id,
    appearanceId: Id,
    footprintTiles: Size,
    service: z.enum(['none', 'rest', 'eat', 'drink', 'wash', 'work', 'social']),
    occlusion: z.enum(['none', 'roof', 'canopy']),
    stage: ArtStageSchema.optional(),
    sourceDigest: Digest.optional(),
  })
  .strict();
export const SceneAssetSchema = z
  .object({
    id: Id,
    appearanceId: Id,
    category: z.enum(['ground', 'shore', 'cliff', 'ramp', 'canopy', 'building', 'prop', 'weather']),
    stage: ArtStageSchema.optional(),
    sourceDigest: Digest.optional(),
  })
  .strict();
export const SourceDigestSchema = z
  .object({ subjectKind: ArtSubjectKindSchema, subjectId: Id, digest: Digest })
  .strict();
export const ArtApprovalRecordSchema = z
  .object({
    id: Id,
    subjectKind: ArtSubjectKindSchema,
    subjectId: Id,
    sourceDigest: Digest,
    decision: z.enum(['approved', 'rejected']),
    approvedBy: z.string().min(1).max(160),
    approvedAt: z.iso.datetime(),
    notes: z.string().max(2000).optional(),
  })
  .strict();
export const ArtApprovalLedgerSchema = z
  .object({ schemaVersion: z.literal(1), records: z.array(ArtApprovalRecordSchema) })
  .strict()
  .superRefine((ledger, ctx) => {
    const ids = new Set<string>(),
      decisions = new Set<string>();
    for (const r of ledger.records) {
      const key = `${r.subjectKind}:${r.subjectId}:${r.sourceDigest}`;
      if (ids.has(r.id) || decisions.has(key))
        ctx.addIssue({ code: 'custom', message: `Duplicate or conflicting art approval: ${r.id}` });
      ids.add(r.id);
      decisions.add(key);
    }
  });
export type RigDefinition = z.infer<typeof RigDefinitionSchema>;
export type BuildProfile = z.infer<typeof BuildProfileSchema>;
export type LayerSet = z.infer<typeof LayerSetSchema>;
export type AppearanceRecipe = z.infer<typeof AppearanceRecipeSchema>;
export type PortraitSet = z.infer<typeof PortraitSetSchema>;
export type EffectDefinition = z.infer<typeof EffectDefinitionSchema>;
export type FurnitureDefinition = z.infer<typeof FurnitureDefinitionSchema>;
export type SceneAsset = z.infer<typeof SceneAssetSchema>;
export type SourceDigest = z.infer<typeof SourceDigestSchema>;
export type ArtApprovalRecord = z.infer<typeof ArtApprovalRecordSchema>;

/** Pixel anchors refer to the untrimmed canvas. Never round a normalized anchor back to pixels. */
export function normalizedAnchor(
  anchorPx: z.infer<typeof PixelPointSchema>,
  size: z.infer<typeof Size>,
): z.infer<typeof Anchor> {
  PixelPointSchema.parse(anchorPx);
  Size.parse(size);
  if (anchorPx.x > size.w || anchorPx.y > size.h)
    throw new Error('Pixel anchor outside untrimmed canvas');
  return { x: anchorPx.x / size.w, y: anchorPx.y / size.h };
}
export function hasArtApproval(
  kind: SourceDigest['subjectKind'],
  id: string,
  digest: string | undefined,
  records: readonly ArtApprovalRecord[],
): boolean {
  return (
    !!digest &&
    records.some(
      (r) =>
        r.subjectKind === kind &&
        r.subjectId === id &&
        r.sourceDigest === digest &&
        r.decision === 'approved',
    )
  );
}
export const AssetCatalogSchema = z
  .object({
    schemaVersion: z.union([z.literal(1), z.literal(2)]),
    contentVersion: z.string().min(1),
    pages: z.array(
      z
        .object({
          id: Id,
          url: Url,
          imageUrl: Url,
          width: z.number().int().positive().max(2048),
          height: z.number().int().positive().max(2048),
          variants: z
            .array(
              z
                .object({
                  resolution: z.union([z.literal(1), z.literal(0.5)]),
                  url: Url,
                  imageUrl: Url,
                  width: z.number().int().positive().max(2048),
                  height: z.number().int().positive().max(2048),
                })
                .strict(),
            )
            .min(1),
        })
        .strict(),
    ),
    frames: z.array(AssetFrameSchema),
    clips: z.array(AnimationClipSchema),
    appearances: z.array(AssetAppearanceSchema),
    portraits: z.array(
      z
        .object({
          kind: z.enum(['species', 'npc', 'origin']),
          contentId: Id,
          hud96: Url,
          hud128: Url,
        })
        .strict(),
    ),
    rigs: z.array(RigDefinitionSchema).optional(),
    buildProfiles: z.array(BuildProfileSchema).optional(),
    layerSets: z.array(LayerSetSchema).optional(),
    recipes: z.array(AppearanceRecipeSchema).optional(),
    portraitSets: z.array(PortraitSetSchema).optional(),
    effects: z.array(EffectDefinitionSchema).optional(),
    furniture: z.array(FurnitureDefinitionSchema).optional(),
    sceneAssets: z.array(SceneAssetSchema).optional(),
    sourceDigests: z.array(SourceDigestSchema).optional(),
    approvals: z.array(ArtApprovalRecordSchema).optional(),
    reviewAppearances: z.array(AssetAppearanceSchema).optional(),
    reviewClips: z.array(AnimationClipSchema).optional(),
    authoringProvenance: z.array(AuthoringProvenanceSchema).optional(),
  })
  .strict()
  .superRefine((catalog, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    for (const [label, rows] of [
      ['page', catalog.pages],
      ['frame', catalog.frames],
      ['clip', catalog.clips],
      ['appearance', catalog.appearances],
    ] as const) {
      const ids = new Set<string>();
      for (const row of rows) {
        if (ids.has(row.id)) issue(`Duplicate ${label} ID: ${row.id}`);
        ids.add(row.id);
      }
    }
    const pages = new Map(catalog.pages.map((p) => [p.id, p]));
    const frames = new Map(catalog.frames.map((f) => [f.id, f]));
    const clips = new Map(catalog.clips.map((c) => [c.id, c]));
    const appearances = new Map(catalog.appearances.map((a) => [a.id, a]));
    const canonical: Record<string, Set<string>> = {
      species: new Set(SPECIES.filter((s) => s.id !== 'human').map((s) => s.id)),
      npc: new Set(NPC_PROFILES.map((p) => p.id)),
      origin: new Set(VILLAGES.map((v) => v.name.toLowerCase())),
      item: new Set(Object.keys(ITEMS)),
    };
    for (const page of catalog.pages) {
      const full = page.variants.find((v) => v.resolution === 1);
      if (
        !full ||
        full.url !== page.url ||
        full.imageUrl !== page.imageUrl ||
        full.width !== page.width ||
        full.height !== page.height
      )
        issue(`Missing/mismatched full page variant: ${page.id}`);
    }
    for (const frame of catalog.frames) {
      const page = pages.get(frame.pageId);
      if (
        !page ||
        frame.rect.x + frame.rect.w > page.width ||
        frame.rect.y + frame.rect.h > page.height
      )
        issue(`Frame outside page: ${frame.id}`);
      if (
        frame.trim.x + frame.trim.w > frame.sourceSize.w ||
        frame.trim.y + frame.trim.h > frame.sourceSize.h ||
        frame.trim.w !== frame.rect.w ||
        frame.trim.h !== frame.rect.h
      )
        issue(`Invalid trim registration: ${frame.id}`);
      if (frame.anchorPx) {
        try {
          const expected = normalizedAnchor(frame.anchorPx, frame.sourceSize);
          if (frame.anchor.x !== expected.x || frame.anchor.y !== expected.y)
            issue(`Pixel/normalized anchor mismatch: ${frame.id}`);
        } catch {
          issue(`Pixel anchor outside frame: ${frame.id}`);
        }
      }
    }
    const bindings = new Set<string>();
    for (const appearance of catalog.appearances) {
      const binding = `${appearance.kind}:${appearance.contentId}`;
      if (appearance.stage === 'proof' || appearance.stage === 'candidate')
        issue(`Review-only appearance cannot enter active bindings: ${appearance.id}`);
      if (bindings.has(binding)) issue(`Duplicate content binding: ${binding}`);
      bindings.add(binding);
      if (canonical[appearance.kind] && !canonical[appearance.kind]!.has(appearance.contentId))
        issue(`Unknown canonical binding: ${binding}`);
      if (appearance.fallbackId && !appearances.has(appearance.fallbackId))
        issue(`Missing fallback: ${appearance.id}`);
      const fallback = appearance.fallbackId && appearances.get(appearance.fallbackId);
      if (fallback && (fallback.kind !== 'fallback' || fallback.quality !== 'prototype'))
        issue(`Fallback must be an explicit generic prototype: ${appearance.id}`);
      if (appearance.fallbackId === appearance.id) issue(`Recursive fallback: ${appearance.id}`);
      const fallbackChain = new Set([appearance.id]);
      let fallbackId = appearance.fallbackId;
      while (fallbackId) {
        if (fallbackChain.has(fallbackId)) {
          issue(`Cyclic fallback: ${appearance.id}`);
          break;
        }
        fallbackChain.add(fallbackId);
        fallbackId = appearances.get(fallbackId)?.fallbackId;
      }
      if (appearance.frameId && !frames.has(appearance.frameId))
        issue(`Missing static frame: ${appearance.id}`);
      for (const id of appearance.clipIds)
        if (clips.get(id)?.appearanceId !== appearance.id) issue(`Invalid clip ownership: ${id}`);
    }
    const clipBindings = new Set<string>();
    for (const clip of catalog.clips) {
      const binding = `${clip.appearanceId}:${clip.state}:${clip.facing}:${clip.moveId ?? ''}`;
      if (clipBindings.has(binding)) issue(`Duplicate clip binding: ${binding}`);
      clipBindings.add(binding);
      if (!appearances.has(clip.appearanceId)) issue(`Missing appearance: ${clip.appearanceId}`);
      for (const id of clip.frameIds) if (!frames.has(id)) issue(`Missing clip frame: ${id}`);
    }
    const portraitBindings = new Set<string>();
    for (const p of catalog.portraits) {
      const key = `${p.kind}:${p.contentId}`;
      if (portraitBindings.has(key)) issue(`Duplicate portrait binding: ${key}`);
      portraitBindings.add(key);
      if (!canonical[p.kind]?.has(p.contentId)) issue(`Unknown portrait identity: ${key}`);
    }
    const reviewIds = new Set<string>(),
      reviewClipIds = new Set<string>();
    const review = new Map(catalog.reviewAppearances?.map((a) => [a.id, a]));
    for (const a of catalog.reviewAppearances ?? []) {
      if (reviewIds.has(a.id)) issue(`Duplicate review appearance: ${a.id}`);
      reviewIds.add(a.id);
      if (a.stage !== 'proof' && a.stage !== 'candidate')
        issue(`Review appearance has invalid stage: ${a.id}`);
      if (canonical[a.kind] && !canonical[a.kind]!.has(a.contentId))
        issue(`Unknown review identity: ${a.id}`);
      if (a.frameId && !frames.has(a.frameId)) issue(`Missing review static frame: ${a.id}`);
    }
    for (const c of catalog.reviewClips ?? []) {
      if (reviewClipIds.has(c.id)) issue(`Duplicate review clip: ${c.id}`);
      reviewClipIds.add(c.id);
      if (!review.has(c.appearanceId)) issue(`Missing review clip owner: ${c.id}`);
      for (const id of c.frameIds)
        if (!frames.has(id)) issue(`Missing review clip frame: ${c.id}/${id}`);
    }
    if (
      !ArtApprovalLedgerSchema.safeParse({ schemaVersion: 1, records: catalog.approvals ?? [] })
        .success
    )
      issue('Duplicate/conflicting runtime art approvals');
    const digestIds = new Set<string>();
    for (const d of catalog.sourceDigests ?? []) {
      const key = `${d.subjectKind}:${d.subjectId}`;
      if (digestIds.has(key)) issue(`Duplicate source digest: ${key}`);
      digestIds.add(key);
    }
    const provenanceIds = new Set<string>();
    for (const p of catalog.authoringProvenance ?? []) {
      if (provenanceIds.has(p.id)) issue(`Duplicate authoring provenance: ${p.id}`);
      provenanceIds.add(p.id);
    }
    for (const a of [
      ...catalog.appearances,
      ...(catalog.reviewAppearances ?? []),
      ...(catalog.portraitSets ?? []),
    ]) {
      if (a.provenanceId && !provenanceIds.has(a.provenanceId))
        issue(`Missing authoring provenance: ${a.id}`);
      if (a.stage === 'approved' && !a.provenanceId)
        issue(`Approved production art needs authoring provenance: ${a.id}`);
    }
    validateV2Graph(
      {
        ...catalog,
        appearances: [...catalog.appearances, ...(catalog.reviewAppearances ?? [])],
        clips: [...catalog.clips, ...(catalog.reviewClips ?? [])],
      },
      issue,
    );
    for (const set of catalog.portraitSets ?? [])
      if (!canonical[set.kind]?.has(set.contentId))
        issue(`Unknown portrait-set identity: ${set.id}`);
    for (const [kind, collection] of [
      ['appearance', catalog.appearances],
      ['layer-set', catalog.layerSets ?? []],
      ['recipe', catalog.recipes ?? []],
      ['portrait-set', catalog.portraitSets ?? []],
      ['effect', catalog.effects ?? []],
      ['furniture', catalog.furniture ?? []],
      ['scene', catalog.sceneAssets ?? []],
    ] as const) {
      for (const artifact of collection)
        if (artifact.stage === 'approved') {
          const digest = catalog.sourceDigests?.find(
            (d) => d.subjectKind === kind && d.subjectId === artifact.id,
          )?.digest;
          if (
            !digest ||
            digest !== artifact.sourceDigest ||
            !hasArtApproval(kind, artifact.id, digest, catalog.approvals ?? [])
          )
            issue(`Approved artifact lacks matching engineering source approval: ${artifact.id}`);
        }
    }
  });
export type AssetCatalog = z.infer<typeof AssetCatalogSchema>;
export type AssetFrame = AssetCatalog['frames'][number];
export type AnimationClip = z.infer<typeof AnimationClipSchema>;
export type AssetAppearance = z.infer<typeof AssetAppearanceSchema>;
export type AppearanceKind = AssetAppearance['kind'];
export type ResolvedRecipeLayer = AppearanceRecipe['layers'][number] & {
  layerSet: LayerSet;
  appearance: AssetAppearance;
};

type GraphFrame = {
  id: string;
  sourceSize?: { w: number; h: number };
  anchor?: { x: number; y: number };
  anchorPx?: { x: number; y: number };
  rigId?: string;
  sockets?: Record<string, { x: number; y: number }>;
  held?: Record<string, HeldPose>;
};
export interface AssetGraph {
  frames: readonly GraphFrame[];
  appearances: readonly AssetAppearance[];
  clips: readonly AnimationClip[];
  rigs?: readonly RigDefinition[];
  buildProfiles?: readonly BuildProfile[];
  layerSets?: readonly LayerSet[];
  recipes?: readonly AppearanceRecipe[];
  effects?: readonly EffectDefinition[];
  furniture?: readonly FurnitureDefinition[];
  sceneAssets?: readonly SceneAsset[];
}
/** Default registration remains compatible; alternates must be explicitly authored. */
export function rigRegistration(
  rig: RigDefinition,
  frame: Pick<GraphFrame, 'sourceSize' | 'anchorPx' | 'anchor'>,
): RigRegistration | undefined {
  if (!frame.sourceSize) return undefined;
  if (matchesRegistration(rig, frame)) return rig;
  if (rig.registrations)
    for (const registration of rig.registrations)
      if (matchesRegistration(registration, frame)) return registration;
  return undefined;
}
function matchesRegistration(
  r: RigRegistration,
  frame: Pick<GraphFrame, 'sourceSize' | 'anchorPx' | 'anchor'>,
): boolean {
  return (
    r.canvas.w === frame.sourceSize?.w &&
    r.canvas.h === frame.sourceSize?.h &&
    (frame.anchorPx
      ? r.anchorPx.x === frame.anchorPx.x && r.anchorPx.y === frame.anchorPx.y
      : r.anchorPx.x / r.canvas.w === frame.anchor?.x &&
        r.anchorPx.y / r.canvas.h === frame.anchor?.y)
  );
}
/** Shared structural reference validation for author inputs and normalized runtime bundles. */
export function validateV2Graph(graph: AssetGraph, issue: (message: string) => void): void {
  for (const [label, collection] of [
    ['rig', graph.rigs],
    ['build profile', graph.buildProfiles],
    ['layer set', graph.layerSets],
    ['recipe', graph.recipes],
    ['effect', graph.effects],
    ['furniture', graph.furniture],
    ['scene', graph.sceneAssets],
  ] as const) {
    const seen = new Set<string>();
    for (const row of collection ?? []) {
      if (seen.has(row.id)) issue(`Duplicate ${label} ID: ${row.id}`);
      seen.add(row.id);
    }
  }
  const rigs = new Map(graph.rigs?.map((r) => [r.id, r])),
    profiles = new Map(graph.buildProfiles?.map((p) => [p.id, p]));
  const layers = new Map(graph.layerSets?.map((l) => [l.id, l])),
    recipes = new Map(graph.recipes?.map((r) => [r.id, r]));
  const appearances = new Map(graph.appearances.map((a) => [a.id, a])),
    clips = new Map(graph.clips.map((c) => [c.id, c])),
    frames = new Map(graph.frames.map((f) => [f.id, f]));
  const appearanceFrames = (a: AssetAppearance) =>
    [
      ...new Set([
        ...(a.frameId ? [a.frameId] : []),
        ...a.clipIds.flatMap((id) => clips.get(id)?.frameIds ?? []),
      ]),
    ].map((id) => frames.get(id));
  for (const r of rigs.values()) {
    const seen = new Set<string>();
    for (const registration of [r, ...(r.registrations ?? [])]) {
      if (
        registration.anchorPx.x > registration.canvas.w ||
        registration.anchorPx.y > registration.canvas.h
      )
        issue(`Rig anchor outside canvas: ${r.id}`);
      const key = `${registration.canvas.w}:${registration.canvas.h}:${registration.anchorPx.x}:${registration.anchorPx.y}`;
      if (seen.has(key)) issue(`Duplicate rig registration: ${r.id}/${key}`);
      seen.add(key);
    }
    if (new Set(r.socketIds).size !== r.socketIds.length) issue(`Duplicate rig socket: ${r.id}`);
  }
  for (const p of profiles.values())
    if (!rigs.has(p.rigId)) issue(`Missing build-profile rig: ${p.id}`);
  for (const f of frames.values()) {
    const rig = f.rigId ? rigs.get(f.rigId) : undefined;
    if (f.rigId && !rig) issue(`Missing frame rig: ${f.id}`);
    if (rig && !rigRegistration(rig, f)) issue(`Undeclared frame/rig registration: ${f.id}`);
    for (const [id, p] of Object.entries(f.sockets ?? {})) {
      if (!rig || !rig.socketIds.includes(id)) issue(`Undeclared frame socket: ${f.id}/${id}`);
      if (!f.sourceSize || p.x > f.sourceSize.w || p.y > f.sourceSize.h)
        issue(`Socket outside untrimmed canvas: ${f.id}/${id}`);
    }
    for (const id of Object.keys(f.held ?? {}))
      if (!f.sockets?.[id]) issue(`Held pose without its socket: ${f.id}/${id}`);
  }
  for (const layer of layers.values()) {
    const rig = rigs.get(layer.rigId),
      appearance = appearances.get(layer.appearanceId);
    if (!rig) issue(`Missing layer rig: ${layer.id}`);
    if (!appearance || appearance.kind !== 'layer')
      issue(`Layer must reference a layer appearance: ${layer.id}`);
    if (appearance?.recipeId)
      issue(`Layer appearances cannot recursively compose recipes: ${layer.id}`);
    for (const id of layer.buildProfileIds)
      if (profiles.get(id)?.rigId !== layer.rigId)
        issue(`Incompatible layer build profile: ${layer.id}/${id}`);
    if (new Set(layer.buildProfileIds).size !== layer.buildProfileIds.length)
      issue(`Duplicate layer build profile: ${layer.id}`);
    if (appearance && layer.slot === 'held')
      for (const id of appearance.clipIds) {
        const clip = clips.get(id);
        if (clip && (clip.state !== 'idle' || clip.frameIds.length !== 8))
          issue(`Held layer needs one idle clip per facing with 8 grip frames: ${layer.id}/${id}`);
      }
    if (appearance && rig && layer.slot !== 'held')
      for (const f of appearanceFrames(appearance)) {
        if (!f || !rigRegistration(rig, f))
          issue(`Layer registration incompatible with rig: ${layer.id}`);
        if (f?.rigId && f.rigId !== rig.id) issue(`Layer frame rig mismatch: ${layer.id}/${f.id}`);
      }
  }
  for (const recipe of recipes.values()) {
    const rig = rigs.get(recipe.rigId);
    if (!rig || profiles.get(recipe.buildProfileId)?.rigId !== recipe.rigId)
      issue(`Incompatible recipe rig/build profile: ${recipe.id}`);
    const body = recipe.layers.filter((l) => layers.get(l.layerSetId)?.slot === 'body');
    if (body.length !== 1 || !body[0]?.required)
      issue(`Recipe requires exactly one required body layer: ${recipe.id}`);
    const ids = new Set<string>();
    for (const part of recipe.layers) {
      const layer = layers.get(part.layerSetId);
      if (
        !layer ||
        layer.rigId !== recipe.rigId ||
        !layer.buildProfileIds.includes(recipe.buildProfileId)
      )
        issue(`Incompatible recipe layer: ${recipe.id}/${part.layerSetId}`);
      if (ids.has(part.layerSetId))
        issue(`Duplicate recipe layer: ${recipe.id}/${part.layerSetId}`);
      ids.add(part.layerSetId);
      if (part.heldSlot !== undefined && part.gearSlot)
        issue(`Layer cannot occupy held and garment slots: ${recipe.id}`);
      if ((part.heldSlot !== undefined || part.gearSlot) && !part.itemId)
        issue(`Equipment layer needs an explicit canonical item: ${recipe.id}`);
      if (part.itemId && !ITEMS[part.itemId as keyof typeof ITEMS])
        issue(`Unknown recipe item: ${part.itemId}`);
      if (
        part.gearSlot &&
        ITEMS[part.itemId as keyof typeof ITEMS]?.garment?.slot !== part.gearSlot
      )
        issue(`Item/garment slot mismatch: ${recipe.id}/${part.itemId}`);
      if (part.socketId && (!rig?.socketIds.includes(part.socketId) || layer?.slot !== 'held'))
        issue(`Invalid attachment socket: ${recipe.id}/${part.socketId}`);
      if (
        layer?.slot === 'held' &&
        (!part.socketId || part.heldSlot === undefined || part.required)
      )
        issue(
          `Held layer needs a socket, a held slot and required: false: ${recipe.id}/${part.layerSetId}`,
        );
      if (layer && body[0] && part.required && layer.slot !== 'body' && layer.slot !== 'held') {
        const base = appearances.get(layers.get(body[0].layerSetId)?.appearanceId ?? ''),
          overlay = appearances.get(layer.appearanceId);
        if (base && overlay)
          for (const clipId of base.clipIds) {
            const baseClip = clips.get(clipId),
              overlayClip = overlay.clipIds
                .map((id) => clips.get(id))
                .find(
                  (c) =>
                    c?.state === baseClip?.state &&
                    c?.facing === baseClip?.facing &&
                    c?.moveId === baseClip?.moveId,
                );
            if (baseClip && overlayClip && baseClip.frameIds.length !== overlayClip.frameIds.length)
              issue(`Required layer pose cadence mismatch: ${recipe.id}/${layer.id}/${clipId}`);
            if (baseClip && overlayClip)
              for (let i = 0; i < baseClip.frameIds.length; i++) {
                const baseFrame = frames.get(baseClip.frameIds[i]!),
                  overlayFrame = frames.get(overlayClip.frameIds[i] ?? '');
                const baseRegistration = rig && baseFrame && rigRegistration(rig, baseFrame),
                  overlayRegistration = rig && overlayFrame && rigRegistration(rig, overlayFrame);
                if (
                  baseRegistration &&
                  overlayRegistration &&
                  baseRegistration !== overlayRegistration
                )
                  issue(
                    `Required layer pose registration mismatch: ${recipe.id}/${layer.id}/${clipId}/${i}`,
                  );
              }
          }
      }
      if (part.socketId && body[0]) {
        const base = appearances.get(layers.get(body[0].layerSetId)?.appearanceId ?? '');
        if (base)
          for (const f of appearanceFrames(base))
            if (!f?.sockets?.[part.socketId])
              issue(`Body pose lacks attachment socket: ${recipe.id}/${f?.id}/${part.socketId}`);
            else if (layer?.slot === 'held' && !f.held?.[part.socketId])
              issue(`Body pose lacks a held pose: ${recipe.id}/${f.id}/${part.socketId}`);
      }
    }
  }
  for (const a of appearances.values())
    if (a.recipeId && !recipes.has(a.recipeId)) issue(`Missing appearance recipe: ${a.id}`);
  for (const effect of graph.effects ?? []) {
    if (!clips.has(effect.clipId)) issue(`Missing effect clip: ${effect.id}`);
    if (
      effect.attachment === 'socket' &&
      (!effect.rigId ||
        !effect.socketId ||
        !rigs.get(effect.rigId)?.socketIds.includes(effect.socketId))
    )
      issue(`Invalid effect attachment socket: ${effect.id}`);
  }
  for (const f of graph.furniture ?? [])
    if (!appearances.has(f.appearanceId)) issue(`Missing furniture appearance: ${f.id}`);
  for (const s of graph.sceneAssets ?? [])
    if (!appearances.has(s.appearanceId)) issue(`Missing scene appearance: ${s.id}`);
}

/** Immutable lookup tables. Content IDs are canonical; filenames never select an identity. */
export class AppearanceResolver {
  getAppearance(id: string): AssetAppearance | undefined {
    return this.byId.get(id);
  }
  private readonly bindings: ReadonlyMap<string, AssetAppearance>;
  private readonly byId: ReadonlyMap<string, AssetAppearance>;
  private readonly clips: ReadonlyMap<string, AnimationClip>;
  constructor(readonly catalog: AssetCatalog) {
    const usable = catalog.appearances.filter(
      (a) => a.stage !== 'proof' && a.stage !== 'candidate',
    );
    this.bindings = new Map(usable.map((a) => [`${a.kind}:${a.contentId}`, a]));
    this.byId = new Map(usable.map((a) => [a.id, a]));
    this.clips = new Map(catalog.clips.map((c) => [c.id, c]));
  }
  resolve(kind: AppearanceKind, contentId: string): AssetAppearance | undefined {
    return this.bindings.get(`${kind}:${contentId}`);
  }
  clip(
    appearance: AssetAppearance,
    state: AnimationState,
    facing: Facing,
    moveId?: string,
  ): AnimationClip | undefined {
    if (appearance.recipeId) {
      const body = this.recipeLayers(appearance.recipeId).find(
        (part) => part.layerSet.slot === 'body',
      );
      return body ? this.clip(body.appearance, state, facing, moveId) : undefined;
    }
    const find = (a: AssetAppearance, s: AnimationState, f: Facing) =>
      a.clipIds
        .map((id) => this.clips.get(id))
        .find(
          (c) =>
            c?.state === s &&
            c.facing === f &&
            (!moveId || c.moveId === moveId || a.quality === 'prototype'),
        );
    const direct = find(appearance, state, facing);
    if (direct) return direct;
    // Only prototype appearances may visibly fall back to a cardinal/idle pose.
    if (appearance.quality === 'prototype') {
      const cardinal: Facing = facing.includes('e') ? 'e' : facing.includes('w') ? 'w' : facing;
      const approximate =
        find(appearance, state, cardinal) ??
        find(appearance, state, 's') ??
        find(appearance, 'idle', 's');
      if (approximate) return approximate;
    }
    const fallback = appearance.fallbackId && this.byId.get(appearance.fallbackId);
    return fallback ? (find(fallback, state, facing) ?? find(fallback, 'idle', 's')) : undefined;
  }
  portrait(
    kind: 'species' | 'npc' | 'origin',
    contentId: string,
    emotion: DialogueEmotion = 'neutral',
  ): (AssetCatalog['portraits'][number] & { resolvedEmotion?: DialogueEmotion }) | undefined {
    const set = this.catalog.portraitSets?.find(
      (p) =>
        p.kind === kind &&
        p.contentId === contentId &&
        p.stage === 'approved' &&
        hasArtApproval('portrait-set', p.id, p.sourceDigest, this.catalog.approvals ?? []),
    );
    const resolvedEmotion = set?.expressions[emotion] ? emotion : 'neutral';
    const expression = set?.expressions[resolvedEmotion];
    if (expression) return { kind, contentId, ...expression, resolvedEmotion };
    const legacy = this.catalog.portraits.find((p) => p.kind === kind && p.contentId === contentId);
    return legacy ? { ...legacy, resolvedEmotion: 'neutral' } : undefined;
  }
  recipeLayers(recipeId: string): readonly ResolvedRecipeLayer[] {
    const recipe = this.catalog.recipes?.find(
      (r) => r.id === recipeId && r.stage !== 'proof' && r.stage !== 'candidate',
    );
    if (!recipe) return [];
    const result: ResolvedRecipeLayer[] = [];
    for (const part of recipe.layers) {
      const layerSet = this.catalog.layerSets?.find(
        (l) => l.id === part.layerSetId && l.stage !== 'proof' && l.stage !== 'candidate',
      );
      const appearance = layerSet && this.byId.get(layerSet.appearanceId);
      if (!layerSet || !appearance) {
        if (part.required) return [];
        else continue;
      }
      result.push({ ...part, layerSet, appearance });
    }
    return result.sort((a, b) => a.z - b.z || a.layerSetId.localeCompare(b.layerSetId));
  }
}
