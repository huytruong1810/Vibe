import { z } from 'zod';
import {
  PaintingBriefSchema,
  ArtifactStore,
  sanitizeArtifactText,
  type Artifact,
} from './artifacts';
import { TwoSlotInventory, type ItemInstance } from './inventory';
import {
  paintingSubjectExists,
  namedPaintingSubjects,
  validatePaintingText,
} from '../content/painting-rules';
import type { NpcId } from './values';

export type Painting = Extract<Artifact, { kind: 'painting' }>;
export type PaintingBrief = z.infer<typeof PaintingBriefSchema>;
export const CreatePaintingSchema = z
  .object({ type: z.literal('CREATE_PAINTING'), brief: PaintingBriefSchema })
  .strict();
export const HangPaintingSchema = z
  .object({ type: z.literal('HANG_PAINTING'), artifactId: z.string().regex(/^art:[1-9]\d*$/) })
  .strict();
export const PaintingActionSchema = z.discriminatedUnion('type', [
  CreatePaintingSchema,
  HangPaintingSchema,
]);
export type PaintingAction = z.infer<typeof PaintingActionSchema>;
export const isPaintingAction = (action: { type: string }): action is PaintingAction =>
  action.type === 'CREATE_PAINTING' || action.type === 'HANG_PAINTING';
export const PaintingResultSchema = z
  .object({
    pixels: z
      .string()
      .length(1024)
      .regex(/^[A-Za-z0-9+/]+$/),
    palette: z
      .array(z.string().regex(/^#[0-9a-f]{6}$/))
      .min(1)
      .max(16),
    caption: z
      .string()
      .max(2000)
      .refine((text) => text.trim().split(/\s+/).filter(Boolean).length <= 40),
    render: z
      .object({
        provider: z.string().min(1).max(80),
        model: z.string().min(1).max(200),
        seed: z.number().int().min(0).max(0xffffffff),
        steps: z.number().int().min(1).max(100),
        width: z.number().int().min(1).max(2048),
        height: z.number().int().min(1).max(2048),
      })
      .strict(),
  })
  .strict();
export type PaintingResult = z.infer<typeof PaintingResultSchema>;
export function paintingCaptionFallback(brief: PaintingBrief): string {
  return brief.subject.trim().split(/\s+/).slice(0, 40).join(' ');
}
export function groundedPaintingCaption(brief: PaintingBrief, caption: string): string {
  try {
    validatePaintingText(caption);
    const allowed = new Set(
      [...brief.subjects, ...namedPaintingSubjects(brief.subject)].map((s) => `${s.kind}:${s.id}`),
    );
    if (namedPaintingSubjects(caption).some((s) => !allowed.has(`${s.kind}:${s.id}`)))
      return paintingCaptionFallback(brief);
    return sanitizeArtifactText(caption).trim() || paintingCaptionFallback(brief);
  } catch {
    return paintingCaptionFallback(brief);
  }
}
export function validatePaintingBrief(
  brief: PaintingBrief,
  affinity: (id: string) => number = () => 0,
): void {
  PaintingBriefSchema.parse(brief);
  validatePaintingText(brief.title + ' ' + brief.subject);
  const subjects = [...brief.subjects, ...namedPaintingSubjects(brief.subject)];
  if (new Set(subjects.map((s) => `${s.kind}:${s.id}`)).size > 4)
    throw Error('Choose at most four painting subjects.');
  for (const subject of subjects) {
    if (!paintingSubjectExists(subject))
      throw Error('Painting subject does not exist in this world.');
    if (subject.kind === 'npc' && affinity(subject.id) < 0)
      throw Error('A portrait subject needs at least neutral affinity.');
  }
  if (brief.composition === 'portrait' && !subjects.some((s) => s.kind === 'npc'))
    throw Error('A portrait needs a named villager subject.');
}
/** Authoritative durable transitions. Client previews never mutate an existing brief. */
export class PaintingService {
  constructor(
    private readonly artifacts: ArtifactStore,
    private readonly inventory: TwoSlotInventory,
  ) {}
  requestPlayer(
    slot: 0 | 1,
    prompt: string,
    mood: PaintingBrief['mood'],
    composition: PaintingBrief['composition'],
    day: number,
    affinity?: (id: string) => number,
  ): Painting {
    const subject = sanitizeArtifactText(prompt).trim();
    const brief = PaintingBriefSchema.parse({
      title: subject.slice(0, 48),
      subject,
      mood,
      composition,
      subjects: namedPaintingSubjects(subject),
    });
    validatePaintingBrief(brief, affinity);
    const item = this.inventory.state[slot];
    if (!item || item.id !== 'canvas' || item.artifact)
      throw Error('Carry a blank canvas to begin painting.');
    if (
      this.artifacts
        .views()
        .some((a) => a.kind === 'painting' && a.author.kind === 'player' && a.status === 'pending')
    )
      throw Error('Finish or discard your pending painting first.');
    const painting = this.artifacts.create({
      kind: 'painting',
      title: brief.title,
      author: { kind: 'player' },
      createdDay: day,
      status: 'pending',
      brief,
    }) as Painting;
    this.inventory.set(slot, { id: 'painting', instance: item.instance, artifact: painting.id });
    return painting;
  }
  requestNpc(
    npc: { id: NpcId; artist: boolean; relations: Readonly<Record<string, number>> },
    brief: PaintingBrief,
    day: number,
    carry: (item: ItemInstance) => boolean,
  ): Painting {
    if (brief.subject.length < 3 || brief.subject.length > 160)
      throw Error('Villager painting subjects need3–160 characters.');
    validatePaintingBrief(brief, (id) => (id === npc.id ? 0 : (npc.relations[id] ?? 0)));
    const previous = this.artifacts
      .views()
      .filter((a) => a.kind === 'painting' && a.author.kind === 'npc' && a.author.id === npc.id);
    if (previous.some((a) => day - a.createdDay < (npc.artist ? 1 : 7)))
      throw Error('Painting rate reached for this villager.');
    const painting = this.artifacts.create({
      kind: 'painting',
      title: brief.title,
      author: { kind: 'npc', id: npc.id },
      createdDay: day,
      status: 'pending',
      brief,
    }) as Painting;
    const item = { ...this.inventory.create('painting'), artifact: painting.id };
    if (!carry(item)) {
      this.artifacts.remove(painting.id);
      throw Error('The painter needs a free hand.');
    }
    return painting;
  }
  complete(id: string, revision: number, result: PaintingResult): Painting {
    const painting = this.pending(id);
    if (painting.revision !== revision || painting.pixels)
      throw Error('Stale painting result ignored.');
    PaintingResultSchema.parse(result);
    return this.artifacts.update(painting.id, {
      ...result,
      caption: groundedPaintingCaption(painting.brief, result.caption),
      status: painting.author.kind === 'npc' ? 'ready' : 'pending',
      failure: undefined,
    }) as Painting;
  }
  fail(id: string, revision: number, reason: string): void {
    const painting = this.pending(id);
    if (painting.revision !== revision || painting.pixels)
      throw Error('Stale painting failure ignored.');
    this.artifacts.update(painting.id, {
      status: 'failed',
      failure: sanitizeArtifactText(reason).slice(0, 200),
    });
  }
  keep(id: string): Painting {
    const { painting } = this.carriedPlayer(id);
    if (painting.status !== 'pending' || !painting.pixels || !painting.palette)
      throw Error('Wait for a palette preview before keeping.');
    this.artifacts.update(painting.id, { status: 'ready' });
    return this.artifacts.seal(painting.id) as Painting;
  }
  discard(id: string): void {
    const { painting, slot, item } = this.carriedPlayer(id);
    if (painting.sealed || painting.status === 'ready')
      throw Error('A kept painting cannot be discarded through the preview.');
    this.inventory.set(slot, { id: 'canvas', instance: item.instance });
    this.artifacts.remove(painting.id);
  }
  private pending(id: string): Painting {
    const painting = this.artifacts.get(id);
    if (
      !painting ||
      painting.kind !== 'painting' ||
      painting.sealed ||
      painting.status !== 'pending'
    )
      throw Error('No pending painting with that identity.');
    return painting;
  }
  private carriedPlayer(id: string) {
    const painting = this.artifacts.get(id),
      slot = this.inventory.state.findIndex((item) => item?.artifact === id);
    if (!painting || painting.kind !== 'painting' || painting.author.kind !== 'player' || slot < 0)
      throw Error('Carry your own painting to finish its preview.');
    return { painting, slot: slot as 0 | 1, item: this.inventory.state[slot as 0 | 1]! };
  }
}
