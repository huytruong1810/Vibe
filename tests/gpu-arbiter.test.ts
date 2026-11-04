import { expect, it, vi } from 'vitest';
import { GpuArbiter } from '../src/adapters/gpu-arbiter';
import { ImageGpuStateUnknown } from '../src/adapters/image';
import { InferenceScheduler, OllamaAdapter } from '../src/adapters/inference';

const flush = async () => {
  for (let n = 0; n < 15; n++) await Promise.resolve();
};
function harness(unloadEnabled = true) {
  let leased = false;
  const scheduler = {
    foregroundPending: false,
    suspend: vi.fn(),
    exclusive: async <T>(operation: () => Promise<T>): Promise<T> => {
      expect(leased).toBe(false);
      leased = true;
      try {
        return await operation();
      } finally {
        leased = false;
      }
    },
  };
  const unload = vi.fn(async () => {
    expect(leased).toBe(true);
  });
  const arbiter = new GpuArbiter(scheduler, unload, unloadEnabled);
  return { arbiter, scheduler, unload, leased: () => leased };
}
it('defers villagers until idle pause/sleep/acceleration and preserves the GPU lease until cancellation settles', async () => {
  const { arbiter, unload, leased } = harness();
  let stopped!: () => void;
  const run = vi.fn((signal: AbortSignal) =>
    run.mock.calls.length === 1
      ? new Promise<string>((_resolve, reject) => {
          signal.addEventListener('abort', () => {
            stopped = () => reject(signal.reason);
          });
        })
      : Promise.resolve('painting'),
  );
  const pending = arbiter.request('npc:1', 'villager', run);
  await flush();
  expect(run).not.toHaveBeenCalled();
  arbiter.setWindow({ dialogue: false, paused: true, asleep: false, accelerated: false });
  await flush();
  expect(run).toHaveBeenCalledTimes(1);
  arbiter.setWindow({ dialogue: true, paused: true, asleep: false, accelerated: false });
  await flush();
  expect(leased()).toBe(true);
  expect(run.mock.calls[0]![0].aborted).toBe(true);
  stopped();
  await flush();
  expect(leased()).toBe(false);
  expect(run).toHaveBeenCalledTimes(1);
  arbiter.setWindow({ dialogue: false, paused: false, asleep: true, accelerated: true });
  await expect(pending).resolves.toBe('painting');
  expect(run).toHaveBeenCalledTimes(2);
  expect(unload).toHaveBeenCalledTimes(2);
  await arbiter.dispose();
});
it('never preempts player work for dialogue, serializes players and honors optional unload', async () => {
  const { arbiter, unload } = harness(false);
  let complete!: (value: string) => void, signal!: AbortSignal;
  const first = arbiter.request('player:1', 'player', (s) => {
    signal = s;
    return new Promise<string>((resolve) => {
      complete = resolve;
    });
  });
  const runSecond = vi.fn(async () => 'second');
  const second = arbiter.request('player:2', 'player', runSecond);
  await flush();
  arbiter.setWindow({ dialogue: true, paused: true, asleep: false, accelerated: false });
  expect(signal.aborted).toBe(false);
  expect(runSecond).not.toHaveBeenCalled();
  complete('first');
  await expect(first).resolves.toBe('first');
  await expect(second).resolves.toBe('second');
  expect(unload).not.toHaveBeenCalled();
  await arbiter.dispose();
});
it('cancels queued work and disposal waits for active server cleanup', async () => {
  const { arbiter } = harness();
  const queued = arbiter.request('npc', 'villager', async () => 'unused');
  const rejected = expect(queued).rejects.toThrow('cancelled');
  arbiter.cancel('npc');
  await rejected;
  let settle!: () => void;
  const active = arbiter.request(
    'player',
    'player',
    (signal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => {
          settle = () => reject(signal.reason);
        });
      }),
  );
  const failed = expect(active).rejects.toThrow('disposed');
  await flush();
  let disposed = false;
  const cleanup = arbiter.dispose().then(() => {
    disposed = true;
  });
  await flush();
  expect(disposed).toBe(false);
  settle();
  await cleanup;
  await failed;
});
it('suspends chat and rejects the painting queue if GPU cancellation is unacknowledged', async () => {
  const { arbiter, scheduler } = harness();
  const pending = arbiter.request('player', 'player', async () => {
    throw new ImageGpuStateUnknown('recover server');
  });
  const queued = arbiter.request('npc', 'villager', async () => 'unused');
  await expect(pending).rejects.toThrow('recover server');
  await expect(queued).rejects.toThrow('recover server');
  expect(scheduler.suspend).toHaveBeenCalledTimes(1);
  await expect(arbiter.request('later', 'player', async () => 'unused')).rejects.toThrow(
    'unavailable',
  );
  await arbiter.dispose();
});
it('sends and awaits the documented Ollama unload call', async () => {
  const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
    expect(JSON.parse(String(init?.body))).toEqual({
      model: 'gemma4:26b',
      keep_alive: 0,
      stream: false,
    });
    return new Response(JSON.stringify({ done: true }));
  });
  await new OllamaAdapter('http://localhost:11434', fetcher).unload(
    'gemma4:26b',
    new AbortController().signal,
  );
  expect(fetcher.mock.calls[0]![0]).toBe('http://localhost:11434/api/generate');
});
it('keeps real scheduler dialogue queued behind a player lease and stops pumping after quarantine', async () => {
  const generate = vi.fn(async () => ({ output: {}, tokens: 0 }));
  const scheduler = new InferenceScheduler(
    { generate, models: async () => [], capabilityCheck: async () => {} },
    'model',
    () => {},
  );
  const arbiter = new GpuArbiter(scheduler, async () => {});
  let complete!: () => void;
  const painting = arbiter.request(
    'player',
    'player',
    () =>
      new Promise<void>((resolve) => {
        complete = resolve;
      }),
  );
  await flush();
  scheduler.enqueue({
    id: 'dialogue',
    kind: 'dialogue',
    session: 'test',
    npcId: 'npc:lark',
    priority: 0,
    expectedRevision: 0,
    memoryRevision: 0,
    sourceIds: [],
    messages: [],
  });
  expect(generate).not.toHaveBeenCalled();
  complete();
  await painting;
  await flush();
  expect(generate).toHaveBeenCalledTimes(1);
  scheduler.suspend();
  scheduler.enqueue({
    id: 'next',
    kind: 'dialogue',
    session: 'test',
    npcId: 'npc:lark',
    priority: 0,
    expectedRevision: 0,
    memoryRevision: 0,
    sourceIds: [],
    messages: [],
  });
  await flush();
  expect(generate).toHaveBeenCalledTimes(1);
  await arbiter.dispose();
  scheduler.dispose();
});
