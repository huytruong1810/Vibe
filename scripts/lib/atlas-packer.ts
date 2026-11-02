export interface AtlasInput {
  path: string;
  contents: Buffer;
}
interface PackedAtlas {
  textures: { name: string; buffer: Buffer }[];
  jsons: { name: string; json: unknown }[];
}

/** AssetPack 1.7's folder pipe feeds unsorted glob results into an order-sensitive
 * packer. Keep its packing/trim/resize implementation, but supply ordered inputs.
 * This narrow internal adapter is version-pinned in package.json/package-lock.json. */
export async function packAtlasTextures(
  inputs: readonly AtlasInput[],
  resolution: 1 | 0.5,
  maximumTextureSize = 2044,
): Promise<PackedAtlas> {
  const engine = await import(
    new URL('./packer/packTextures.js', import.meta.resolve('@assetpack/core/texture-packer')).href
  );
  if (typeof engine.packTextures !== 'function')
    throw new Error('Pinned AssetPack packing API changed');
  // Binary descending order is independent of OS directory enumeration and ICU locale.
  const texturesToPack = [...inputs].sort((a, b) =>
    a.path < b.path ? 1 : a.path > b.path ? -1 : 0,
  );
  return engine.packTextures({
    texturesToPack,
    textureName: 'bundle',
    width: maximumTextureSize,
    height: maximumTextureSize,
    padding: 2,
    allowTrim: true,
    allowRotation: false,
    nameStyle: 'short',
    removeFileExtension: true,
    autodetectAnimations: false,
    sharpOptions: { resize: { kernel: 'nearest' } },
    textureFormat: 'png',
    scale: resolution,
    resolution,
  });
}
