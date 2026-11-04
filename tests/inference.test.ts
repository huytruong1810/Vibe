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
  it('captions one image only for a vision model and rejects unbounded or action-bearing output', async () => {
    const bodies: any[] = [];
    let vision = false,
      caption: unknown = { caption: 'Purple reeds beside green water.' };
    const adapter = new OllamaAdapter('http://localhost:11434', async (url, init) => {
      bodies.push(JSON.parse(String(init?.body)));
      return Response.json(
        String(url).endsWith('/api/show')
          ? { capabilities: vision ? ['vision'] : ['completion'] }
          : { message: { content: JSON.stringify(caption) } },
      );
    });
    const png = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
      signal = new AbortController().signal;
    expect(await adapter.captionPainting('gemma4', png, signal)).toBeNull();
    expect(bodies).toHaveLength(1);
    vision = true;
    expect(await adapter.captionPainting('gemma4', png, signal)).toBe(
      'Purple reeds beside green water.',
    );
    expect(bodies.at(-1)).toMatchObject({
      stream: false,
      think: false,
      options: { num_predict: 140, num_ctx: 4096 },
      messages: [{ role: 'system' }, { role: 'user', images: ['AQID'] }],
    });
    caption = { caption: 'word '.repeat(41) };
    expect(await adapter.captionPainting('gemma4', png, signal)).toBeNull();
    caption = { caption: 'Reeds', action: { type: 'DROP_GIFT' } };
    expect(await adapter.captionPainting('gemma4', png, signal)).toBeNull();
  });
  it('sends fixed read ranges as equivalent homogeneous arrays accepted by Ollama', async () => {
    const adapter = new OllamaAdapter('http://localhost:11434', async (_input, init) => {
      const schema = JSON.parse(String(init?.body)).format;
      const read = schema.properties.action.oneOf.find(
        (branch: any) => branch.properties.type.const === 'READ_TEXT',
      );
      expect(read.properties.pages.items).toMatchObject({ type: 'integer' });
      expect(read.properties.pages).toMatchObject({ minItems: 2, maxItems: 2 });
      expect(read.properties.pages).not.toHaveProperty('prefixItems');
      return new Response(
        JSON.stringify({
          message: {
            content: JSON.stringify({
              dialogue: 'Let me read.',
              emotion: 'neutral',
              action: { type: 'READ_TEXT', artifactId: 'art:1', pages: [1, 2] },
            }),
          },
        }),
      );
    });
    const response = await adapter.generate(
      job('proposal', 'dialogue'),
      'gemma4:e4b',
      new AbortController().signal,
    );
    expect(response.output).toHaveProperty('action.pages', [1, 2]);
  });
  it('collects a bounded reading stream across UTF-8 chunk boundaries before exposing JSON', async () => {
    const output = {
      dialogue: 'The river is quiet, é.',
      emotion: 'thoughtful',
      summary: 'The book describes a quiet river.',
      wantsMore: false,
    };
    const bytes = new TextEncoder().encode(
      JSON.stringify({ message: { content: JSON.stringify(output) }, done: false }) +
        '\n' +
        JSON.stringify({ done: true, eval_count: 24, prompt_eval_count: 100 }),
    );
    const split = bytes.findIndex((b) => b === 0xc3) + 1;
    const adapter = new OllamaAdapter('http://localhost:11434', async (_input, init) => {
      const body = JSON.parse(String(init?.body));
      expect(body.stream).toBe(true);
      expect(body.options.num_gpu).toBe(0);
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(bytes.slice(0, split));
            controller.enqueue(bytes.slice(split));
            controller.close();
          },
        }),
      );
    });
    const result = await adapter.generate(
      { ...job('reading', 'reading'), numGpu: 0 },
      'gemma4:e4b',
      new AbortController().signal,
    );
    expect(result.output).toEqual(output);
    expect(result.firstTokenMs).toBeGreaterThanOrEqual(0);
    expect(result.promptTokens).toBe(100);
    const unfinished = new OllamaAdapter(
      'http://localhost:11434',
      async () => new Response(JSON.stringify({ message: { content: '{}' }, done: false }) + '\n'),
    );
    await expect(
      unfinished.generate(job('unfinished', 'reading'), 'gemma4:e4b', new AbortController().signal),
    ).rejects.toThrow(/complete response/);
    const oversized = new OllamaAdapter(
      'http://localhost:11434',
      async () => new Response('x'.repeat(128001)),
    );
    await expect(
      oversized.generate(job('oversized', 'reading'), 'gemma4:e4b', new AbortController().signal),
    ).rejects.toThrow(/size limit/);
  });
  it('lets foreground reading bypass routine quota and lets dialogue preempt that reading', async () => {
    vi.useFakeTimers();
    let readingAborted = false;
    const receipts: InferenceReceipt[] = [];
    const provider: InferenceProvider = {
      models: async () => [],
      capabilityCheck: async () => {},
      generate: async (request, _model, signal) => {
        if (request.kind === 'reading')
          return new Promise((_resolve, reject) =>
            signal.addEventListener(
              'abort',
              () => {
                readingAborted = true;
                reject(Error('preempted'));
              },
              { once: true },
            ),
          );
        return { output: { done: true }, tokens: 1 };
      },
    };
    const scheduler = new InferenceScheduler(
      provider,
      'model',
      (r) => receipts.push(r),
      () => Date.now(),
    );
    scheduler.enqueue(job('routine1'));
    await vi.advanceTimersByTimeAsync(1);
    scheduler.enqueue(job('routine2'));
    await vi.advanceTimersByTimeAsync(1);
    scheduler.setBackgroundDeferred(true);
    scheduler.enqueue({
      ...job('read', 'reading'),
      priority: 0.5,
      readingTarget: {
        conversationId: 'conversation:test',
        metadata: {
          id: 'art:1',
          kind: 'note',
          title: 'River',
          author: { kind: 'player' },
          createdDay: 0,
          revision: 1,
          sealed: true,
          length: 1,
        },
        source: { artifactId: 'art:1', revision: 1, lines: [1, 1] },
        requested: { type: 'READ_TEXT', artifactId: 'art:1', lines: [1, 1] },
        excerpt: 'The river.',
      },
    });
    await vi.advanceTimersByTimeAsync(1);
    scheduler.enqueue(job('dialogue', 'dialogue'));
    await vi.advanceTimersByTimeAsync(1);
    expect(readingAborted).toBe(true);
    expect(receipts.some((r) => r.jobId === 'dialogue' && r.output)).toBe(true);
    scheduler.dispose();
  });
  it('runs extraction despite the routine quota and resumes it after dialogue preemption', async () => {
    vi.useFakeTimers();
    let extractions = 0;
    const receipts: InferenceReceipt[] = [];
    const provider: InferenceProvider = {
      models: async () => [],
      capabilityCheck: async () => {},
      generate: (request, _model, signal) => {
        if (request.kind === 'extraction' && ++extractions === 1)
          return new Promise((_resolve, reject) =>
            signal.addEventListener('abort', () => reject(Error('preempted')), { once: true }),
          );
        return Promise.resolve({ output: { done: true }, tokens: 1 });
      },
    };
    const scheduler = new InferenceScheduler(
      provider,
      'model',
      (r) => receipts.push(r),
      () => Date.now(),
    );
    scheduler.enqueue(job('routine1'));
    await vi.advanceTimersByTimeAsync(1);
    scheduler.enqueue(job('routine2'));
    await vi.advanceTimersByTimeAsync(1);
    scheduler.enqueue({ ...job('extract', 'extraction'), priority: 1 });
    expect(extractions).toBe(1);
    scheduler.enqueue(job('new-dialogue', 'dialogue'));
    await vi.advanceTimersByTimeAsync(10);
    expect(extractions).toBe(2);
    expect(receipts.filter((r) => r.jobId === 'extract')).toEqual([
      { jobId: 'extract', output: { done: true } },
    ]);
    scheduler.dispose();
  });
  it('sends per-job context and CPU options and returns prompt token counts', async () => {
    let request: Record<string, unknown> = {};
    const adapter = new OllamaAdapter('http://localhost:11434', async (_url, init) => {
      request = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({ message: { content: '{}' }, eval_count: 12, prompt_eval_count: 246 }),
      );
    });
    const result = await adapter.generate(
      { ...job('compact', 'compaction'), contextTokens: 16384, numGpu: 0, outputLimit: 768 },
      'gemma4-abliterated:e4b',
      new AbortController().signal,
    );
    expect(request.model).toBe('gemma4-abliterated:e4b');
    expect(request.options).toEqual({
      temperature: 0.4,
      num_ctx: 16384,
      num_predict: 768,
      num_gpu: 0,
    });
    expect(result.promptTokens).toBe(246);
  });
  it('routes compaction to its selected model and forwards token calibration receipts', async () => {
    const generate = vi.fn(async (_job: InferenceJob, _model: string, _signal: AbortSignal) => ({
      output: {},
      tokens: 3,
      promptTokens: 150,
    }));
    const receipts: InferenceReceipt[] = [];
    const scheduler = new InferenceScheduler(
      { models: async () => [], capabilityCheck: async () => undefined, generate },
      'dialogue-model',
      (r) => receipts.push(r),
    );
    scheduler.enqueue({ ...job('compact', 'compaction'), model: 'cpu-model', numGpu: 0 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(generate.mock.calls[0]?.[1]).toBe('cpu-model');
    expect(receipts[0]?.promptTokens).toBe(150);
    scheduler.dispose();
  });

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
    scheduler.enqueue(job('background', 'compaction'));
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
