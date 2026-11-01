import { writeAssetSchemas } from './lib/asset-schemas';

await writeAssetSchemas();
console.log('Shared asset schemas regenerated; no source art or atlas rebuilt.');
