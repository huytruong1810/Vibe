import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';

const git = (...args: string[]): string =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const sha = git('rev-parse', 'HEAD');
let previous: string | undefined;
try {
  const response = await fetch('https://huytruong1810.github.io/Vibe/beta-notes.json', {
    signal: AbortSignal.timeout(5000),
    cache: 'no-cache',
  });
  if (response.ok) {
    const notes: unknown = await response.json();
    if (
      notes &&
      typeof notes === 'object' &&
      'sha' in notes &&
      typeof notes.sha === 'string' &&
      /^[a-f0-9]{40}$/.test(notes.sha)
    ) {
      git('merge-base', '--is-ancestor', notes.sha, sha);
      previous = notes.sha;
    }
  }
} catch {
  /* First deployment or unavailable previous site: show the latest ten subjects. */
}
const subjects = git('log', '--format=%s', ...(previous ? [`${previous}..${sha}`] : ['-10', sha]))
  .split('\n')
  .filter(Boolean)
  .slice(0, 100);
await mkdir('public', { recursive: true });
await writeFile(
  'public/beta-notes.json',
  JSON.stringify({ sha, previous: previous ?? null, subjects }, null, 2) + '\n',
);
console.log(`Beta notes: ${subjects.length} subjects for ${sha}`);
