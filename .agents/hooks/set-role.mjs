// Set this machine's Hearthwild agent role (the only machine-local hook setting).
// Usage: node .agents/hooks/set-role.mjs <blender|communicator>
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROLES, STATE_DIR } from './lib.mjs';

const role = (process.argv[2] ?? '').trim().toLowerCase();
if (!ROLES.includes(role)) {
  console.error(`Usage: node .agents/hooks/set-role.mjs <${ROLES.join('|')}>`);
  process.exit(2);
}
mkdirSync(STATE_DIR, { recursive: true });
writeFileSync(path.join(STATE_DIR, 'role'), `${role}\n`);
console.log(`Hearthwild role for this machine: ${role}`);
console.log(`Next: read AGENTS.md, then docs/team/briefs/${role}.md.`);
