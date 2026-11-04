import { test, expect } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

test('C19 mocked sd-server PNG decodes and quantizes in a bounded worker', async ({ page }) => {
  const png = await readFile(new URL('../fixtures/painting-golden.png', import.meta.url));
  let generations = 0;
  await page.route('http://127.0.0.1:5899/**', async (route) => {
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    };
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers });
      return;
    }
    if (route.request().url().endsWith('/sdapi/v1/sd-models')) {
      await route.fulfill({ json: [{ model_name: 'z_image_turbo-Q4_K' }], headers });
      return;
    }
    expect(route.request().url()).toBe('http://127.0.0.1:5899/sdapi/v1/txt2img');
    expect(route.request().postDataJSON()).toMatchObject({
      width: 512,
      height: 352,
      batch_size: 1,
      seed: 42,
    });
    generations++;
    await route.fulfill({ json: { images: [png.toString('base64')] }, headers });
  });
  await page.goto('/?test=1');
  await page.waitForFunction(() => (window as any).__hearthwild?.stats().loadMs > 0);
  const result = await page.evaluate(async () => {
    const modulePath = new URL('src/adapters/image.ts', location.href).pathname;
    const { SdCppProvider, PaintingDecoder } = (await import(
      modulePath
    )) as typeof import('../../src/adapters/image');
    const provider = new SdCppProvider('http://127.0.0.1:5899'),
      decoder = new PaintingDecoder();
    const started = performance.now();
    await decoder.prepare();
    const workerStartupMs = performance.now() - started,
      probe = await provider.probe();
    const blob = await provider.generate(
      {
        prompt: 'River reeds',
        negative: 'text',
        width: 512,
        height: 352,
        steps: 8,
        cfg: 1,
        seed: 42,
      },
      new AbortController().signal,
    );
    const painting = await decoder.decode(blob, new AbortController().signal);
    const header = new Uint8Array(33);
    header.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82]);
    const view = new DataView(header.buffer);
    view.setUint32(16, 4096);
    view.setUint32(20, 4096);
    const rejectsOversizedHeader = await decoder
      .decode(new Blob([header]), new AbortController().signal)
      .then(
        () => false,
        (error) => String(error).includes('2048'),
      );
    return {
      ...painting,
      workerStartupMs,
      probe,
      mockPipelineMs: performance.now() - started,
      rejectsOversizedHeader,
    };
  });
  expect(generations).toBe(1);
  expect(result.probe).toEqual({ ok: true, model: 'z_image_turbo-Q4_K' });
  expect(result.rejectsOversizedHeader).toBe(true);
  const painting = { pixels: result.pixels, palette: result.palette };
  const hash = createHash('sha256').update(JSON.stringify(painting)).digest('hex');
  expect(hash).toBe('80bd3049d7d65ff7f8ce461f9ca0ffb7489b50e1f9780879482b62281f14ba01');
  const packed = Buffer.from(result.pixels, 'base64'),
    rgb = Buffer.alloc(48 * 32 * 3);
  for (let n = 0; n < 48 * 32; n++) {
    const byte = packed[n >> 1]!,
      index = n % 2 ? byte & 15 : byte >> 4;
    const hex = result.palette[index]!;
    for (let c = 0; c < 3; c++) rgb[n * 3 + c] = parseInt(hex.slice(1 + c * 2, 3 + c * 2), 16);
  }
  await mkdir('artifacts', { recursive: true });
  await sharp(rgb, { raw: { width: 48, height: 32, channels: 3 } })
    .png()
    .toFile('artifacts/c19-golden-native.png');
  await sharp(rgb, { raw: { width: 48, height: 32, channels: 3 } })
    .resize(192, 128, { kernel: 'nearest' })
    .png()
    .toFile('artifacts/c19-golden-preview.png');
  await writeFile(
    'artifacts/c19-golden.json',
    JSON.stringify({ ...result, hash, realImageModel: false }, null, 2),
  );
});
