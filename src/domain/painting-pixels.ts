import type { QuantizedPainting } from './painting-quantize';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Decode 1024 base64 chars into 1536 4-bit palette indices (48×32). */
export function decodePaintingIndices(pixels: string): Uint8Array {
  if (pixels.length !== 1024 || !/^[A-Za-z0-9+/]+$/.test(pixels))
    throw Error('Invalid painting pixels');
  const output = new Uint8Array(48 * 32);
  let pixel = 0;
  for (let n = 0; n < pixels.length; n += 4) {
    const a = alphabet.indexOf(pixels[n]!),
      b = alphabet.indexOf(pixels[n + 1]!),
      c = alphabet.indexOf(pixels[n + 2]!),
      d = alphabet.indexOf(pixels[n + 3]!);
    for (const byte of [(a << 2) | (b >> 4), ((b & 15) << 4) | (c >> 2), ((c & 3) << 6) | d]) {
      output[pixel++] = byte >> 4;
      output[pixel++] = byte & 15;
    }
  }
  return output;
}

/** Pack 1536 4-bit palette indices (48×32) into 1024 base64 chars. */
export function encodePaintingIndices(indices: ArrayLike<number>): string {
  if (indices.length !== 48 * 32) throw Error('Invalid painting pixel count');
  const packed = new Uint8Array(768);
  for (let n = 0; n < indices.length; n++) {
    const idx = indices[n]!;
    if (idx < 0 || idx > 15) throw Error('Pixel index out of bounds');
    packed[n >> 1] = packed[n >> 1]! | (idx << (n % 2 ? 0 : 4));
  }
  let result = '';
  for (let n = 0; n < packed.length; n += 3) {
    const bits = (packed[n]! << 16) | (packed[n + 1]! << 8) | packed[n + 2]!;
    result +=
      alphabet[(bits >>> 18) & 63]! +
      alphabet[(bits >>> 12) & 63]! +
      alphabet[(bits >>> 6) & 63]! +
      alphabet[bits & 63]!;
  }
  return result;
}

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
  const output = new Uint8ClampedArray(48 * 32 * 4);
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
