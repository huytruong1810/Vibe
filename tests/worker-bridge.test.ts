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
  postMessage(): void {}
  terminate(): void {}
  ready(): void {
    this.onmessage?.({
      data: { type: 'ready', frame: { session: 'world:test' }, terrain: {} },
    } as unknown as MessageEvent<FromWorker>);
  }
}
afterEach(() => vi.unstubAllGlobals());
describe('worker presentation failure boundary', () => {
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
