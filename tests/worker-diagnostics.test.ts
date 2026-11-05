import { afterEach, expect, it, vi } from 'vitest';
import type { FromWorker, ToWorker } from '../src/domain/contracts';
import { migrateSave } from '../src/domain/save-schema';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('routes routine snapshots directly to storage and forwards only success or failure receipts to the UI', async () => {
  vi.resetModules();
  vi.useFakeTimers();
  const messages: FromWorker[] = [];
  class Writer {
    static latest: Writer;
    onmessage: ((event: MessageEvent) => void) | null = null;
    onerror: ((event: ErrorEvent) => void) | null = null;
    messages: any[] = [];
    constructor() {
      Writer.latest = this;
    }
    postMessage(message: unknown) {
      this.messages.push(structuredClone(message));
    }
    terminate = vi.fn();
  }
  const scope = {
    onmessage: null as ((event: MessageEvent<ToWorker>) => void) | null,
    postMessage: (message: FromWorker) => messages.push(structuredClone(message)),
    close: vi.fn(),
  };
  vi.stubGlobal('self', scope);
  vi.stubGlobal('Worker', Writer);
  await import('../src/worker/simulation.worker');
  const send = (data: ToWorker) => scope.onmessage!({ data } as MessageEvent<ToWorker>);
  send({ type: 'initialize', seed: 42, origin: 1, population: 0 });
  const before = messages.length;
  send({ type: 'persistCheckpoint', requestId: 'save' });
  expect(messages).toHaveLength(before);
  expect(Writer.latest.messages[0]).toMatchObject({
    type: 'checkpoint',
    requestId: 'save',
    snapshot: { version: 9, seed: 42 },
  });
  Writer.latest.onmessage!({ data: { type: 'saved', requestId: 'save' } } as MessageEvent);
  expect(messages.at(-1)).toEqual({ type: 'checkpointSaved', requestId: 'save' });
  send({ type: 'persistCheckpoint', requestId: 'error' });
  Writer.latest.onmessage!({
    data: { type: 'error', requestId: 'error', message: 'Storage full' },
  } as MessageEvent);
  expect(messages.at(-1)).toEqual({ type: 'error', requestId: 'error', message: 'Storage full' });
  expect(messages.every((m) => m.type !== 'checkpoint')).toBe(true);
  send({ type: 'dispose' });
  expect(Writer.latest.messages.at(-1)).toEqual({ type: 'dispose' });
});

it('keeps worker result/frame order and bounds opt-in service diagnostics without changing content', async () => {
  vi.resetModules();
  vi.useFakeTimers();
  const messages: FromWorker[] = [];
  const worker = {
    onmessage: null as ((event: MessageEvent<ToWorker>) => void) | null,
    postMessage: (message: FromWorker) => messages.push(structuredClone(message)),
    close: vi.fn(),
  };
  vi.stubGlobal('self', worker);
  await import('../src/worker/simulation.worker');
  const send = (data: ToWorker) => worker.onmessage!({ data } as MessageEvent<ToWorker>);
  send({ type: 'initialize', seed: 42, origin: 1, population: 0 });
  const ready = messages[0]!;
  if (ready.type !== 'ready') throw Error('Expected ready');
  const session = ready.frame.session;
  for (let n = 0; n < 20; n++) {
    send({
      type: 'command',
      diagnostic: true,
      envelope: {
        id: `test:${n}`,
        session,
        issuer: 'player',
        command: { type: 'pause', token: 'menu' },
      },
    });
    const [result, frame] = messages.slice(-2);
    expect(result?.type).toBe('result');
    expect(frame?.type).toBe('frame');
    expect(result?.diagnostic?.requestId).toBe(`test:${n}`);
    expect(result!.diagnostic!.recent.length).toBeLessThanOrEqual(16);
  }
  send({
    type: 'artifactContent',
    artifactId: 'art:missing',
    requestId: 'content',
    diagnostic: true,
  });
  const content = messages.at(-1)!;
  expect(content.type).toBe('artifactContent');
  if (content.type !== 'artifactContent') throw Error('Expected content');
  expect(content.artifact).toBeNull();
  expect(content.diagnostic?.requestId).toBe('content');
  expect(content.diagnostic!.serviceEnd).toBeGreaterThanOrEqual(content.diagnostic!.received);
  expect(content.diagnostic!.reply).toBeGreaterThanOrEqual(content.diagnostic!.serviceEnd);
  expect(content.diagnostic!.recent.some((entry) => entry.name === 'command-publish')).toBe(true);
  expect(content.diagnostic!.recent.some((entry) => entry.name === 'host-artifact-content')).toBe(
    true,
  );
  send({ type: 'artifactContent', artifactId: 'art:missing', requestId: 'plain' });
  expect(messages.at(-1)!.diagnostic).toBeUndefined();
  send({ type: 'dispose' });
  expect(worker.close).toHaveBeenCalledOnce();
});

it('keeps paused commands and checkpoints current without repeatedly rebuilding the same frame', async () => {
  vi.resetModules();
  vi.useFakeTimers();
  const messages: FromWorker[] = [];
  const worker = {
    onmessage: null as ((event: MessageEvent<ToWorker>) => void) | null,
    postMessage: (message: FromWorker) => messages.push(structuredClone(message)),
    close: vi.fn(),
  };
  vi.stubGlobal('self', worker);
  await import('../src/worker/simulation.worker');
  const send = (data: ToWorker) => worker.onmessage!({ data } as MessageEvent<ToWorker>);
  send({ type: 'initialize', seed: 42, origin: 1, population: 0 });
  const initial = messages[0]!;
  if (initial.type !== 'ready') throw Error('Expected ready');
  let serial = 0;
  const command = (type: 'pause' | 'resume', token: 'menu' | 'hidden') =>
    send({
      type: 'command',
      envelope: {
        id: `cadence:${++serial}`,
        session: initial.frame.session,
        issuer: 'player',
        command: { type, token },
      },
    });
  command('pause', 'menu');
  const count = messages.length;
  await vi.advanceTimersByTimeAsync(5000);
  expect(messages).toHaveLength(count);
  send({ type: 'checkpoint', requestId: 'paused-save' });
  const checkpoint = messages.at(-1)!;
  if (checkpoint.type !== 'checkpoint') throw Error('Expected checkpoint');
  expect(migrateSave(checkpoint.snapshot).tick).toBe(initial.frame.tick);
  command('pause', 'hidden');
  const changed = messages.at(-1)!;
  if (changed.type !== 'frame') throw Error('Expected command frame');
  expect(changed.frame.paused).toEqual(['menu', 'hidden']);
  expect(changed.frame.tick).toBe(initial.frame.tick);
  command('resume', 'menu');
  const stillPaused = messages.length;
  await vi.advanceTimersByTimeAsync(500);
  expect(messages).toHaveLength(stillPaused);
  command('resume', 'hidden');
  await vi.advanceTimersByTimeAsync(250);
  const resumed = messages.filter((m) => m.type === 'frame').at(-1)!;
  expect(resumed.frame.paused).toEqual([]);
  expect(resumed.frame.tick).toBeGreaterThan(initial.frame.tick);
  send({ type: 'dispose' });
});
