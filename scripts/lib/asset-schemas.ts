import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { format } from 'prettier';
import { z } from 'zod';
import { AssetCatalogSchema, ArtApprovalRecordSchema } from '../../src/presentation/assets/catalog';
import { SourceManifestSchema } from '../../src/presentation/assets/source';

/** Shared contract generation needs no textures, source images or atlas repack. */
export async function writeAssetSchemas(directory = 'docs/art'): Promise<void> {
  await mkdir(directory, { recursive: true });
  for (const [filename, schema] of [
    ['asset-catalog.schema.json', AssetCatalogSchema],
    ['source-manifest.schema.json', SourceManifestSchema],
    ['art-approval-record.schema.json', ArtApprovalRecordSchema],
  ] as const) {
    await writeFile(
      resolve(directory, filename),
      await format(JSON.stringify(z.toJSONSchema(schema)), {
        parser: 'json',
        printWidth: 100,
      }),
    );
  }
}
