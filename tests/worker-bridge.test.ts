import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkerBridge } from '../src/adapters/worker-bridge';
import type { FromWorker } from '../src/domain/contracts';

class TestWorker {
  static latest: TestWorker;
  onmessage: ((event: MessageEvent<FromWorker>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  constructor() {
    TestWorker.latest = this;
  }
  messages: unknown[] = [];
  postMessage(message: unknown): void {
    this.messages.push(message);
  }
  terminate(): void {}
  ready(): void {
    this.onmessage?.({
      data: { type: 'ready', frame: { session: 'world:test' }, terrain: {} },
    } as unknown as MessageEvent<FromWorker>);
  }
}
afterEach(() => vi.unstubAllGlobals());
describe('worker presentation failure boundary', () => {
  it('saves through a completion-only worker request and propagates storage failures', async () => {
    vi.stubGlobal('Worker', TestWorker);
    const bridge = new WorkerBridge();
    await expect(bridge.persistCheckpoint()).rejects.toThrow(/journey/);
    const initialize = bridge.initialize(42, 1);
    TestWorker.latest.ready();
    await initialize;
    const saving = bridge.persistCheckpoint();
    const request = TestWorker.latest.messages.at(-1) as { type: string; requestId: string };
    expect(request.type).toBe('persistCheckpoint');
    TestWorker.latest.onmessage!({
      data: { type: 'checkpointSaved', requestId: request.requestId },
    } as MessageEvent<FromWorker>);
    await expect(saving).resolves.toBeUndefined();
    const rejected = bridge.persistCheckpoint();
    const next = TestWorker.latest.messages.at(-1) as { requestId: string };
    TestWorker.latest.onmessage!({
      data: { type: 'error', requestId: next.requestId, message: 'Storage full' },
    } as MessageEvent<FromWorker>);
    await expect(rejected).rejects.toThrow('Storage full');
    bridge.dispose();
  });
  it('retains only the current bounded opening and correlates out-of-order worker receipts', async () => {
    vi.stubGlobal('Worker', TestWorker);
    const bridge = new WorkerBridge();
    const initializing = bridge.initialize(42, 1);
    TestWorker.latest.ready();
    await initializing;
    bridge.bookDiagnostics(true);
    const first = bridge.artifactContent('art:1');
    const second = bridge.artifactContent('art:2');
    const requests = TestWorker.latest.messages.filter(
      (m) => (m as { type: string }).type === 'artifactContent',
    ) as { requestId: string; diagnostic?: boolean }[];
    expect(requests.every((r) => r.diagnostic)).toBe(true);
    for (const request of [...requests].reverse()) {
      TestWorker.latest.onmessage?.({
        data: {
          type: 'artifactContent',
          requestId: request.requestId,
          artifact: null,
          diagnostic: {
            requestId: request.requestId,
            received: 10,
            serviceEnd: 12,
            reply: 13,
            recent: [],
          },
        },
      } as unknown as MessageEvent<FromWorker>);
    }
    await Promise.all([first, second]);
    for (let n = 0; n < 100; n++) bridge.recordWork('renderer-tick', n, n + 1);
    bridge.bookDiagnostics(false);
    const receipt = bridge.diagnosticReceipt() as {
      requests: { id: string; resolved: number; worker: { requestId: string } }[];
      main: unknown[];
    };
    expect(receipt.requests.map((r) => r.worker.requestId)).toEqual(
      requests.map((r) => r.requestId),
    );
    expect(receipt.requests.every((r) => Number.isFinite(r.resolved))).toBe(true);
    expect(receipt.main).toHaveLength(32);
    bridge.recordWork('after-close', 200, 201);
    expect(bridge.diagnosticReceipt()).toEqual(receipt);
    receipt.main.length = 0;
    expect((bridge.diagnosticReceipt() as { main: unknown[] }).main).toHaveLength(32);
    bridge.bookDiagnostics(true);
    expect((bridge.diagnosticReceipt() as { requests: unknown[] }).requests).toEqual([]);
    bridge.dispose();
  });
  it('bounds request diagnostics and rejects pending work on disposal while diagnostics are active', async () => {
    vi.stubGlobal('Worker', TestWorker);
    const bridge = new WorkerBridge();
    const initializing = bridge.initialize(42, 1);
    TestWorker.latest.ready();
    await initializing;
    bridge.bookDiagnostics(true);
    const pending = Array.from({ length: 20 }, () => bridge.artifactContent('art:1').catch(String));
    expect((bridge.diagnosticReceipt() as { requests: unknown[] }).requests).toHaveLength(8);
    bridge.dispose();
    expect(await Promise.all(pending)).toEqual(Array(20).fill('Error: Game closed'));
  });
  it('queries artifact content on demand and correlates null or content responses', async () => {
    vi.stubGlobal('Worker', TestWorker);
    const bridge = new WorkerBridge();
    await expect(bridge.artifactContent('art:1')).rejects.toThrow(/journey/);
    const initializing = bridge.initialize(42, 1);
    TestWorker.latest.ready();
    await initializing;
    const first = bridge.artifactContent('art:1'),
      second = bridge.artifactContent('art:2');
    const requests = TestWorker.latest.messages.filter(
      (m) => (m as { type: string }).type === 'artifactContent',
    ) as { requestId: string; artifactId: string }[];
    expect(requests.map((r) => r.artifactId)).toEqual(['art:1', 'art:2']);
    TestWorker.latest.onmessage?.({
      data: { type: 'artifactContent', requestId: requests[1]!.requestId, artifact: null },
    } as MessageEvent<FromWorker>);
    const artifact = {
      id: 'art:1',
      kind: 'note',
      title: 'Hello',
      author: { kind: 'player' },
      createdDay: 0,
      revision: 1,
      sealed: false,
      lines: ['Hi'],
    } as const;
    TestWorker.latest.onmessage?.({
      data: { type: 'artifactContent', requestId: requests[0]!.requestId, artifact },
    } as unknown as MessageEvent<FromWorker>);
    expect(await first).toEqual(artifact);
    expect(await second).toBeNull();
    bridge.dispose();
  });
  it('rejects startup immediately when a presentation consumer fails instead of timing out', async () => {
    vi.stubGlobal('Worker', TestWorker);
    const bridge = new WorkerBridge(),
      errors: string[] = [];
    bridge.onError = (message) => errors.push(message);
    bridge.onFrame = () => {
      throw Error('Missing HUD target');
    };
    bridge.bookDiagnostics(true);
    const pending = bridge.initialize(42, 1);
    const result = expect(pending).rejects.toThrow('Missing HUD target');
    TestWorker.latest.ready();
    await result;
    expect(errors).toEqual(['Presentation failed: Missing HUD target']);
    bridge.dispose();
  });
  it('ignores obsolete frame sessions after the active world has changed', async () => {
    vi.stubGlobal('Worker', TestWorker);
    const bridge = new WorkerBridge(),
      frames: string[] = [];
    bridge.onFrame = (frame) => frames.push(frame.session);
    const pending = bridge.initialize(42, 1);
    TestWorker.latest.ready();
    await pending;
    TestWorker.latest.onmessage?.({
      data: { type: 'frame', frame: { session: 'world:old' } },
    } as unknown as MessageEvent<FromWorker>);
    expect(frames).toEqual(['world:test']);
    bridge.dispose();
  });
});
