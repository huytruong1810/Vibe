import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { readFileSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeAssetSchemas } from '../scripts/lib/asset-schemas';
import { DIALOGUE_EMOTIONS } from '../src/domain/dialogue';
import {
  AssetCatalogSchema,
  ArtApprovalLedgerSchema,
  AppearanceResolver,
  PortraitSetSchema,
  normalizedAnchor,
  hasArtApproval,
  AuthoringProvenanceSchema,
  rigRegistration,
  RigDefinitionSchema,
  type AssetCatalog,
  type ArtApprovalRecord,
  type PortraitSet,
  type AuthoringProvenance,
} from '../src/presentation/assets/catalog';
import {
  SourceManifestSchema,
  canonicalSourceJson,
  sourceSubjectDependencies,
  completePortraitExpressions,
  type SourceManifestV2,
} from '../src/presentation/assets/source';
import { assetCoverage, canPublishAppearance } from '../src/presentation/assets/coverage';
import { compositeBounds, layerRegistration } from '../src/presentation/compositor';

const DIGEST = 'a'.repeat(64);

function stagedCreatures(): SourceManifestV2 {
  const result: SourceManifestV2 = {
    schemaVersion: 2,
    frames: [],
    clips: [],
    appearances: [],
    rigs: [],
    authoringProvenance: [],
  };
  const socketIds = new Set<string>();
  for (const asset of ['rivallie', 'bramblefang', 'marshstalker']) {
    const staging = JSON.parse(readFileSync(`art/source/staging/blender/${asset}.json`, 'utf8'));
    const appearanceId = `species:${asset}`;
    result.frames.push(
      ...staging.frames.map(
        (frame: {
          id: string;
          file: string;
          sourceSize: { w: number; h: number };
          anchorPx: { x: number; y: number };
          rigId: string;
          sockets: Record<string, { x: number; y: number }>;
        }) => {
          for (const id of Object.keys(frame.sockets)) socketIds.add(id);
          return {
            id: frame.id.replaceAll(':', '_'),
            path: frame.file,
            sourceSize: frame.sourceSize,
            anchorPx: frame.anchorPx,
            rigId: frame.rigId,
            sockets: frame.sockets,
            stage: 'candidate' as const,
          };
        },
      ),
    );
    const clips = staging.clips.map((clip: SourceManifestV2['clips'][number]) => ({
      ...clip,
      appearanceId,
      frameIds: clip.frameIds.map((id) => id.replaceAll(':', '_')),
    }));
    result.clips.push(...clips);
    result.appearances.push({
      id: appearanceId,
      kind: 'species',
      contentId: asset,
      quality: 'hd',
      stage: 'candidate',
      clipIds: clips.map((clip: SourceManifestV2['clips'][number]) => clip.id),
      provenanceId: staging.authoringProvenance.id,
    });
    result.authoringProvenance!.push(staging.authoringProvenance);
  }
  result.rigs!.push({
    id: 'quadruped-v1',
    canvas: { w: 112, h: 112 },
    anchorPx: { x: 56, y: 82 },
    socketIds: [...socketIds].sort(),
    registrations: [{ canvas: { w: 160, h: 144 }, anchorPx: { x: 80, y: 112 } }],
  });
  return result;
}

describe('explicit rig registrations', () => {
  it('validates all 1848 actual staged frames without renaming their shared skeleton', () => {
    const s = stagedCreatures();
    expect(s.frames).toHaveLength(1848);
    expect(SourceManifestSchema.safeParse(s).success).toBe(true);
    s.rigs![0]!.registrations = undefined;
    expect(SourceManifestSchema.safeParse(s).success).toBe(false);
  });
  it('rejects undeclared mixed pairs, duplicate registrations, missing rigs and outside sockets', () => {
    const changes: ((s: SourceManifestV2) => void)[] = [
      (s) => {
        s.frames[0]!.anchorPx.x++;
      },
      (s) => {
        s.rigs![0]!.registrations!.push({
          canvas: s.rigs![0]!.canvas,
          anchorPx: s.rigs![0]!.anchorPx,
        });
      },
      (s) => {
        s.rigs![0]!.registrations![0]!.anchorPx.x = 161;
      },
      (s) => {
        s.rigs = [];
      },
      (s) => {
        const frame = s.frames[0]!;
        frame.sockets![Object.keys(frame.sockets!)[0]!]!.x = 1000;
      },
    ];
    for (const change of changes) {
      const s = stagedCreatures();
      change(s);
      expect(SourceManifestSchema.safeParse(s).success).toBe(false);
    }
  });
  it('binds standalone frame rigs and registration edits into source digest dependencies', () => {
    const s = stagedCreatures();
    const dependencies = () => sourceSubjectDependencies(s, 'appearance', 'species:rivallie');
    const hash = () =>
      createHash('sha256').update(canonicalSourceJson(dependencies())).digest('hex');
    expect(dependencies().metadata.map((m) => m.key)).toContain('rig:quadruped-v1');
    const before = hash();
    s.rigs![0]!.registrations![0]!.anchorPx.x--;
    expect(hash()).not.toBe(before);
    s.rigs = [];
    expect(dependencies).toThrow('Missing source digest dependency: rig:quadruped-v1');
  });
  it('accepts multi-canvas human layers but rejects a required layer registered to the wrong pose', () => {
    const s = source();
    s.rigs![0]!.registrations = [{ canvas: { w: 192, h: 176 }, anchorPx: { x: 96, y: 132 } }];
    for (const kind of ['body', 'hair']) {
      const frame = structuredClone(s.frames.find((f) => f.id === `${kind}0`)!);
      frame.id = `${kind}_wide`;
      frame.path = `exports/${frame.id}.png`;
      frame.sourceSize = { w: 192, h: 176 };
      frame.anchorPx = { x: 96, y: 132 };
      s.frames.push(frame);
      s.clips.push({
        id: `${kind}-hit`,
        appearanceId: kind,
        state: 'hit',
        facing: 's',
        frameIds: [frame.id],
        fps: 6,
        playback: 'once',
      });
      s.appearances.find((a) => a.id === kind)!.clipIds.push(`${kind}-hit`);
    }
    expect(SourceManifestSchema.safeParse(s).success).toBe(true);
    s.clips.find((c) => c.id === 'hair-hit')!.frameIds = ['hair0'];
    expect(SourceManifestSchema.safeParse(s).success).toBe(false);
  });
  it('keeps active frame roots and composite bounds correct for normalized and integer anchors', () => {
    const rig = RigDefinitionSchema.parse({
      id: 'human',
      canvas: { w: 112, h: 152 },
      anchorPx: { x: 56, y: 132 },
      socketIds: [],
      registrations: [{ canvas: { w: 192, h: 176 }, anchorPx: { x: 96, y: 132 } }],
    });
    const frame = {
      id: 'wide',
      pageId: 'page',
      textureKey: 'wide',
      rect: { x: 0, y: 0, w: 192, h: 176 },
      trim: { x: 0, y: 0, w: 192, h: 176 },
      sourceSize: { w: 192, h: 176 },
      anchorPx: { x: 96, y: 132 },
      anchor: { x: 0.5, y: 0.75 },
    };
    const registration = rigRegistration(rig, frame)!;
    expect(registration).toBe(rig.registrations![0]);
    expect(rigRegistration(rig, { sourceSize: frame.sourceSize, anchor: frame.anchor })).toBe(
      registration,
    );
    expect(layerRegistration(frame, registration.anchorPx)).toMatchObject({ x: 0, y: 0 });
    expect(
      compositeBounds(registration.canvas, [{ frame, target: registration.anchorPx }]),
    ).toEqual({ x: 0, y: 0, w: 192, h: 176 });
    expect(rigRegistration(rig, { ...frame, anchorPx: { x: 56, y: 132 } })).toBeUndefined();
  });
  it('emits deterministic shared JSON schemas without changing an atlas', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'hearthwild-c3e-'));
    try {
      await writeAssetSchemas(dir);
      const before = await readFile(join(dir, 'source-manifest.schema.json'), 'utf8');
      await writeAssetSchemas(dir);
      expect(await readFile(join(dir, 'source-manifest.schema.json'), 'utf8')).toBe(before);
      expect(before).toContain('registrations');
      expect(
        JSON.parse(before).oneOf[1].properties.rigs.items.properties.registrations.maxItems,
      ).toBe(64);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
function provenance(): AuthoringProvenance {
  return {
    id: 'authoring',
    method: 'pillow',
    inputs: [
      { path: 'generators/render.py', sha256: DIGEST, role: 'script' },
      { path: 'pipeline/requirements.lock', sha256: DIGEST, role: 'dependency-lock' },
    ],
    toolchain: [
      { name: 'Python', version: '3.12.8' },
      { name: 'Pillow', version: '11.3.0' },
    ],
    command: 'python generators/render.py --output exports (record only)',
  };
}
function approval(
  subjectKind: ArtApprovalRecord['subjectKind'],
  subjectId: string,
): ArtApprovalRecord {
  return {
    id: `review-${subjectKind}-${subjectId}`,
    subjectKind,
    subjectId,
    sourceDigest: DIGEST,
    decision: 'approved',
    approvedBy: 'engineering-review',
    approvedAt: '2026-10-30T12:00:00Z',
  };
}
function source(): SourceManifestV2 {
  const frame = (id: string) => ({
    id,
    path: `exports/${id}.png`,
    sourceSize: { w: 96, h: 144 },
    anchorPx: { x: 48, y: 140 },
    rigId: 'human',
    sockets: { hand_r: { x: 76, y: 92 } },
    stage: 'candidate' as const,
  });
  return {
    schemaVersion: 2,
    frames: [
      frame('body0'),
      frame('hair0'),
      {
        id: 'sword0',
        path: 'exports/sword0.png',
        sourceSize: { w: 24, h: 64 },
        anchorPx: { x: 12, y: 60 },
        stage: 'candidate',
      },
    ],
    appearances: [
      {
        id: 'body',
        kind: 'layer',
        contentId: 'body-regular',
        quality: 'hd',
        clipIds: ['body-idle'],
        stage: 'candidate',
      },
      {
        id: 'hair',
        kind: 'layer',
        contentId: 'hair-short',
        quality: 'hd',
        clipIds: ['hair-idle'],
        stage: 'candidate',
      },
      {
        id: 'sword',
        kind: 'layer',
        contentId: 'sword-held',
        quality: 'hd',
        clipIds: ['sword-idle'],
        stage: 'candidate',
      },
      {
        id: 'aqualia-hd',
        kind: 'origin',
        contentId: 'aqualia',
        quality: 'hd',
        clipIds: [],
        recipeId: 'human-aqualia',
        stage: 'candidate',
      },
    ],
    clips: ['body', 'hair', 'sword'].map((id) => ({
      id: `${id}-idle`,
      appearanceId: id,
      state: 'idle',
      facing: 's',
      frameIds: [`${id}0`],
      fps: 6,
      playback: 'loop',
    })),
    rigs: [
      {
        id: 'human',
        canvas: { w: 96, h: 144 },
        anchorPx: { x: 48, y: 140 },
        socketIds: ['hand_r'],
      },
    ],
    buildProfiles: [{ id: 'regular', rigId: 'human', label: 'Regular adult' }],
    layerSets: [
      {
        id: 'body-set',
        appearanceId: 'body',
        rigId: 'human',
        buildProfileIds: ['regular'],
        slot: 'body',
        stage: 'candidate',
      },
      {
        id: 'hair-set',
        appearanceId: 'hair',
        rigId: 'human',
        buildProfileIds: ['regular'],
        slot: 'hair',
        stage: 'candidate',
      },
      {
        id: 'sword-set',
        appearanceId: 'sword',
        rigId: 'human',
        buildProfileIds: ['regular'],
        slot: 'held',
        stage: 'candidate',
      },
    ],
    recipes: [
      {
        id: 'human-aqualia',
        rigId: 'human',
        buildProfileId: 'regular',
        stage: 'candidate',
        layers: [
          { layerSetId: 'body-set', z: 0, required: true },
          { layerSetId: 'hair-set', z: 10, required: true },
          {
            layerSetId: 'sword-set',
            z: 20,
            required: false,
            heldSlot: 0,
            itemId: 'sword',
            socketId: 'hand_r',
          },
        ],
      },
    ],
  };
}
function runtime(): AssetCatalog {
  return {
    schemaVersion: 2,
    contentVersion: 'test-v2',
    pages: [
      {
        id: 'page',
        url: '/assets/page.json',
        imageUrl: '/assets/page.png',
        width: 128,
        height: 256,
        variants: [
          {
            resolution: 1,
            url: '/assets/page.json',
            imageUrl: '/assets/page.png',
            width: 128,
            height: 256,
          },
        ],
      },
    ],
    frames: [
      {
        id: 'base0',
        pageId: 'page',
        textureKey: 'base0',
        rect: { x: 2, y: 2, w: 90, h: 138 },
        sourceSize: { w: 96, h: 144 },
        trim: { x: 3, y: 3, w: 90, h: 138 },
        anchorPx: { x: 48, y: 140 },
        anchor: normalizedAnchor({ x: 48, y: 140 }, { w: 96, h: 144 }),
      },
    ],
    clips: [],
    appearances: [
      {
        id: 'legacy-player',
        kind: 'origin',
        contentId: 'aqualia',
        quality: 'prototype',
        clipIds: [],
        frameId: 'base0',
      },
    ],
    portraits: [
      {
        kind: 'origin',
        contentId: 'aqualia',
        hud96: '/assets/neutral96.png',
        hud128: '/assets/neutral128.png',
      },
    ],
  };
}
function portraitSet(stage: PortraitSet['stage'] = 'candidate'): PortraitSet {
  return {
    id: 'aqualia-faces',
    kind: 'origin',
    contentId: 'aqualia',
    stage,
    sourceDigest: DIGEST,
    provenanceId: 'authoring',
    expressions: Object.fromEntries(
      DIALOGUE_EMOTIONS.map((emotion) => [
        emotion,
        { hud96: `/assets/${emotion}96.png`, hud128: `/assets/${emotion}128.png` },
      ]),
    ),
  };
}

describe('v2 source boundaries', () => {
  it('keeps the v1 neutral portrait adapter usable and exports both strict input schemas', () => {
    expect(
      SourceManifestSchema.parse({
        schemaVersion: 1,
        frames: [],
        appearances: [],
        clips: [],
        portraits: [
          {
            kind: 'npc',
            contentId: 'npc:neris',
            hud96: 'exports/neris96.png',
            hud128: 'exports/neris128.png',
          },
        ],
      }).schemaVersion,
    ).toBe(1);
    expect(z.toJSONSchema(SourceManifestSchema)).toHaveProperty('oneOf');
    expect(SourceManifestSchema.parse(source()).schemaVersion).toBe(2);
  });
  it('converts integer anchors exactly in untrimmed space and rejects a mismatched normalized anchor', () => {
    expect(normalizedAnchor({ x: 48, y: 140 }, { w: 96, h: 144 })).toEqual({
      x: 0.5,
      y: 140 / 144,
    });
    const c = runtime();
    expect(AssetCatalogSchema.safeParse(c).success).toBe(true);
    c.frames[0]!.anchor.y = 1;
    expect(AssetCatalogSchema.safeParse(c).success).toBe(false);
    for (const x of [-1, 0.5, 97]) {
      const s = source();
      s.frames[0]!.anchorPx.x = x;
      expect(SourceManifestSchema.safeParse(s).success).toBe(false);
    }
  });
  it('rejects broken frame, appearance, build profile, rig, furniture and scene references', () => {
    const changes: ((s: SourceManifestV2) => void)[] = [
      (s) => {
        s.clips[0]!.frameIds = ['missing'];
      },
      (s) => {
        s.clips[0]!.appearanceId = 'missing';
      },
      (s) => {
        s.buildProfiles![0]!.rigId = 'missing';
      },
      (s) => {
        s.layerSets![0]!.buildProfileIds = ['missing'];
      },
      (s) => {
        s.recipes![0]!.buildProfileId = 'missing';
      },
      (s) => {
        s.furniture = [
          {
            id: 'chair',
            appearanceId: 'missing',
            footprintTiles: { w: 1, h: 1 },
            service: 'rest',
            occlusion: 'none',
            stage: 'candidate',
          },
        ];
      },
      (s) => {
        s.sceneAssets = [
          { id: 'ground', appearanceId: 'missing', category: 'ground', stage: 'candidate' },
        ];
      },
    ];
    for (const change of changes) {
      const s = source();
      change(s);
      expect(SourceManifestSchema.safeParse(s).success).toBe(false);
    }
  });
  it('rejects incompatible layer canvas, registration, cadence and recursive recipes', () => {
    const changes: ((s: SourceManifestV2) => void)[] = [
      (s) => {
        s.frames[1]!.sourceSize.w = 100;
      },
      (s) => {
        s.frames[1]!.anchorPx.x = 47;
      },
      (s) => {
        s.clips[1]!.frameIds = ['hair0', 'hair0'];
      },
      (s) => {
        s.appearances[0]!.recipeId = 'human-aqualia';
      },
      (s) => {
        s.recipes![0]!.layers[0]!.required = false;
      },
    ];
    for (const change of changes) {
      const s = source();
      change(s);
      expect(SourceManifestSchema.safeParse(s).success).toBe(false);
    }
  });
  it('validates action sockets and canonical equipment selectors', () => {
    const changes: ((s: SourceManifestV2) => void)[] = [
      (s) => {
        s.frames[0]!.sockets = { imaginary: { x: 1, y: 1 } };
      },
      (s) => {
        s.frames[0]!.sockets = {};
      },
      (s) => {
        s.recipes![0]!.layers[2]!.socketId = 'missing';
      },
      (s) => {
        s.recipes![0]!.layers[2]!.itemId = 'imaginary-sword';
      },
      (s) => {
        s.recipes![0]!.layers[2]!.gearSlot = 'coat';
      },
    ];
    for (const change of changes) {
      const s = source();
      change(s);
      expect(SourceManifestSchema.safeParse(s).success).toBe(false);
    }
  });
  it('keeps partial proof art reviewable without shadowing a playable appearance', () => {
    const s = SourceManifestSchema.parse({
      schemaVersion: 2,
      frames: [
        {
          id: 'proof',
          path: 'proofs/player.png',
          sourceSize: { w: 96, h: 144 },
          anchorPx: { x: 48, y: 140 },
          stage: 'proof',
        },
      ],
      appearances: [
        {
          id: 'player-proof',
          kind: 'origin',
          contentId: 'aqualia',
          quality: 'hd',
          frameId: 'proof',
          clipIds: [],
          stage: 'proof',
        },
      ],
      clips: [],
    });
    expect(canPublishAppearance(s, s.appearances[0]!)).toBe(false);
    const c = runtime();
    c.reviewAppearances = [
      {
        id: 'player-proof',
        kind: 'origin',
        contentId: 'aqualia',
        quality: 'hd',
        frameId: 'base0',
        clipIds: [],
        stage: 'proof',
      },
    ];
    expect(AssetCatalogSchema.safeParse(c).success).toBe(true);
    expect(new AppearanceResolver(c).resolve('origin', 'aqualia')!.id).toBe('legacy-player');
    c.appearances = c.reviewAppearances;
    expect(AssetCatalogSchema.safeParse(c).success).toBe(false);
  });
  it('does not publish a single-frame candidate actor even if it declares HD', () => {
    const s = source(),
      a = s.appearances.find((a) => a.kind === 'origin')!;
    expect(canPublishAppearance(s, a)).toBe(false);
    const c = runtime();
    c.reviewAppearances = [{ ...a }];
    c.reviewClips = [];
    // Coverage can report declarations separately from full animation and approval.
    const report = assetCoverage(c);
    expect(report.requiredAppearances).toBe(19);
    expect(report.fullWorld.requiredAppearances).toBe(41);
    expect(report.declaredHdAppearances).toBe(1);
    expect(report.completeAnimationAppearances).toBe(0);
    expect(report.approvedAppearances).toBe(0);
  });
  it('keeps working v1 walk clips when partial authored HD idle art is proposed', () => {
    const v1 = SourceManifestSchema.parse({
      schemaVersion: 1,
      frames: [{ id: 'proof', path: 'exports/proof.png', anchor: { x: 0.5, y: 1 } }],
      appearances: [
        {
          id: 'legacy-player',
          kind: 'origin',
          contentId: 'aqualia',
          quality: 'hd',
          clipIds: ['proof-idle'],
        },
      ],
      clips: [
        {
          id: 'proof-idle',
          appearanceId: 'legacy-player',
          state: 'idle',
          facing: 's',
          frameIds: ['proof'],
          fps: 6,
          playback: 'loop',
        },
      ],
    });
    expect(canPublishAppearance(v1, v1.appearances[0]!)).toBe(false);
    const c = runtime();
    c.appearances[0]!.clipIds = ['old-walk'];
    c.clips = [
      {
        id: 'old-walk',
        appearanceId: 'legacy-player',
        state: 'walk',
        facing: 's',
        frameIds: ['base0'],
        fps: 8,
        stride: 1,
        playback: 'distance',
      },
    ];
    c.reviewAppearances = [{ ...v1.appearances[0]!, stage: 'candidate' }];
    c.reviewClips = [{ ...v1.clips[0]!, frameIds: ['base0'] }];
    expect(AssetCatalogSchema.safeParse(c).success).toBe(true);
    const resolver = new AppearanceResolver(c);
    expect(resolver.clip(resolver.resolve('origin', 'aqualia')!, 'walk', 's')?.id).toBe('old-walk');
  });
  it('rejects artist-supplied approvals, self-approved stages, path escapes and unknown expressions', () => {
    expect(SourceManifestSchema.safeParse({ ...source(), approvals: [] }).success).toBe(false);
    const s = source();
    (s.appearances[0] as { stage: string }).stage = 'approved';
    expect(SourceManifestSchema.safeParse(s).success).toBe(false);
    const p = source();
    p.frames[0]!.path = '../secret.png';
    expect(SourceManifestSchema.safeParse(p).success).toBe(false);
    const e = source();
    e.portraitSets = [
      {
        id: 'face',
        kind: 'origin',
        contentId: 'aqualia',
        stage: 'candidate',
        expressions: {
          neutral: { hud96: 'exports/n96.png', hud128: 'exports/n128.png' },
          joy: { hud96: 'exports/j96.png', hud128: 'exports/j128.png' },
        },
      } as NonNullable<SourceManifestV2['portraitSets']>[number],
    ];
    expect(SourceManifestSchema.safeParse(e).success).toBe(false);
  });
});

describe('art approval and provenance', () => {
  it('ties approval to the exact digest and rejects duplicate/conflicting decisions', () => {
    const record = approval('appearance', 'env');
    expect(hasArtApproval('appearance', 'env', DIGEST, [record])).toBe(true);
    expect(hasArtApproval('appearance', 'env', 'b'.repeat(64), [record])).toBe(false);
    expect(
      ArtApprovalLedgerSchema.safeParse({
        schemaVersion: 1,
        records: [record, { ...record, id: 'different', decision: 'rejected' }],
      }).success,
    ).toBe(false);
    const c = runtime();
    c.appearances = [
      {
        id: 'env',
        kind: 'environment',
        contentId: 'ground_grass',
        quality: 'hd',
        frameId: 'base0',
        clipIds: [],
        stage: 'approved',
        sourceDigest: DIGEST,
        provenanceId: 'authoring',
      },
    ];
    c.authoringProvenance = [provenance()];
    expect(AssetCatalogSchema.safeParse(c).success).toBe(false);
    c.sourceDigests = [{ subjectKind: 'appearance', subjectId: 'env', digest: DIGEST }];
    c.approvals = [record];
    expect(AssetCatalogSchema.safeParse(c).success).toBe(true);
  });
  it('requires pinned Blender sources and hashes every model, script, material and pose-config dependency', () => {
    const blend: AuthoringProvenance = {
      id: 'blend',
      method: 'blender-bake',
      inputs: [
        { path: 'blender/models/player.blend', sha256: DIGEST, role: 'model' },
        { path: 'blender/bake.py', sha256: DIGEST, role: 'script' },
        { path: 'blender/material.png', sha256: DIGEST, role: 'material' },
        { path: 'blender/pose.json', sha256: DIGEST, role: 'pose-config' },
      ],
      toolchain: [{ name: 'Blender', version: '4.5.3' }],
      command:
        'blender -b blender/models/player.blend -P blender/bake.py (description; not executed)',
    };
    expect(AuthoringProvenanceSchema.safeParse(blend).success).toBe(true);
    const missing = structuredClone(blend);
    missing.inputs = missing.inputs.filter((i) => i.role !== 'model');
    expect(AuthoringProvenanceSchema.safeParse(missing).success).toBe(false);
    const unpinned = structuredClone(blend);
    unpinned.toolchain[0]!.version = '4.x';
    expect(AuthoringProvenanceSchema.safeParse(unpinned).success).toBe(false);
    const s = source();
    s.authoringProvenance = [blend];
    s.appearances[0]!.provenanceId = 'blend';
    const payload = sourceSubjectDependencies(s, 'appearance', 'aqualia-hd');
    expect(payload.paths).toEqual(expect.arrayContaining(blend.inputs.map((i) => i.path)));
    const c = runtime(),
      set = portraitSet('approved');
    c.portraitSets = [set];
    c.sourceDigests = [{ subjectKind: 'portrait-set', subjectId: set.id, digest: DIGEST }];
    c.approvals = [approval('portrait-set', set.id)];
    expect(AssetCatalogSchema.safeParse(c).success).toBe(false);
    c.authoringProvenance = [provenance()];
    expect(AssetCatalogSchema.safeParse(c).success).toBe(true);
  });
  it('includes socket, layer, rig and source-file dependencies in per-artifact approval payloads', () => {
    const s = source(),
      before = sourceSubjectDependencies(s, 'appearance', 'aqualia-hd');
    expect(before.paths).toEqual(['exports/body0.png', 'exports/hair0.png', 'exports/sword0.png']);
    expect(before.metadata.map((m) => m.key)).toContain('rig:human');
    const hash = (value: unknown) =>
      createHash('sha256').update(canonicalSourceJson(value)).digest('hex');
    const digest = hash(before);
    s.frames[0]!.sockets!.hand_r!.x++;
    expect(hash(sourceSubjectDependencies(s, 'appearance', 'aqualia-hd'))).not.toBe(digest);
    expect(
      hash({
        metadata: before.metadata,
        files: [{ path: before.paths[0], sha256: 'pixels-before' }],
      }),
    ).not.toBe(
      hash({
        metadata: before.metadata,
        files: [{ path: before.paths[0], sha256: 'pixels-after' }],
      }),
    );
  });
});

describe('nine-expression portrait sets', () => {
  it('allows partial candidate expressions but requires nine distinct exports for approval', () => {
    const set = portraitSet();
    set.expressions = { neutral: set.expressions.neutral };
    expect(PortraitSetSchema.safeParse(set).success).toBe(true);
    expect(completePortraitExpressions(set)).toBe(false);
    set.stage = 'approved';
    expect(PortraitSetSchema.safeParse(set).success).toBe(false);
    const complete = portraitSet('approved');
    expect(PortraitSetSchema.safeParse(complete).success).toBe(true);
    complete.expressions.angry = complete.expressions.neutral;
    expect(PortraitSetSchema.safeParse(complete).success).toBe(false);
  });
  it('uses approved expression art and otherwise retains the same identity neutral portrait', () => {
    const c = runtime();
    const set = portraitSet();
    c.portraitSets = [set];
    c.authoringProvenance = [provenance()];
    expect(new AppearanceResolver(c).portrait('origin', 'aqualia', 'angry')?.resolvedEmotion).toBe(
      'neutral',
    );
    expect(new AppearanceResolver(c).portrait('npc', 'npc:neris', 'angry')).toBeUndefined();
    set.stage = 'approved';
    c.approvals = [approval('portrait-set', set.id)];
    c.sourceDigests = [{ subjectKind: 'portrait-set', subjectId: set.id, digest: DIGEST }];
    expect(AssetCatalogSchema.safeParse(c).success).toBe(true);
    expect(new AppearanceResolver(c).portrait('origin', 'aqualia', 'angry')).toMatchObject({
      hud128: '/assets/angry128.png',
      resolvedEmotion: 'angry',
    });
  });
});
