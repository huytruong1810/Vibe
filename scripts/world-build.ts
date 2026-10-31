import { readFile, mkdir, open, rename, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { canonical, compileWorld, digest } from './lib/world-compiler';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = 'art/source/world/hearthwild.ldtk';
const importerSources = [
  'scripts/world-build.ts',
  'scripts/lib/world-compiler.ts',
  'src/domain/authored-world.ts',
  'src/domain/world.ts',
  'src/domain/values.ts',
  'src/content/definitions.ts',
  'package-lock.json',
  'art/source/forge/uv.lock',
  'art/source/world/tools/worldforge.py',
  'art/source/world/tools/worldlib/cli.py',
  'art/source/world/tools/worldlib/project.py',
  'art/source/world/tools/worldlib/checks.py',
  'art/source/world/tools/worldlib/semantics.py',
  'art/source/world/tools/worldlib/passes.py',
  'art/source/world/tools/worldlib/review.py',
];

/** Same-directory replacement; a rejected compile never opens the destination. */
export async function writeCompiledWorld(path: string, bytes: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    const handle = await open(temporary, 'wx');
    try {
      await handle.writeFile(bytes, 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function buildWorld(options: {
  region: string;
  level?: string;
  check?: boolean;
}): Promise<string> {
  if (options.region !== 'aqualia')
    throw new Error('Only the protected Aqualia region is authored');
  const planPath = resolve(root, `art/source/world/regions/${options.region}.plan.json`);
  const before = await Promise.all([
    readFile(resolve(root, source), 'utf8'),
    readFile(planPath, 'utf8'),
  ]);
  const args = [
    '-m',
    'uv',
    'run',
    '--project',
    'art/source/forge',
    'python',
    '-B',
    'art/source/world/tools/worldforge.py',
    'check',
    '--region',
    options.region,
  ];
  if (options.level) args.push('--level', options.level);
  const qa = spawnSync('python', args, {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 4 * 1024 * 1024,
    timeout: 120000,
  });
  if (qa.error || qa.status !== 0)
    throw new Error(`Worldforge validation failed: ${qa.error?.message ?? qa.stderr + qa.stdout}`);
  const [project, plan, dependencies] = await Promise.all([
    readFile(resolve(root, source), 'utf8'),
    readFile(planPath, 'utf8'),
    Promise.all(
      importerSources.map(async (name) => [
        name,
        (await readFile(resolve(root, name), 'utf8')).replaceAll('\r\n', '\n'),
      ]),
    ),
  ]);
  if (project !== before[0] || plan !== before[1])
    throw new Error('Source changed during worldforge validation; retry');
  const compiled = compileWorld(JSON.parse(project), {
    ...options,
    planDigest: digest(JSON.parse(plan)),
    importerDigest: digest(Object.fromEntries(dependencies)),
  });
  const output = resolve(
    root,
    'art/source/world/work/import',
    `${options.region}-${options.level ?? 'region'}.json`,
  );
  const bytes = canonical(compiled);
  if (!options.check) await writeCompiledWorld(output, bytes);
  console.log(
    `Candidate ${compiled.scope}: ${compiled.levels.length} level(s), ${compiled.entities.length} placements; excluded=${compiled.excludedLevels.join(',') || 'none'}; ${options.check ? 'validated without output' : output}`,
  );
  return bytes;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({
    options: {
      region: { type: 'string', default: 'aqualia' },
      level: { type: 'string' },
      check: { type: 'boolean', default: false },
    },
  });
  buildWorld({ region: values.region!, level: values.level, check: values.check }).catch(
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    },
  );
}
