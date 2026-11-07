import { z } from 'zod';
import { AnimationClipSchema, AssetFrameSchema } from './catalog';

export const PacketNameSchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/);
const RelativePng = z.string().regex(/^frames\/[a-zA-Z0-9_-]+\/[a-z]{1,2}_\d+\.png$/);
/** Dev-only transport reuses frame/clip contracts without relaxing gameplay asset URLs. */
export const ReviewPacketSchema = z
  .object({
    schemaVersion: z.literal(1),
    status: z.literal('candidate'),
    asset: z.string().min(1).max(160),
    sourceDigest: z.string().regex(/^[a-f0-9]{64}$/),
    qa: z
      .array(
        z
          .object({
            check: z.string().max(100),
            rule: z.string().max(200),
            pass: z.boolean(),
            hard: z.boolean(),
            detail: z.string().max(4000),
          })
          .strict(),
      )
      .max(100)
      .optional(),
    frames: z
      .array(
        AssetFrameSchema.extend({
          file: RelativePng,
          sha256: z.string().regex(/^[a-f0-9]{64}$/),
        }).strict(),
      )
      .min(1)
      .max(4096),
    clips: z.array(AnimationClipSchema).min(1).max(256),
  })
  .strict()
  .superRefine((packet, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    const frames = new Map(packet.frames.map((f) => [f.id, f]));
    if (frames.size !== packet.frames.length) fail('Duplicate packet frame');
    if (new Set(packet.clips.map((c) => c.id)).size !== packet.clips.length)
      fail('Duplicate packet clip');
    for (const f of packet.frames) {
      if (f.sourceSize.w > 1024 || f.sourceSize.h > 1024) fail('Packet canvas exceeds 1024');
      if (
        f.rect.x !== 0 ||
        f.rect.y !== 0 ||
        f.rect.w !== f.sourceSize.w ||
        f.rect.h !== f.sourceSize.h ||
        f.trim.x !== 0 ||
        f.trim.y !== 0 ||
        f.trim.w !== f.rect.w ||
        f.trim.h !== f.rect.h
      )
        fail('Review frames must be untrimmed');
      if (!f.anchorPx || f.anchorPx.x >= f.sourceSize.w || f.anchorPx.y >= f.sourceSize.h)
        fail('Invalid packet anchor');
      if (
        f.anchorPx &&
        (Math.abs(f.anchor.x - f.anchorPx.x / f.sourceSize.w) > 1e-8 ||
          Math.abs(f.anchor.y - f.anchorPx.y / f.sourceSize.h) > 1e-8)
      )
        fail('Inconsistent packet anchor');
    }
    for (const c of packet.clips)
      for (const id of c.frameIds) if (!frames.has(id)) fail(`Missing frame ${id}`);
  });
export type ReviewPacket = z.infer<typeof ReviewPacketSchema>;
export function packetBase(name: string): string {
  return `/art/review/${PacketNameSchema.parse(name)}/`;
}
