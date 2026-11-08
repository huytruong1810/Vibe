/** Digest-bound intake of published faces and approved inventory exports (M25/C3b). */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { ITEMS, SPECIES } from '../src/content/definitions';
import {
  SourceManifestSchema,
  canonicalSourceJson,
  sourceSubjectDependencies,
} from '../src/presentation/assets/source';
import { FaceExpressionSchema, FACINGS } from '../src/presentation/assets/catalog';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Snapshot = { path: string; bytes: Buffer };
export type Intake = {
  manifest: Json;
  subjects: { kind: string; id: string }[];
  records: string[];
  snapshots: Snapshot[];
};
const hash = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
/** Forge faces use Python json.dumps(sort_keys=True); icon packets use compact JSON. */
export function reviewDigest(value: Json, spaced = false): string {
  const { sourceDigest: _digest, ...payload } = value;
  const encode = (v: any): string => {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    if (Array.isArray(v)) return `[${v.map(encode).join(', ')}]`;
    if (v && typeof v === 'object')
      return `{${Object.keys(v)
        .sort()
        .map((k) => `${encode(k)}: ${encode(v[k])}`)
        .join(', ')}}`;
    return JSON.stringify(v).replace(
      /[\u007f-\uffff]/g,
      (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`,
    );
  };
  return hash(spaced ? encode(payload) : canonicalSourceJson(payload));
}
function file(repo: string, name: string): string {
  const path = resolve(repo, name);
  const base = realpathSync(repo);
  const actual = existsSync(path) ? realpathSync(path) : path;
  if (!actual.startsWith(base + sep)) throw new Error(`Intake path escapes repository: ${name}`);
  return path;
}
const read = (repo: string, name: string): Json =>
  JSON.parse(readFileSync(file(repo, name), 'utf8'));
const sha = (repo: string, name: string) => hash(readFileSync(file(repo, name)));
const nid = (id: string) => id.replaceAll(':', '_');
function meta(repo: string, name: string): Json {
  if (!file(repo, name).startsWith(resolve(repo, 'docs/team/comms/director/approvals') + sep))
    throw new Error('Approval must be a director record');
  const text = readFileSync(file(repo, name), 'utf8');
  if (!text.startsWith('---')) throw new Error('Approval needs front matter');
  return Object.fromEntries(
    text
      .split('---')[1]!
      .trim()
      .split('\n')
      .filter((s) => s.includes(':'))
      .map((s) => {
        const i = s.indexOf(':');
        return [s.slice(0, i).trim(), s.slice(i + 1).trim()];
      }),
  );
}
function approved(
  repo: string,
  name: string,
  asset: string,
  packet: string,
  digest: string,
  scopes: string[],
) {
  const m = meta(repo, name);
  const scope = m.scope?.replace(/[\[\] ]/g, '').split(',') ?? [];
  if (
    m.asset !== asset ||
    m.decision !== 'director-approved' ||
    m['superseded-by'] ||
    m.packetDigest !== digest ||
    resolve(repo, m.packet ?? '') !== resolve(repo, packet) ||
    scopes.some((s) => !scope.includes(s))
  )
    throw new Error('Approval asset, scope, packet or digest mismatch');
  return m;
}
function verifyFrames(repo: string, rows: Json[]) {
  if (!rows.length) throw new Error('Empty export');
  for (const f of rows)
    if (sha(repo, `art/source/${f.file}`) !== f.sha256)
      throw new Error(`Changed export: ${f.file}`);
}
export function verifyPublishedBody(repo: string, body: Json) {
  if (
    sha(repo, body.approvalRecord) !== body.approvalSha256 ||
    sha(repo, `${body.packet}/review.json`) !== body.packetSha256
  )
    throw new Error('Body approval or packet changed since publication');
  approved(repo, body.approvalRecord, body.asset, body.packet, body.packetDigest, [
    'body',
    'clips',
  ]);
  verifyFrames(repo, body.frames);
}
/** An immutable receipt of intake, not a claim about the generator's missing tool versions. */
function provenance(
  repo: string,
  id: string,
  rows: Json[],
  packet: string,
  records: string[],
  receipt: Json,
): { record: Json; snapshots: Snapshot[] } {
  const snapshots: { name: string; bytes: Buffer; role: string }[] = [
    {
      name: 'art-sidecars.ts',
      bytes: readFileSync(file(repo, 'scripts/art-sidecars.ts')),
      role: 'script',
    },
    {
      name: 'package-lock.json',
      bytes: readFileSync(file(repo, 'package-lock.json')),
      role: 'dependency-lock',
    },
    { name: 'packet.json', bytes: readFileSync(file(repo, packet)), role: 'pose-config' },
    { name: 'receipt.json', bytes: Buffer.from(canonicalSourceJson(receipt)), role: 'pose-config' },
    ...records.map((record, i) => ({
      name: `approval-${i}.md`,
      bytes: readFileSync(file(repo, record)),
      role: 'pose-config',
    })),
  ];
  const digest = hash(
    Buffer.concat(snapshots.map((s) => Buffer.concat([Buffer.from(s.name), s.bytes]))),
  );
  const prefix = `exports/intake/${id}/${digest}`;
  const inputs = rows.map((f) => ({ path: f.file, sha256: f.sha256, role: 'master' }));
  const planned: Snapshot[] = [];
  for (const s of snapshots) {
    const path = file(repo, `art/source/${prefix}/${s.name}`);
    if (existsSync(path) && hash(readFileSync(path)) !== hash(s.bytes))
      throw new Error('Immutable intake receipt changed');
    planned.push({ path: `art/source/${prefix}/${s.name}`, bytes: s.bytes });
    inputs.push({ path: `${prefix}/${s.name}`, sha256: hash(s.bytes), role: s.role });
  }
  return {
    snapshots: planned,
    record: {
      id: `intake-${id}`,
      method: 'reviewed-export',
      inputs,
      toolchain: [{ name: 'node', version: process.versions.node }],
      command: `npm run art:integrate -- merge-${receipt.scope} ${receipt.asset}`,
    },
  };
}
export function installIntake(repo: string, intake: Intake) {
  for (const s of intake.snapshots) {
    const path = file(repo, s.path);
    if (existsSync(path) && hash(readFileSync(path)) !== hash(s.bytes))
      throw new Error('Immutable intake receipt changed');
  }
  for (const s of intake.snapshots) {
    const path = file(repo, s.path);
    if (!existsSync(path)) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, s.bytes);
    }
  }
}
function put(m: Json, collection: string, row: Json) {
  m[collection] = [...(m[collection] ?? []).filter((r: Json) => r.id !== row.id), row];
}
function validate(m: Json) {
  SourceManifestSchema.parse(m);
}

export function mergeFaces(repo: string, manifest: Json, asset: string): Intake {
  if (!SPECIES.some((s) => s.id === asset))
    throw new Error('Creature sidecar intake needs a canonical species');
  const slug = asset.replace(':', '-');
  const s = read(repo, `art/source/staging/blender/${slug}-faces.json`);
  if (s.asset !== asset || !s.scope.includes('faces')) throw new Error('Wrong face sidecar');
  if (
    sha(repo, s.approvalRecord) !== s.approvalSha256 ||
    sha(repo, `${s.packet}/faces.json`) !== s.packetSha256
  )
    throw new Error('Face approval or packet changed since publication');
  approved(repo, s.approvalRecord, asset, s.packet, s.packetDigest, ['faces']);
  const packet = read(repo, `${s.packet}/faces.json`);
  if (
    packet.asset !== asset ||
    packet.bodyPacketDigest !== s.bodyPacketDigest ||
    packet.bodyManifestSha256 !== s.bodyManifestSha256
  )
    throw new Error('Face/body packet binding mismatch');
  if (
    packet.sourceDigest !== s.packetDigest ||
    reviewDigest(packet, true) !== packet.sourceDigest ||
    packet.status !== 'candidate' ||
    packet.qa.some((q: Json) => !q.pass)
  )
    throw new Error('Face packet is not a matching candidate');
  if (
    canonicalSourceJson(s.registration) !== canonicalSourceJson(packet.registration) ||
    canonicalSourceJson(s.frames) !==
      canonicalSourceJson(
        packet.frames.map((f: Json) => ({
          ...f,
          file: `exports/${slug}-faces/${packet.sourceDigest}/${f.file}`,
        })),
      )
  )
    throw new Error('Staged face metadata differs from approved packet');
  const body = read(repo, `art/source/staging/blender/${slug}.json`);
  if (
    body.packetDigest !== s.bodyPacketDigest ||
    body.packetSha256 !== s.bodyManifestSha256 ||
    sha(repo, `${body.packet}/review.json`) !== s.bodyManifestSha256 ||
    sha(repo, body.approvalRecord) !== body.approvalSha256
  )
    throw new Error('Face/body packet binding mismatch');
  approved(repo, body.approvalRecord, asset, body.packet, body.packetDigest, ['body', 'clips']);
  verifyFrames(repo, s.frames);
  verifyFrames(repo, body.frames);
  const bodyId = asset.startsWith('npc:') ? asset : `species:${asset}`;
  const m = structuredClone(manifest);
  const appearance = m.appearances.find((a: Json) => a.id === bodyId);
  if (!appearance || appearance.legacy || appearance.recipeId) {
    // Repeated intake may replace its own recipe, but never somebody else's composition.
    if (!appearance || appearance.legacy || appearance.recipeId !== `recipe:${slug}:faces`)
      throw new Error('Merge the matching published body before its faces');
  }
  const frameIds = new Set(body.frames.map((f: Json) => nid(f.id)));
  const expectedClips = body.clips.map((c: Json) => ({
    ...c,
    appearanceId: bodyId,
    frameIds: c.frameIds.map(nid),
  }));
  const actualClips = m.clips.filter((c: Json) => appearance.clipIds.includes(c.id));
  if (
    canonicalSourceJson(expectedClips) !== canonicalSourceJson(actualClips) ||
    body.frames.some((f: Json) => {
      const actual = m.frames.find((r: Json) => r.id === nid(f.id));
      return (
        !actual ||
        actual.path !== f.file ||
        actual.rigId !== body.rigId ||
        canonicalSourceJson([actual.sourceSize, actual.anchorPx, actual.held ?? null]) !==
          canonicalSourceJson([f.sourceSize, f.anchorPx, f.held ?? null]) ||
        canonicalSourceJson(actual.sockets) !== canonicalSourceJson(f.sockets) ||
        sha(repo, `art/source/${actual.path}`) !== f.sha256
      );
    })
  )
    throw new Error('Integrated body differs from the approved published body');
  const registration = Object.fromEntries(
    Object.entries(s.registration?.frames ?? {}).map(([id, offset]) => [nid(id), offset]),
  );
  const required = body.frames
    .filter((f: Json) => ['s', 'se', 'sw', 'e', 'w'].includes(f.id.split(':').at(-2)))
    .map((f: Json) => nid(f.id));
  if (
    Object.keys(registration).some((id) => !frameIds.has(id)) ||
    required.some((id: string) => !(id in registration))
  )
    throw new Error('Incomplete or foreign face registration');
  const hidden = required.filter((id: string) => registration[id] === null);
  if (hidden.length > required.length * 0.1 || hidden.some((id: string) => id.includes('_idle_')))
    throw new Error('Face coverage fails');
  const faceId = `layer:${slug}:faces`,
    bodyLayerId = `layer-set:${slug}:body`,
    faceLayerId = `layer-set:${slug}:faces`;
  const frames: Json = {};
  for (const f of s.frames.filter((x: Json) => !x.variant)) {
    FaceExpressionSchema.parse(f.expression);
    if (!['s', 'se', 'sw', 'e', 'w'].includes(f.facing) || frames[f.expression]?.[f.facing])
      throw new Error('Invalid or duplicate face pose');
    const id = `${slug}_face_${f.expression}_${f.facing}`;
    (frames[f.expression] ??= {})[f.facing] = id;
    put(m, 'frames', {
      id,
      path: f.file,
      sourceSize: f.sourceSize,
      anchorPx: f.anchorPx,
      stage: 'candidate',
    });
  }
  for (const expression of ['neutral', 'warm', 'fearful', 'hurt', 'sleep'])
    if (['s', 'se', 'sw', 'e', 'w'].some((f) => !frames[expression]?.[f]))
      throw new Error('Incomplete creature expressions');
  const clipIds: string[] = [];
  for (const facing of FACINGS.filter((f) => frames.neutral[f])) {
    const id = `${slug}_faces_${facing}`;
    clipIds.push(id);
    put(m, 'clips', {
      id,
      appearanceId: faceId,
      state: 'idle',
      facing,
      frameIds: Object.values(frames)
        .map((poses: any) => poses[facing])
        .filter(Boolean),
      fps: 1,
      playback: 'loop',
    });
  }
  const p = provenance(
    repo,
    `${slug}-faces`,
    s.frames,
    `${s.packet}/faces.json`,
    [body.approvalRecord, s.approvalRecord],
    { ...s, scope: 'faces' },
  );
  put(m, 'authoringProvenance', p.record);
  put(m, 'appearances', {
    id: faceId,
    kind: 'layer',
    contentId: `${slug}-faces`,
    quality: 'hd',
    clipIds,
    stage: 'candidate',
    provenanceId: p.record.id,
  });
  const profile = `profile:${slug}:faces`;
  put(m, 'buildProfiles', { id: profile, rigId: body.rigId, label: `${asset} approved body` });
  // Body layer shares approved body bytes without recursing through the actor recipe.
  const baseId = `layer:${slug}:body`;
  const bodyClips = expectedClips.map((c: Json) => ({
    ...c,
    id: `${c.id}_body_layer`,
    appearanceId: baseId,
  }));
  for (const c of bodyClips) put(m, 'clips', c);
  const { recipeId: _recipe, ...base } = appearance;
  put(m, 'appearances', {
    ...base,
    id: baseId,
    kind: 'layer',
    contentId: `${slug}-body`,
    clipIds: bodyClips.map((c: Json) => c.id),
  });
  put(m, 'layerSets', {
    id: bodyLayerId,
    rigId: body.rigId,
    buildProfileIds: [profile],
    slot: 'body',
    appearanceId: baseId,
    stage: 'candidate',
  });
  put(m, 'layerSets', {
    id: faceLayerId,
    rigId: body.rigId,
    buildProfileIds: [profile],
    slot: 'face',
    appearanceId: faceId,
    stage: 'candidate',
    face: { bodyAppearanceId: baseId, bodyPacketDigest: s.bodyPacketDigest, frames, registration },
  });
  appearance.recipeId = `recipe:${slug}:faces`;
  put(m, 'recipes', {
    id: appearance.recipeId,
    rigId: body.rigId,
    buildProfileId: profile,
    stage: 'candidate',
    layers: [
      { layerSetId: bodyLayerId, z: 0, required: true },
      { layerSetId: faceLayerId, z: 1, required: false, socketId: 'Socket_Head' },
    ],
  });
  validate(m);
  return {
    manifest: m,
    snapshots: p.snapshots,
    records: [body.approvalRecord, s.approvalRecord],
    subjects: [
      { kind: 'appearance', id: bodyId },
      { kind: 'appearance', id: baseId },
      { kind: 'appearance', id: faceId },
      { kind: 'layer-set', id: bodyLayerId },
      { kind: 'layer-set', id: faceLayerId },
      { kind: 'recipe', id: appearance.recipeId },
    ],
  };
}

export function mergeIcons(repo: string, manifest: Json, record: string): Intake {
  const metadata = meta(repo, record),
    packetPath = `${metadata.packet}/review.json`;
  const packet = read(repo, packetPath);
  approved(repo, record, 'icons:items', metadata.packet, packet.sourceDigest, ['icons', 'items']);
  if (
    packet.asset !== 'icons:items' ||
    reviewDigest(packet) !== packet.sourceDigest ||
    packet.status !== 'candidate' ||
    packet.qa.some((q: Json) => !q.pass)
  )
    throw new Error('Invalid icon packet');
  const rows = packet.icons.map((i: Json) => ({ ...i, file: `ui/icons/items/${i.item}.png` }));
  if (new Set(rows.map((i: Json) => i.item)).size !== rows.length)
    throw new Error('Duplicate item icon');
  verifyFrames(repo, rows);
  for (const i of packet.icons)
    if (
      (!ITEMS[i.item as keyof typeof ITEMS] && i.item !== 'garment') ||
      sha(repo, `${metadata.packet}/${i.file}`) !== i.sha256 ||
      i.size.w !== 32 ||
      i.size.h !== 32
    )
      throw new Error('Unknown item or changed packet icon');
  const m = structuredClone(manifest),
    subjects: Intake['subjects'] = [];
  const p = provenance(repo, 'inventory-icons', rows, packetPath, [record], {
    asset: 'icons:items',
    scope: 'icons',
    packetDigest: packet.sourceDigest,
  });
  put(m, 'authoringProvenance', p.record);
  const bindings = rows.flatMap((i: Json) =>
    i.item === 'garment'
      ? Object.values(ITEMS)
          .filter((item) => item.garment)
          .map((item) => ({ ...i, item: item.id, frameKey: 'garment' }))
      : [{ ...i, frameKey: i.item }],
  );
  for (const i of bindings) {
    const id = `item:${i.item}`,
      frameId = `inventory_${i.frameKey.replaceAll('-', '_')}`;
    const old = m.appearances.find((a: Json) => a.id === id);
    if (old?.clipIds.length || old?.recipeId)
      throw new Error(`Refusing to replace composed item: ${id}`);
    put(m, 'frames', {
      id: frameId,
      path: i.file,
      sourceSize: { w: 32, h: 32 },
      anchorPx: { x: 16, y: 16 },
      stage: 'candidate',
    });
    put(m, 'appearances', {
      id,
      kind: 'item',
      contentId: i.item,
      quality: 'hd',
      clipIds: [],
      frameId,
      stage: 'candidate',
      provenanceId: p.record.id,
    });
    subjects.push({ kind: 'appearance', id });
  }
  validate(m);
  return { manifest: m, subjects, records: [record], snapshots: p.snapshots };
}

export function approvalEntries(repo: string, intake: Intake, catalog: Json): Json[] {
  const records = intake.records.map((record) => ({ record, meta: meta(repo, record) }));
  return intake.subjects.map(({ kind, id }) => {
    const digest = catalog.sourceDigests?.find(
      (d: Json) => d.subjectKind === kind && d.subjectId === id,
    )?.digest;
    if (!digest) throw new Error(`Build the integrated assets before ledger: ${id}`);
    const subject = { kind: kind as Parameters<typeof sourceSubjectDependencies>[1], id };
    const deps = sourceSubjectDependencies(
      intake.manifest as ReturnType<typeof SourceManifestSchema.parse>,
      subject.kind,
      id,
    );
    const files = deps.paths.map((path) => ({ path, sha256: sha(repo, `art/source/${path}`) }));
    const current = hash(
      canonicalSourceJson({ contractVersion: 2, subject, metadata: deps.metadata, files }),
    );
    if (current !== digest) throw new Error(`Catalog digest is stale: ${id}`);
    const metadata = records.at(-1)!.meta;
    return {
      id: `intake-${kind}-${id.replaceAll(':', '-')}`,
      subjectKind: kind,
      subjectId: id,
      sourceDigest: digest,
      decision: 'approved',
      approvedBy: metadata.recordedBy ?? 'director',
      approvedAt: `${metadata.date}T00:00:00Z`,
      notes: `Verified approved exports and body binding. Records: ${records.map((r) => r.record).join(', ')}. No approval of regenerated art.`,
    };
  });
}

/** Supersession withdraws an old ledger grant; it is not a new rejection decision. */
export function reconcileLedger(repo: string, ledger: Json): { ledger: Json; withdrawn: string[] } {
  const withdrawn: string[] = [];
  const records = ledger.records.filter((r: Json) => {
    if (r.decision !== 'approved') return true;
    const paths: string[] =
      r.notes?.match(/docs\/team\/comms\/director\/approvals\/[A-Za-z0-9_-]+\.md/g) ?? [];
    if (
      paths.some((path) => {
        const metadata = meta(repo, path);
        return metadata.decision !== 'director-approved' || !!metadata['superseded-by'];
      })
    ) {
      withdrawn.push(r.id);
      return false;
    }
    return true;
  });
  return { ledger: { ...ledger, records }, withdrawn };
}
