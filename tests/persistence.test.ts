import { afterEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { IndexedDbSaveRepository, SaveCoordinator } from '../src/adapters/persistence';
import { SimulationHost } from '../src/domain/simulation';

const repositories: IndexedDbSaveRepository[] = [];
afterEach(async () => {
  await Promise.all(repositories.splice(0).map((r) => r.close()));
});
describe('transactional browser saves', () => {
  it('persists a full snapshot and exports/imports validated data', async () => {
    const repository = new IndexedDbSaveRepository('roundtrip', new IDBFactory());
    repositories.push(repository);
    expect(await repository.restore()).toBeNull();
    const host = new SimulationHost(42, 1, 0);
    host.inventory.add('berries');
    const save = host.snapshot();
    await repository.checkpoint(save);
    expect(await repository.restore()).toEqual(save);
    expect(repository.import(repository.export(save))).toEqual(save);
    expect(() => repository.import('{')).toThrow();
    expect(() => repository.import('{"version":900}')).toThrow();
  });
  it('recovers the previous checkpoint if the newest slot is corrupted', async () => {
    const factory = new IDBFactory(),
      repository = new IndexedDbSaveRepository('recovery', factory);
    repositories.push(repository);
    const host = new SimulationHost(42, 1, 0);
    await repository.checkpoint(host.snapshot());
    host.advance(2);
    await repository.checkpoint(host.snapshot());
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = factory.open('recovery', 1);
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('checkpoints', 'readwrite');
      tx.objectStore('checkpoints').put({ revision: 2, checksum: 123, payload: 'damaged' }, 'b');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    expect((await repository.restore())?.tick).toBe(0);
  });
  it('serializes checkpoints and allows retry after a storage failure', async () => {
    let attempts = 0;
    const observed: number[] = [];
    const repository = {
      async checkpoint(snapshot: ReturnType<SimulationHost['snapshot']>) {
        attempts++;
        if (attempts === 1) throw new Error('quota');
        observed.push(snapshot.tick);
      },
      async restore() {
        return null;
      },
      export() {
        return '';
      },
      import() {
        throw new Error('unused');
      },
    };
    const coordinator = new SaveCoordinator(repository),
      host = new SimulationHost(42, 1, 0);
    await expect(coordinator.checkpoint(host.snapshot())).rejects.toThrow('quota');
    host.advance(1);
    await coordinator.checkpoint(host.snapshot());
    expect(observed).toEqual([1]);
  });
});
