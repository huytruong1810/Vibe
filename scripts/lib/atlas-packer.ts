export interface AtlasInput {
  path: string;
  contents: Buffer;
}
/** Forge review artifacts never become runtime textures. Expression decals are separate. */
export function isReviewOnlySprite(value: string): boolean {
  return /(?:^|[\\/_.:-])(?:turntable|expression[_-]?sheet)(?:$|[\\/_.:-])/i.test(value);
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
  const ordered = [...inputs].sort((a, b) => (a.path < b.path ? 1 : a.path > b.path ? -1 : 0));
  const texturesToPack: AtlasInput[] = [];
  const hashes = new Map<string, string>();
  const aliases = new Map<
    string,
    {
      canonical: string;
      sourceSize: { w: number; h: number };
      spriteSourceSize: { x: number; y: number; w: number; h: number };
    }
  >();
  for (const input of ordered) {
    const image = sharp(input.contents).ensureAlpha();
    const metadata = await image.metadata();
    const w = Math.ceil(metadata.width! * resolution),
      h = Math.ceil(metadata.height! * resolution);
    const { data, info } = await image
      .resize(w, h, { kernel: 'nearest' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    let left = w,
      top = h,
      right = -1,
      bottom = -1;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        // Any nonzero alpha is content, including faint antialiasing pixels.
        if (data[(y * w + x) * info.channels + 3] !== 0) {
          left = Math.min(left, x);
          top = Math.min(top, y);
          right = Math.max(right, x);
          bottom = Math.max(bottom, y);
        }
      }
    if (right < left) throw new Error(`Empty atlas frame: ${input.path}`);
    const width = right - left + 1,
      height = bottom - top + 1;
    const cropped = await sharp(data, { raw: { width: w, height: h, channels: 4 } })
      .extract({ left, top, width, height })
      .raw()
      .toBuffer();
    const hash = createHash('sha256').update(`${width},${height}:`).update(cropped).digest('hex');
    const id = basename(input.path, extname(input.path));
    const canonical = hashes.get(hash) ?? id;
    aliases.set(id, {
      canonical,
      sourceSize: { w, h },
      spriteSourceSize: { x: left, y: top, w: width, h: height },
    });
    if (!hashes.has(hash)) {
      hashes.set(hash, id);
      texturesToPack.push({
        path: input.path,
        contents: await sharp(cropped, { raw: { width, height, channels: 4 } })
          .png()
          .toBuffer(),
      });
    }
  }
  const result: PackedAtlas = await engine.packTextures({
    texturesToPack,
    textureName: 'bundle',
    width: maximumTextureSize,
    height: maximumTextureSize,
    padding: 2,
    allowTrim: false,
    allowRotation: false,
    nameStyle: 'short',
    removeFileExtension: true,
    autodetectAnimations: false,
    sharpOptions: { resize: { kernel: 'nearest' } },
    textureFormat: 'png',
    scale: 1,
    resolution,
  });
  type Entry = {
    frame: { x: number; y: number; w: number; h: number };
    rotated: boolean;
    trimmed: boolean;
    sourceSize: { w: number; h: number };
    spriteSourceSize: { x: number; y: number; w: number; h: number };
  };
  for (const atlas of result.jsons) {
    const json = atlas.json as { frames: Record<string, Entry> };
    const packed = { ...json.frames };
    json.frames = {};
    for (const [id, alias] of aliases) {
      const entry = packed[alias.canonical];
      if (!entry) continue;
      json.frames[id] = {
        ...entry,
        sourceSize: alias.sourceSize,
        spriteSourceSize: alias.spriteSourceSize,
        trimmed:
          alias.sourceSize.w !== alias.spriteSourceSize.w ||
          alias.sourceSize.h !== alias.spriteSourceSize.h,
      };
    }
  }
  return result;
}
import { createHash } from 'node:crypto';
import { basename, extname } from 'node:path';
import sharp from 'sharp';
