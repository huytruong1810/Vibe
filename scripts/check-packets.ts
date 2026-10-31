import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { ReviewPacketSchema } from '../src/presentation/assets/review-packet';

for (const name of ['rivallie', 'bramblefang']) {
  const base = resolve(`art/review/2026-10-31-${name}`);
  const packet = ReviewPacketSchema.parse(
    JSON.parse(await readFile(resolve(base, 'review.json'), 'utf8')),
  );
  for (const frame of packet.frames) {
    const bytes = await readFile(resolve(base, frame.file));
    if (createHash('sha256').update(bytes).digest('hex') !== frame.sha256)
      throw new Error(`Digest: ${frame.id}`);
    const { info: metadata } = await sharp(bytes)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (metadata.width !== frame.sourceSize.w || metadata.height !== frame.sourceSize.h)
      throw new Error(`Dimensions: ${frame.id}`);
    for (const point of [frame.anchorPx!, ...Object.values(frame.sockets ?? {})])
      if (point.x % 2 || point.y % 2 || point.x > metadata.width! || point.y > metadata.height!)
        throw new Error(`Registration: ${frame.id}`);
  }
  console.log(
    `${name}: ${packet.frames.length} verified frames, ${packet.clips.length} facing clips; ${packet.qa?.filter((q) => !q.pass).length ?? 0} open QA findings. No gameplay activation.`,
  );
}
