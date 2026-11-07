import { afterEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  SdCppProvider,
  ImageGpuStateUnknown,
  type ImageFlight,
  type ImageFlightStore,
} from '../src/adapters/image';
const request = {
  prompt: 'River reeds',
  negative: 'text',
  width: 512,
  height: 352,
  steps: 8,
  cfg: 1,
  seed: 42,
};
const png = readFileSync(new URL('./fixtures/painting-golden.png', import.meta.url)).toString(
  'base64',
);
const json = (value: unknown) => new Response(JSON.stringify(value));
const complete = { status: 'completed', result: { images: [{ b64_json: png }] } };
afterEach(() => vi.useRealTimers());
it('submits and polls native jobs with one image and the requested sampling parameters', async () => {
  const fetcher = vi.fn<typeof fetch>(async (url, init) => {
    if (String(url).endsWith('/img_gen')) {
      expect(JSON.parse(String(init?.body))).toMatchObject({
        batch_count: 1,
        output_format: 'png',
        sample_params: { sample_steps: 8, guidance: { txt_cfg: 1 } },
      });
      return json({ id: 'job_test', status: 'queued' });
    }
    expect(String(url)).toBe('http://localhost/sdcpp/v1/jobs/job_test');
    return json(complete);
  });
  await expect(
    new SdCppProvider('http://localhost', fetcher).generateManaged(
      request,
      new AbortController().signal,
    ),
  ).resolves.toBeInstanceOf(Blob);
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it('finishes submission after abort and waits for terminal cancellation before rejecting', async () => {
  vi.useFakeTimers();
  let submit!: (response: Response) => void,
    polls = 0;
  const controller = new AbortController();
  const fetcher = vi.fn<typeof fetch>(async (url) => {
    if (String(url).endsWith('/img_gen'))
      return new Promise((resolve) => {
        submit = resolve;
      });
    if (String(url).endsWith('/cancel'))
      return json({ status: 'generating', cancel_requested: true });
    return json({ status: ++polls === 1 ? 'generating' : 'cancelled' });
  });
  const provider = new SdCppProvider('http://localhost', fetcher);
  const pending = provider.generateManaged(request, controller.signal);
  const failed = expect(pending).rejects.toThrow('dialogue');
  await vi.advanceTimersByTimeAsync(0);
  controller.abort(Error('dialogue'));
  submit(json({ id: 'job_test', status: 'queued' }));
  await vi.advanceTimersByTimeAsync(250);
  expect(polls).toBe(1);
  await expect(provider.generate(request, new AbortController().signal)).rejects.toThrow('busy');
  await vi.advanceTimersByTimeAsync(250);
  await failed;
  expect(polls).toBe(2);
  expect(vi.getTimerCount()).toBe(0);
});
it('times out generation, cancels it and only releases on terminal acknowledgement', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn<typeof fetch>(async (url) =>
    json(
      String(url).endsWith('/img_gen')
        ? { id: 'job_test' }
        : String(url).endsWith('/cancel')
          ? { status: 'cancelled' }
          : { status: 'generating' },
    ),
  );
  const pending = new SdCppProvider('http://localhost', fetcher).generateManaged(
    request,
    new AbortController().signal,
  );
  const failed = expect(pending).rejects.toThrow('timeout');
  await vi.advanceTimersByTimeAsync(90_000);
  await failed;
  expect(fetcher.mock.calls.some(([url]) => String(url).endsWith('/cancel'))).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
});
it('quarantines a server that never acknowledges cancellation or loses submission state', async () => {
  vi.useFakeTimers();
  const fetcher = vi.fn<typeof fetch>(async (url) =>
    json(String(url).endsWith('/img_gen') ? { id: 'job_test' } : { status: 'generating' }),
  );
  const provider = new SdCppProvider('http://localhost', fetcher),
    controller = new AbortController();
  const pending = provider.generateManaged(request, controller.signal);
  const failed = expect(pending).rejects.toBeInstanceOf(ImageGpuStateUnknown);
  await vi.advanceTimersByTimeAsync(0);
  controller.abort();
  await vi.advanceTimersByTimeAsync(10_500);
  await failed;
  await expect(provider.generateManaged(request, new AbortController().signal)).rejects.toThrow(
    'recovery',
  );
  expect((await provider.probe()).ok).toBe(false);
  const missing = new SdCppProvider('http://localhost', async () => {
    throw Error('connection lost');
  });
  await expect(
    missing.generateManaged(request, new AbortController().signal),
  ).rejects.toBeInstanceOf(ImageGpuStateUnknown);
});
it('reconciles the saved server job before submitting replacement work after reload', async () => {
  vi.useFakeTimers();
  let marker: ImageFlight | null = { endpoint: 'http://localhost', id: 'job_previous' };
  const history: (ImageFlight | null)[] = [];
  const store: ImageFlightStore = {
    read: () => marker,
    write: (value) => {
      marker = value;
      history.push(value);
    },
  };
  const fetcher = vi.fn<typeof fetch>(async (url) => {
    if (String(url).endsWith('/job_previous/cancel'))
      return json({ status: 'generating', cancel_requested: true });
    if (String(url).endsWith('/job_previous')) return json({ status: 'cancelled' });
    if (String(url).endsWith('/img_gen')) {
      expect(marker?.id).toBeNull();
      return json({ id: 'job_new' });
    }
    return json(complete);
  });
  const pending = new SdCppProvider('http://localhost', fetcher, store).generateManaged(
    request,
    new AbortController().signal,
  );
  await vi.advanceTimersByTimeAsync(500);
  await expect(pending).resolves.toBeInstanceOf(Blob);
  expect(fetcher.mock.calls.map(([url]) => new URL(String(url)).pathname)).toEqual([
    '/sdcpp/v1/jobs/job_previous/cancel',
    '/sdcpp/v1/jobs/job_previous',
    '/sdcpp/v1/img_gen',
    '/sdcpp/v1/jobs/job_new',
  ]);
  expect(history).toEqual([
    null,
    { endpoint: 'http://localhost', id: null },
    { endpoint: 'http://localhost', id: 'job_new' },
    null,
  ]);
  expect(marker).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});
it('does no generation when a previous submission has no ID or durable storage cannot be written', async () => {
  const fetcher = vi.fn<typeof fetch>();
  const lost: ImageFlightStore = {
    read: () => ({ endpoint: 'http://localhost', id: null }),
    write: vi.fn(),
  };
  await expect(
    new SdCppProvider('http://localhost', fetcher, lost).generateManaged(
      request,
      new AbortController().signal,
    ),
  ).rejects.toBeInstanceOf(ImageGpuStateUnknown);
  expect(lost.write).not.toHaveBeenCalled();
  const full: ImageFlightStore = {
    read: () => null,
    write: () => {
      throw Error('storage full');
    },
  };
  await expect(
    new SdCppProvider('http://localhost', fetcher, full).generateManaged(
      request,
      new AbortController().signal,
    ),
  ).rejects.toThrow('storage full');
  expect(fetcher).not.toHaveBeenCalled();
});
it('rejects pre-aborted work without submission and leaves failed terminal jobs reusable', async () => {
  const fetcher = vi.fn<typeof fetch>(async (url) =>
    json(
      String(url).endsWith('/img_gen')
        ? { id: 'job_test' }
        : { status: 'failed', error: { message: 'out of VRAM' } },
    ),
  );
  const provider = new SdCppProvider('http://localhost', fetcher);
  await expect(
    provider.generateManaged(request, AbortSignal.abort(Error('cancelled'))),
  ).rejects.toThrow('cancelled');
  expect(fetcher).not.toHaveBeenCalled();
  for (let n = 0; n < 2; n++)
    await expect(provider.generateManaged(request, new AbortController().signal)).rejects.toThrow(
      'out of VRAM',
    );
});
