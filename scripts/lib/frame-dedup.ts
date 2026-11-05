import { createHash } from 'node:crypto';

/** Collapses byte-identical encoded frames so the atlas packs each image once. */
export class FrameDeduper {
  private readonly byHash = new Map<string, string>();
  private readonly alias = new Map<string, string>();

  /** Returns the canonical id for these bytes (the first id added with them). */
  add(id: string, data: Uint8Array): string {
    const hash = createHash('sha256').update(data).digest('hex');
    const first = this.byHash.get(hash);
    if (first === undefined) {
      this.byHash.set(hash, id);
      return id;
    }
    this.alias.set(id, first);
    return first;
  }
  aliases(): ReadonlyMap<string, string> {
    return this.alias;
  }
  get savedFrames(): number {
    return this.alias.size;
  }
}
