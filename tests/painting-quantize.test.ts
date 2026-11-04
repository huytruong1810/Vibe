import { expect, it } from 'vitest';
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PAINTING_COLORS, quantizePainting } from '../src/domain/painting-quantize';
import palette from '../art/source/forge/spec/palette.json';

const fixture = fileURLToPath(new URL('./fixtures/painting-golden.png', import.meta.url));
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function solid(width: number, height: number, hex: string): Uint8Array {
  const data = new Uint8Array(width * height * 4);
  const rgba = [1, 3, 5].map((n) => parseInt(hex.slice(n, n + 2), 16)).concat(255);
  for (let n = 0; n < data.length; n += 4) data.set(rgba, n);
  return data;
}

it('locks the PNG golden bytes, palette limit, outline exclusion and deterministic packed indices', async () => {
  const { data, info } = await sharp(fixture)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const result = quantizePainting(data, info.width, info.height);
  expect(hash(result)).toBe('80bd3049d7d65ff7f8ce461f9ca0ffb7489b50e1f9780879482b62281f14ba01');
  expect(quantizePainting(data, info.width, info.height)).toEqual(result);
  expect(result.palette).toHaveLength(16);
  expect(new Set(result.palette).size).toBe(16);
  expect(result.palette.every((c) => PAINTING_COLORS.includes(c))).toBe(true);
  expect(
    result.palette.some((c) => Object.values(palette.ramps['outline-neutral'].steps).includes(c)),
  ).toBe(false);
  const packed = Buffer.from(result.pixels, 'base64');
  expect(packed).toHaveLength(768);
  expect(
    [...packed].every((b) => b >> 4 < result.palette.length && (b & 15) < result.palette.length),
  ).toBe(true);
});

it.each([
  [96, 32],
  [48, 64],
])('centre-crops %ix%i without admitting the outside strips', (width, height) => {
  const data = solid(width!, height!, palette.ramps.ember.steps.mid);
  const color = palette.ramps.teal.steps.mid;
  const rgb = [1, 3, 5].map((n) => parseInt(color.slice(n, n + 2), 16));
  for (let y = 0; y < height!; y++)
    for (let x = 0; x < width!; x++)
      if (width === 96 ? x >= 24 && x < 72 : y >= 16 && y < 48)
        data.set([...rgb, 255], (y * width! + x) * 4);
  expect(quantizePainting(data, width!, height!).palette).toEqual([color]);
});

it('area-averages in linear light and flattens alpha onto palette paper', () => {
  const data = solid(96, 64, '#000000');
  for (let y = 0; y < 64; y++)
    for (let x = 1; x < 96; x += 2) data.set([255, 255, 255, 255], (y * 96 + x) * 4);
  const result = quantizePainting(data, 96, 64);
  expect(result.palette).toHaveLength(1);
  // Source cells map in pairs after cropping; linear 50% gray is about187 sRGB, not127.
  expect(result.palette.every((c) => parseInt(c.slice(1, 3), 16) > 160)).toBe(true);
  expect(quantizePainting(new Uint8Array(4), 1, 1).palette).toEqual([
    palette.ramps.cream.steps.mid,
  ]);
});

it.each([
  [0, 1, 0],
  [2049, 1, 8196],
  [1, 1, 3],
])('rejects invalid bounded RGBA input', (width, height, length) => {
  expect(() => quantizePainting(new Uint8Array(length!), width!, height!)).toThrow(
    'Invalid painting',
  );
});

it('quantizes the configured512x352 input within the5ms CPU budget after warmup', async () => {
  const { data, info } = await sharp(fixture)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let n = 0; n < 8; n++) quantizePainting(data, info.width, info.height);
  const times = Array.from({ length: 15 }, () => {
    const start = performance.now();
    quantizePainting(data, info.width, info.height);
    return performance.now() - start;
  }).sort((a, b) => a - b);
  expect(times[7]).toBeLessThanOrEqual(5);
});
