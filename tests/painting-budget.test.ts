import { expect, it } from 'vitest';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { quantizePainting } from '../src/domain/painting-quantize';
const fixture = new URL('./fixtures/painting-golden.png', import.meta.url);

it('quantizes the configured512x352 input within the5ms CPU budget after warmup', async () => {
  const { data, info } = await sharp(fileURLToPath(fixture))
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
