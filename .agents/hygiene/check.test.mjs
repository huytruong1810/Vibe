// Run: node --test .agents/hygiene/check.test.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { checkWorkspace } from './check.mjs';

function repo(files) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'hw-hyg-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  for (const [p, c] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, p)), { recursive: true });
    writeFileSync(path.join(root, p), c);
  }
  execFileSync('git', ['add', '-A'], { cwd: root });
  return root;
}

const base = {
  'README.md': '[docs](docs/README.md)',
  'docs/README.md': '[a](art/a.md)',
  'docs/art/a.md': 'linked',
  'package.json': '{"scripts":{"x":"tsx scripts/used.ts"}}',
  'scripts/used.ts': 'export {}',
};

test('clean fixture passes', () => {
  assert.deepEqual(checkWorkspace({ root: repo(base), mode: 'ci' }).errors, []);
});

test('orphan docs, unused tools, litter names and new top-level entries fail', () => {
  const root = repo({
    ...base,
    'docs/art/stale.md': 'nobody links me',
    'scripts/forgotten.ts': 'export {}',
    'art/source/tools/helper.py': 'print(1)',
    'docs/art/a-final.md': 'copy',
    'output/x.txt': 'x',
  });
  const rules = checkWorkspace({ root, mode: 'ci' }).errors.map((e) => `${e.rule}:${e.path}`);
  for (const want of [
    'orphan-doc:docs/art/stale.md',
    'unused-tool:scripts/forgotten.ts',
    'unused-tool:art/source/tools/helper.py',
    'litter-name:docs/art/a-final.md',
    'root-allowlist:output/x.txt',
  ]) {
    assert.ok(rules.includes(want), `${want} in ${rules.join(', ')}`);
  }
});

test('comms and proposals are exempt from the orphan check', () => {
  const root = repo({ ...base, 'docs/team/comms/blender/2026-11-01T1000--to-all--x.md': 'msg' });
  assert.deepEqual(checkWorkspace({ root, mode: 'ci' }).errors, []);
});

test('working mode flags untracked litter; ci mode ignores untracked files', () => {
  const root = repo(base);
  writeFileSync(path.join(root, 'docs/art/notes.bak'), 'x');
  assert.ok(
    checkWorkspace({ root, mode: 'working' }).errors.some((e) => e.path === 'docs/art/notes.bak'),
  );
  assert.deepEqual(checkWorkspace({ root, mode: 'ci' }).errors, []);
});
