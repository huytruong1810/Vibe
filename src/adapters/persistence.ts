import { hashString } from '../domain/core';
import { migrateSave, type GameSave } from '../domain/save-schema';

export interface SaveRepository {
  checkpoint(snapshot: GameSave): Promise<void>;
  restore(): Promise<GameSave | null>;
  export(snapshot: GameSave): string;
  import(text: string): GameSave;
}
interface Checkpoint {
  revision: number;
  createdAt: string;
  checksum: number;
  payload: string;
}
const request = <T>(r: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error('IndexedDB request failed'));
  });
const finished = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () =>
      reject(tx.error ?? new Error('Storage transaction was interrupted'));
  });

/** Two rotating checkpoints and the active pointer are committed in one transaction. */
export class IndexedDbSaveRepository implements SaveRepository {
  private database: Promise<IDBDatabase> | null = null;
  constructor(
    private readonly name = 'hearthwild-v1',
    private readonly factory: IDBFactory = indexedDB,
  ) {}
  private open(): Promise<IDBDatabase> {
    if (!this.database)
      this.database = new Promise((resolve, reject) => {
        const opening = this.factory.open(this.name, 1);
        opening.onupgradeneeded = () => {
          opening.result.createObjectStore('checkpoints');
          opening.result.createObjectStore('metadata');
        };
        opening.onsuccess = () => {
          const db = opening.result;
          db.onversionchange = () => {
            db.close();
            this.database = null;
          };
          resolve(db);
        };
        opening.onerror = () => {
          this.database = null;
          reject(opening.error ?? new Error('Storage unavailable'));
        };
        opening.onblocked = () =>
          reject(new Error('Close another Hearthwild tab to update its storage'));
      });
    return this.database;
  }
  async checkpoint(snapshot: GameSave): Promise<void> {
    const validated = migrateSave(snapshot),
      payload = JSON.stringify(validated),
      db = await this.open();
    const tx = db.transaction(['checkpoints', 'metadata'], 'readwrite'),
      done = finished(tx);
    const meta = tx.objectStore('metadata'),
      slots = tx.objectStore('checkpoints');
    const current = (await request(meta.get('active'))) as
      { slot: string; revision: number } | undefined;
    const slot = current?.slot === 'a' ? 'b' : 'a',
      revision = (current?.revision ?? 0) + 1;
    slots.put(
      {
        revision,
        payload,
        checksum: hashString(payload),
        createdAt: new Date().toISOString(),
      } satisfies Checkpoint,
      slot,
    );
    meta.put({ slot, revision }, 'active');
    await done;
  }
  async restore(): Promise<GameSave | null> {
    const db = await this.open(),
      tx = db.transaction(['checkpoints', 'metadata'], 'readonly'),
      done = finished(tx);
    const [a, b] = (await Promise.all([
      request(tx.objectStore('checkpoints').get('a')),
      request(tx.objectStore('checkpoints').get('b')),
    ])) as [Checkpoint | undefined, Checkpoint | undefined];
    await done;
    const entries = [a, b]
      .filter((x): x is Checkpoint => !!x)
      .sort((x, y) => y.revision - x.revision);
    for (const entry of entries)
      try {
        if (entry.checksum === hashString(entry.payload)) return this.import(entry.payload);
      } catch {
        /* Try previous intact checkpoint. */
      }
    if (entries.length)
      throw new Error('Neither checkpoint is readable. Import an exported save to recover.');
    return null;
  }
  export(snapshot: GameSave): string {
    return JSON.stringify(migrateSave(snapshot));
  }
  import(text: string): GameSave {
    if (new TextEncoder().encode(text).length > 24 * 1024 * 1024)
      throw new Error('Save exceeds the 24 MB import limit');
    return migrateSave(JSON.parse(text));
  }
  async close(): Promise<void> {
    if (this.database) (await this.database).close();
    this.database = null;
  }
}

export class SaveCoordinator {
  private pending: Promise<void> = Promise.resolve();
  constructor(readonly repository: SaveRepository) {}
  checkpoint(snapshot: GameSave): Promise<void> {
    const operation = this.pending
      .catch(() => undefined)
      .then(() => this.repository.checkpoint(snapshot));
    this.pending = operation;
    return operation;
  }
}
