import { z } from 'zod';
import { ITEMS, NPC_PROFILES, SPECIES, VILLAGES } from '../../content/definitions';

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
const Url = z
  .string()
  .regex(/^\/assets\/[A-Za-z0-9_./@+-]+$/)
  .refine((s) => !s.includes('..'), 'Asset URLs must stay inside /assets');
export const AssetFrameSchema = z
  .object({
    id: Id,
    pageId: Id,
    textureKey: Id,
    rect: Rect,
    sourceSize: Size,
    trim: Rect,
    anchor: Anchor,
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
    kind: z.enum(['species', 'npc', 'origin', 'item', 'environment', 'fallback']),
    contentId: Id,
    quality: z.enum(['prototype', 'hd']),
    clipIds: z.array(Id),
    frameId: Id.optional(),
    fallbackId: Id.optional(),
  })
  .strict();
export const AssetCatalogSchema = z
  .object({
    schemaVersion: z.literal(1),
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
    }
    const bindings = new Set<string>();
    for (const appearance of catalog.appearances) {
      const binding = `${appearance.kind}:${appearance.contentId}`;
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
  });
export type AssetCatalog = z.infer<typeof AssetCatalogSchema>;
export type AssetFrame = AssetCatalog['frames'][number];
export type AnimationClip = z.infer<typeof AnimationClipSchema>;
export type AssetAppearance = z.infer<typeof AssetAppearanceSchema>;
export type AppearanceKind = AssetAppearance['kind'];

/** Immutable lookup tables. Content IDs are canonical; filenames never select an identity. */
export class AppearanceResolver {
  getAppearance(id: string): AssetAppearance | undefined {
    return this.byId.get(id);
  }
  private readonly bindings: ReadonlyMap<string, AssetAppearance>;
  private readonly byId: ReadonlyMap<string, AssetAppearance>;
  private readonly clips: ReadonlyMap<string, AnimationClip>;
  constructor(readonly catalog: AssetCatalog) {
    this.bindings = new Map(catalog.appearances.map((a) => [`${a.kind}:${a.contentId}`, a]));
    this.byId = new Map(catalog.appearances.map((a) => [a.id, a]));
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
  ): AssetCatalog['portraits'][number] | undefined {
    return this.catalog.portraits.find((p) => p.kind === kind && p.contentId === contentId);
  }
}
