import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  mergeFaces,
  mergeIcons,
  installIntake,
  approvalEntries,
  reviewDigest,
  reconcileLedger,
} from '../scripts/art-sidecars';
import {
  canonicalSourceJson,
  sourceSubjectDependencies,
  SourceManifestSchema,
} from '../src/presentation/assets/source';
import { AuthoringProvenanceSchema } from '../src/presentation/assets/catalog';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const digest = (s: Buffer | string) => createHash('sha256').update(s).digest('hex');
let repo: string, manifest: Json, sidecar: Json;
const record = 'docs/team/comms/director/approvals/faces.md';
const bodyRecord = 'docs/team/comms/director/approvals/body.md';
const bodyDigest = 'b'.repeat(64);
let faceDigest = 'f'.repeat(64);
const write = (path: string, value: unknown) => {
  const dest = join(repo, path);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(
    dest,
    typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value),
  );
};
function approval(asset: string, packet: string, packetDigest: string, scope: string) {
  return `---\nasset: ${asset}\npacket: ${packet}\npacketDigest: ${packetDigest}\ndecision: director-approved\nscope: [${scope}]\ndate: 2026-11-05\nrecordedBy: director\n---\n`;
}
beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'hearthwild-intake-'));
  write('scripts/art-sidecars.ts', readFileSync('scripts/art-sidecars.ts'));
  write('package-lock.json', '{}');
  const bytes = readFileSync('art/source/ui/icons/items/berries.png');
  const faces = ['s', 'se', 'sw', 'e', 'w'];
  const bodyFrames = [...faces, 'n', 'ne', 'nw'].map((f) => {
    const file = `exports/rivallie/${bodyDigest}/${f}.png`;
    write(`art/source/${file}`, bytes);
    return {
      id: `rivallie:idle:${f}:0`,
      file,
      sha256: digest(bytes),
      sourceSize: { w: 112, h: 112 },
      anchorPx: { x: 56, y: 82 },
      rigId: 'quadruped-v1',
      sockets: { Socket_Head: { x: 56, y: 40 } },
    };
  });
  const bodyClips = bodyFrames.map((f, i) => ({
    id: `body_${i}`,
    state: 'idle',
    facing: f.id.split(':')[2],
    frameIds: [f.id],
    fps: 6,
    playback: 'loop',
  }));
  write('art/review/body/review.json', {
    sourceDigest: bodyDigest,
    frames: bodyFrames,
    clips: bodyClips,
  });
  write(bodyRecord, approval('rivallie', 'art/review/body', bodyDigest, 'body, clips'));
  const body = {
    asset: 'rivallie',
    packet: 'art/review/body',
    packetDigest: bodyDigest,
    packetSha256: digest(readFileSync(join(repo, 'art/review/body/review.json'))),
    approvalRecord: bodyRecord,
    approvalSha256: digest(readFileSync(join(repo, bodyRecord))),
    frames: bodyFrames,
    clips: bodyClips,
    rigId: 'quadruped-v1',
  };
  write('art/source/staging/blender/rivallie.json', body);
  const frames = ['neutral', 'warm', 'fearful', 'hurt', 'sleep'].flatMap((expression) =>
    faces.map((facing) => {
      const file = `${expression}/${facing}.png`;
      write(`art/source/exports/rivallie-faces/${faceDigest}/${file}`, bytes);
      return {
        expression,
        facing,
        file,
        sha256: digest(bytes),
        sourceSize: { w: 32, h: 24 },
        anchorPx: { x: 16, y: 12 },
        socket: 'Socket_Head',
      };
    }),
  );
  const registration = {
    unit: 'frame px',
    frames: Object.fromEntries(bodyFrames.slice(0, 5).map((f) => [f.id, [0, 6]])),
  };
  const packet = {
    asset: 'rivallie',
    bodyPacketDigest: bodyDigest,
    bodyManifestSha256: body.packetSha256,
    sourceDigest: faceDigest,
    status: 'candidate',
    frames,
    registration,
    qa: [{ pass: true }],
  };
  faceDigest = reviewDigest(packet, true);
  packet.sourceDigest = faceDigest;
  for (const f of frames) write(`art/source/exports/rivallie-faces/${faceDigest}/${f.file}`, bytes);
  write('art/review/faces/faces.json', packet);
  write(record, approval('rivallie', 'art/review/faces', faceDigest, 'faces'));
  sidecar = {
    asset: 'rivallie',
    scope: ['faces'],
    packet: 'art/review/faces',
    packetDigest: faceDigest,
    packetSha256: digest(readFileSync(join(repo, 'art/review/faces/faces.json'))),
    approvalRecord: record,
    approvalSha256: digest(readFileSync(join(repo, record))),
    bodyPacketDigest: bodyDigest,
    bodyManifestSha256: body.packetSha256,
    registration,
    frames: frames.map((f) => ({ ...f, file: `exports/rivallie-faces/${faceDigest}/${f.file}` })),
  };
  write('art/source/staging/blender/rivallie-faces.json', sidecar);
  manifest = {
    schemaVersion: 2,
    frames: bodyFrames.map(({ file, sha256: _hash, ...f }) => ({
      ...f,
      id: f.id.replaceAll(':', '_'),
      path: file,
      stage: 'candidate',
    })),
    clips: bodyClips.map((c) => ({
      ...c,
      appearanceId: 'species:rivallie',
      frameIds: c.frameIds.map((id) => id.replaceAll(':', '_')),
    })),
    appearances: [
      {
        id: 'species:rivallie',
        kind: 'species',
        contentId: 'rivallie',
        quality: 'hd',
        clipIds: bodyClips.map((c) => c.id),
        stage: 'candidate',
      },
    ],
    rigs: [
      {
        id: 'quadruped-v1',
        canvas: { w: 112, h: 112 },
        anchorPx: { x: 56, y: 82 },
        socketIds: ['Socket_Head'],
      },
    ],
    authoringProvenance: [],
  };
});
afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

describe('approved sidecar intake', () => {
  it('withdraws a superseded ledger grant without inventing a rejection or affecting current grants', () => {
    const ledger = {
      schemaVersion: 1,
      records: [
        { id: 'old', decision: 'approved', notes: `Record ${record}` },
        { id: 'current', decision: 'approved', notes: `Record ${bodyRecord}` },
      ],
    };
    write(
      record,
      approval('rivallie', 'art/review/faces', faceDigest, 'faces').replace(
        'decision:',
        'superseded-by: newer.md\ndecision:',
      ),
    );
    const result = reconcileLedger(repo, ledger);
    expect(result.withdrawn).toEqual(['old']);
    expect(result.ledger.records).toEqual([ledger.records[1]]);
    expect(reconcileLedger(repo, result.ledger).withdrawn).toEqual([]);
  });
  it('accepts current published sidecars, rejects superseded body bindings, and verifies all 17 icon images', () => {
    const root = process.cwd();
    for (const asset of ['rivallie', 'bramblefang', 'mireling']) {
      const body = JSON.parse(readFileSync(`art/source/staging/blender/${asset}.json`, 'utf8'));
      const faces = JSON.parse(
        readFileSync(`art/source/staging/blender/${asset}-faces.json`, 'utf8'),
      );
      const appearanceId = `species:${asset}`;
      const clips = body.clips.map((c: Json) => ({
        ...c,
        appearanceId,
        frameIds: c.frameIds.map((id: string) => id.replaceAll(':', '_')),
      }));
      const registrations = [
        ...new Map<string, Json>(
          body.frames.map((f: Json) => [
            canonicalSourceJson([f.sourceSize, f.anchorPx]),
            { canvas: f.sourceSize, anchorPx: f.anchorPx },
          ]),
        ).values(),
      ];
      const m = {
        schemaVersion: 2,
        frames: body.frames.map((f: Json) => ({
          id: f.id.replaceAll(':', '_'),
          path: f.file,
          sourceSize: f.sourceSize,
          anchorPx: f.anchorPx,
          rigId: f.rigId,
          sockets: f.sockets,
          ...(f.held ? { held: f.held } : {}),
          stage: 'candidate',
        })),
        clips,
        appearances: [
          {
            id: appearanceId,
            kind: 'species',
            contentId: asset,
            quality: 'hd',
            stage: 'candidate',
            clipIds: clips.map((c: Json) => c.id),
            provenanceId: body.authoringProvenance.id,
          },
        ],
        rigs: [
          {
            id: body.rigId,
            ...registrations[0],
            registrations: registrations.slice(1),
            socketIds: [...new Set(body.frames.flatMap((f: Json) => Object.keys(f.sockets ?? {})))],
          },
        ],
        authoringProvenance: [body.authoringProvenance],
      };
      if (!m.rigs[0]!.registrations.length) delete (m.rigs[0] as Json).registrations;
      const approval = readFileSync(body.approvalRecord, 'utf8');
      if (
        /^decision: superseded\s*$/m.test(approval) ||
        /^superseded-by:/m.test(approval) ||
        body.packetDigest !== faces.bodyPacketDigest ||
        body.packetSha256 !== faces.bodyManifestSha256
      )
        expect(() => mergeFaces(root, m, asset)).toThrow(/binding|Approval|changed/i);
      else expect(mergeFaces(root, m, asset).subjects).toHaveLength(6);
    }
    const icons = mergeIcons(
      root,
      JSON.parse(readFileSync('art/source/manifest.json', 'utf8')),
      'docs/team/comms/director/approvals/icons-items--2026-11-04-icons-items-1.md',
    );
    expect(icons.subjects).toHaveLength(34);
    expect(
      new Set(
        icons.manifest.frames
          .filter((f: Json) => f.id.startsWith('inventory_'))
          .map((f: Json) => f.path),
      ).size,
    ).toBe(17);
  });
  it('is idempotent and binds every expression and registration in source dependencies', () => {
    const first = mergeFaces(repo, manifest, 'rivallie');
    expect(existsSync(join(repo, first.snapshots[0]!.path))).toBe(false);
    installIntake(repo, first);
    const again = mergeFaces(repo, first.manifest, 'rivallie');
    expect(again.manifest).toEqual(first.manifest);
    SourceManifestSchema.parse(first.manifest);
    AuthoringProvenanceSchema.parse(first.manifest.authoringProvenance[0]);
    const deps = sourceSubjectDependencies(
      first.manifest as never,
      'layer-set',
      'layer-set:rivallie:faces',
    );
    expect(deps.paths.filter((p) => p.endsWith('.png'))).toHaveLength(33);
    expect(JSON.stringify(deps.metadata)).toContain('registration');
    expect(
      first.manifest.clips.filter((c: Json) => c.appearanceId === 'layer:rivallie:body'),
    ).toHaveLength(8);
  });
  it('rejects superseded approvals and body replacement without writing receipts', () => {
    const contents = readFileSync(join(repo, record), 'utf8').replace(
      'decision:',
      'superseded-by: newer.md\ndecision:',
    );
    write(record, contents);
    sidecar.approvalSha256 = digest(contents);
    write('art/source/staging/blender/rivallie-faces.json', sidecar);
    expect(() => mergeFaces(repo, manifest, 'rivallie')).toThrow(/Approval/);
    expect(existsSync(join(repo, 'art/source/exports/intake'))).toBe(false);
  });
  it('rejects body digest mismatch, modified sockets, altered exports and altered registration', () => {
    sidecar.bodyPacketDigest = '0'.repeat(64);
    write('art/source/staging/blender/rivallie-faces.json', sidecar);
    expect(() => mergeFaces(repo, manifest, 'rivallie')).toThrow(/binding/);
    sidecar.bodyPacketDigest = bodyDigest;
    write('art/source/staging/blender/rivallie-faces.json', sidecar);
    manifest.frames[0].sockets.Socket_Head.x += 2;
    expect(() => mergeFaces(repo, manifest, 'rivallie')).toThrow(/Integrated body/);
    manifest.frames[0].sockets.Socket_Head.x -= 2;
    sidecar.registration.frames['rivallie:idle:s:0'] = [2, 2];
    write('art/source/staging/blender/rivallie-faces.json', sidecar);
    expect(() => mergeFaces(repo, manifest, 'rivallie')).toThrow(/metadata/);
    sidecar.registration.frames['rivallie:idle:s:0'] = [0, 6];
    write('art/source/staging/blender/rivallie-faces.json', sidecar);
    write(`art/source/${sidecar.frames[0].file}`, 'changed');
    expect(() => mergeFaces(repo, manifest, 'rivallie')).toThrow(/Changed export/);
  });
  it('rejects stale catalog digests before ledger transcription', () => {
    const intake = mergeFaces(repo, manifest, 'rivallie');
    installIntake(repo, intake);
    const sourceDigests = intake.subjects.map(({ kind, id }) => {
      const deps = sourceSubjectDependencies(intake.manifest as never, kind as never, id);
      return {
        subjectKind: kind,
        subjectId: id,
        digest: digest(
          canonicalSourceJson({
            contractVersion: 2,
            subject: { kind, id },
            metadata: deps.metadata,
            files: deps.paths.map((path) => ({
              path,
              sha256: digest(readFileSync(join(repo, 'art/source', path))),
            })),
          }),
        ),
      };
    });
    expect(approvalEntries(repo, intake, { sourceDigests })).toHaveLength(6);
    sourceDigests[0]!.digest = '0'.repeat(64);
    expect(() => approvalEntries(repo, intake, { sourceDigests })).toThrow(/stale/);
  });
  it('integrates inventory identities and rejects unknown items or modified masters', () => {
    const bytes = readFileSync('art/source/ui/icons/items/berries.png');
    write('art/source/ui/icons/items/berries.png', bytes);
    write('art/review/icons/berries.png', bytes);
    const packet = {
      asset: 'icons:items',
      status: 'candidate',
      sourceDigest: faceDigest,
      qa: [{ pass: true }],
      icons: [
        { item: 'berries', file: 'berries.png', sha256: digest(bytes), size: { w: 32, h: 32 } },
      ],
    };
    packet.sourceDigest = reviewDigest(packet);
    write('art/review/icons/review.json', packet);
    const iconRecord = 'docs/team/comms/director/approvals/icons.md';
    write(
      iconRecord,
      approval('icons:items', 'art/review/icons', packet.sourceDigest, 'icons, items'),
    );
    const intake = mergeIcons(repo, manifest, iconRecord);
    expect(intake.manifest.appearances.find((a: Json) => a.id === 'item:berries').frameId).toBe(
      'inventory_berries',
    );
    expect(mergeIcons(repo, intake.manifest, iconRecord).manifest).toEqual(intake.manifest);
    write('art/source/ui/icons/items/berries.png', 'changed');
    expect(() => mergeIcons(repo, manifest, iconRecord)).toThrow(/Changed export/);
  });
});
