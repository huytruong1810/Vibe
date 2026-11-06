import { ARTIFACT_LIMITS } from '../content/definitions';
import { ArtifactStore, type Artifact } from './artifacts';
import type { CommandPayload } from './contracts';
import type { TwoSlotInventory } from './inventory';

export type ArtifactEdit = Extract<
  CommandPayload,
  { type: 'artifactWrite' | 'artifactPageAdd' | 'artifactPageRemove' | 'artifactSeal' }
>;

/** Validate the complete replacement before changing either the record or its item. */
export function editCarriedArtifact(
  store: ArtifactStore,
  inventory: TwoSlotInventory,
  command: ArtifactEdit,
  day: number,
): Artifact {
  const item = inventory.state[command.slot];
  if (!item || (item.id !== 'note' && item.id !== 'book'))
    throw Error('Carry a note or book to write.');
  const record = item.artifact ? store.get(item.artifact) : null;
  if (item.artifact && (!record || record.kind !== item.id))
    throw Error('That text is unavailable.');
  if (record && (record.author.kind !== 'player' || record.sealed))
    throw Error('Only your own unsealed text can be changed.');
  if (!record) {
    if (command.type !== 'artifactWrite')
      throw Error('Write the first page before changing the book.');
    if ((command.page ?? 1) !== 1) throw Error('Start with the first page.');
    const common = {
      title: command.title ?? (item.id === 'book' ? 'Untitled book' : 'Untitled note'),
      author: { kind: 'player' as const },
      createdDay: day,
    };
    const created = store.create(
      item.id === 'book'
        ? { ...common, kind: 'book', pages: [command.lines] }
        : { ...common, kind: 'note', lines: command.lines },
    );
    inventory.set(command.slot, { ...item, artifact: created.id });
    return created;
  }
  if (command.type === 'artifactSeal') return store.seal(record.id);
  if (record.kind !== 'note' && record.kind !== 'book') throw Error('That item is not text.');
  if (command.type === 'artifactWrite') {
    const page = (command.page ?? 1) - 1;
    if (record.kind === 'note') {
      if (page !== 0) throw Error('A note has one page.');
      return store.update(record.id, {
        ...(command.title !== undefined ? { title: command.title } : {}),
        lines: command.lines,
      });
    }
    if (page >= record.pages.length) throw Error('Add the page before writing it.');
    record.pages[page] = command.lines;
    return store.update(record.id, {
      ...(command.title !== undefined ? { title: command.title } : {}),
      pages: record.pages,
    });
  }
  if (record.kind !== 'book') throw Error('Only books have multiple pages.');
  if (command.type === 'artifactPageAdd') {
    if (record.pages.length >= ARTIFACT_LIMITS.pages)
      throw Error('A book can hold at most 48 pages.');
    record.pages.push([]);
  } else {
    if (record.pages.length === 1) throw Error('Keep at least one page.');
    if (command.page > record.pages.length) throw Error('That page does not exist.');
    record.pages.splice(command.page - 1, 1);
  }
  return store.update(record.id, { pages: record.pages });
}
