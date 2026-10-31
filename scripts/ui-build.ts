import { readFile, mkdir, copyFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

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
  const python = process.env.PYTHON ?? 'python';
  const result = spawnSync(
    python,
    [
      '-m',
      'uv',
      'run',
      '--project',
      join(root, 'art/source/forge'),
      'python',
      join(root, 'art/source/forge/tools/subset_font.py'),
      font,
      join(output, 'Silver-core.woff2'),
    ],
    { stdio: 'inherit' },
  );
  if (result.status !== 0)
    throw new Error('Font subset failed; install uv with python -m pip install uv==0.13.6.');
  const files = (await readdir(join(source, 'kit/export')))
    .filter((f) => f.endsWith('.png'))
    .sort();
  for (const file of files) await copyFile(join(source, 'kit/export', file), join(output, file));
  const digest = async (file: string) =>
    createHash('sha256')
      .update(await readFile(file))
      .digest('hex');
  await writeFile(
    join(output, 'build.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        fontTools: '4.61.1',
        fontSha256: await digest(font),
        subsetSha256: await digest(join(output, 'Silver-core.woff2')),
        files,
      },
      null,
      2,
    ) + '\n',
  );
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) await buildUi();
