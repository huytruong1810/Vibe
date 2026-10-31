// PreToolUse guard: blocks doctrine edits, out-of-lane writes, banned claims and
// destructive git (DOC-1, TEAM-2, TEAM-5.3, TEAM-7). Best effort for shell commands.
import { arg, bannedLine, emit, readRole, readStdin, repoRel, writeDenial } from './lib.mjs';

const READ_ONLY_TOOL = /^(read_file|list_dir|list_directory|view_file|view_.*|grep_search|find_by_name|search_.*|codebase_search|manage_task|browser_.*|read_.*|get_.*)$/;
const MUTATING_TOOL = /write|edit|replace|delete|remove|move|rename|create|patch|append/;

const DESTRUCTIVE_GIT = [
  [/\bgit\b[^\n;&|]*\bpush\b[^\n;&|]*(--force\b|--force-with-lease\b|\s-f\b|\s\+\S)/, 'Force push is forbidden (TEAM-7.1).'],
  [/--no-verify\b/, '--no-verify is forbidden (TEAM-7.1).'],
  [/\bgit\b[^\n;&|]*\breset\b[^\n;&|]*--hard\b/, 'git reset --hard is forbidden on shared work (TEAM-7.1).'],
  [/\bgit\b[^\n;&|]*\bclean\b[^\n;&|]*\s-[a-zA-Z]*f/, 'git clean -f is forbidden; delete only your own files explicitly.'],
  [/core\.hooksPath/, 'Changing git hook configuration is forbidden.'],
  [/\bgit\b[^\n;&|]*\bfilter-(branch|repo)\b|\bgit\b[^\n;&|]*\brebase\b[^\n;&|]*\bpush\b/, 'Rewriting shared history is forbidden (TEAM-7.1).'],
];

const PROTECTED_TOKENS =
  /docs[\\/]+doctrine|forge[\\/]+spec|team[\\/]+briefs|\.agents[\\/]+(?!state\b)|(^|[\s"'\\/])(AGENTS|GEMINI)\.md|comms[\\/]+director/i;
const WRITE_OPS =
  /(^|[^<>&0-9])>>?(?!&)|\btee\b|\bsed\b[^\n|;]*\s-i|\brm\b|\bmv\b|\bcp\b|\btruncate\b|\bdd\b|\bpython3?\b[^\n|;]*\s-c\b|\bnode\b[^\n|;]*\s-e\b|\bperl\b[^\n|;]*\s-[a-z]*[pi]|\bpatch\b|\bgit\b[^\n;&|]*\b(apply|checkout|restore|rm|mv|stash)\b|Set-Content|Add-Content|Out-File|Remove-Item|Move-Item|Copy-Item|New-Item|\bdel\b|\bcopy\b|\bmove\b|\bren\b/i;

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
  for (const [re, reason] of DESTRUCTIVE_GIT) if (re.test(cmd)) deny(reason);
  if (/set-role\.mjs/.test(cmd) && !WRITE_OPS.test(cmd.replace(/node\s+\S*set-role\.mjs\s+\w+/, ''))) {
    emit({ decision: 'allow' });
    process.exit(0);
  }
  if (PROTECTED_TOKENS.test(cmd) && WRITE_OPS.test(cmd)) {
    deny('This command appears to modify doctrine-protected files (DOC-1). Read them with cat/grep/sed -n only; propose changes in docs/team/proposals/.');
  }
  const other = cmd.match(/comms[\\/]+(claude|codex|communicator|blender|director)[\\/]/i);
  if (other && other[1].toLowerCase() !== role && WRITE_OPS.test(cmd)) {
    deny(`This command appears to write in ${other[1]}'s comms folder (TEAM-3).`);
  }
  if (/\bgit\b[^\n;&|]*\bcommit\b/.test(cmd)) {
    const line = bannedLine(cmd);
    if (line) deny(`Commit message contains a banned superlative (TEAM-5.3): "${line}". State facts and cite evidence.`);
  }
  emit({ decision: 'allow' });
  process.exit(0);
}

if (READ_ONLY_TOOL.test(name) || !MUTATING_TOOL.test(name)) {
  emit({ decision: 'allow' });
  process.exit(0);
}

const target = arg(args, 'Path', 'TargetFile', 'FilePath', 'file_path', 'path', 'AbsolutePath', 'Destination');
const rel = repoRel(target);
const reason = writeDenial(role, rel);
if (reason) deny(reason);

const content = [arg(args, 'Content', 'CodeContent', 'Replacement', 'ReplacementContent', 'content') ?? '']
  .concat((args.ReplacementChunks ?? []).map?.((c) => c?.ReplacementContent ?? '') ?? [])
  .join('\n');
if (rel && /\.(md|txt|json)$/i.test(rel)) {
  const line = bannedLine(content);
  if (line) deny(`Banned superlative in ${rel} (TEAM-5.3): "${line}". Describe what you saw and cite QA evidence instead.`);
}
emit({ decision: 'allow' });
