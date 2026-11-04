import type { QuantizedPainting } from '../domain/painting-quantize';

export interface ImageRequest {
  readonly prompt: string;
  readonly negative: string;
  readonly width: number;
  readonly height: number;
  readonly steps: number;
  readonly cfg: number;
  readonly seed: number;
}
export type ImageProbe = { ok: true; model: string } | { ok: false; reason: string };
export interface ImageProvider {
  readonly id: 'sdcpp' | 'ollama' | 'comfyui';
  probe(signal?: AbortSignal): Promise<ImageProbe>;
  generate(request: ImageRequest, signal: AbortSignal): Promise<Blob>;
}
export const IMAGE_RESPONSE_LIMIT = 8 * 1024 * 1024;
const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
export function loopbackImageEndpoint(endpoint: string): string {
  const url = new URL(endpoint);
  if (
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw Error('Choose a loopback image URL, such as http://127.0.0.1:8080');
  return url.origin;
}
async function boundedBody(response: Response, signal: AbortSignal): Promise<Uint8Array> {
  if (!response.ok) {
    await response.body?.cancel();
    throw Error(`Image server returned HTTP ${response.status}`);
  }
  if (Number(response.headers.get('content-length')) > IMAGE_RESPONSE_LIMIT) {
    await response.body?.cancel();
    throw Error('Image response exceeded 8 MiB');
  }
  const reader = response.body?.getReader();
  if (!reader) throw Error('Image server returned no response body');
  const chunks: Uint8Array[] = [];
  let length = 0;
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener('abort', cancel, { once: true });
  try {
    for (;;) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > IMAGE_RESPONSE_LIMIT) {
        await reader.cancel();
        throw Error('Image response exceeded 8 MiB');
      }
      chunks.push(chunk.value);
    }
    signal.throwIfAborted();
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  } finally {
    signal.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}

/** The SDAPI transport is single-flight; GPU scheduling is owned by GpuArbiter. */
export class SdCppProvider implements ImageProvider {
  readonly id = 'sdcpp' as const;
  readonly endpoint: string;
  private active = false;
  private model: string | null = null;
  constructor(
    endpoint: string,
    private readonly fetcher: typeof fetch = (input, init) => fetch(input, init),
  ) {
    this.endpoint = loopbackImageEndpoint(endpoint);
  }
  private async request(
    path: string,
    init: RequestInit,
    external?: AbortSignal,
    timeout = 90_000,
  ): Promise<unknown> {
    external?.throwIfAborted();
    if (this.active) throw Error('An image request is already in progress');
    this.active = true;
    const controller = new AbortController();
    const abort = () => controller.abort(external!.reason);
    external?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(
      () =>
        controller.abort(new DOMException('Image request exceeded its timeout', 'TimeoutError')),
      timeout,
    );
    let cancel!: () => void;
    const aborted = new Promise<never>((_, reject) => {
      cancel = () => reject(controller.signal.reason);
      controller.signal.addEventListener('abort', cancel, { once: true });
    });
    try {
      return await Promise.race([
        aborted,
        (async () => {
          const response = await this.fetcher(`${this.endpoint}${path}`, {
            ...init,
            signal: controller.signal,
            credentials: 'omit',
            redirect: 'error',
            referrerPolicy: 'no-referrer',
          });
          const bytes = await boundedBody(response, controller.signal);
          return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
        })(),
      ]);
    } finally {
      clearTimeout(timer);
      external?.removeEventListener('abort', abort);
      controller.signal.removeEventListener('abort', cancel);
      this.active = false;
    }
  }
  async probe(signal?: AbortSignal): Promise<ImageProbe> {
    signal?.throwIfAborted();
    if (this.model) return { ok: true, model: this.model };
    try {
      // The pinned server exposes the loaded filename without generating an image.
      const data = await this.request('/sdapi/v1/sd-models', {}, signal, 5000);
      const model = Array.isArray(data) ? data[0]?.model_name : null;
      if (typeof model !== 'string' || !model.trim() || model.length > 200)
        throw Error('Image server has no loaded model');
      this.model = model;
      return { ok: true, model };
    } catch (error) {
      if (signal?.aborted) throw error;
      return {
        ok: false,
        reason: error instanceof Error ? error.message.slice(0, 200) : 'Image server unavailable',
      };
    }
  }
  async generate(request: ImageRequest, signal: AbortSignal): Promise<Blob> {
    if (
      !request.prompt.trim() ||
      request.prompt.length > 2000 ||
      request.negative.length > 1000 ||
      ![request.width, request.height].every((n) => Number.isInteger(n) && n >= 1 && n <= 2048) ||
      !Number.isInteger(request.steps) ||
      request.steps < 1 ||
      request.steps > 100 ||
      !Number.isFinite(request.cfg) ||
      request.cfg < 0 ||
      request.cfg > 30 ||
      !Number.isInteger(request.seed) ||
      request.seed < -1 ||
      request.seed > 0xffffffff
    )
      throw Error('Invalid image generation parameters');
    const data = (await this.request(
      '/sdapi/v1/txt2img',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: request.prompt,
          negative_prompt: request.negative,
          width: request.width,
          height: request.height,
          steps: request.steps,
          cfg_scale: request.cfg,
          seed: request.seed,
          batch_size: 1,
        }),
      },
      signal,
    )) as { images?: unknown };
    const encoded = Array.isArray(data?.images) && data.images.length === 1 ? data.images[0] : null;
    if (
      typeof encoded !== 'string' ||
      !encoded.length ||
      encoded.length % 4 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)
    )
      throw Error('Image server returned invalid base64 PNG data');
    const bytes = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
    if (!pngSignature.every((byte, n) => bytes[n] === byte))
      throw Error('Image server did not return a PNG');
    return new Blob([bytes], { type: 'image/png' });
  }
}
export class OllamaImageProvider implements ImageProvider {
  readonly id = 'ollama' as const;
  async probe(): Promise<ImageProbe> {
    return { ok: false, reason: 'Ollama image generation is unavailable. Choose sd-server.' };
  }
  async generate(_request: ImageRequest, _signal: AbortSignal): Promise<never> {
    throw Error('Ollama image generation is unavailable');
  }
}

export interface DecodedPainting extends QuantizedPainting {
  readonly quantizeMs: number;
}
/** One disposable worker per decode bounds lifetime and lets cancellation stop CPU work. */
export class PaintingDecoder {
  private active = false;
  private disposed = false;
  private prepared: { worker: Worker; ready: Promise<void>; reject(error: unknown): void } | null =
    null;
  private abortActive: (() => void) | null = null;
  constructor(
    private readonly makeWorker: () => Worker = () =>
      new Worker(new URL('../worker/painting.worker.ts', import.meta.url), { type: 'module' }),
  ) {}
  prepare(): Promise<void> {
    if (this.disposed) return Promise.reject(Error('Painting decoder disposed'));
    if (this.prepared) return this.prepared.ready;
    const worker = this.makeWorker();
    let resolve!: () => void, reject!: (error: unknown) => void;
    const ready = new Promise<void>((yes, no) => {
      resolve = yes;
      reject = no;
    });
    this.prepared = { worker, ready, reject };
    worker.onmessage = (event: MessageEvent<{ ready?: boolean; error?: string }>) => {
      if (event.data.ready) resolve();
      else if (event.data.error) this.discard(Error(event.data.error));
    };
    worker.onerror = (event) => {
      event.preventDefault();
      this.discard(Error('Painting worker failed'));
    };
    return ready;
  }
  private discard(error: unknown): void {
    const prepared = this.prepared;
    this.prepared = null;
    prepared?.reject(error);
    prepared?.worker.terminate();
  }
  async decode(png: Blob, signal: AbortSignal): Promise<DecodedPainting> {
    signal.throwIfAborted();
    if (this.active) return Promise.reject(Error('A painting decode is already in progress'));
    this.active = true;
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (
        result?: DecodedPainting,
        error: unknown = Error('Invalid painting worker response'),
      ) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', abort);
        this.discard(error);
        this.active = false;
        this.abortActive = null;
        if (result) resolve(result);
        else reject(error);
      };
      const abort = () =>
        finish(
          undefined,
          signal.reason ?? new DOMException('Painting decode aborted', 'AbortError'),
        );
      signal.addEventListener('abort', abort, { once: true });
      this.abortActive = () => finish(undefined, Error('Painting decoder disposed'));
      try {
        const ready = this.prepare(),
          worker = this.prepared?.worker;
        ready
          .then(() => {
            if (settled || !worker) return;
            worker.onmessage = (
              event: MessageEvent<{ result?: DecodedPainting; error?: string }>,
            ) =>
              event.data.error
                ? finish(undefined, Error(event.data.error))
                : finish(event.data.result);
            worker.onerror = (event) => {
              event.preventDefault();
              finish(undefined, Error('Painting worker failed'));
            };
            worker.postMessage({ png });
          })
          .catch((error) => finish(undefined, error));
      } catch (error) {
        finish(undefined, error);
      }
    });
  }
  dispose(): void {
    this.disposed = true;
    this.abortActive?.();
    this.discard(Error('Painting decoder disposed'));
  }
}
