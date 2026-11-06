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
export interface ImageSettings {
  endpoint: string;
  provider: 'sdcpp' | 'ollama';
  unload: boolean;
}
export interface ImageProvider {
  readonly id: 'sdcpp' | 'ollama' | 'comfyui';
  probe(signal?: AbortSignal): Promise<ImageProbe>;
  generate(request: ImageRequest, signal: AbortSignal): Promise<Blob>;
}
export const IMAGE_RESPONSE_LIMIT = 8 * 1024 * 1024;
/** No terminal server acknowledgement: do not release the GPU to Ollama. */
export class ImageGpuStateUnknown extends Error {}
export interface ImageFlight {
  endpoint: string;
  id: string | null;
}
export interface ImageFlightStore {
  read(): ImageFlight | null;
  write(flight: ImageFlight | null): void;
}
const flightKey = 'hearthwild-image-flight';
export const browserImageFlights: ImageFlightStore | undefined =
  typeof window === 'undefined'
    ? undefined
    : {
        read() {
          const text = localStorage.getItem(flightKey);
          if (!text) return null;
          const value = JSON.parse(text) as ImageFlight;
          if (
            !value ||
            typeof value.endpoint !== 'string' ||
            (value.id !== null &&
              (typeof value.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value.id)))
          )
            throw new ImageGpuStateUnknown(
              'Invalid saved image job. Restart sd-server before resetting painting recovery in Settings.',
            );
          return { endpoint: loopbackImageEndpoint(value.endpoint), id: value.id };
        },
        write(flight) {
          if (flight) localStorage.setItem(flightKey, JSON.stringify(flight));
          else localStorage.removeItem(flightKey);
        },
      };
/** Run before warming Ollama after a browser reload. */
export async function recoverImageFlight(store = browserImageFlights): Promise<void> {
  const operation = async () => {
    const flight = store?.read();
    if (flight) await new SdCppProvider(flight.endpoint, undefined, store).recoverPending();
  };
  if (typeof window !== 'undefined' && navigator.locks)
    await navigator.locks.request('hearthwild-image-gpu', operation);
  else await operation();
}
/** Invoked only by the user's explicit server-restarted recovery control. */
export async function resetImageFlightAfterServerRestart(): Promise<void> {
  const clear = () => browserImageFlights?.write(null);
  if (typeof window !== 'undefined' && navigator.locks)
    await navigator.locks.request('hearthwild-image-gpu', clear);
  else clear();
}
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
  private managed = false;
  private managedQueued = false;
  private uncertain = false;
  constructor(
    endpoint: string,
    private readonly fetcher: typeof fetch = (input, init) => fetch(input, init),
    private readonly flights: ImageFlightStore | undefined = browserImageFlights,
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
    if (this.managed || this.managedQueued || this.uncertain)
      return { ok: false, reason: 'Image GPU is busy or needs server recovery' };
    try {
      // The pinned server exposes the loaded filename without generating an image.
      const data = await this.request('/sdapi/v1/sd-models', {}, signal, 5000);
      const model = Array.isArray(data) ? data[0]?.model_name : null;
      if (typeof model !== 'string' || !model.trim() || model.length > 200)
        throw Error('Image server has no loaded model');
      return { ok: true, model };
    } catch (error) {
      if (signal?.aborted) throw error;
      return {
        ok: false,
        reason: error instanceof Error ? error.message.slice(0, 200) : 'Image server unavailable',
      };
    }
  }
  private validate(request: ImageRequest): void {
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
  }
  async generate(request: ImageRequest, signal: AbortSignal): Promise<Blob> {
    this.validate(request);
    if (this.managed || this.managedQueued || this.uncertain)
      throw Error('Image GPU is busy or needs server recovery');
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
    return this.png(
      Array.isArray(data?.images) && data.images.length === 1 ? data.images[0] : null,
    );
  }
  private png(encoded: unknown): Blob {
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
  /** Native jobs acknowledge cancellation; SDAPI fetch abort alone cannot stop GPU work. */
  async generateManaged(request: ImageRequest, signal: AbortSignal): Promise<Blob> {
    signal.throwIfAborted();
    this.validate(request);
    if (this.active || this.managedQueued || this.managed || this.uncertain)
      throw Error('Image GPU is busy or needs server recovery');
    this.managedQueued = true;
    const operation = async () => {
      await this.recoverPending();
      return this.generateManagedUnlocked(request, signal);
    };
    try {
      return typeof window !== 'undefined' && navigator.locks
        ? await navigator.locks.request('hearthwild-image-gpu', { signal }, operation)
        : await operation();
    } finally {
      this.managedQueued = false;
    }
  }
  async recoverPending(): Promise<void> {
    const flight = this.flights?.read();
    if (!flight) return;
    if (flight.endpoint !== this.endpoint) {
      await new SdCppProvider(flight.endpoint, this.fetcher, this.flights).recoverPending();
      return;
    }
    try {
      if (!flight.id) throw Error('Image submission acknowledgement was lost');
      const deadline = Date.now() + 10_000;
      let job = (await this.request(
        `/sdcpp/v1/jobs/${flight.id}/cancel`,
        { method: 'POST' },
        undefined,
        5000,
      )) as { status?: string };
      while (
        !['completed', 'failed', 'cancelled'].includes(job.status ?? '') &&
        Date.now() < deadline
      ) {
        await new Promise<void>((resolve) => setTimeout(resolve, 250));
        job = (await this.request(`/sdcpp/v1/jobs/${flight.id}`, {}, undefined, 5000)) as {
          status?: string;
        };
      }
      if (!['completed', 'failed', 'cancelled'].includes(job.status ?? ''))
        throw Error('Image job is still running');
      this.flights?.write(null);
    } catch {
      this.uncertain = true;
      throw new ImageGpuStateUnknown(
        'Previous image job could not confirm stopped GPU work. Stop/restart sd-server, then use painting recovery in Settings.',
      );
    }
  }
  private async generateManagedUnlocked(request: ImageRequest, signal: AbortSignal): Promise<Blob> {
    signal.throwIfAborted();
    this.validate(request);
    if (this.active || this.managed || this.uncertain)
      throw Error('Image GPU is busy or needs server recovery');
    this.managed = true;
    let id: string | undefined,
      idle = true,
      leaseWritten = false;
    const deadline = Date.now() + 90_000;
    type Job = {
      id?: string;
      status?: string;
      result?: { images?: { b64_json?: unknown }[] };
      error?: { message?: string };
    };
    const terminal = (job: Job) => ['completed', 'failed', 'cancelled'].includes(job.status ?? '');
    const poll = () => this.request(`/sdcpp/v1/jobs/${id}`, {}, undefined, 5000) as Promise<Job>;
    const delay = () => new Promise<void>((resolve) => setTimeout(resolve, 250));
    try {
      this.flights?.write({ endpoint: this.endpoint, id: null });
      leaseWritten = true;
      idle = false;
      // Finish submission even after a client abort so its job ID is available for cancellation.
      const submitted = (await this.request(
        '/sdcpp/v1/img_gen',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: request.prompt,
            negative_prompt: request.negative,
            width: request.width,
            height: request.height,
            seed: request.seed,
            batch_count: 1,
            output_format: 'png',
            sample_params: { sample_steps: request.steps, guidance: { txt_cfg: request.cfg } },
          }),
        },
        undefined,
        5000,
      )) as Job;
      if (typeof submitted.id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(submitted.id))
        throw Error('Image server returned no valid job ID');
      id = submitted.id;
      this.flights?.write({ endpoint: this.endpoint, id });
      for (;;) {
        signal.throwIfAborted();
        if (Date.now() >= deadline)
          throw new DOMException('Image request exceeded its timeout', 'TimeoutError');
        const job = await poll();
        if (terminal(job)) {
          idle = true;
          signal.throwIfAborted();
          if (job.status !== 'completed')
            throw Error(job.error?.message?.slice(0, 200) ?? 'Image generation cancelled');
          return this.png(job.result?.images?.length === 1 ? job.result.images[0]?.b64_json : null);
        }
        if (!['queued', 'generating'].includes(job.status ?? ''))
          throw Error('Invalid image job state');
        await delay();
      }
    } catch (error) {
      if (!idle && id) {
        // A cancel request is not a terminal acknowledgement. Keep the scheduler's lease until stopped.
        const cleanupDeadline = Date.now() + 10_000;
        try {
          let job = (await this.request(
            `/sdcpp/v1/jobs/${id}/cancel`,
            { method: 'POST' },
            undefined,
            5000,
          )) as Job;
          while (!terminal(job) && Date.now() < cleanupDeadline) {
            await delay();
            job = await poll();
          }
          idle = terminal(job);
        } catch {
          /* Unknown server state is handled below, never assumed idle. */
        }
      }
      if (!idle) {
        this.uncertain = true;
        throw new ImageGpuStateUnknown(
          'Image server did not confirm stopped GPU work. Stop or restart sd-server before reconnecting local AI.',
        );
      }
      throw error;
    } finally {
      this.managed = false;
      if (idle && leaseWritten) this.flights?.write(null);
    }
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
  readonly captionPng?: Blob;
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
