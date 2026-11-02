import { z } from 'zod';
import { ARTIFACT_LIMITS as LIMIT, NPC_PROFILES } from '../content/definitions';
import paletteSpec from '../../art/source/forge/spec/palette.json';
import type { ItemInstance } from './inventory';

export const ArtifactIdSchema = z
  .string()
  .regex(/^art:[1-9]\d*$/)
  .max(40);
export type ArtifactId = z.infer<typeof ArtifactIdSchema>;
export const ArtifactKindSchema = z.enum(['note', 'book', 'painting']);
export type ArtifactKind = z.infer<typeof ArtifactKindSchema>;
export const ARTIFACT_PALETTE = new Set(
  Object.values(paletteSpec.ramps).flatMap((ramp) => Object.values(ramp.steps)),
);

/** Normalize before enforcing limits; never truncate authored content. */
export function sanitizeArtifactText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f-\u009f]/g, '');
}
const canonicalText = (max: number, min = 0) =>
  z
    .string()
    .min(min)
    .max(max)
    .refine(
      (value) => !/[\u0000-\u001f\u007f-\u009f]/.test(value) && value === value.normalize('NFC'),
      'Invalid authored text',
    );
const title = canonicalText(LIMIT.title, 1).refine(
  (value) => value.trim().length > 0,
  'Empty title',
);
const page = z.array(canonicalText(LIMIT.line)).max(LIMIT.lines);
export const PaintingBriefSchema = z
  .object({
    title,
    subject: canonicalText(160, 3),
    composition: z.enum(['wide landscape', 'close study', 'portrait', 'still life', 'scene']),
    mood: z.enum(['dawn', 'noon', 'dusk', 'night', 'storm', 'festival', 'quiet']),
    subjects: z
      .array(
        z
          .object({
            kind: z.enum(['npc', 'creature', 'place', 'item']),
            id: z.string().min(1).max(200),
          })
          .strict(),
      )
      .max(4),
  })
  .strict();
const uint = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const base = {
  id: ArtifactIdSchema,
  title,
  author: z.union([
    z.object({ kind: z.literal('player') }).strict(),
    z.object({ kind: z.literal('npc'), id: z.enum(NPC_PROFILES.map((n) => n.id)) }).strict(),
  ]),
  createdDay: uint,
  revision: uint.min(1),
  sealed: z.boolean(),
};
export const ArtifactSchema = z
  .discriminatedUnion('kind', [
    z.object({ ...base, kind: z.literal('note'), lines: page }).strict(),
    z
      .object({ ...base, kind: z.literal('book'), pages: z.array(page).min(1).max(LIMIT.pages) })
      .strict(),
    z
      .object({
        ...base,
        kind: z.literal('painting'),
        status: z.enum(['pending', 'ready', 'failed']),
        brief: PaintingBriefSchema,
        pixels: z
          .string()
          .length(1024)
          .regex(/^[A-Za-z0-9+/]+$/)
          .optional(),
        palette: z
          .array(
            z
              .string()
              .regex(/^#[0-9a-f]{6}$/)
              .refine((color) => ARTIFACT_PALETTE.has(color)),
          )
          .min(1)
          .max(LIMIT.colors)
          .optional(),
        caption: canonicalText(2000)
          .refine(
            (value) => value.trim().split(/\s+/).filter(Boolean).length <= 40,
            'Caption exceeds 40 words',
          )
          .optional(),
        render: z
          .object({
            provider: canonicalText(80, 1),
            model: canonicalText(200, 1),
            seed: z.number().int().finite(),
            steps: uint.min(1),
            width: uint.min(1),
            height: uint.min(1),
          })
          .strict()
          .optional(),
        failure: canonicalText(200).optional(),
      })
      .strict(),
  ])
  .superRefine((artifact, ctx) => {
    if (artifact.kind !== 'painting') return;
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (artifact.status === 'ready' && (!artifact.pixels || !artifact.palette))
      fail('Ready painting needs pixels and palette');
    if (Boolean(artifact.pixels) !== Boolean(artifact.palette))
      fail('Pixels and palette must occur together');
    if (artifact.palette && new Set(artifact.palette).size !== artifact.palette.length)
      fail('Duplicate painting color');
    if (artifact.pixels && artifact.palette) {
      // Decode base64 without a browser or Node dependency (768 packed bytes).
      const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      for (let i = 0; i < artifact.pixels.length; i += 4) {
        const a = alphabet.indexOf(artifact.pixels[i]!),
          b = alphabet.indexOf(artifact.pixels[i + 1]!);
        const c = alphabet.indexOf(artifact.pixels[i + 2]!),
          d = alphabet.indexOf(artifact.pixels[i + 3]!);
        for (const byte of [(a << 2) | (b >> 4), ((b & 15) << 4) | (c >> 2), ((c & 3) << 6) | d])
          if (byte >> 4 >= artifact.palette.length || (byte & 15) >= artifact.palette.length) {
            fail('Painting pixel index outside palette');
            return;
          }
      }
    }
  });
export type Artifact = z.infer<typeof ArtifactSchema>;
export type AuthorRef = Artifact['author'];
type NewRecord<T> = T extends Artifact ? Omit<T, 'id' | 'revision' | 'sealed'> : never;
export type NewArtifact = NewRecord<Artifact>;
export type ArtifactView = Pick<
  Artifact,
  'id' | 'kind' | 'title' | 'author' | 'createdDay' | 'revision' | 'sealed'
> & { readonly length: number; readonly status?: 'pending' | 'ready' | 'failed' };
export interface ArtifactPlacement {
  readonly artifactId: ArtifactId;
  readonly sceneId: string;
  readonly propId: string;
  readonly slot: number;
  /** Retain identity while an item is displayed. */
  readonly item: ItemInstance;
}
export function artifactTextBytes(record: Artifact): number {
  const length = (value: unknown): number =>
    typeof value === 'string'
      ? value.length
      : Array.isArray(value)
        ? value.reduce((n, v) => n + length(v), 0)
        : value && typeof value === 'object'
          ? Object.values(value).reduce<number>((n, v) => n + length(v), 0)
          : 0;
  // Packed image data is separately bounded; all other strings count, including provenance.
  const { id: _id, ...content } = record;
  if (content.kind === 'painting') {
    const { pixels: _pixels, palette: _palette, ...text } = content;
    return 2 * length(text);
  }
  return 2 * length(content);
}
export const ArtifactRecordsSchema = z
  .array(ArtifactSchema)
  .max(LIMIT.records)
  .superRefine((records, ctx) => {
    if (new Set(records.map((record) => record.id)).size !== records.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate artifact identity' });
    if (records.reduce((n, record) => n + artifactTextBytes(record), 0) > LIMIT.textBytes)
      ctx.addIssue({ code: 'custom', message: 'Artifact text budget exceeded' });
  });

export class ArtifactStore {
  private records = new Map<ArtifactId, Artifact>();
  private sequence = 0;
  get serial(): number {
    return this.sequence;
  }
  get(id: ArtifactId): Artifact | null {
    return structuredClone(this.records.get(id) ?? null);
  }
  snapshot(): Artifact[] {
    return structuredClone([...this.records.values()]);
  }
  views(): ArtifactView[] {
    return [...this.records.values()].map((a) => ({
      id: a.id,
      kind: a.kind,
      title: a.title,
      author: structuredClone(a.author),
      createdDay: a.createdDay,
      revision: a.revision,
      sealed: a.sealed,
      length: a.kind === 'note' ? a.lines.length : a.kind === 'book' ? a.pages.length : 0,
      ...(a.kind === 'painting' ? { status: a.status } : {}),
    }));
  }
  create(input: NewArtifact): Artifact {
    if (!Number.isSafeInteger(this.sequence + 1)) throw Error('Artifact identity exhausted');
    const record = this.normalize({
      ...input,
      id: `art:${this.sequence + 1}`,
      revision: 1,
      sealed: false,
    });
    this.validate(record);
    this.records.set(record.id, record);
    this.sequence++;
    return structuredClone(record);
  }
  update(
    id: ArtifactId,
    change: Partial<Pick<Artifact, 'title'>> & {
      lines?: string[];
      pages?: string[][];
      status?: 'pending' | 'ready' | 'failed';
      pixels?: string;
      palette?: string[];
      caption?: string;
      render?: Extract<Artifact, { kind: 'painting' }>['render'];
      failure?: string;
    },
  ): Artifact {
    const previous = this.records.get(id);
    if (!previous) throw Error('Unknown artifact');
    if (previous.sealed) throw Error('Artifact is sealed');
    const allowed = [
      'title',
      'lines',
      'pages',
      'status',
      'pixels',
      'palette',
      'caption',
      'render',
      'failure',
    ];
    if (Object.keys(change).some((key) => !allowed.includes(key)))
      throw Error('Immutable artifact provenance');
    const record = this.normalize({ ...previous, ...change, revision: previous.revision + 1 });
    this.validate(record);
    this.records.set(id, record);
    return structuredClone(record);
  }
  seal(id: ArtifactId): Artifact {
    const previous = this.records.get(id);
    if (!previous) throw Error('Unknown artifact');
    if (!previous.sealed) {
      const record = ArtifactSchema.parse({
        ...previous,
        sealed: true,
        revision: previous.revision + 1,
      });
      this.records.set(id, record);
    }
    return this.get(id)!;
  }
  remove(id: ArtifactId): void {
    this.records.delete(id);
  }
  restore(records: readonly Artifact[], sequence: number): void {
    const parsed = ArtifactRecordsSchema.parse(records);
    if (
      !Number.isSafeInteger(sequence) ||
      sequence < 0 ||
      parsed.some((a) => Number(a.id.slice(4)) > sequence)
    )
      throw Error('Artifact allocation counter would reuse identity');
    this.records = new Map(parsed.map((record) => [record.id, record]));
    this.sequence = sequence;
  }
  private validate(record: Artifact): void {
    ArtifactRecordsSchema.parse(
      [...this.records.values()].filter((a) => a.id !== record.id).concat(record),
    );
  }
  private normalize(value: unknown): Artifact {
    const normalize = (v: unknown, key = ''): unknown =>
      typeof v === 'string'
        ? ['pixels', 'id'].includes(key)
          ? v
          : sanitizeArtifactText(v)
        : Array.isArray(v)
          ? v.map((x) => normalize(x, key))
          : v && typeof v === 'object'
            ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, normalize(x, k)]))
            : v;
    return ArtifactSchema.parse(normalize(value));
  }
}
