import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const directory = resolve('src/domain');
const errors: string[] = [];
for (const name of await readdir(directory)) {
  if (!name.endsWith('.ts')) continue;
  const text = await readFile(resolve(directory, name), 'utf8');
  if (/from\s+['"](?:pixi\.js|\.\.\/(?:adapters|presentation|worker))/.test(text))
    errors.push(`${name}: domain imports a browser adapter`);
  if (/\b(?:document|window|indexedDB|AudioContext)\b|Math\.random\(/.test(text))
    errors.push(`${name}: domain uses browser state or unseeded randomness`);
}
if (errors.length) throw new Error(errors.join('\n'));
console.log(
  'Architecture check passed: the simulation domain is independent of rendering, browser storage, networking, and unseeded randomness.',
);
