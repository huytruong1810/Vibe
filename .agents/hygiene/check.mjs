// Workspace hygiene check (doctrine TEAM-9). Policy: .agents/workspace-policy.json.
//   node .agents/hygiene/check.mjs          working tree: tracked + untracked + stray ignored files
//   node .agents/hygiene/check.mjs --ci     tracked files only (CI); stale temp docs are warnings
// Doctrine-protected: only Claude/director edit this file or the policy.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const POLICY_FILE = path.resolve(HERE, '..', 'workspace-policy.json');

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function listFiles(root, kind) {
  const args = {
    tracked: ['ls-files', '-z'],
    untracked: ['ls-files', '-z', '--others', '--exclude-standard'],
    ignored: ['ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--directory'],
  }[kind];
  return git(root, args).split('\0').filter(Boolean);
}

const rx = (list) => list.map((s) => new RegExp(s, 'i'));
const anyMatch = (res, s) => res.some((r) => r.test(s));

function mdLinks(text) {
  const out = [];
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const url = m[1];
    if (/^[a-z]+:/i.test(url) || url.startsWith('#')) continue;
    out.push(url.split('#')[0]);
  }
  return out;
}

/**
 * @param {{root?: string, mode?: 'working'|'ci', only?: Set<string>|null, role?: string|null}} opts
 * `only` restricts working-tree findings to these repo-relative paths (used by the stop hook).
 * @returns {{errors: {rule: string, path: string, fix: string}[], warnings: {rule: string, path: string, fix: string}[]}}
 */
export function checkWorkspace({
  root = path.resolve(HERE, '..', '..'),
  mode = 'working',
  only = null,
  role = null,
} = {}) {
  const policy = JSON.parse(readFileSync(POLICY_FILE, 'utf8'));
  const errors = [];
  const warnings = [];
  const add = (list, rule, p, fix) => {
    if (only && !only.has(p) && ![...only].some((o) => p.startsWith(o.endsWith('/') ? o : `${o}/`)))
      return;
    list.push({ rule, path: p, fix });
  };

  const tracked = listFiles(root, 'tracked');
  const untracked = mode === 'working' ? listFiles(root, 'untracked') : [];
  const present = [...tracked, ...untracked].filter((p) => existsSync(path.join(root, p)));
  const forbidden = rx(policy.forbiddenNamePatterns);
  const exceptions = rx(policy.forbiddenNameExceptions ?? []);
  const rootAllow = new Set(policy.rootAllowlist);

  // R1 top-level entries
  for (const p of present) {
    const top = p.split('/')[0];
    if (!rootAllow.has(top)) {
      add(
        errors,
        'root-allowlist',
        p,
        'New top-level entries need director/claude approval (TEAM-9.2). Move it under its lane folder or delete it.',
      );
    }
  }

  // R2 litter names
  for (const p of present) {
    if (anyMatch(exceptions, p)) continue;
    if (anyMatch(forbidden, p)) {
      add(
        errors,
        'litter-name',
        p,
        'Scratch/backup/versioned-copy names are not allowed in the repo (TEAM-9.1). Delete it, or rename the real deliverable descriptively.',
      );
    }
  }

  // R3 stray ignored files outside approved scratch locations (working tree only)
  if (mode === 'working') {
    const approved = policy.approvedIgnoredRoots;
    for (const p of listFiles(root, 'ignored')) {
      if (approved.some((a) => p === a || p.startsWith(a) || a.startsWith(p))) continue;
      if (/(^|\/)__pycache__\/?$/.test(p)) {
        add(
          errors,
          'stray-ignored',
          p,
          'Python bytecode cache. Delete it (forge sets PYTHONDONTWRITEBYTECODE).',
        );
        continue;
      }
      add(
        errors,
        'stray-ignored',
        p,
        `Ignored file outside approved scratch locations (${approved.join(', ')}). Delete it or move it there (TEAM-9.1).`,
      );
    }
  }

  // R4 large files
  const largeAllow = rx(policy.largeFileAllowlist);
  for (const p of present) {
    if (anyMatch(largeAllow, p)) continue;
    try {
      if (statSync(path.join(root, p)).size > policy.largeFileBytes) {
        add(
          errors,
          'large-file',
          p,
          `Over ${policy.largeFileBytes} bytes outside allowed asset folders. Keep binaries in their asset folder or out of git.`,
        );
      }
    } catch {
      /* vanished */
    }
  }

  // R5 orphan docs: every docs/**/*.md must be reachable by links from the doc roots
  const mdSet = new Set(present.filter((p) => p.endsWith('.md')));
  const seen = new Set();
  const queue = policy.docs.roots.filter((r) => mdSet.has(r));
  while (queue.length) {
    const cur = queue.shift();
    if (seen.has(cur)) continue;
    seen.add(cur);
    const text = readFileSync(path.join(root, cur), 'utf8');
    for (const link of mdLinks(text)) {
      let target = path.posix.normalize(path.posix.join(path.posix.dirname(cur), link));
      if (
        link.endsWith('/') ||
        (existsSync(path.join(root, target)) && statSync(path.join(root, target)).isDirectory())
      ) {
        const readme = path.posix.join(target, 'README.md');
        target = readme;
      }
      if (mdSet.has(target) && !seen.has(target)) queue.push(target);
    }
  }
  const docExempt = rx(policy.docs.exemptFromOrphanCheck);
  for (const p of mdSet) {
    if (!p.startsWith('docs/') || anyMatch(docExempt, p) || seen.has(p)) continue;
    add(
      errors,
      'orphan-doc',
      p,
      'Not linked from the docs index tree. Link it from the right index if it is current, otherwise delete it (outdated docs are removed, not kept; TEAM-9.3).',
    );
  }

  // R6 unused tools
  const textFiles = present.filter(
    (p) =>
      /\.(ts|tsx|mjs|js|json|py|md|yml|yaml|toml|sh)$/.test(p) && !p.startsWith('node_modules/'),
  );
  const corpus = new Map(textFiles.map((p) => [p, readFileSync(path.join(root, p), 'utf8')]));
  const pkg = corpus.get('package.json') ?? '';
  for (const dir of policy.tools.packageScriptDirs) {
    for (const p of present.filter((f) => f.startsWith(dir) && /\.(ts|mjs|js)$/.test(f))) {
      const stem = path.posix.basename(p).replace(/\.(ts|mjs|js)$/, '');
      const used =
        pkg.includes(p) ||
        [...corpus].some(
          ([f, t]) =>
            f !== p &&
            /\.(ts|tsx|mjs|js)$/.test(f) &&
            new RegExp(`from ['"][^'"]*\\b${stem}(\\.(ts|mjs|js))?['"]`).test(t),
        );
      if (!used)
        add(
          errors,
          'unused-tool',
          p,
          'Not referenced by a package.json script or imported anywhere. Delete unused tools in the change that replaces them (TEAM-9.4).',
        );
    }
  }
  const entry = new Set(policy.tools.entrypoints);
  for (const p of present.filter(
    (f) => f.endsWith('.py') && policy.tools.pythonRoots.some((r) => f.startsWith(r)),
  )) {
    const base = path.posix.basename(p);
    if (entry.has(p) || base === '__init__.py') continue;
    const stem = base.replace(/\.py$/, '');
    const modRe = new RegExp(
      `(\\bimport\\s+[\\w.]*\\b${stem}\\b|\\bfrom\\s+[\\w.]*\\b${stem}\\b|\\bfrom\\s+[\\w.]+\\s+import\\s+[^\\n]*\\b${stem}\\b|\\b${stem}\\.py\\b)`,
    );
    const used = [...corpus].some(([f, t]) => f !== p && modRe.test(t));
    if (!used)
      add(
        errors,
        'unused-tool',
        p,
        'Python module not imported, invoked or documented anywhere. Delete it if it is no longer used (TEAM-9.4).',
      );
  }

  // R7 stale temp docs in comms/<member>/tmp/
  const days = policy.comms.staleTempDays;
  const tempRe = new RegExp(`^docs/team/comms/([^/]+)/${policy.comms.tempSubdir}/`);
  for (const p of present) {
    const m = p.match(tempRe);
    if (!m) continue;
    let ageDays = 0;
    try {
      const ts = git(root, ['log', '-1', '--format=%ct', '--', p]).trim();
      const t = ts ? Number(ts) * 1000 : statSync(path.join(root, p)).mtimeMs;
      ageDays = (Date.now() - t) / 86400000;
    } catch {
      /* untracked: fresh */
    }
    if (ageDays > days) {
      const own = role && m[1] === role;
      add(
        mode === 'working' && own ? errors : warnings,
        'stale-temp',
        p,
        `Temp doc older than ${days} days. Its owner (${m[1]}) deletes it or promotes it (TEAM-9.5).`,
      );
    }
  }

  return { errors, warnings };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv.includes('--ci') ? 'ci' : 'working';
  const { errors, warnings } = checkWorkspace({ mode });
  for (const w of warnings) console.warn(`warn  [${w.rule}] ${w.path}\n      ${w.fix}`);
  for (const e of errors) console.error(`error [${e.rule}] ${e.path}\n      ${e.fix}`);
  console.log(
    `Workspace hygiene (${mode}): ${errors.length} error(s), ${warnings.length} warning(s).`,
  );
  process.exit(errors.length ? 1 : 0);
}
