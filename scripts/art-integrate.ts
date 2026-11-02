/**
 * Integrate a director-approved, published forge body into the game (the steps Claude did by
 * hand for Rivallie, Bramblefang, Marshstalker and Mireling).
 *
 *   npm run art:integrate -- merge  <asset> [--appearance species:<id>|npc:<id>]   (communicator, TEAM-2a)
 *   npm run assets:build
 *   npm run art:integrate -- ledger <asset>                                           (codex)
 *   npm run assets:build && npm run check:assets
 *
 * merge: reads art/source/staging/blender/<asset>.json, replaces that appearance's rows in
 * art/source/manifest.json (legacy rows included), normalizes frame ids (`:` -> `_`), adds the
 * rig if the manifest lacks it (derived from the frames: most common canvas is the default,
 * the rest are C3e registrations), and validates the result with SourceManifestSchema.
 * ledger: checks the approval record is director-approved for the staged packet digest and
 * that every manifest frame is byte-identical to the staged export, then writes the ledger
 * entry bound to the catalog's current source digest for that appearance.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { format, resolveConfig } from 'prettier';
import { SPECIES } from '../src/content/definitions';
import { SourceManifestSchema } from '../src/presentation/assets/source';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const read = (p: string): Json => JSON.parse(readFileSync(p, 'utf8'));
const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const fail = (m: string): never => {
  console.error(`art:integrate: ${m}`);
  process.exit(1);
};
const [command, asset, ...rest] = process.argv.slice(2);
if (!['merge', 'ledger'].includes(command ?? '') || !asset)
  fail('usage: merge|ledger <asset> [--appearance species:<id>|npc:<id>]');
const flag = rest.indexOf('--appearance');
const appearanceId =
  flag >= 0
    ? rest[flag + 1]!
    : SPECIES.some((s) => s.id === asset)
      ? `species:${asset}`
      : fail(
          `${asset} is not a species; pass --appearance npc:<id> (modular humans need recipes, C9b)`,
        );
const [kind, contentId] = appearanceId.split(':') as [string, string];
const stagingPath = `art/source/staging/blender/${asset}.json`;
const staging = read(stagingPath);
const MANIFEST = 'art/source/manifest.json';

async function writeJson(path: string, value: unknown) {
  writeFileSync(
    path,
    await format(JSON.stringify(value, null, 2), {
      ...(await resolveConfig(path)),
      parser: 'json',
      filepath: path,
    }),
  );
}

async function merge() {
  const m = read(MANIFEST);
  const nid = (id: string) => id.replaceAll(':', '_');
  const old = m.appearances.find((a: Json) => a.id === appearanceId);
  const oldClips = new Set<string>(old?.clipIds ?? []);
  const oldFrames = new Set<string>(
    m.clips.filter((c: Json) => oldClips.has(c.id)).flatMap((c: Json) => c.frameIds),
  );
  m.frames = m.frames.filter((f: Json) => !oldFrames.has(f.id));
  m.clips = m.clips.filter((c: Json) => !oldClips.has(c.id));
  const frames = staging.frames.map((f: Json) => ({
    id: nid(f.id),
    path: f.file,
    sourceSize: f.sourceSize,
    anchorPx: f.anchorPx,
    rigId: f.rigId,
    sockets: f.sockets,
    ...(f.held ? { held: f.held } : {}),
    stage: 'candidate',
  }));
  // spread keeps the staged (sorted) key order; overriding keys keep their position
  const clips = staging.clips.map((c: Json) => ({
    ...c,
    appearanceId,
    frameIds: c.frameIds.map(nid),
  }));
  m.frames.push(...frames);
  m.clips.push(...clips);
  const appearance = {
    id: appearanceId,
    kind,
    contentId,
    quality: 'hd',
    stage: 'candidate',
    clipIds: clips.map((c: Json) => c.id),
    provenanceId: staging.authoringProvenance.id,
  };
  m.appearances = old
    ? m.appearances.map((a: Json) => (a.id === appearanceId ? appearance : a))
    : [...m.appearances, appearance];
  m.authoringProvenance = [
    ...m.authoringProvenance.filter((p: Json) => p.id !== staging.authoringProvenance.id),
    staging.authoringProvenance,
  ];
  if (!m.rigs.some((r: Json) => r.id === staging.rigId)) {
    const key = (f: Json) => `${f.sourceSize.w}x${f.sourceSize.h}@${f.anchorPx.x},${f.anchorPx.y}`;
    const counts = new Map<string, Json>();
    for (const f of frames) {
      const e = counts.get(key(f)) ?? { n: 0, f };
      e.n++;
      counts.set(key(f), e);
    }
    const [main, ...others] = [...counts.values()].sort((a, b) => b.n - a.n);
    const reg = (f: Json) => ({ canvas: f.sourceSize, anchorPx: f.anchorPx });
    m.rigs.push({
      id: staging.rigId,
      ...reg(main!.f),
      socketIds: [...new Set(frames.flatMap((f: Json) => Object.keys(f.sockets ?? {})))].sort(),
      ...(others.length ? { registrations: others.map((o) => reg(o.f)) } : {}),
    });
    console.log(`added rig ${staging.rigId} (${others.length} extra registrations)`);
  }
  const parsed = SourceManifestSchema.safeParse(m);
  if (!parsed.success)
    fail(
      `merged manifest is invalid:\n${parsed.error.issues
        .slice(0, 8)
        .map((i) => `- ${i.message}`)
        .join('\n')}`,
    );
  await writeJson(MANIFEST, m);
  console.log(
    `merged ${appearanceId}: ${frames.length} frames, ${clips.length} clips (removed ${oldFrames.size} old frames). Next: npm run assets:build`,
  );
}

async function ledger() {
  const record = readFileSync(staging.approvalRecord, 'utf8');
  if (sha(staging.approvalRecord) !== staging.approvalSha256)
    fail(`${staging.approvalRecord} changed since publish (approvalSha256)`);
  const meta = Object.fromEntries(
    record
      .split('---')[1]!
      .trim()
      .split('\n')
      .map((l) => l.split(/:(.*)/s).map((s) => s.trim())),
  );
  if (meta.decision !== 'director-approved' || meta.packetDigest !== staging.packetDigest)
    fail('the approval record is not director-approved for the staged packet digest');
  const m = read(MANIFEST);
  const appearance = m.appearances.find((a: Json) => a.id === appearanceId);
  if (!appearance) fail(`${appearanceId} is not in the manifest: run merge first`);
  const byId = new Map(staging.frames.map((f: Json) => [f.id.replaceAll(':', '_'), f]));
  const clipFrames = m.clips
    .filter((c: Json) => appearance.clipIds.includes(c.id))
    .flatMap((c: Json) => c.frameIds);
  for (const id of clipFrames) {
    const f = m.frames.find((x: Json) => x.id === id);
    const s = byId.get(id) as Json | undefined;
    if (!f || !s || sha(`art/source/${f.path}`) !== s.sha256)
      fail(`frame ${id} is not byte-identical to the staged export`);
  }
  const catalog = read('public/assets/generated/catalog.json');
  const digest = catalog.sourceDigests?.find(
    (d: Json) => d.subjectKind === 'appearance' && d.subjectId === appearanceId,
  )?.digest;
  if (!digest) fail('no catalog source digest: run npm run assets:build after merge');
  const path = 'docs/art/approvals.json';
  const ledger = read(path);
  const id = `${appearanceId.replace(':', '-')}-body`;
  const entry = {
    id,
    subjectKind: 'appearance',
    subjectId: appearanceId,
    sourceDigest: digest,
    decision: 'approved',
    approvedBy: meta.recordedBy?.startsWith('claude')
      ? meta.recordedBy
      : 'director (recorded in docs/team/comms/director/approvals)',
    approvedAt: `${meta.date}T00:00:00Z`,
    notes: `Body and clips only. Record ${staging.approvalRecord} binds forge packet ${staging.packetDigest}; all ${clipFrames.length} manifest frames verified byte-identical to the staged export by npm run art:integrate.`,
  };
  ledger.records = [
    ...ledger.records.filter(
      (r: Json) => r.id !== id && !(r.subjectId === appearanceId && r.sourceDigest === digest),
    ),
    entry,
  ];
  await writeJson(path, ledger);
  console.log(
    `ledger ${id} -> ${digest.slice(0, 12)}. Next: npm run assets:build && npm run check:assets`,
  );
}

await (command === 'merge' ? merge() : ledger());
