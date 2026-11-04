import { quantizePainting } from '../domain/painting-quantize';

const scope = self as unknown as DedicatedWorkerGlobalScope;
// Compile the bounded default path while the image server is generating, not after its PNG arrives.
const warmup = new Uint8ClampedArray(512 * 352 * 4);
for (let n = 0; n < warmup.length / 4; n++) {
  warmup[n * 4] = n % 251;
  warmup[n * 4 + 1] = (n * 31) % 253;
  warmup[n * 4 + 2] = (n * 97) % 255;
  warmup[n * 4 + 3] = 255;
}
for (let n = 0; n < 8; n++) quantizePainting(warmup, 512, 352);
scope.postMessage({ ready: true });
scope.onmessage = async (event: MessageEvent<{ png: Blob }>) => {
  let bitmap: ImageBitmap | undefined;
  try {
    const png = event.data.png;
    if (!(png instanceof Blob) || png.size > 8 * 1024 * 1024)
      throw Error('Painting PNG exceeds its size limit');
    const header = new Uint8Array(await png.slice(0, 33).arrayBuffer());
    if (
      header.length !== 33 ||
      ![137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82].every(
        (b, n) => header[n] === b,
      )
    )
      throw Error('Invalid painting PNG header');
    const view = new DataView(header.buffer),
      width = view.getUint32(16),
      height = view.getUint32(20);
    if (!width || !height || width > 2048 || height > 2048)
      throw Error('Painting PNG dimensions exceed 2048');
    bitmap = await createImageBitmap(png, {
      premultiplyAlpha: 'none',
      colorSpaceConversion: 'none',
    });
    if (bitmap.width !== width || bitmap.height !== height)
      throw Error('Painting PNG dimensions differ');
    const canvas = new OffscreenCanvas(width, height),
      context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw Error('Painting decode needs a worker canvas');
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, width, height).data;
    const start = performance.now(),
      result = quantizePainting(pixels, width, height);
    scope.postMessage({ result: { ...result, quantizeMs: performance.now() - start } });
  } catch (error) {
    scope.postMessage({
      error: error instanceof Error ? error.message.slice(0, 200) : 'Painting decode failed',
    });
  } finally {
    bitmap?.close();
  }
};
