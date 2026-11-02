import { expect, it } from 'vitest';
import sharp from 'sharp';
import { packAtlasTextures } from '../scripts/lib/atlas-packer';

it.each([1, 0.5] as const)(
  'packs shuffled directory inputs identically at %s resolution',
  async (resolution) => {
    const inputs = await Promise.all(
      ['a', 'z', 'Z', '_', 'n10', 'n2'].map(async (id, index) => ({
        path: `${id}.png`,
        contents: await sharp({
          create: {
            width: 32,
            height: 32,
            channels: 4,
            background: { r: index * 40, g: 100, b: 200, alpha: 1 },
          },
        })
          .png()
          .toBuffer(),
      })),
    );
    const a = await packAtlasTextures(inputs, resolution, 48);
    const b = await packAtlasTextures([...inputs].reverse(), resolution, 48);
    expect(a.jsons.length).toBeGreaterThan(1);
    expect(a.jsons).toEqual(b.jsons);
    expect(a.textures.map((t) => t.name)).toEqual(b.textures.map((t) => t.name));
    for (let n = 0; n < a.textures.length; n++)
      expect(a.textures[n]!.buffer.equals(b.textures[n]!.buffer)).toBe(true);
    const names = a.jsons.flatMap(({ json }) => Object.keys((json as { frames: object }).frames));
    expect(names.sort()).toEqual(inputs.map((input) => input.path.slice(0, -4)).sort());
  },
);
