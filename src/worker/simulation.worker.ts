/// <reference lib="webworker" />
import { SimulationHost } from '../domain/simulation';
import { FixedStepClock } from '../domain/core';
import { migrateSave } from '../domain/save-schema';
import type { FromWorker, ToWorker, WorkTiming } from '../domain/contracts';
import type { CheckpointWriteReply } from './checkpoint.worker';

const worker = self as unknown as DedicatedWorkerGlobalScope;
let host: SimulationHost | null = null;
const clock = new FixedStepClock();
const buffers: ArrayBuffer[] = [];
let previous = performance.now(),
  lastFrame = 0;
let publishedScene = '';
let publishedTick = -1;
let publishedPauses = '';
const recent: WorkTiming[] = [];
let checkpointWriter: Worker | null = null;
const checkpointRequests = new Set<string>();
const writer = (): Worker => {
  if (checkpointWriter) return checkpointWriter;
  checkpointWriter = new Worker(new URL('./checkpoint.worker.ts', import.meta.url), {
    type: 'module',
  });
  checkpointWriter.onmessage = (event: MessageEvent<CheckpointWriteReply>) => {
    const reply = event.data;
    if (!checkpointRequests.delete(reply.requestId)) return;
    send(
      reply.type === 'saved'
        ? { type: 'checkpointSaved', requestId: reply.requestId }
        : { type: 'error', requestId: reply.requestId, message: reply.message },
    );
  };
  checkpointWriter.onerror = (event) => {
    for (const requestId of checkpointRequests)
      send({ type: 'error', requestId, message: event.message || 'Checkpoint writer failed' });
    checkpointRequests.clear();
    checkpointWriter?.terminate();
    checkpointWriter = null;
  };
  return checkpointWriter;
};
const record = (name: string, start: number): void => {
  recent.push({ name, start, end: performance.now() });
  if (recent.length > 16) recent.shift();
};
const send = (message: FromWorker, transfer: Transferable[] = []): void => {
  const started = performance.now();
  worker.postMessage(message, transfer);
  record(`post-${message.type}`, started);
};
const publish = (type: 'ready' | 'frame' | 'restored', requestId = ''): void => {
  if (!host) return;
  const started = performance.now();
  const frame = host.frame(buffers.pop());
  publishedTick = frame.tick;
  publishedPauses = JSON.stringify(frame.paused);
  record('host-frame', started);
  if (type === 'frame' && publishedScene === frame.scene.id)
    send({ type, frame }, [frame.packed.buffer]);
  else {
    const terrain = host.terrain();
    publishedScene = frame.scene.id;
    const message: FromWorker =
      type === 'ready'
        ? { type, terrain, frame }
        : type === 'frame'
          ? { type, terrain, frame }
          : { type, requestId, terrain, frame };
    send(message, [
      frame.packed.buffer,
      terrain.biome.buffer,
      terrain.elevation.buffer,
      terrain.fluid.buffer,
      terrain.flags.buffer,
      terrain.resource.buffer,
      terrain.quantity.buffer,
      ...(terrain.surface ? [terrain.surface.buffer] : []),
      ...(terrain.ground ? [terrain.ground.buffer] : []),
    ]);
  }
  record('publish-frame', started);
};
worker.onmessage = (message: MessageEvent<ToWorker>): void => {
  const data = message.data;
  const received = performance.now();
  const reply = (response: FromWorker, requestId: string): void => {
    const serviceEnd = performance.now();
    send(
      data.diagnostic
        ? {
            ...response,
            diagnostic: {
              requestId,
              received,
              serviceEnd,
              reply: performance.now(),
              recent: recent.slice(),
            },
          }
        : response,
    );
  };
  try {
    switch (data.type) {
      case 'initialize':
        host?.dispose();
        buffers.length = 0;
        host = new SimulationHost(data.seed, data.origin, data.population, undefined, {
          worldSource: 'authored',
          compiledWorld: data.compiledWorld,
        });
        previous = performance.now();
        publish('ready');
        break;
      case 'command':
        if (host) {
          const started = performance.now();
          const result = host.submit(data.envelope);
          record('host-submit', started);
          reply({ type: 'result', result }, data.envelope.id);
          const publishStarted = performance.now();
          publish('frame');
          record('command-publish', publishStarted);
        }
        break;
      case 'checkpoint':
        if (host)
          send({ type: 'checkpoint', requestId: data.requestId, snapshot: host.snapshot() });
        break;
      case 'persistCheckpoint': {
        if (!host) throw Error('Start a journey before saving');
        const destination = writer();
        const snapshot = host.snapshot();
        checkpointRequests.add(data.requestId);
        try {
          destination.postMessage({ type: 'checkpoint', requestId: data.requestId, snapshot });
        } catch (error) {
          checkpointRequests.delete(data.requestId);
          throw error;
        }
        break;
      }
      case 'artifactContent': {
        if (!host) throw Error('Start a journey before reading');
        const started = performance.now();
        const artifact = host.artifactContent(data.artifactId, data.paintingPurpose);
        record('host-artifact-content', started);
        reply(
          {
            type: 'artifactContent',
            requestId: data.requestId,
            artifact,
          },
          data.requestId,
        );
        break;
      }
      case 'restore': {
        const save = migrateSave(data.snapshot);
        const restored = new SimulationHost(save.seed, save.player.origin, 0, undefined, {
          worldSource: 'authored',
          compiledWorld: data.compiledWorld,
        });
        restored.restore(save);
        host?.dispose();
        host = restored;
        buffers.length = 0;
        previous = performance.now();
        publish('restored', data.requestId);
        break;
      }
      case 'recycle':
        if (buffers.length < 3 && data.buffer.byteLength > 0) buffers.push(data.buffer);
        break;
      case 'dispose':
        host?.dispose();
        checkpointWriter?.postMessage({ type: 'dispose' });
        clearInterval(timer);
        worker.close();
        break;
    }
  } catch (error) {
    send({
      type: 'error',
      message: error instanceof Error ? error.message : 'Simulation failed',
      ...('requestId' in data ? { requestId: data.requestId } : {}),
    });
  }
};
const timer = setInterval(() => {
  if (!host) return;
  const started = performance.now();
  const now = performance.now();
  try {
    clock.consume(now - previous, host.pauses.paused, () => {
      const scale = host!.timeScale;
      for (let i = 0; i < scale; i++) {
        host!.step();
        // Each ordinary tick can revoke acceleration immediately.
        if (host!.timeScale !== scale || host!.pauses.paused) break;
      }
    });
    record('clock-consume', started);
    previous = now;
    // Commands still publish immediately. An unchanged paused world has no new
    // snapshot to construct/clone/apply; repeated copies compete with menu I/O.
    // Recycled transport also acknowledges main-thread progress. Keep stepping
    // above while it is busy instead of allocating an unbounded frame backlog.
    if (
      now - lastFrame >= 100 &&
      buffers.length > 0 &&
      (host.tick !== publishedTick || JSON.stringify(host.pauses.reasons) !== publishedPauses)
    ) {
      publish('frame');
      lastFrame = now;
    }
  } catch (error) {
    host.pauses.acquire('error');
    send({
      type: 'error',
      message: error instanceof Error ? error.message : 'Simulation step failed',
    });
  } finally {
    record('periodic-work', started);
  }
}, 1000 / 60);
