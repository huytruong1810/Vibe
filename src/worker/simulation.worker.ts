/// <reference lib="webworker" />
import { SimulationHost } from '../domain/simulation';
import { FixedStepClock } from '../domain/core';
import { migrateSave } from '../domain/save-schema';
import type { FromWorker, ToWorker } from '../domain/contracts';

const worker = self as unknown as DedicatedWorkerGlobalScope;
let host: SimulationHost | null = null;
const clock = new FixedStepClock();
const buffers: ArrayBuffer[] = [];
let previous = performance.now(),
  lastFrame = 0;
let publishedScene = '';
const send = (message: FromWorker, transfer: Transferable[] = []): void =>
  worker.postMessage(message, transfer);
const publish = (type: 'ready' | 'frame' | 'restored', requestId = ''): void => {
  if (!host) return;
  const frame = host.frame(buffers.pop());
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
    ]);
  }
};
worker.onmessage = (message: MessageEvent<ToWorker>): void => {
  const data = message.data;
  try {
    switch (data.type) {
      case 'initialize':
        host?.dispose();
        buffers.length = 0;
        host = new SimulationHost(data.seed, data.origin, data.population);
        previous = performance.now();
        publish('ready');
        break;
      case 'command':
        if (host) {
          send({ type: 'result', result: host.submit(data.envelope) });
          publish('frame');
        }
        break;
      case 'checkpoint':
        if (host)
          send({ type: 'checkpoint', requestId: data.requestId, snapshot: host.snapshot() });
        break;
      case 'artifactContent':
        if (!host) throw Error('Start a journey before reading');
        send({
          type: 'artifactContent',
          requestId: data.requestId,
          artifact: host.artifacts.get(data.artifactId),
        });
        break;
      case 'restore': {
        const save = migrateSave(data.snapshot);
        const restored = new SimulationHost(save.seed, save.player.origin, 0);
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
    previous = now;
    if (now - lastFrame >= 100) {
      publish('frame');
      lastFrame = now;
    }
  } catch (error) {
    host.pauses.acquire('error');
    send({
      type: 'error',
      message: error instanceof Error ? error.message : 'Simulation step failed',
    });
  }
}, 1000 / 60);
