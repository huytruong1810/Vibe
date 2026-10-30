import { NPC_PROFILES, SPECIES, VILLAGES } from '../../content/definitions';
import { FACINGS, type AssetCatalog, type AnimationState, type Facing } from './catalog';

export interface CoverageGap {
  readonly appearanceId: string;
  readonly requirement: string;
}
export interface CoverageReport {
  readonly status: 'prototype-only' | 'hd-ready';
  readonly requiredAppearances: number;
  readonly hdAppearances: number;
  readonly missingIdentities: readonly string[];
  readonly gaps: readonly CoverageGap[];
  readonly fullTextureBytes: number;
  readonly halfTextureBytes: number;
  readonly environmentGaps: readonly string[];
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
}[] = [
  { state: 'idle', frames: 6, directions: FACINGS },
  { state: 'walk', frames: 8, directions: FACINGS },
  { state: 'run', frames: 8, directions: FACINGS },
  { state: 'attack', frames: 12, directions: FACINGS, moves: ['strike', 'element'] },
  { state: 'guard', frames: 4, directions: FACINGS },
  { state: 'hit', frames: 4, directions: FACINGS },
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
export function decodedTextureBytes(catalog: AssetCatalog, resolution: 1 | 0.5): number {
  const variants = new Map(
    catalog.pages.flatMap((p) =>
      p.variants.filter((v) => v.resolution === resolution).map((v) => [v.url, v] as const),
    ),
  );
  return [...variants.values()].reduce((n, v) => n + v.width * v.height * 4, 0);
}
export function assetCoverage(catalog: AssetCatalog): CoverageReport {
  const required = [
    { kind: 'origin', contentId: 'aqualia' },
    ...NPC_PROFILES.filter((p) => p.village === 1).map((p) => ({
      kind: 'npc',
      contentId: p.id as string,
    })),
    ...SPECIES.filter((s) => s.id !== 'human').map((s) => ({
      kind: 'species',
      contentId: s.id as string,
    })),
  ];
  const gaps: CoverageGap[] = [],
    missingIdentities: string[] = [];
  let hdAppearances = 0;
  for (const identity of required) {
    const appearance = catalog.appearances.find(
      (a) => a.kind === identity.kind && a.contentId === identity.contentId,
    );
    const appearanceId = appearance?.id ?? `${identity.kind}:${identity.contentId}`;
    if (!appearance || (!appearance.frameId && !appearance.clipIds.length))
      missingIdentities.push(identity.contentId);
    if (appearance?.quality === 'hd') hdAppearances++;
    else gaps.push({ appearanceId, requirement: 'native-detail approved HD appearance' });
    if (appearance?.quality === 'hd' && identity.kind !== 'species') {
      const frameIds = new Set(
        appearance.clipIds.flatMap((id) => catalog.clips.find((c) => c.id === id)?.frameIds ?? []),
      );
      if (
        [...frameIds].some((id) => {
          const f = catalog.frames.find((frame) => frame.id === id);
          return !f || f.sourceSize.w < 96 || f.sourceSize.h < 144;
        })
      )
        gaps.push({
          appearanceId,
          requirement: 'human frames must be at least 96×144 untrimmed pixels',
        });
    }
    for (const row of CLIP_MATRIX) {
      if (row.playerOnly && identity.kind !== 'origin') continue;
      for (const facing of row.directions)
        for (const move of row.moves ?? [undefined]) {
          const clip = catalog.clips.find(
            (c) =>
              c.appearanceId === appearanceId &&
              c.state === row.state &&
              c.facing === facing &&
              (!move || c.moveId === move),
          );
          if (
            !clip ||
            clip.frameIds.length < row.frames ||
            new Set(clip.frameIds).size < row.frames
          )
            gaps.push({
              appearanceId,
              requirement: `${row.state}${move ? `/${move}` : ''}/${facing}: ${row.frames} authored frames`,
            });
          if (clip && row.state === 'attack' && (!clip.phases || clip.playback !== 'combat'))
            gaps.push({
              appearanceId,
              requirement: `attack/${move}/${facing}: authoritative combat phase mapping`,
            });
          if (
            clip &&
            (row.state === 'walk' || row.state === 'run') &&
            (clip.playback !== 'distance' || !clip.stride)
          )
            gaps.push({
              appearanceId,
              requirement: `${row.state}/${facing}: distance playback and world-tile stride`,
            });
        }
    }
    if (
      !catalog.portraits.some((p) => p.kind === identity.kind && p.contentId === identity.contentId)
    )
      gaps.push({ appearanceId, requirement: 'identity-matched 96/128 portrait pair' });
  }
  // Canonical registry validation stays independent from legacy filenames.
  const valid: Record<string, Set<string>> = {
    species: new Set(SPECIES.filter((s) => s.id !== 'human').map((s) => s.id)),
    npc: new Set(NPC_PROFILES.map((p) => p.id)),
    origin: new Set(VILLAGES.map((v) => v.name.toLowerCase())),
  };
  for (const a of catalog.appearances)
    if (valid[a.kind] && !valid[a.kind]!.has(a.contentId))
      gaps.push({
        appearanceId: a.id,
        requirement: `unknown canonical ${a.kind} identity ${a.contentId}`,
      });
  const environmentGaps = REQUIRED_ENVIRONMENT_IDS.filter(
    (id) =>
      !catalog.appearances.some(
        (a) =>
          a.kind === 'environment' &&
          a.contentId === id &&
          a.quality === 'hd' &&
          (a.frameId || a.clipIds.length),
      ),
  );
  return {
    status: gaps.length || environmentGaps.length ? 'prototype-only' : 'hd-ready',
    requiredAppearances: required.length,
    hdAppearances,
    missingIdentities,
    gaps,
    environmentGaps,
    fullTextureBytes: decodedTextureBytes(catalog, 1),
    halfTextureBytes: decodedTextureBytes(catalog, 0.5),
  };
}
