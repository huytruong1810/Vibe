import type {
  CommandPayload,
  CommandResult,
  FromWorker,
  RenderSnapshot,
  TerrainView,
  ToWorker,
} from '../domain/contracts';
import { migrateSave, type GameSave } from '../domain/save-schema';
import type { Artifact } from '../domain/artifacts';

export class WorkerBridge {
  private readonly worker = new Worker(new URL('../worker/simulation.worker.ts', import.meta.url), {
    type: 'module',
  });
  private readonly waiting = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timeout: ReturnType<typeof setTimeout>;
    }
  >();
  private session = '';
  private serial = 0;
  private start: {
    resolve: () => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  } | null = null;
  onFrame: (frame: RenderSnapshot, terrain?: TerrainView) => void = () => undefined;
  onError: (message: string) => void = () => undefined;
  constructor() {
    this.worker.onmessage = (event: MessageEvent<FromWorker>): void => {
      try {
        const message = event.data;
        switch (message.type) {
          case 'ready':
          case 'restored':
            this.session = message.frame.session;
            this.onFrame(message.frame, message.terrain);
            if (message.type === 'restored') this.resolve(message.requestId, undefined);
            else if (this.start) {
              clearTimeout(this.start.timeout);
              this.start.resolve();
              this.start = null;
            }
            break;
          case 'frame':
            if (message.frame.session === this.session)
              this.onFrame(message.frame, message.terrain);
            break;
          case 'result':
            this.resolve(message.result.id, message.result);
            break;
          case 'checkpoint':
            this.resolve(message.requestId, message.snapshot);
            break;
          case 'artifactContent':
            this.resolve(message.requestId, message.artifact);
            break;
          case 'error': {
            const error = new Error(message.message);
            if (message.requestId) this.reject(message.requestId, error);
            else if (this.start) {
              clearTimeout(this.start.timeout);
              this.start.reject(error);
              this.start = null;
            } else this.onError(message.message);
            break;
          }
        }
      } catch (error) {
        const failure = error instanceof Error ? error : new Error(String(error));
        this.failPending(failure);
        this.onError(`Presentation failed: ${failure.message}`);
      }
    };
    this.worker.onerror = (event) => {
      this.onError(`Simulation worker failed: ${event.message}`);
      this.failPending(new Error(event.message));
    };
  }
  private post(message: ToWorker, transfer: Transferable[] = []): void {
    this.worker.postMessage(message, transfer);
  }
  private request<T>(id: string, message: ToWorker): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.waiting.delete(id);
        reject(new Error('Simulation did not respond in time'));
      }, 20_000);
      this.waiting.set(id, { resolve: (value) => resolve(value as T), reject, timeout });
      this.post(message);
    });
  }
  private resolve(id: string, value: unknown): void {
    const pending = this.waiting.get(id);
    if (!pending) return;
    clearTimeout(pending.timeout);
    pending.resolve(value);
    this.waiting.delete(id);
  }
  private reject(id: string, error: Error): void {
    const pending = this.waiting.get(id);
    if (!pending) return;
    clearTimeout(pending.timeout);
    pending.reject(error);
    this.waiting.delete(id);
  }
  private failPending(error: Error): void {
    for (const id of this.waiting.keys()) this.reject(id, error);
    if (this.start) {
      clearTimeout(this.start.timeout);
      this.start.reject(error);
      this.start = null;
    }
  }
  initialize(seed: number, origin: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.start = null;
        reject(new Error('World generation timed out'));
      }, 20_000);
      this.start = { resolve, reject, timeout };
      this.post({ type: 'initialize', seed, origin });
    });
  }
  send(command: CommandPayload, issuer: 'player' | 'inference' = 'player'): Promise<CommandResult> {
    if (!this.session)
      return Promise.reject(new Error('Connect your local AI and enter the world first.'));
    const id = `${this.session}:c${++this.serial}`;
    return this.request(id, {
      type: 'command',
      envelope: { id, session: this.session, issuer, command },
    });
  }
  async checkpoint(): Promise<GameSave> {
    if (!this.session) throw new Error('Start a journey before saving');
    const requestId = `checkpoint:${++this.serial}`;
    return migrateSave(await this.request(requestId, { type: 'checkpoint', requestId }));
  }
  artifactContent(artifactId: string): Promise<Artifact | null> {
    if (!this.session) return Promise.reject(new Error('Start a journey before reading'));
    const requestId = `artifact:${++this.serial}`;
    return this.request(requestId, { type: 'artifactContent', requestId, artifactId });
  }
  restore(snapshot: GameSave): Promise<void> {
    const requestId = `restore:${++this.serial}`;
    return this.request(requestId, { type: 'restore', requestId, snapshot: migrateSave(snapshot) });
  }
  recycle(buffer: ArrayBuffer): void {
    if (buffer.byteLength) this.post({ type: 'recycle', buffer }, [buffer]);
  }
  dispose(): void {
    this.failPending(new Error('Game closed'));
    this.post({ type: 'dispose' });
    this.worker.terminate();
  }
}
