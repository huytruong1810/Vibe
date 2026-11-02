// Stop hook: before an agent ends its turn, verify lane hygiene, viewed contact sheets
// and the Changed/Evidence/Gaps report (TEAM-2, PRD-5, TEAM-5). Each issue blocks once.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { checkWorkspace } from '../hygiene/check.mjs';
import {
  REPO_ROOT,
  bannedLine,
  changeDenial,
  emit,
  gitChangedPaths,
  loadState,
  readRole,
  readStdin,
  saveState,
  sha256File,
} from './lib.mjs';

const input = readStdin();
if (input.terminationReason && input.terminationReason !== 'NO_TOOL_CALL') {
  emit({});
  process.exit(0);
}

const conv = String(input.conversationId ?? 'unknown');
const role = readRole();
const sessions = loadState('sessions.json', {});
const session = sessions[conv] ?? {};
const baseline = new Set(session.baseline ?? []);
const raised = new Set(session.stopRaised ?? []);
const issues = [];

// 1. Files this session changed that the role may not change.
const changed = gitChangedPaths().filter((p) => !baseline.has(p));
const bad = changed.map((p) => [p, changeDenial(role, p)]).filter(([, why]) => why);
if (bad.length) {
  issues.push({
    key: `lane:${bad
      .map(([p]) => p)
      .sort()
      .join(',')}`,
    text:
      'These working-tree changes are outside your lane or protected:\n' +
      bad.map(([p, why]) => `- ${p}: ${why}`).join('\n') +
      '\nRevert the ones you made (git checkout -- <path> for tracked files, delete new files you created). ' +
      'If you did not make a change, leave it and say so under Gaps.',
  });
}
// Authoritative map edits must match worldforge's latest atomic-write receipt.
if (role === 'blender' && changed.some((p) => /^art\/source\/world\/.*\.ldtk$/i.test(p))) {
  const receiptPath = path.join(REPO_ROOT, 'art/source/world/work/authoring-receipt.json');
  let receipt = null;
  try {
    receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  } catch {
    /* missing receipt is a failure */
  }
  const map = path.join(REPO_ROOT, 'art/source/world/hearthwild.ldtk');
  if (!receipt || !existsSync(map) || receipt.projectSha256 !== sha256File(map))
    issues.push({
      key: 'worldforge-receipt',
      text: 'Map differs from worldforge authoring receipt. Restore your direct edits and use validated passes (WLD-4.3).',
    });
}

// 2. Exports changed without an approval record (L7).
if (changed.some((p) => p.startsWith('art/source/exports/'))) {
  const dir = path.join(REPO_ROOT, 'docs/team/comms/director/approvals');
  const approvals = existsSync(dir)
    ? readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'README.md')
    : [];
  if (!approvals.length) {
    issues.push({
      key: 'exports-without-approval',
      text: 'art/source/exports/ changed but there is no director approval record (L7). Revert the export changes; only `forge.py publish` after approval may write them.',
    });
  }
}

// 3. Forge contact sheets the agent never opened (PRD-5).
const work = path.join(REPO_ROOT, 'art/source/forge/work');
if (existsSync(work)) {
  for (const asset of readdirSync(work)) {
    const sheet = path.join(work, asset, 'contact.png');
    if (!existsSync(sheet)) continue;
    const marker = path.join(work, asset, 'contact.viewed');
    const seen = existsSync(marker) ? readFileSync(marker, 'utf8').trim() : '';
    if (seen !== sha256File(sheet)) {
      issues.push({
        key: `contact:${asset}:${sha256File(sheet).slice(0, 12)}`,
        text: `You have not opened the current contact sheet for ${asset}. Open art/source/forge/work/${asset}/contact.png with read_file, describe what you see (PRD-5.2), then finish.`,
      });
    }
  }
}

// 4. Workspace hygiene: anything new this session that litters the repo (TEAM-9).
try {
  const before = new Set(session.hygieneBaseline ?? []);
  const fresh = checkWorkspace({ root: REPO_ROOT, mode: 'working', role }).errors.filter(
    (e) => !before.has(`${e.rule}:${e.path}`),
  );
  if (fresh.length) {
    issues.push({
      key: `hygiene:${fresh
        .map((e) => `${e.rule}:${e.path}`)
        .sort()
        .join(',')}`,
      text:
        'Clean up before you finish (TEAM-9). These appeared during this session:\n' +
        fresh.map((e) => `- [${e.rule}] ${e.path}: ${e.fix}`).join('\n') +
        '\nThen run `npm run check:hygiene`.',
    });
  }
} catch {
  /* hygiene check unavailable: do not block */
}

// 5. Final report format and wording (TEAM-5.2, TEAM-5.3), when the session changed files.
function lastResponse(file) {
  try {
    const lines = readFileSync(file, 'utf8').trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const o = JSON.parse(lines[i]);
      if (o.type === 'PLANNER_RESPONSE' && typeof o.content === 'string' && o.content.trim())
        return o.content;
    }
  } catch {
    /* transcript unavailable */
  }
  return null;
}
const reply = lastResponse(input.transcriptPath);
if (reply !== null && changed.length) {
  const missing = ['Changed', 'Evidence', 'Gaps'].filter(
    (h) => !new RegExp(`\\b${h}\\b`, 'i').test(reply),
  );
  if (missing.length) {
    issues.push({
      key: `report:${changed.length}`,
      text: `End with a report containing these sections: ${missing.join(', ')} (TEAM-5.2). List files changed, evidence paths and numbers, and what is missing or unverified.`,
    });
  }
  const line = bannedLine(reply);
  if (line) {
    issues.push({
      key: `banned:${line}`,
      text: `Your reply uses a banned superlative (TEAM-5.3): "${line}". Rewrite it factually.`,
    });
  }
}

const fresh = issues.filter((i) => !raised.has(i.key));
if (fresh.length) {
  session.stopRaised = [...raised, ...fresh.map((i) => i.key)];
  sessions[conv] = session;
  saveState('sessions.json', sessions);
  emit({
    decision: 'continue',
    reason: `[Hearthwild stop check]\n${fresh.map((i) => i.text).join('\n\n')}`,
  });
} else {
  emit({});
}
