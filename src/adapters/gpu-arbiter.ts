import { ImageGpuStateUnknown } from './image';
import type { InferenceScheduler } from './inference';

type Ticket = {
  id: string;
  owner: 'player' | 'villager';
  run(signal: AbortSignal): Promise<unknown>;
  resolve(value: unknown): void;
  reject(error: unknown): void;
};
export interface PaintingWindow {
  dialogue: boolean;
  paused: boolean;
  asleep: boolean;
  accelerated: boolean;
}
/** Holds a scheduler lease through server cancellation acknowledgement, not just fetch abort. */
export class GpuArbiter {
  private readonly queue: Ticket[] = [];
  private active: { ticket: Ticket; abort: AbortController; preempted: boolean } | null = null;
  private settling: Promise<void> | null = null;
  private disposed = false;
  private window: PaintingWindow = {
    dialogue: false,
    paused: false,
    asleep: false,
    accelerated: false,
  };
  constructor(
    private readonly scheduler: Pick<
      InferenceScheduler,
      'exclusive' | 'foregroundPending' | 'suspend'
    >,
    private readonly unload: (signal: AbortSignal) => Promise<void>,
    readonly unloadEnabled = true,
  ) {}
  setWindow(window: PaintingWindow): void {
    this.window = window;
    if (this.active?.ticket.owner === 'villager' && !this.eligible()) this.preempt();
    this.pump();
  }
  private eligible(): boolean {
    return (
      !this.window.dialogue &&
      !this.scheduler.foregroundPending &&
      (this.window.paused || this.window.asleep || this.window.accelerated)
    );
  }
  private preempt(): void {
    if (!this.active || this.active.ticket.owner === 'player') return;
    this.active.preempted = true;
    this.active.abort.abort(new DOMException('Villager painting deferred', 'AbortError'));
  }
  request<T>(
    id: string,
    owner: Ticket['owner'],
    run: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    if (this.disposed) return Promise.reject(Error('Painting queue unavailable'));
    if (this.active?.ticket.id === id || this.queue.some((ticket) => ticket.id === id))
      return Promise.reject(Error('Painting is already queued'));
    if (this.queue.length >= 16) return Promise.reject(Error('Painting queue is full'));
    const pending = new Promise<T>((resolve, reject) => {
      this.queue.push({ id, owner, run, resolve: (value) => resolve(value as T), reject });
    });
    if (owner === 'player') this.preempt();
    this.pump();
    return pending;
  }
  cancel(id: string): void {
    const index = this.queue.findIndex((ticket) => ticket.id === id);
    if (index >= 0)
      this.queue.splice(index, 1)[0]!.reject(new DOMException('Painting cancelled', 'AbortError'));
    if (this.active?.ticket.id === id) {
      this.active.preempted = false;
      this.active.abort.abort(new DOMException('Painting cancelled', 'AbortError'));
    }
  }
  private pump(): void {
    if (this.disposed || this.active) return;
    let index = this.queue.findIndex((ticket) => ticket.owner === 'player');
    if (index < 0 && this.eligible() && this.queue.length) index = 0;
    if (index < 0) return;
    const ticket = this.queue.splice(index, 1)[0]!,
      active = { ticket, abort: new AbortController(), preempted: false };
    this.active = active;
    this.settling = this.scheduler
      .exclusive(async () => {
        try {
          active.abort.signal.throwIfAborted();
          if (this.unloadEnabled) await this.unload(active.abort.signal);
          active.abort.signal.throwIfAborted();
          const value = await ticket.run(active.abort.signal);
          active.abort.signal.throwIfAborted();
          ticket.resolve(value);
        } catch (error) {
          if (error instanceof ImageGpuStateUnknown) {
            this.scheduler.suspend();
            this.disposed = true;
            for (const pending of this.queue.splice(0)) pending.reject(error);
            ticket.reject(error);
          } else if (active.preempted && !this.disposed) this.queue.unshift(ticket);
          else ticket.reject(error);
        }
      })
      .finally(() => {
        this.active = null;
        this.settling = null;
        this.pump();
      });
  }
  async dispose(): Promise<void> {
    this.disposed = true;
    for (const ticket of this.queue.splice(0)) ticket.reject(Error('Painting queue disposed'));
    if (this.active) {
      this.active.preempted = false;
      this.active.abort.abort(Error('Painting queue disposed'));
    }
    await this.settling;
  }
}
