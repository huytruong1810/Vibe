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
