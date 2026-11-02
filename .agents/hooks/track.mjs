// PostToolUse on read_file: record which images the agent actually opened (PRD-5).
// Viewing a forge contact sheet writes a hash-bound marker that `forge.py packet` checks.
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import {
  REPO_ROOT,
  arg,
  emit,
  loadState,
  readStdin,
  repoRel,
  saveState,
  sha256File,
} from './lib.mjs';

const input = readStdin();
const rel = repoRel(arg(input.toolCall?.args ?? {}, 'Path', 'AbsolutePath', 'path', 'TargetFile'));
if (!input.error && rel && /\.(png|gif|jpe?g|webp)$/i.test(rel)) {
  const abs = path.join(REPO_ROOT, rel);
  if (existsSync(abs)) {
    const hash = sha256File(abs);
    const viewed = loadState('viewed.json', {});
    viewed[rel] = {
      hash,
      at: new Date().toISOString(),
      conversationId: input.conversationId ?? null,
    };
    saveState('viewed.json', viewed);
    if (path.basename(rel) === 'contact.png') {
      writeFileSync(path.join(path.dirname(abs), 'contact.viewed'), `${hash}\n`);
    }
    if (rel.startsWith('art/source/world/work/') && rel.endsWith('.png'))
      writeFileSync(`${abs}.viewed`, `${hash}\n`);
  }
}
emit({});
