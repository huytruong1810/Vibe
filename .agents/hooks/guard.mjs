// PreToolUse guard: blocks doctrine edits, out-of-lane writes, banned claims and
// destructive git (DOC-1, TEAM-2, TEAM-5.3, TEAM-7). Best effort for shell commands.
import { execFileSync } from 'node:child_process';
import {
  arg,
  bannedLine,
  emit,
  litterDenial,
  match,
  PROTECTED,
  readRole,
  readStdin,
  REPO_ROOT,
  repoRel,
  writeDenial,
  worldforgeCommand,
} from './lib.mjs';

const READ_ONLY_TOOL =
  /^(read_file|list_dir|list_directory|view_file|view_.*|grep_search|find_by_name|search_.*|codebase_search|manage_task|browser_.*|read_.*|get_.*)$/;
const MUTATING_TOOL = /write|edit|replace|delete|remove|move|rename|create|patch|append/;

const DESTRUCTIVE_GIT = [
  [
    /\bgit\b[^\n;&|]*\bpush\b[^\n;&|]*(--force\b|--force-with-lease\b|\s-f\b|\s\+\S)/,
    'Force push is forbidden (TEAM-7.1).',
  ],
  [/--no-verify\b/, '--no-verify is forbidden (TEAM-7.1).'],
  [
    /\bgit\b[^\n;&|]*\breset\b[^\n;&|]*--hard\b/,
    'git reset --hard is forbidden on shared work (TEAM-7.1).',
  ],
  [
    /\bgit\b[^\n;&|]*\bclean\b[^\n;&|]*\s-[a-zA-Z]*f/,
    'git clean -f is forbidden; delete only your own files explicitly.',
  ],
  [/core\.hooksPath/, 'Changing git hook configuration is forbidden.'],
  [
    /\bgit\b[^\n;&|]*\bfilter-(branch|repo)\b|\bgit\b[^\n;&|]*\brebase\b[^\n;&|]*\bpush\b/,
    'Rewriting shared history is forbidden (TEAM-7.1).',
  ],
];

const PROTECTED_TOKENS =
  /docs[\\/]+doctrine|forge[\\/]+spec|tiles[\\/]+spec|team[\\/]+briefs|\.agents[\\/]+(?!state\b)|(^|[\s"'\\/])(AGENTS|GEMINI)\.md|comms[\\/]+director/i;
const WRITE_OPS =
  /(^|[^<>&0-9])>>?(?!&)|\btee\b|\bsed\b[^\n|;]*\s-i|\brm\b|\bmv\b|\bcp\b|\btruncate\b|\bdd\b|\bpython3?\b[^\n|;]*\s-c\b|\bnode\b[^\n|;]*\s-e\b|\bperl\b[^\n|;]*\s-[a-z]*[pi]|\bpatch\b|\bgit\b[^\n;&|]*\b(apply|checkout|restore|rm|mv|stash|add|commit)\b|Set-Content|Add-Content|Out-File|Remove-Item|Move-Item|Copy-Item|New-Item|\bdel\b|\bcopy\b|\bmove\b|\bren\b/i;

function deny(reason) {
  emit({ decision: 'deny', reason: `[Hearthwild guard] ${reason}` });
  process.exit(0);
}

const input = readStdin();
const name = String(input.toolCall?.name ?? '');
const args = input.toolCall?.args ?? {};
const role = readRole();

if (name === 'run_command') {
  const cmd = String(arg(args, 'CommandLine', 'command', 'Command') ?? '');
  if (role === 'blender') {
    if (/worldforge\.py/i.test(cmd)) {
      if (!worldforgeCommand(cmd))
        deny('Use a single canonical worldforge command; shell wrappers are denied (WLD-4.3).');
    } else if (
      (/\.ldtk|source[\\/]+world/i.test(cmd) &&
        (WRITE_OPS.test(cmd) || /writealltext|writefilesync|appendalltext/i.test(cmd))) ||
      (/\b(?:python3?|node)\b[^\n]*(?:\s-c\b|\s-e\b)/.test(cmd) &&
        /\.ldtk|source[\\/]+world|base64/i.test(cmd) &&
        /write|base64|eval|exec\(/i.test(cmd))
    ) {
      deny('Direct or encoded map writes are denied; use worldforge passes (WLD-4.3).');
    }
  }
  for (const [re, reason] of DESTRUCTIVE_GIT) if (re.test(cmd)) deny(reason);
  if (
    /set-role\.mjs/.test(cmd) &&
    !WRITE_OPS.test(cmd.replace(/node\s+\S*set-role\.mjs\s+\w+/, ''))
  ) {
    emit({ decision: 'allow' });
    process.exit(0);
  }
  // Committing protected files never names them (`git commit` takes whatever is staged), so check
  // what the commit or a broad `git add` would actually include (DOC-1, TEAM-2a; the f4105e4 gap).
  if (role && /\bgit\b[^\n;&|]*\b(commit|add)\b/.test(cmd)) {
    const git = (a) => {
      try {
        return execFileSync('git', a, { cwd: REPO_ROOT, encoding: 'utf8' })
          .split('\n')
          .filter(Boolean);
      } catch {
        return [];
      }
    };
    const broad =
      /\badd\b[^\n;&|]*(\s(-A|--all|-u|--update|\.)(\s|$))|\bcommit\b[^\n;&|]*\s-[a-zA-Z]*a/.test(
        cmd,
      );
    const files = [
      ...git(['diff', '--cached', '--name-only']),
      ...(broad
        ? git(['status', '--porcelain', '--untracked-files=all']).map((l) => l.slice(3))
        : []),
    ];
    const hit = files.find((f) => match(f, PROTECTED) && !f.startsWith('.agents/state/'));
    if (hit)
      deny(
        `This would commit the protected file ${hit}. Agents never stage or commit protected paths, director records included (DOC-1, TEAM-2a). Leave it for the director; tell them in your comms.`,
      );
  }
  if (PROTECTED_TOKENS.test(cmd) && WRITE_OPS.test(cmd)) {
    deny(
      'This command appears to modify doctrine-protected files (DOC-1). Read them with cat/grep/sed -n only; propose changes in docs/team/proposals/.',
    );
  }
  const other = cmd.match(/comms[\\/]+(claude|codex|communicator|blender|director)[\\/]/i);
  if (other && other[1].toLowerCase() !== role && WRITE_OPS.test(cmd)) {
    deny(`This command appears to write in ${other[1]}'s comms folder (TEAM-3).`);
  }
  if (/\bgit\b[^\n;&|]*\bcommit\b/.test(cmd)) {
    const line = bannedLine(cmd);
    if (line)
      deny(
        `Commit message contains a banned superlative (TEAM-5.3): "${line}". State facts and cite evidence.`,
      );
  }
  emit({ decision: 'allow' });
  process.exit(0);
}

if (READ_ONLY_TOOL.test(name) || !MUTATING_TOOL.test(name)) {
  emit({ decision: 'allow' });
  process.exit(0);
}

const target = arg(
  args,
  'Path',
  'TargetFile',
  'FilePath',
  'file_path',
  'path',
  'AbsolutePath',
  'Destination',
);
const rel = repoRel(target);
const reason = writeDenial(role, rel) ?? litterDenial(rel);
if (reason) deny(reason);

const content = [
  arg(args, 'Content', 'CodeContent', 'Replacement', 'ReplacementContent', 'content') ?? '',
]
  .concat((args.ReplacementChunks ?? []).map?.((c) => c?.ReplacementContent ?? '') ?? [])
  .join('\n');
if (rel && /\.(md|txt|json)$/i.test(rel)) {
  const line = bannedLine(content);
  if (line)
    deny(
      `Banned superlative in ${rel} (TEAM-5.3): "${line}". Describe what you saw and cite QA evidence instead.`,
    );
}
emit({ decision: 'allow' });
