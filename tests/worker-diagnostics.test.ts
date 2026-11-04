import { afterEach, expect, it, vi } from 'vitest';
import type { FromWorker, ToWorker } from '../src/domain/contracts';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('keeps worker result/frame order and bounds opt-in service diagnostics without changing content', async () => {
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
