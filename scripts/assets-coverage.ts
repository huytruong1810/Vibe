import { readFile } from 'node:fs/promises';
import { AssetCatalogSchema } from '../src/presentation/assets/catalog';
import { writeCoverageReport } from './lib/coverage-report';

const catalog = AssetCatalogSchema.parse(
  JSON.parse(await readFile('public/assets/generated/catalog.json', 'utf8')),
);
await writeCoverageReport(catalog);
console.log('Coverage refreshed from existing catalog; no atlas rebuilt.');
