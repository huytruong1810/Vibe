import { RESPONSE_SCHEMAS, type InferenceJob } from '../domain/agents';

export interface ModelInfo {
  readonly name: string;
  readonly size: number;
}
export interface InferenceUsage {
  readonly requests: number;
  readonly errors: number;
  readonly lastMs: number;
  readonly outputTokens: number;
  readonly queued: number;
}
export interface InferenceProvider {
  models(signal?: AbortSignal): Promise<readonly ModelInfo[]>;
  capabilityCheck(model: string, signal?: AbortSignal): Promise<void>;
  generate(
    job: InferenceJob,
    model: string,
    signal: AbortSignal,
  ): Promise<{ output: unknown; tokens: number }>;
}

export class OllamaAdapter implements InferenceProvider {
  readonly endpoint: string;
  constructor(
    endpoint = 'http://127.0.0.1:11434',
    private readonly fetcher: typeof fetch = (input, init) => fetch(input, init),
  ) {
    const url = new URL(endpoint);
    if (
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.pathname !== '/' && url.pathname !== '')
    )
      throw new Error('Choose a loopback Ollama URL, such as http://127.0.0.1:11434');
    this.endpoint = url.origin;
  }
  private async call(path: string, init: RequestInit): Promise<unknown> {
    const response = await this.fetcher(`${this.endpoint}${path}`, init);
    if (!response.ok)
      throw new Error(
        `Ollama returned HTTP ${response.status}. Check the selected model and allowed browser origin.`,
      );
    const text = await response.text();
    if (text.length > 128_000) throw new Error('Ollama response exceeded its size limit');
    return JSON.parse(text);
  }
  async models(signal = AbortSignal.timeout(5000)): Promise<readonly ModelInfo[]> {
    const data = (await this.call('/api/tags', { signal })) as {
      models?: { name?: unknown; size?: unknown }[];
    };
    if (!Array.isArray(data.models))
      throw new Error('Ollama model discovery returned an invalid response');
    return data.models
      .filter((m) => typeof m.name === 'string' && typeof m.size === 'number')
      .map((m) => ({ name: m.name as string, size: m.size as number }));
  }
  async capabilityCheck(model: string, signal = AbortSignal.timeout(60_000)): Promise<void> {
    const models = await this.models(signal);
    if (!models.some((m) => m.name === model))
      throw new Error(
        `Model “${model}” is not installed. Select an installed model or install qwen2.5:3b in Ollama.`,
      );
    const data = await this.chat(
      model,
      [{ role: 'user', content: 'Return only {"ready":true}.' }],
      {
        type: 'object',
        properties: { ready: { type: 'boolean' } },
        required: ['ready'],
        additionalProperties: false,
      },
      32,
      signal,
    );
    const output = JSON.parse(data.message.content) as { ready?: unknown };
    if (output.ready !== true)
      throw new Error('The selected model did not pass the structured-output check');
  }
  private async chat(
    model: string,
    messages: readonly { role: string; content: string }[],
    format: unknown,
    outputLimit: number,
    signal: AbortSignal,
  ): Promise<{ message: { content: string }; eval_count?: number }> {
    const data = (await this.call('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal,
      body: JSON.stringify({
        model,
        messages,
        format,
        stream: false,
        ...(model.startsWith('qwen3') || model.startsWith('gemma4') ? { think: false } : {}),
        keep_alive: '5m',
        options: { temperature: 0.4, num_ctx: 4096, num_predict: outputLimit },
      }),
    })) as { message?: { content?: unknown }; eval_count?: number };
    if (typeof data.message?.content !== 'string')
      throw new Error('Ollama did not return message content');
    return data as { message: { content: string }; eval_count?: number };
  }
  async generate(
    job: InferenceJob,
    model: string,
    signal: AbortSignal,
  ): Promise<{ output: unknown; tokens: number }> {
    const response = await this.chat(
      model,
      job.messages,
      RESPONSE_SCHEMAS[job.kind],
      job.kind === 'dialogue' ? 384 : 256,
      signal,
    );
    return { output: JSON.parse(response.message.content), tokens: response.eval_count ?? 0 };
  }
}

export interface InferenceReceipt {
  readonly jobId: string;
  readonly output?: unknown;
  readonly error?: string;
}
/** One in-flight request; real-time budget, deadlines, and dialogue preemption. */
export class InferenceScheduler {
  private readonly queue: InferenceJob[] = [];
  private readonly seen = new Set<string>();
  private readonly backgroundStarts: number[] = [];
  private active: { job: InferenceJob; abort: AbortController } | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private session = '';
  private generation = 0;
  private requests = 0;
  private errors = 0;
  private lastMs = 0;
  private outputTokens = 0;
  private backgroundDeferred = false;
  private settling: Promise<void> | null = null;
  private controls = 0;
  private controlTail: Promise<void> = Promise.resolve();
  /** Readiness checks share the same request boundary as generation. Abort and
   * settle current work before entering a serialized browser lifecycle operation. */
  async exclusive<T>(operation: () => Promise<T>): Promise<T> {
    this.controls++;
    const predecessor = this.controlTail;
    let release!: () => void;
    this.controlTail = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.active?.abort.abort();
    try {
      await predecessor;
      await this.settling;
      return await operation();
    } finally {
      this.controls--;
      release();
      this.pump();
    }
  }
  setBackgroundDeferred(value: boolean): void {
    this.backgroundDeferred = value;
    if (!value) this.pump();
  }
  constructor(
    private readonly provider: InferenceProvider,
    readonly model: string,
    private readonly receipt: (receipt: InferenceReceipt) => void,
    private readonly now: () => number = () => performance.now(),
  ) {}
  enqueue(job: InferenceJob): void {
    if (!this.session) this.session = job.session;
    if (job.session !== this.session || this.seen.has(job.id)) return;
    this.seen.add(job.id);
    if (this.seen.size > 512) this.seen.delete(this.seen.values().next().value!);
    if (this.queue.length >= 16) {
      const evicted = this.queue.pop()!;
      this.receipt({ jobId: evicted.id, error: 'Inference queue reached capacity' });
    }
    this.queue.push(job);
    this.queue.sort((a, b) => a.priority - b.priority);
    if (job.kind === 'dialogue' && this.active?.job.kind !== 'dialogue') this.active?.abort.abort();
    this.pump();
  }
  private pump(): void {
    if (this.active || this.settling || this.controls || !this.queue.length) return;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const now = this.now();
    while (this.backgroundStarts.length && now - this.backgroundStarts[0]! >= 60_000)
      this.backgroundStarts.shift();
    const first = this.queue[0]!;
    if (this.backgroundDeferred && first.kind !== 'dialogue') return;
    if (first.kind !== 'dialogue' && this.backgroundStarts.length >= 2) {
      this.timer = setTimeout(
        () => {
          this.timer = null;
          this.pump();
        },
        Math.max(1, 60_000 - (now - this.backgroundStarts[0]!)),
      );
      return;
    }
    const job = this.queue.shift()!,
      abort = new AbortController(),
      generation = this.generation;
    this.active = { job, abort };
    if (job.kind !== 'dialogue') this.backgroundStarts.push(now);
    this.requests++;
    const timeout = setTimeout(() => abort.abort(), job.kind === 'dialogue' ? 45_000 : 30_000);
    this.settling = this.provider
      .generate(job, this.model, abort.signal)
      .then((response) => {
        if (generation !== this.generation) return;
        this.outputTokens += response.tokens;
        this.receipt({ jobId: job.id, output: response.output });
      })
      .catch((error: unknown) => {
        if (generation !== this.generation) return;
        this.errors++;
        this.receipt({
          jobId: job.id,
          error: error instanceof Error ? error.message.slice(0, 180) : 'Inference failed',
        });
      })
      .finally(() => {
        clearTimeout(timeout);
        this.settling = null;
        if (generation !== this.generation) {
          this.pump();
          return;
        }
        this.lastMs = this.now() - now;
        this.active = null;
        this.pump();
      });
  }
  reset(session: string): void {
    this.generation++;
    this.active?.abort.abort();
    this.active = null;
    this.queue.length = 0;
    this.seen.clear();
    this.backgroundStarts.length = 0;
    this.session = session;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }
  get usage(): InferenceUsage {
    return {
      requests: this.requests,
      errors: this.errors,
      lastMs: this.lastMs,
      outputTokens: this.outputTokens,
      queued: this.queue.length + (this.active ? 1 : 0),
    };
  }
  dispose(): void {
    this.reset('disposed');
  }
}
