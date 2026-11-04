import type { QuantizedPainting } from './painting-quantize';

/** Decode persisted packed pixels without browser or Node dependencies. */
export function paintingRgba(painting: QuantizedPainting): Uint8ClampedArray<ArrayBuffer> {
  const { pixels, palette } = painting;
  if (
    pixels.length !== 1024 ||
    !/^[A-Za-z0-9+/]+$/.test(pixels) ||
    !palette.length ||
    palette.length > 16 ||
    palette.some((c) => !/^#[0-9a-f]{6}$/.test(c))
  )
    throw Error('Invalid painting pixels');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
    output = new Uint8ClampedArray(48 * 32 * 4);
  const colors = palette.map((hex) =>
    [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)),
  );
  let pixel = 0;
  for (let n = 0; n < pixels.length; n += 4) {
    const a = alphabet.indexOf(pixels[n]!),
      b = alphabet.indexOf(pixels[n + 1]!),
      c = alphabet.indexOf(pixels[n + 2]!),
      d = alphabet.indexOf(pixels[n + 3]!);
    for (const byte of [(a << 2) | (b >> 4), ((b & 15) << 4) | (c >> 2), ((c & 3) << 6) | d])
      for (const index of [byte >> 4, byte & 15]) {
        const color = colors[index];
        if (!color) throw Error('Painting index exceeds palette');
        output.set([...color, 255], pixel++ * 4);
      }
  }
  return output;
}
