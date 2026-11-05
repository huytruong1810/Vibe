import { readFile, mkdir, copyFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

export const BAR_PARTS = {
  hp: { width: 168, height: 18, segment: 16 },
  stamina: { width: 168, height: 18, segment: 16 },
  xp: { width: 168, height: 12, segment: 2 },
  need: { width: 32, height: 12, segment: 2 },
} as const;

/** Lossless compilation of authored pixels, not a repaint of the kit. */
export async function compileBarStrip(
  bytes: Buffer,
  kind: keyof typeof BAR_PARTS,
): Promise<Buffer> {
  const part = BAR_PARTS[kind],
    meta = await sharp(bytes).metadata();
  if (meta.width !== part.width || meta.height !== part.height)
    throw new Error(`Unexpected ${kind} bar dimensions`);
  return sharp(bytes)
    .extract({ left: 4, top: 4, width: part.segment, height: part.height - 8 })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Compile the tracked kit, never redraw it. Runs explicitly and from assets:build. */
export async function buildUi(): Promise<void> {
  const root = resolve(import.meta.dirname, '..');
  const output = join(root, 'public/assets/generated/ui');
  await mkdir(output, { recursive: true });
  const source = join(root, 'art/source/ui');
  const theme = JSON.parse(
    await readFile(join(root, 'art/source/forge/spec/ui_theme.json'), 'utf8'),
  );
  const palette = JSON.parse(
    await readFile(join(root, 'art/source/forge/spec/palette.json'), 'utf8'),
  );
  const variables = Object.entries(theme.colorTokens).map(([name, value]) => {
    const [ramp, step = 'mid'] = String(value).split('.');
    const color = palette.ramps[ramp!]?.steps[step];
    if (!/^#[\da-f]{6}$/i.test(color ?? '')) throw new Error(`Unknown UI token ${value}`);
    return `--ui-${name}: ${color};`;
  });
  await writeFile(
    join(output, 'tokens.css'),
    `/* Generated from ui_theme.json and palette.json. */\n:root {\n${variables.join('\n')}\n}\n`,
  );
  const font = join(source, 'fonts/Silver.ttf');
  await copyFile(font, join(output, 'Silver-full.ttf'));
  await copyFile(join(source, 'fonts/LICENSE.md'), join(output, 'LICENSE.md'));
  const uvArgs = [
    'run',
    '--project',
    join(root, 'art/source/forge'),
    'python',
    join(root, 'art/source/forge/tools/subset_font.py'),
    font,
    join(output, 'Silver-core.woff2'),
  ];
  // Prefer a standalone uv (machine A has no `python` binary); fall back to the pip module.
  const standalone = process.env.PYTHON ? null : spawnSync('uv', uvArgs, { stdio: 'inherit' });
  const result =
    standalone && !standalone.error
      ? standalone
      : spawnSync(process.env.PYTHON ?? 'python', ['-m', 'uv', ...uvArgs], { stdio: 'inherit' });
  if (result.status !== 0)
    throw new Error('Font subset failed; install uv with python -m pip install uv==0.13.6.');
  const files = (await readdir(join(source, 'kit/export')))
    .filter((f) => f.endsWith('.png'))
    .sort();
  for (const file of files) await copyFile(join(source, 'kit/export', file), join(output, file));
  // These icons accompany the approved B18 UI packet; gameplay atlas intake remains M25.
  const artifactPacket = join(root, 'art/review/2026-11-05-ui-authored-artifacts');
  const artifactReview = JSON.parse(await readFile(join(artifactPacket, 'review.json'), 'utf8'));
  const approval = await readFile(
    join(
      root,
      'docs/team/comms/director/approvals/ui-authored-artifacts--2026-11-05-ui-authored-artifacts.md',
    ),
    'utf8',
  );
  const contactDigest = createHash('sha256')
    .update(await readFile(join(artifactPacket, 'contact.png')))
    .digest('hex');
  if (
    !/^decision: director-approved\s*$/m.test(approval) ||
    /^superseded-by:/m.test(approval) ||
    !approval.includes(`packetDigest: ${contactDigest}`) ||
    artifactReview.sourceDigest !== contactDigest
  )
    throw new Error('Authored artifact UI approval does not match its packet');
  for (const name of [
    'frame_book_spread',
    'frame_note_page',
    'icon_page_prev',
    'icon_page_next',
    'seal_stamp',
    'frame_painting_wall',
    'frame_painting_preview',
    'easel_cloth',
  ]) {
    const record = artifactReview.frames.find((frame: { id: string }) => frame.id === name);
    const bytes = await readFile(join(source, 'kit', `${name}.png`));
    const packetBytes = await readFile(join(artifactPacket, `frames/${name}.png`));
    if (
      !record ||
      createHash('sha256').update(bytes).digest('hex') !== record.sha256 ||
      !bytes.equals(packetBytes)
    )
      throw new Error(`Authored artifact UI frame differs from its approved packet: ${name}`);
    const expected = await sharp(bytes)
      .resize(record.width * 2, record.height * 2, { kernel: 'nearest' })
      .raw()
      .toBuffer();
    const exported = await sharp(join(source, 'kit/export', `${name}.png`))
      .raw()
      .toBuffer();
    if (!exported.equals(expected))
      throw new Error(`Authored artifact UI export is not the approved 2x pixels: ${name}`);
  }
  for (const name of [
    'note-blank',
    'note-written',
    'book-blank',
    'book-written',
    'canvas-blank',
    'canvas-painted',
  ]) {
    const record = artifactReview.frames.find(
      (frame: { id: string }) => frame.id === `icon_${name}`,
    );
    const bytes = await readFile(join(source, 'icons/items', `${name}.png`));
    const packetBytes = await readFile(join(artifactPacket, `frames/icon_${name}.png`));
    if (
      !record ||
      createHash('sha256').update(bytes).digest('hex') !== record.sha256 ||
      !bytes.equals(packetBytes)
    )
      throw new Error(`Authored artifact UI icon differs from its approved packet: ${name}`);
    const file = `artifact-${name}.png`;
    await writeFile(join(output, file), bytes);
    files.push(file);
  }
  files.sort();
  const digest = async (file: string) =>
    createHash('sha256')
      .update(await readFile(file))
      .digest('hex');
  const derivatives = [];
  for (const kind of Object.keys(BAR_PARTS) as (keyof typeof BAR_PARTS)[]) {
    const file = `bar_${kind}_fill.png`,
      sourceFile = join(source, 'kit/export', `bar_${kind}.png`);
    await writeFile(join(output, file), await compileBarStrip(await readFile(sourceFile), kind));
    derivatives.push({
      file,
      source: `bar_${kind}.png`,
      sourceSha256: await digest(sourceFile),
      sha256: await digest(join(output, file)),
      width: BAR_PARTS[kind].segment,
      height: BAR_PARTS[kind].height - 8,
    });
  }
  await writeFile(
    join(output, 'build.json'),
    JSON.stringify(
      {
        schemaVersion: 2,
        fontTools: '4.61.1',
        fontSha256: await digest(font),
        subsetSha256: await digest(join(output, 'Silver-core.woff2')),
        files,
        derivatives,
      },
      null,
      2,
    ) + '\n',
  );
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) await buildUi();
