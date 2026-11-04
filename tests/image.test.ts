import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  IMAGE_RESPONSE_LIMIT,
  loopbackImageEndpoint,
  OllamaImageProvider,
  PaintingDecoder,
  SdCppProvider,
} from '../src/adapters/image';

const png = readFileSync(new URL('./fixtures/painting-golden.png', import.meta.url));
const success = () => new Response(JSON.stringify({ images: [png.toString('base64')] }));
const request = {
  prompt: 'River reeds',
  negative: 'text',
  width: 512,
  height: 352,
  steps: 8,
  cfg: 1,
  seed: 42,
};
afterEach(() => vi.useRealTimers());

it.each(['http://127.0.0.1:8080', 'http://localhost:8080/', 'https://[::1]:8080'])(
  'accepts exact loopback origins: %s',
  (endpoint) => {
    expect(loopbackImageEndpoint(endpoint)).toBe(new URL(endpoint).origin);
  },
);
it.each([
  'https://example.com',
  'http://127.0.0.2',
  'http://localhost/model',
  'http://localhost/?a=1',
  'http://localhost/#a',
  'http://user:pass@localhost',
  'ftp://localhost',
  '',
])('rejects unsafe image endpoint: %s', (endpoint) => {
  expect(() => new SdCppProvider(endpoint)).toThrow();
});
it('probes the pinned server model discovery route once without generating', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(JSON.stringify([{ model_name: 'z_image_turbo-Q4_K' }])));
  const provider = new SdCppProvider('http://localhost:8080', fetcher);
  expect(await provider.probe()).toEqual({ ok: true, model: 'z_image_turbo-Q4_K' });
  expect(await provider.probe()).toEqual({ ok: true, model: 'z_image_turbo-Q4_K' });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]![0]).toBe('http://localhost:8080/sdapi/v1/sd-models');
});
it('sends the exact bounded single-image SDAPI request and returns the original PNG', async () => {
  const fetcher = vi.fn<typeof fetch>().mockResolvedValue(success());
  const blob = await new SdCppProvider('http://127.0.0.1:8080', fetcher).generate(
    request,
    new AbortController().signal,
  );
  const [url, init] = fetcher.mock.calls[0]!;
  expect(url).toBe('http://127.0.0.1:8080/sdapi/v1/txt2img');
  expect(init).toMatchObject({ credentials: 'omit', redirect: 'error', method: 'POST' });
  expect(JSON.parse(String(init!.body))).toEqual({
    prompt: 'River reeds',
    negative_prompt: 'text',
    width: 512,
    height: 352,
    steps: 8,
    cfg_scale: 1,
    seed: 42,
    batch_size: 1,
  });
  expect(Buffer.from(await blob.arrayBuffer())).toEqual(png);
  expect(blob.type).toBe('image/png');
});
it.each([
  () => new Response('failed', { status: 503 }),
  () => new Response('not JSON'),
  () => new Response(JSON.stringify({ images: ['@@@@'] })),
  () => new Response(JSON.stringify({ images: [Buffer.from('<svg/>').toString('base64')] })),
  () => new Response(JSON.stringify({ images: [] })),
  () => new Response('x', { headers: { 'Content-Length': String(IMAGE_RESPONSE_LIMIT + 1) } }),
])('rejects HTTP, encoding, PNG and declared-size failures', async (response) => {
  await expect(
    new SdCppProvider('http://localhost', async () => response()).generate(
      request,
      new AbortController().signal,
    ),
  ).rejects.toThrow();
});
it('caps chunked response bytes and cancels the stream before parsing', async () => {
  const cancel = vi.fn();
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(new Uint8Array(IMAGE_RESPONSE_LIMIT));
      c.enqueue(new Uint8Array(1));
    },
    cancel,
  });
  await expect(
    new SdCppProvider('http://localhost', async () => new Response(body)).generate(
      request,
      new AbortController().signal,
    ),
  ).rejects.toThrow('8 MiB');
  expect(cancel).toHaveBeenCalled();
});
it('enforces90 seconds even when a fetch mock ignores abort', async () => {
  vi.useFakeTimers();
  const provider = new SdCppProvider('http://localhost', () => new Promise(() => {}));
  const pending = provider.generate(request, new AbortController().signal);
  const failed = expect(pending).rejects.toThrow('timeout');
  await vi.advanceTimersByTimeAsync(90_000);
  await failed;
  expect(vi.getTimerCount()).toBe(0);
});
it('aborts in flight, rejects a second request and frees the client slot', async () => {
  let resolve!: (response: Response) => void;
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    )
    .mockImplementation(async () => success());
  const provider = new SdCppProvider('http://localhost', fetcher),
    controller = new AbortController();
  const pending = provider.generate(request, controller.signal);
  await expect(provider.generate(request, new AbortController().signal)).rejects.toThrow(
    'already in progress',
  );
  const failed = expect(pending).rejects.toThrow('cancel painting');
  controller.abort(Error('cancel painting'));
  await failed;
  // Settle the mock too; client abort is not proof that the real server stopped GPU work.
  resolve(success());
  await expect(provider.generate(request, new AbortController().signal)).resolves.toBeInstanceOf(
    Blob,
  );
});
it('does no I/O for a pre-aborted request or the unavailable Ollama image stub', async () => {
  const fetcher = vi.fn<typeof fetch>(),
    signal = AbortSignal.abort(Error('cancelled'));
  await expect(
    new SdCppProvider('http://localhost', fetcher).generate(request, signal),
  ).rejects.toThrow('cancelled');
  expect(fetcher).not.toHaveBeenCalled();
  expect(await new OllamaImageProvider().probe()).toMatchObject({ ok: false });
  await expect(
    new OllamaImageProvider().generate(request, new AbortController().signal),
  ).rejects.toThrow('unavailable');
});
it('terminates worker decoding on abort, rejects overlapping decodes and permits another job', async () => {
  const workers: {
    terminate: ReturnType<typeof vi.fn>;
    postMessage: ReturnType<typeof vi.fn>;
    onmessage?: ((event: MessageEvent) => void) | null;
    onerror?: unknown;
  }[] = [];
  const decoder = new PaintingDecoder(() => {
    const w = { terminate: vi.fn(), postMessage: vi.fn() };
    workers.push(w);
    return w as unknown as Worker;
  });
  const controller = new AbortController(),
    pending = decoder.decode(new Blob([png]), controller.signal);
  await expect(decoder.decode(new Blob([png]), new AbortController().signal)).rejects.toThrow(
    'already in progress',
  );
  const failed = expect(pending).rejects.toThrow();
  controller.abort(null);
  await failed;
  expect(workers[0]!.terminate).toHaveBeenCalledTimes(1);
  const next = decoder.decode(new Blob([png]), new AbortController().signal);
  workers[1]!.onmessage!({ data: { ready: true } } as MessageEvent);
  await Promise.resolve();
  workers[1]!.onmessage!({
    data: { result: { pixels: 'A'.repeat(1024), palette: ['#ece0c2'], quantizeMs: 1 } },
  } as MessageEvent);
  await expect(next).resolves.toMatchObject({ quantizeMs: 1 });
  expect(workers[1]!.terminate).toHaveBeenCalledTimes(1);
});
