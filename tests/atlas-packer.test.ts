import { expect, it } from 'vitest';
import sharp from 'sharp';
import { packAtlasTextures, isReviewOnlySprite } from '../scripts/lib/atlas-packer';

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

it.each([1, 0.5] as const)(
  'deduplicates pixels while preserving independent canvas registration at %s',
  async (resolution) => {
    const make = async (offset: number) => {
      const pixels = Buffer.alloc(16 * 16 * 4);
      for (let y = offset; y < offset + 4; y++)
        for (let x = offset; x < offset + 4; x++) {
          const n = (y * 16 + x) * 4;
          pixels[n] = 250;
          pixels[n + 3] = 1; // Faint content must survive exact alpha bounds.
        }
      return sharp(pixels, { raw: { width: 16, height: 16, channels: 4 } })
        .png()
        .toBuffer();
    };
    const packed = await packAtlasTextures(
      [
        { path: 'a.png', contents: await make(2) },
        { path: 'b.png', contents: await make(8) },
      ],
      resolution,
      48,
    );
    const json = packed.jsons[0]!.json as { frames: Record<string, any> };
    expect(Object.keys(json.frames).sort()).toEqual(['a', 'b']);
    expect(json.frames.a.frame).toEqual(json.frames.b.frame);
    expect(json.frames.a.sourceSize).toEqual({ w: 16 * resolution, h: 16 * resolution });
    expect(json.frames.a.spriteSourceSize).toEqual({
      x: 2 * resolution,
      y: 2 * resolution,
      w: 4 * resolution,
      h: 4 * resolution,
    });
    expect(json.frames.b.spriteSourceSize.x).toBe(8 * resolution);
    // Reconstruct a head pixel relative to each frame's independent logical pivot.
    expect(json.frames.a.spriteSourceSize.x - 8 * resolution).toBe(-6 * resolution);
    expect(json.frames.b.spriteSourceSize.x - 8 * resolution).toBe(0);
  },
);

it('excludes review sheets without excluding runtime expression decals', () => {
  for (const name of [
    'body/turntable/000.png',
    'npc:reed-ExpressionSheet-0',
    'ExpressionSheet.png',
  ])
    expect(isReviewOnlySprite(name)).toBe(true);
  expect(isReviewOnlySprite('faces/joyful-e.png')).toBe(false);
});
