import { afterEach, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { IndexedDbSaveRepository } from '../src/adapters/persistence';
import { SimulationHost } from '../src/domain/simulation';
import type { CheckpointWriteRequest, CheckpointWriteReply } from '../src/worker/checkpoint.worker';

afterEach(() => vi.unstubAllGlobals());
it('commits the existing rotating save format in order, acknowledges after storage, and recovers after a rejected save', async () => {
  vi.resetModules();
  const factory = new IDBFactory();
  const messages: CheckpointWriteReply[] = [];
  const scope = {
    onmessage: null as ((event: MessageEvent<CheckpointWriteRequest>) => Promise<void>) | null,
    postMessage: (message: CheckpointWriteReply) => messages.push(structuredClone(message)),
    close: vi.fn(),
  };
  vi.stubGlobal('self', scope);
  vi.stubGlobal('indexedDB', factory);
  await import('../src/worker/checkpoint.worker');
  const send = (data: CheckpointWriteRequest) =>
    scope.onmessage!({ data } as MessageEvent<CheckpointWriteRequest>);
  const host = new SimulationHost(42, 1, 0);
  const reader = new IndexedDbSaveRepository('hearthwild-v1', factory);
  try {
    const first = host.snapshot();
    host.step();
    const second = host.snapshot();
    const writing = send({ type: 'checkpoint', requestId: 'first', snapshot: first });
    expect(messages).toEqual([]);
    const rejected = send({
      type: 'checkpoint',
      requestId: 'bad',
      snapshot: { ...first, version: -1 } as never,
    });
    const next = send({ type: 'checkpoint', requestId: 'second', snapshot: second });
    await Promise.all([writing, rejected, next]);
    expect(messages).toMatchObject([
      { type: 'saved', requestId: 'first' },
      { type: 'error', requestId: 'bad' },
      { type: 'saved', requestId: 'second' },
    ]);
    expect(messages.every((m) => !('snapshot' in m))).toBe(true);
    expect(await reader.restore()).toEqual(second);
    await send({ type: 'dispose' });
    expect(scope.close).toHaveBeenCalledOnce();
    await send({ type: 'checkpoint', requestId: 'closed', snapshot: first });
    expect(messages.at(-1)).toMatchObject({ type: 'error', requestId: 'closed' });
    expect(await reader.restore()).toEqual(second);
  } finally {
    host.dispose();
    await reader.close();
  }
});
