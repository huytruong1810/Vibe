import { IndexedDbSaveRepository } from '../adapters/persistence';
import type { GameSave } from '../domain/save-schema';

export type CheckpointWriteRequest =
  { type: 'checkpoint'; requestId: string; snapshot: GameSave } | { type: 'dispose' };
export type CheckpointWriteReply =
  { type: 'saved'; requestId: string } | { type: 'error'; requestId: string; message: string };

const scope = self as unknown as DedicatedWorkerGlobalScope;
const repository = new IndexedDbSaveRepository();
let pending = Promise.resolve();
let closing = false;
// The existing repository retains validation, checksums and atomic two-slot commits.
scope.onmessage = async (event: MessageEvent<CheckpointWriteRequest>): Promise<void> => {
  const message = event.data;
  if (message.type === 'dispose') {
    closing = true;
    await pending.catch(() => undefined);
    await repository.close();
    scope.close();
    return;
  }
  const reply = (value: CheckpointWriteReply) => scope.postMessage(value);
  if (closing) {
    reply({ type: 'error', requestId: message.requestId, message: 'Checkpoint writer is closed' });
    return;
  }
  const operation = pending
    .catch(() => undefined)
    .then(() => repository.checkpoint(message.snapshot));
  pending = operation;
  try {
    await operation;
    reply({ type: 'saved', requestId: message.requestId });
  } catch (error) {
    reply({
      type: 'error',
      requestId: message.requestId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
