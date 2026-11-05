import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { verifyPublishedBody } from '../../scripts/art-sidecars';

test('approved creature sidecars register expressions against actual body poses', async ({
  page,
}) => {
  const fixtures = ['rivallie', 'bramblefang', 'mireling']
    .map((asset) => ({
      asset,
      body: JSON.parse(readFileSync(`art/source/staging/blender/${asset}.json`, 'utf8')),
      faces: JSON.parse(readFileSync(`art/source/staging/blender/${asset}-faces.json`, 'utf8')),
    }))
    .filter(({ body, faces }) => {
      try {
        verifyPublishedBody(process.cwd(), body);
        const approval = readFileSync(faces.approvalRecord, 'utf8');
        return (
          body.packetDigest === faces.bodyPacketDigest &&
          body.packetSha256 === faces.bodyManifestSha256 &&
          /^decision: director-approved\s*$/m.test(approval) &&
          !/^superseded-by:/m.test(approval) &&
          createHash('sha256').update(approval).digest('hex') === faces.approvalSha256
        );
      } catch {
        return false;
      }
    });
  test.skip(
    fixtures.length === 0,
    'Await freshly published, approved B20 body/face pairs; historical sidecars are superseded.',
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.route('**/__sidecar-proof', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:24px;background:#1c2232;color:#eee;font:18px monospace"><h1>C3b registration proof - approved body/face pairs</h1><p>Rows: Rivallie, Bramblefang, Mireling. Columns: South neutral/warm, East neutral/warm, West neutral/warm.</p><canvas id="proof" width="1344" height="744"></canvas></body></html>',
    }),
  );
  await page.goto('/__sidecar-proof');
  const counts = await page.evaluate(async (data) => {
    const moduleUrl = '/src/presentation/compositor.ts';
    const { faceLayerPose } = await import(/* @vite-ignore */ moduleUrl);
    const canvas = document.querySelector<HTMLCanvasElement>('#proof')!;
    const ctx = canvas.getContext('2d')!;
    document.querySelector('p')!.textContent =
      `Rows: ${data.map((d) => d.asset).join(', ')}. Columns: South neutral/warm, East neutral/warm, West neutral/warm.`;
    canvas.height = data.length * 248;
    ctx.imageSmoothingEnabled = false;
    const load = async (file: string) => {
      const image = new Image();
      image.src = `/art/source/${file}`;
      await image.decode();
      return image;
    };
    let composed = 0,
      hidden = 0;
    for (const [row, fixture] of data.entries()) {
      const faceFrames: Record<string, Record<string, string>> = {};
      for (const frame of fixture.faces.frames)
        (faceFrames[frame.expression] ??= {})[frame.facing] = frame.file;
      const layer = {
        face: { frames: faceFrames, registration: fixture.faces.registration.frames },
      };
      for (const [column, facing] of ['s', 'e', 'w'].entries()) {
        const body = fixture.body.frames.find((f: any) => f.id.endsWith(`:idle:${facing}:0`));
        if (!body) throw Error('Missing approved idle frame');
        for (const [variant, expression] of ['neutral', 'warm'].entries()) {
          const pose = faceLayerPose(
            layer,
            { pose: 'idle', faceExpression: expression },
            body,
            facing,
          );
          if (!pose) throw Error(`Missing visible idle face: ${fixture.asset}/${facing}`);
          const decal = fixture.faces.frames.find((f: any) => f.file === pose.frameId)!;
          const x = (column * 2 + variant) * 224,
            y = row * 248;
          ctx.drawImage(await load(body.file), x, y, body.sourceSize.w * 2, body.sourceSize.h * 2);
          ctx.drawImage(
            await load(decal.file),
            x + (pose.target.x - decal.anchorPx.x) * 2,
            y + (pose.target.y - decal.anchorPx.y) * 2,
            decal.sourceSize.w * 2,
            decal.sourceSize.h * 2,
          );
          composed++;
          if (faceLayerPose(layer, { pose: 'idle' }, body, 'n'))
            throw Error('Back-facing decal leaked');
        }
      }
      const hiddenId = Object.keys(fixture.faces.registration.frames).find(
        (id) => fixture.faces.registration.frames[id] === null,
      );
      if (hiddenId) {
        const body = fixture.body.frames.find((f: any) => f.id === hiddenId)!;
        if (faceLayerPose(layer, { pose: 'idle' }, body, hiddenId.split(':').at(-2)))
          throw Error('Hidden face leaked');
        hidden++;
      }
    }
    return { composed, hidden };
  }, fixtures);
  expect(counts).toEqual({
    composed: fixtures.length * 6,
    hidden: fixtures.filter((f) =>
      Object.values(f.faces.registration.frames).some((offset) => offset === null),
    ).length,
  });
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: 'artifacts/c3b-sidecars-1080p.png' });
});
