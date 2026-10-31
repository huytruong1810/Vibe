import { NPC_PROFILES, SPECIES, VILLAGES } from '../../content/definitions';
import { DIALOGUE_EMOTIONS } from '../../domain/dialogue';
import {
  FACINGS,
  hasArtApproval,
  type AssetCatalog,
  type AnimationState,
  type Facing,
  type AssetAppearance,
  type AnimationClip,
  type AppearanceRecipe,
  type LayerSet,
} from './catalog';

export interface CoverageGap {
  readonly appearanceId: string;
  readonly requirement: string;
}
export interface ScopeCoverage {
  readonly requiredAppearances: number;
  readonly declaredHdAppearances: number;
  readonly completeAnimationAppearances: number;
  readonly approvedAppearances: number;
  readonly portraitPairs: number;
  readonly completePortraitSets: number;
  readonly approvedPortraitSets: number;
  readonly missingIdentities: readonly string[];
  readonly gaps: readonly CoverageGap[];
}
export interface CoverageReport extends ScopeCoverage {
  readonly status: 'prototype-only' | 'hd-ready';
  readonly hdAppearances: number;
  readonly fullTextureBytes: number;
  readonly halfTextureBytes: number;
  readonly environmentGaps: readonly string[];
  readonly fullWorld: ScopeCoverage;
  readonly reviewAppearanceCount: number;
}
export const REQUIRED_ENVIRONMENT_IDS = [
  'ground_grass',
  'ground_dirt',
  'ground_sand',
  'ground_freshwater',
  ...Array.from({ length: 14 }, (_, i) => `shore_freshwater_mask_${i + 1}`),
  'cliff_grass',
  'ramp_grass',
  'canopy_oak',
  'house_aqualia',
  'landmark_well',
  'landmark_waystone',
  'prop_hearth',
  'tree_oak',
  ...(['berries', 'reeds', 'wheat', 'nectar', 'ashgrass', 'fungi'] as const).flatMap((r) =>
    ['healthy', 'harvested', 'burnt'].map((s) => `flora_${r}_${s}`),
  ),
] as const;
const CARDINALS: readonly Facing[] = ['n', 'e', 's', 'w'];
export const CLIP_MATRIX: readonly {
  state: AnimationState;
  frames: number;
  directions: readonly Facing[];
  moves?: readonly string[];
  playerOnly?: boolean;
  humanOnly?: boolean;
}[] = [
  { state: 'idle', frames: 6, directions: FACINGS },
  { state: 'walk', frames: 8, directions: FACINGS },
  { state: 'run', frames: 8, directions: FACINGS },
  { state: 'attack', frames: 12, directions: FACINGS, moves: ['strike', 'element'] },
  { state: 'guard', frames: 4, directions: FACINGS },
  { state: 'hit', frames: 4, directions: FACINGS },
  {
    state: 'attack',
    frames: 12,
    directions: FACINGS,
    moves: ['sword_slash', 'spear_thrust', 'bow_shot'],
    humanOnly: true,
  },
  { state: 'dash', frames: 6, directions: FACINGS, playerOnly: true },
  ...(['eat', 'drink', 'bathe', 'work', 'social'] as const).map((state) => ({
    state,
    frames: 6,
    directions: CARDINALS,
  })),
  { state: 'sleep', frames: 4, directions: CARDINALS },
  { state: 'downed', frames: 6, directions: CARDINALS },
  { state: 'recovery', frames: 6, directions: CARDINALS },
];
type AnimationGraph = {
  appearances: readonly AssetAppearance[];
  clips: readonly AnimationClip[];
  recipes?: readonly AppearanceRecipe[];
  layerSets?: readonly LayerSet[];
};
export function appearanceClips(
  graph: AnimationGraph,
  appearance: AssetAppearance,
): readonly AnimationClip[] {
  let owner = appearance;
  if (appearance.recipeId) {
    const recipe = graph.recipes?.find((r) => r.id === appearance.recipeId);
    const body = recipe?.layers.find(
      (p) => graph.layerSets?.find((l) => l.id === p.layerSetId)?.slot === 'body',
    );
    const layer = graph.layerSets?.find((l) => l.id === body?.layerSetId);
    owner = graph.appearances.find((a) => a.id === layer?.appearanceId) ?? appearance;
  }
  return owner.clipIds.flatMap((id) => {
    const clip = graph.clips.find((c) => c.id === id);
    return clip ? [clip] : [];
  });
}
/** Authored pose completeness is independent of an artist's HD declaration or an approval record. */
export function animationGaps(graph: AnimationGraph, appearance: AssetAppearance): string[] {
  const clips = appearanceClips(graph, appearance),
    gaps: string[] = [];
  for (const row of CLIP_MATRIX) {
    if (row.playerOnly && appearance.kind !== 'origin') continue;
    if (row.humanOnly && appearance.kind !== 'origin' && appearance.kind !== 'npc') continue;
    for (const facing of row.directions)
      for (const move of row.moves ?? [undefined]) {
        const clip = clips.find(
          (c) => c.state === row.state && c.facing === facing && (!move || c.moveId === move),
        );
        const label = `${row.state}${move ? `/${move}` : ''}/${facing}`;
        if (!clip || clip.frameIds.length < row.frames || new Set(clip.frameIds).size < row.frames)
          gaps.push(`${label}: ${row.frames} authored frames`);
        if (clip && row.state === 'attack' && (!clip.phases || clip.playback !== 'combat'))
          gaps.push(`${label}: authoritative combat phase mapping`);
        if (
          clip &&
          (row.state === 'walk' || row.state === 'run') &&
          (clip.playback !== 'distance' || !clip.stride)
        )
          gaps.push(`${label}: distance-based playback and stride`);
      }
  }
  const recipe = graph.recipes?.find((r) => r.id === appearance.recipeId);
  for (const part of recipe?.layers ?? []) {
    if (!part.required) continue;
    const layer = graph.layerSets?.find((l) => l.id === part.layerSetId),
      owner = graph.appearances.find((a) => a.id === layer?.appearanceId);
    if (!owner) {
      gaps.push(`required layer ${part.layerSetId}: missing appearance`);
      continue;
    }
    for (const base of clips) {
      const overlay = appearanceClips(graph, owner).find(
        (c) => c.state === base.state && c.facing === base.facing && c.moveId === base.moveId,
      );
      if (!overlay || overlay.frameIds.length !== base.frameIds.length)
        gaps.push(
          `required layer ${part.layerSetId}: missing compatible ${base.state}/${base.facing}`,
        );
    }
  }
  return gaps;
}
/** Partial actor proofs can be reviewed but can never shadow a playable appearance. */
export function canPublishAppearance(graph: AnimationGraph, appearance: AssetAppearance): boolean {
  if (appearance.stage === 'proof') return false;
  return (
    !['origin', 'npc', 'species'].includes(appearance.kind) ||
    animationGaps(graph, appearance).length === 0
  );
}
export function decodedTextureBytes(catalog: AssetCatalog, resolution: 1 | 0.5): number {
  const variants = new Map(
    catalog.pages.flatMap((p) =>
      p.variants.filter((v) => v.resolution === resolution).map((v) => [v.url, v] as const),
    ),
  );
  return [...variants.values()].reduce((n, v) => n + v.width * v.height * 4, 0);
}
function scopeCoverage(
  catalog: AssetCatalog,
  required: readonly { kind: string; contentId: string }[],
): ScopeCoverage {
  const active = catalog.appearances,
    review = catalog.reviewAppearances ?? [],
    all = [...active, ...review];
  const graph = {
    ...catalog,
    appearances: all,
    clips: [...catalog.clips, ...(catalog.reviewClips ?? [])],
  };
  const gaps: CoverageGap[] = [],
    missingIdentities: string[] = [];
  let declaredHdAppearances = 0,
    completeAnimationAppearances = 0,
    approvedAppearances = 0,
    portraitPairs = 0,
    completePortraitSets = 0,
    approvedPortraitSets = 0;
  for (const identity of required) {
    const matches = (a: AssetAppearance) =>
      a.kind === identity.kind && a.contentId === identity.contentId;
    const actual = active.find(matches),
      candidate = review.find((a) => matches(a) && a.stage !== 'proof'),
      appearance = candidate ?? actual;
    const id = appearance?.id ?? `${identity.kind}:${identity.contentId}`;
    if (!actual || (!actual.frameId && !actual.clipIds.length && !actual.recipeId))
      missingIdentities.push(identity.contentId);
    if (appearance?.quality === 'hd') declaredHdAppearances++;
    else gaps.push({ appearanceId: id, requirement: 'native-detail HD declaration' });
    const missing = appearance
      ? animationGaps(graph, appearance)
      : CLIP_MATRIX.filter(
          (r) =>
            (!r.playerOnly || identity.kind === 'origin') &&
            (!r.humanOnly || identity.kind === 'origin' || identity.kind === 'npc'),
        ).flatMap((r) =>
          r.directions.flatMap((f) =>
            (r.moves ?? [undefined]).map(
              (m) => `${r.state}${m ? `/${m}` : ''}/${f}: ${r.frames} authored frames`,
            ),
          ),
        );
    for (const requirement of missing) gaps.push({ appearanceId: id, requirement });
    if (appearance && !missing.length) completeAnimationAppearances++;
    let nativeSize = true;
    if (appearance?.quality === 'hd' && identity.kind !== 'species') {
      const ids = new Set(appearanceClips(graph, appearance).flatMap((c) => c.frameIds));
      nativeSize =
        ids.size > 0 &&
        [...ids].every((frameId) => {
          const f = catalog.frames.find((frame) => frame.id === frameId);
          return f && f.sourceSize.w >= 96 && f.sourceSize.h >= 144;
        });
      if (!nativeSize)
        gaps.push({
          appearanceId: id,
          requirement: 'human frames at least 96×144 untrimmed pixels',
        });
    }
    const approved =
      actual?.stage === 'approved' &&
      actual.quality === 'hd' &&
      nativeSize &&
      !missing.length &&
      hasArtApproval('appearance', actual.id, actual.sourceDigest, catalog.approvals ?? []);
    if (approved) approvedAppearances++;
    else if (appearance?.quality === 'hd' && !missing.length)
      gaps.push({ appearanceId: id, requirement: 'engineering approval for this source digest' });
    if (
      catalog.portraits.some((p) => p.kind === identity.kind && p.contentId === identity.contentId)
    )
      portraitPairs++;
    else gaps.push({ appearanceId: id, requirement: 'identity-matched 96/128 portrait pair' });
    const set = catalog.portraitSets?.find(
      (p) => p.kind === identity.kind && p.contentId === identity.contentId && p.stage !== 'proof',
    );
    const completeSet = set && DIALOGUE_EMOTIONS.every((e) => !!set.expressions[e]);
    if (completeSet) completePortraitSets++;
    else
      gaps.push({
        appearanceId: id,
        requirement: 'nine identity-matched portrait expressions at both HUD tiers',
      });
    if (
      completeSet &&
      set.stage === 'approved' &&
      hasArtApproval('portrait-set', set.id, set.sourceDigest, catalog.approvals ?? [])
    )
      approvedPortraitSets++;
    else if (completeSet)
      gaps.push({
        appearanceId: id,
        requirement: 'engineering approval for portrait-set source digest',
      });
  }
  return {
    requiredAppearances: required.length,
    declaredHdAppearances,
    completeAnimationAppearances,
    approvedAppearances,
    portraitPairs,
    completePortraitSets,
    approvedPortraitSets,
    missingIdentities,
    gaps,
  };
}
export function assetCoverage(catalog: AssetCatalog): CoverageReport {
  const species = SPECIES.filter((s) => s.id !== 'human').map((s) => ({
    kind: 'species',
    contentId: s.id as string,
  }));
  const aqualia = scopeCoverage(catalog, [
    { kind: 'origin', contentId: 'aqualia' },
    ...NPC_PROFILES.filter((p) => p.village === 1).map((p) => ({
      kind: 'npc',
      contentId: p.id as string,
    })),
    ...species,
  ]);
  const fullWorld = scopeCoverage(catalog, [
    ...VILLAGES.map((v) => ({ kind: 'origin', contentId: v.name.toLowerCase() })),
    ...NPC_PROFILES.map((p) => ({ kind: 'npc', contentId: p.id as string })),
    ...species,
  ]);
  const environmentGaps = REQUIRED_ENVIRONMENT_IDS.filter(
    (id) =>
      !catalog.appearances.some(
        (a) =>
          a.kind === 'environment' &&
          a.contentId === id &&
          a.quality === 'hd' &&
          (a.frameId || a.clipIds.length) &&
          a.stage === 'approved' &&
          hasArtApproval('appearance', a.id, a.sourceDigest, catalog.approvals ?? []),
      ),
  );
  return {
    ...aqualia,
    status:
      aqualia.approvedAppearances === 19 &&
      aqualia.approvedPortraitSets === 19 &&
      !environmentGaps.length
        ? 'hd-ready'
        : 'prototype-only',
    hdAppearances: aqualia.declaredHdAppearances,
    environmentGaps,
    fullWorld,
    reviewAppearanceCount: catalog.reviewAppearances?.length ?? 0,
    fullTextureBytes: decodedTextureBytes(catalog, 1),
    halfTextureBytes: decodedTextureBytes(catalog, 0.5),
  };
}
