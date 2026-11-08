import { readFileSync } from 'node:fs';
import { setDefaultCompiledWorld } from '../src/domain/simulation';

const compiled = JSON.parse(readFileSync('public/assets/generated/aqualia-region.json', 'utf8'));
(globalThis as unknown as { __HEARTHWILD_COMPILED_WORLD__?: unknown }).__HEARTHWILD_COMPILED_WORLD__ =
  compiled;
setDefaultCompiledWorld(compiled);
