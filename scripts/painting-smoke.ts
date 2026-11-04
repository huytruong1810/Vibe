import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { SdCppProvider } from '../src/adapters/image';
import { OllamaAdapter } from '../src/adapters/inference';
import { quantizePainting } from '../src/domain/painting-quantize';

/** Machine-A live smoke. Never invoked by CI or the machine-B mocked tests. */
export async function paintingSmoke(): Promise<void> {
  const directory = process.env.OLLAMA_SMOKE_DIR ?? join(tmpdir(), 'hearthwild-painting-smoke');
  await mkdir(directory, { recursive: true });
  const model = process.env.OLLAMA_MODEL ?? 'gemma4-abliterated:26b';
  const images = new SdCppProvider(process.env.IMAGE_ENDPOINT ?? 'http://127.0.0.1:8080');
  const ollama = new OllamaAdapter(process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434');
  const files: { path: string; sha256: string }[] = [];
  const vram: { elapsedMs: number; csv: string }[] = [];
  const times: Record<string, number> = {};
  const started = performance.now();
  let sampling: Promise<void> | null = null;
  const sample = (): Promise<void> => {
    if (sampling) return sampling;
    sampling = promisify(execFile)(
      'nvidia-smi',
      ['--query-gpu=name,driver_version,memory.used,memory.total', '--format=csv,noheader,nounits'],
      { timeout: 5000 },
    )
      .then(({ stdout }) => {
        vram.push({ elapsedMs: performance.now() - started, csv: stdout.trim() });
      })
      .catch(() => {})
      .finally(() => {
        sampling = null;
      });
    return sampling;
  };
  const timer = setInterval(() => {
    void sample();
  }, 500);
  let report: Record<string, unknown>;
  const retain = async (name: string, data: Uint8Array) => {
    const path = join(directory, name);
    await writeFile(path, data);
    files.push({ path, sha256: createHash('sha256').update(data).digest('hex') });
  };
  try {
    const probe = await images.probe();
    if (!probe.ok) throw Error(probe.reason);
    await ollama.capabilityCheck(model, AbortSignal.timeout(120_000));
    await sample();
    const pipeline = performance.now();
    await ollama.unload(model, AbortSignal.timeout(30_000));
    times.unloadMs = performance.now() - pipeline;
    const generation = performance.now();
    const blob = await images.generateManaged(
      {
        prompt:
          'A quiet wetland ferry among reeds at dusk, simple broad shapes, no text or lettering',
        negative: 'text, letters, logos, watermark, real people',
        width: 512,
        height: 352,
        steps: 8,
        cfg: 1,
        seed: 42,
      },
      AbortSignal.timeout(90_000),
    );
    times.generationMs = performance.now() - generation;
    const raw = new Uint8Array(await blob.arrayBuffer());
    await retain('painting-raw.png', raw);
    const decode = performance.now();
    const { data, info } = await sharp(raw, { limitInputPixels: 2048 * 2048 })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    times.nodeDecodeMs = performance.now() - decode;
    const quantize = performance.now();
    const painting = quantizePainting(data, info.width, info.height);
    times.coldNodeQuantizeMs = performance.now() - quantize;
    const reload = performance.now();
    await ollama.capabilityCheck(model, AbortSignal.timeout(120_000));
    times.reloadMs = performance.now() - reload;
    times.pipelineIncludingReloadMs = performance.now() - pipeline;
    const packed = Buffer.from(painting.pixels, 'base64'),
      rgb = Buffer.alloc(48 * 32 * 3);
    for (let n = 0; n < 48 * 32; n++) {
      const index = n % 2 ? packed[n >> 1]! & 15 : packed[n >> 1]! >> 4;
      for (let c = 0; c < 3; c++)
        rgb[n * 3 + c] = parseInt(painting.palette[index]!.slice(1 + c * 2, 3 + c * 2), 16);
    }
    await retain(
      'painting-native.png',
      await sharp(rgb, { raw: { width: 48, height: 32, channels: 3 } })
        .png()
        .toBuffer(),
    );
    await retain(
      'painting-preview.png',
      await sharp(rgb, { raw: { width: 48, height: 32, channels: 3 } })
        .resize(192, 128, { kernel: 'nearest' })
        .png()
        .toBuffer(),
    );
    const within30Seconds = times.pipelineIncludingReloadMs <= 30_000;
    report = {
      passed: within30Seconds,
      transportPassed: true,
      within30Seconds,
      model,
      imageModel: probe.model,
      times,
      painting,
      note: 'Machine-A live transport/Node quantizer smoke. Inspect all images. Browser worker/preview latency, cancellation under dialogue and weight hashes require separate receipts.',
    };
    if (!within30Seconds) process.exitCode = 1;
  } catch (error) {
    process.exitCode = 1;
    report = {
      passed: false,
      model,
      times,
      error: String(error),
      note: 'No passing GPU or latency evidence. Do not reload chat until the image server has confirmed stopped GPU work.',
    };
  } finally {
    clearInterval(timer);
    await sampling;
    await sample();
  }
  Object.assign(report, {
    recordedAt: new Date().toISOString(),
    endpoint: images.endpoint,
    files,
    vram,
    imagesInspected: false,
  });
  await writeFile(join(directory, 'painting-smoke.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
