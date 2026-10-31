// Run: node --test .agents/hooks/test/
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, appendFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const HOOKS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fixtureRepo() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'hw-hooks-'));
  execFileSync('git', ['init', '-q'], { cwd: root });
  mkdirSync(path.join(root, 'docs/doctrine'), { recursive: true });
  writeFileSync(path.join(root, 'docs/doctrine/03-art-bible.md'), '# art\n');
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init'], {
    cwd: root,
  });
  return { root, state: mkdtempSync(path.join(os.tmpdir(), 'hw-state-')) };
}

function run(hook, payload, { root, state }, role, args = []) {
  const env = { ...process.env, HEARTHWILD_REPO_ROOT: root, HEARTHWILD_STATE_DIR: state };
  delete env.HEARTHWILD_ROLE;
  if (role) env.HEARTHWILD_ROLE = role;
  const r = spawnSync('node', [path.join(HOOKS, hook), ...args], {
    input: JSON.stringify(payload),
    env,
    encoding: 'utf8',
  });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout ? JSON.parse(r.stdout) : {};
}

const write = (p, content = 'hello') => ({
  toolCall: { name: 'write_file', args: { Path: p, Content: content } },
});
const edit = (p) => ({
  toolCall: { name: 'edit_file', args: { Path: `"${p}"`, Target: 'a', Replacement: 'b' } },
});
const cmd = (c) => ({ toolCall: { name: 'run_command', args: { CommandLine: c } } });

test('doctrine writes are denied for every role, absolute or relative, quoted or not', () => {
  const fx = fixtureRepo();
  for (const role of ['blender', 'communicator']) {
    assert.equal(
      run('guard.mjs', write('docs/doctrine/03-art-bible.md'), fx, role).decision,
      'deny',
    );
    assert.equal(
      run('guard.mjs', edit(path.join(fx.root, 'docs/doctrine/03-art-bible.md')), fx, role)
        .decision,
      'deny',
    );
    for (const p of [
      'AGENTS.md',
      'art/source/AGENTS.md',
      '.agents/hooks.json',
      'art/source/forge/spec/palette.json',
      'docs/team/briefs/blender.md',
    ]) {
      const out = run('guard.mjs', write(p), fx, role);
      assert.equal(out.decision, 'deny', `${role} ${p}`);
      assert.match(out.reason, /DOC-1/);
    }
  }
});

test('own comms folder allowed, other comms and director approvals denied', () => {
  const fx = fixtureRepo();
  assert.equal(
    run('guard.mjs', write('docs/team/comms/blender/2026-11-01T1200--to-all--hi.md'), fx, 'blender')
      .decision,
    'allow',
  );
  assert.equal(
    run('guard.mjs', write('docs/team/comms/codex/x.md'), fx, 'blender').decision,
    'deny',
  );
  assert.equal(
    run(
      'guard.mjs',
      write('docs/team/comms/director/approvals/npc-neris--p1.md'),
      fx,
      'communicator',
    ).decision,
    'deny',
  );
  assert.equal(
    run('guard.mjs', write('docs/team/comms/communicator/image-ledger.md'), fx, 'communicator')
      .decision,
    'allow',
  );
});

test('lanes: blender cannot touch src or exports directly; communicator can edit UI view', () => {
  const fx = fixtureRepo();
  assert.equal(
    run('guard.mjs', write('src/presentation/gallery.ts'), fx, 'blender').decision,
    'deny',
  );
  assert.match(
    run('guard.mjs', write('art/source/exports/npcs/neris/idle_s_0.png'), fx, 'blender').reason,
    /publish/,
  );
  assert.equal(
    run('guard.mjs', write('art/source/forge/recipes/npc-neris.json'), fx, 'blender').decision,
    'allow',
  );
  assert.equal(
    run('guard.mjs', write('art/source/forge/stages/bake.py'), fx, 'blender').decision,
    'deny',
  );
  assert.equal(
    run('guard.mjs', write('src/presentation/ui/hud.css'), fx, 'communicator').decision,
    'allow',
  );
  assert.equal(
    run('guard.mjs', write('src/domain/creatures.ts'), fx, 'communicator').decision,
    'deny',
  );
});

test('writes outside the repo are allowed (agent artifacts and scratch)', () => {
  const fx = fixtureRepo();
  assert.equal(
    run('guard.mjs', write(path.join(os.tmpdir(), 'scratch.md')), fx, 'blender').decision,
    'allow',
  );
});

test('no role set: repo writes blocked, set-role allowed', () => {
  const fx = fixtureRepo();
  assert.match(run('guard.mjs', write('art/review/x.md'), fx, null).reason, /set-role/);
  assert.equal(
    run('guard.mjs', cmd('node .agents/hooks/set-role.mjs blender'), fx, null).decision,
    'allow',
  );
});

test('banned superlatives are blocked in docs and commit messages', () => {
  const fx = fixtureRepo();
  assert.equal(
    run(
      'guard.mjs',
      write('docs/team/comms/blender/m.md', 'Delivered AAA-grade sprites'),
      fx,
      'blender',
    ).decision,
    'deny',
  );
  assert.equal(
    run(
      'guard.mjs',
      write('docs/team/comms/blender/m.md', 'Silhouette reads at 1x; QA pass'),
      fx,
      'blender',
    ).decision,
    'allow',
  );
  assert.equal(
    run('guard.mjs', cmd('git commit -m "feat(art): stellar new cast"'), fx, 'blender').decision,
    'deny',
  );
  assert.equal(
    run('guard.mjs', cmd('git commit -m "feat(art): add neris idle candidate"'), fx, 'blender')
      .decision,
    'allow',
  );
});

test('destructive git and shell writes to doctrine are denied; reads allowed', () => {
  const fx = fixtureRepo();
  for (const c of [
    'git push --force origin art/hd-aqualia-slice',
    'git push -f',
    'git commit --no-verify -m x',
    'git reset --hard HEAD~1',
    "sed -i 's/30/45/' docs/doctrine/03-art-bible.md",
    'echo x >> docs/doctrine/03-art-bible.md',
    'rm AGENTS.md',
    'Set-Content -Path docs\\doctrine\\README.md -Value x',
    'cp /tmp/x art/source/forge/spec/render_spec.json',
  ]) {
    assert.equal(run('guard.mjs', cmd(c), fx, 'blender').decision, 'deny', c);
  }
  for (const c of [
    'cat docs/doctrine/03-art-bible.md',
    'grep -n ART-4 docs/doctrine/*.md 2>/dev/null',
    'git push origin art/hd-aqualia-slice',
    'git status',
  ]) {
    assert.equal(run('guard.mjs', cmd(c), fx, 'blender').decision, 'allow', c);
  }
});

test('inject: card at session start, full card again only after a new compaction', () => {
  const fx = fixtureRepo();
  const transcript = path.join(fx.root, 'transcript.jsonl');
  writeFileSync(transcript, '{"type": "USER_INPUT"}\n');
  const base = { conversationId: 'c1', transcriptPath: transcript };
  const start = run('inject.mjs', base, fx, 'blender', ['session']);
  assert.match(start.injectSteps[0].systemMessage.systemMessage, /role card: BLENDER/);
  assert.deepEqual(run('inject.mjs', base, fx, 'blender', ['invocation']), {});
  appendFileSync(transcript, '{"step_index": 9, "type": "CHECKPOINT", "content": "# Resuming"}\n');
  const after = run('inject.mjs', base, fx, 'blender', ['invocation']);
  assert.match(after.injectSteps[0].systemMessage.systemMessage, /compacted/);
  assert.deepEqual(run('inject.mjs', base, fx, 'blender', ['invocation']), {});
});

test('inject: periodic ephemeral reminder', () => {
  const fx = fixtureRepo();
  const base = { conversationId: 'c2' };
  let reminders = 0;
  for (let i = 0; i < 50; i++)
    if (run('inject.mjs', base, fx, 'communicator', ['invocation']).injectSteps) reminders++;
  assert.equal(reminders, 2);
});

test('track + stop: unviewed contact sheet blocks once; viewing it clears the block', () => {
  const fx = fixtureRepo();
  const dir = path.join(fx.root, 'art/source/forge/work/rivallie');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'contact.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]));
  run('inject.mjs', { conversationId: 'c3' }, fx, 'blender', ['session']);
  const stop1 = run(
    'stop.mjs',
    { conversationId: 'c3', terminationReason: 'NO_TOOL_CALL' },
    fx,
    'blender',
  );
  assert.equal(stop1.decision, 'continue');
  assert.match(stop1.reason, /contact sheet for rivallie/);
  run(
    'track.mjs',
    {
      conversationId: 'c3',
      toolCall: { name: 'read_file', args: { Path: path.join(dir, 'contact.png') } },
    },
    fx,
    'blender',
  );
  const stop2 = run(
    'stop.mjs',
    { conversationId: 'c3', terminationReason: 'NO_TOOL_CALL' },
    fx,
    'blender',
  );
  assert.notEqual(stop2.decision, 'continue');
});

test('stop: out-of-lane change since session start is flagged; pre-existing changes are not', () => {
  const fx = fixtureRepo();
  mkdirSync(path.join(fx.root, 'src'), { recursive: true });
  writeFileSync(path.join(fx.root, 'src/preexisting.ts'), 'x');
  run('inject.mjs', { conversationId: 'c4' }, fx, 'blender', ['session']);
  writeFileSync(path.join(fx.root, 'src/new.ts'), 'x');
  const out = run(
    'stop.mjs',
    { conversationId: 'c4', terminationReason: 'NO_TOOL_CALL' },
    fx,
    'blender',
  );
  assert.equal(out.decision, 'continue');
  assert.match(out.reason, /src\/new\.ts/);
  assert.doesNotMatch(out.reason, /preexisting/);
  assert.notEqual(
    run('stop.mjs', { conversationId: 'c4', terminationReason: 'NO_TOOL_CALL' }, fx, 'blender')
      .decision,
    'continue',
  );
});

test('stop: report must carry Changed/Evidence/Gaps when files changed', () => {
  const fx = fixtureRepo();
  run('inject.mjs', { conversationId: 'c5' }, fx, 'blender', ['session']);
  mkdirSync(path.join(fx.root, 'docs/team/comms/blender'), { recursive: true });
  writeFileSync(path.join(fx.root, 'docs/team/comms/blender/note.md'), 'x');
  const transcript = path.join(fx.root, 't.jsonl');
  writeFileSync(
    transcript,
    JSON.stringify({ type: 'PLANNER_RESPONSE', content: 'All done!' }) + '\n',
  );
  const out = run(
    'stop.mjs',
    { conversationId: 'c5', terminationReason: 'NO_TOOL_CALL', transcriptPath: transcript },
    fx,
    'blender',
  );
  assert.match(out.reason, /Changed, Evidence, Gaps/);
});

test('guard blocks litter names and new top-level entries, allows normal deliverables', () => {
  const fx = fixtureRepo();
  for (const p of [
    'art/review/temp_render.png',
    'output/frame.png',
    'docs/team/comms/blender/notes-old.md',
    'art/source/forge/recipes/neris_backup.json',
    'art/source/blender/models/rig.blend1',
    'debug_contact.png',
  ]) {
    assert.equal(run('guard.mjs', write(p), fx, 'blender').decision, 'deny', p);
  }
  assert.equal(
    run('guard.mjs', write('art/source/forge/recipes/npc-neris.json'), fx, 'blender').decision,
    'allow',
  );
  assert.equal(
    run('guard.mjs', write('docs/team/comms/blender/tmp/plan.md'), fx, 'blender').decision,
    'allow',
  );
});

test('stop: litter created during the session must be cleaned up; pre-existing issues are ignored', () => {
  const fx = fixtureRepo();
  writeFileSync(path.join(fx.root, 'old-junk.txt'), 'pre-existing');
  run('inject.mjs', { conversationId: 'c6' }, fx, 'blender', ['session']);
  mkdirSync(path.join(fx.root, 'art/review'), { recursive: true });
  writeFileSync(path.join(fx.root, 'art/review/frame.bak'), 'x');
  const out = run(
    'stop.mjs',
    { conversationId: 'c6', terminationReason: 'NO_TOOL_CALL' },
    fx,
    'blender',
  );
  assert.equal(out.decision, 'continue');
  assert.match(out.reason, /litter-name\] art\/review\/frame\.bak/);
  assert.doesNotMatch(out.reason, /old-junk/);
});
