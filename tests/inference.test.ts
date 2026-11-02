import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  InferenceScheduler,
  OllamaAdapter,
  type InferenceProvider,
  type InferenceReceipt,
} from '../src/adapters/inference';
import type { InferenceJob } from '../src/domain/agents';

const job = (id: string, kind: InferenceJob['kind'] = 'plan'): InferenceJob => ({
  id,
  session: 'world:test',
  npcId: 'npc:vulkan',
  kind,
  priority: kind === 'dialogue' ? 0 : 2,
  expectedRevision: 0,
  memoryRevision: 0,
  sourceIds: [],
  messages: [],
});
afterEach(() => vi.useRealTimers());
describe('local inference adapter and scheduling', () => {
  it('settles cancelled generation before a readiness check and holds queued work until it ends', async () => {
    let settle!: () => void, finishCheck!: () => void;
    const checked = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishCheck = resolve;
        }),
    );
    let first = true;
    const generate = vi.fn((_job: InferenceJob, _model: string, signal: AbortSignal) => {
      if (!first) return Promise.resolve({ output: { done: true }, tokens: 1 });
      first = false;
      return new Promise<{ output: unknown; tokens: number }>((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => {
            settle = () => reject(Error('cancelled'));
          },
          { once: true },
        );
      });
    });
    const scheduler = new InferenceScheduler(
      { models: async () => [], capabilityCheck: async () => undefined, generate },
      'model',
      () => undefined,
    );
    scheduler.enqueue(job('active'));
    const control = scheduler.exclusive(checked);
    scheduler.enqueue(job('queued'));
    await Promise.resolve();
    expect(checked).not.toHaveBeenCalled();
    expect(generate).toHaveBeenCalledTimes(1);
    settle();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(checked).toHaveBeenCalledTimes(1);
    expect(generate).toHaveBeenCalledTimes(1);
    finishCheck();
    await control;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(generate).toHaveBeenCalledTimes(2);
    scheduler.dispose();
  });
  it('keeps a replacement session queued until obsolete transport cancellation settles', async () => {
    let settle!: () => void,
      first = true;
    const receipts: InferenceReceipt[] = [];
    const generate = vi.fn((_job: InferenceJob, _model: string, signal: AbortSignal) => {
      if (!first) return Promise.resolve({ output: { done: true }, tokens: 1 });
      first = false;
      return new Promise<{ output: unknown; tokens: number }>((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => {
            settle = () => reject(Error('cancelled'));
          },
          { once: true },
        );
      });
    });
    const scheduler = new InferenceScheduler(
      { models: async () => [], capabilityCheck: async () => undefined, generate },
      'model',
      (r) => receipts.push(r),
    );
    scheduler.enqueue(job('old'));
    scheduler.reset('world:new');
    scheduler.enqueue({ ...job('new'), session: 'world:new' });
    expect(generate).toHaveBeenCalledTimes(1);
    settle();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(generate).toHaveBeenCalledTimes(2);
    expect(receipts.map((r) => r.jobId)).toEqual(['new']);
    scheduler.dispose();
  });
  it('defers background starts during sleep acceleration while preserving dialogue priority', async () => {
    const generate = vi.fn(async () => ({ output: { ready: true }, tokens: 1 }));
    const scheduler = new InferenceScheduler(
      { models: async () => [], capabilityCheck: async () => undefined, generate },
      'model',
      () => undefined,
    );
    scheduler.setBackgroundDeferred(true);
    scheduler.enqueue(job('background'));
    expect(generate).not.toHaveBeenCalled();
    scheduler.enqueue(job('dialogue', 'dialogue'));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(generate).toHaveBeenCalledTimes(1);
    scheduler.setBackgroundDeferred(false);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(generate).toHaveBeenCalledTimes(2);
    scheduler.dispose();
  });
  it('constrains endpoints to loopback and validates discovered capabilities', async () => {
    expect(() => new OllamaAdapter('https://unrelated.example')).toThrow(/loopback/);
    expect(() => new OllamaAdapter('http://user:secret@localhost:11434')).toThrow();
    const requests: string[] = [];
    const adapter = new OllamaAdapter('http://localhost:11434', async (input, init) => {
      requests.push(String(input));
      return new Response(
        JSON.stringify(
          String(input).endsWith('/api/tags')
            ? { models: [{ name: 'qwen2.5:3b', size: 1900000000 }] }
            : {
                message: {
                  content: JSON.stringify({
                    ready:
                      JSON.parse(String(init?.body)).format.properties.ready.type === 'boolean',
                  }),
                },
              },
        ),
        { status: 200 },
      );
    });
    await adapter.capabilityCheck('qwen2.5:3b');
    expect(requests).toHaveLength(2);
    await expect(adapter.capabilityCheck('missing')).rejects.toThrow(/not installed/);
  });
  it('rejects failed HTTP requests and invalid structured response content', async () => {
    const failing = new OllamaAdapter(
      'http://localhost:11434',
      async () => new Response('', { status: 403 }),
    );
    await expect(failing.models()).rejects.toThrow(/403/);
    const malformed = new OllamaAdapter(
      'http://localhost:11434',
      async () => new Response(JSON.stringify({ message: { content: 'not json' } })),
    );
    await expect(
      malformed.generate(job('bad'), 'model', new AbortController().signal),
    ).rejects.toThrow();
  });
  it('uses a two-per-minute real-time background budget and deduplicates jobs', async () => {
    vi.useFakeTimers();
    const generate = vi.fn(async () => ({ output: { done: true }, tokens: 5 }));
    const provider: InferenceProvider = {
      models: async () => [],
      capabilityCheck: async () => undefined,
      generate,
    };
    const receipts: InferenceReceipt[] = [],
      scheduler = new InferenceScheduler(
        provider,
        'model',
        (r) => receipts.push(r),
        () => Date.now(),
      );
    scheduler.enqueue(job('one'));
    scheduler.enqueue(job('one'));
    await vi.advanceTimersByTimeAsync(1);
    scheduler.enqueue(job('two'));
    await vi.advanceTimersByTimeAsync(1);
    scheduler.enqueue(job('three'));
    await vi.advanceTimersByTimeAsync(1);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(receipts).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(generate).toHaveBeenCalledTimes(3);
    expect(scheduler.usage.outputTokens).toBe(15);
    scheduler.dispose();
  });
  it('preempts background inference for dialogue and drops obsolete-session completions', async () => {
    vi.useFakeTimers();
    const receipts: InferenceReceipt[] = [],
      provider: InferenceProvider = {
        models: async () => [],
        capabilityCheck: async () => undefined,
        generate: (request, _model, signal) =>
          request.kind === 'dialogue'
            ? Promise.resolve({ output: { dialogue: 'hello' }, tokens: 3 })
            : new Promise((_resolve, reject) =>
                signal.addEventListener('abort', () => reject(new Error('aborted')), {
                  once: true,
                }),
              ),
      };
    const scheduler = new InferenceScheduler(provider, 'model', (r) => receipts.push(r));
    scheduler.enqueue(job('background'));
    scheduler.enqueue(job('conversation', 'dialogue'));
    await vi.advanceTimersByTimeAsync(1);
    expect(receipts.find((r) => r.jobId === 'background')?.error).toBe('aborted');
    expect(receipts.find((r) => r.jobId === 'conversation')?.output).toEqual({ dialogue: 'hello' });
    scheduler.enqueue(job('old'));
    scheduler.reset('world:new');
    await vi.advanceTimersByTimeAsync(1);
    expect(receipts.some((r) => r.jobId === 'old')).toBe(false);
    scheduler.dispose();
  });
});
