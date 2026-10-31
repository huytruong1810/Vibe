import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { FACINGS, type Facing } from '../src/presentation/assets/catalog';
import { SourceManifestSchema, type SourceManifest } from '../src/presentation/assets/source';
import { NPC_PROFILES, SPECIES } from '../src/content/definitions';

const root = process.cwd();

async function main() {
  const existingManifest = JSON.parse(
    await readFile(resolve(root, 'art/source/manifest.json'), 'utf8'),
  ) as SourceManifest;

  // Filter out existing player, species, and npc frames/clips/appearances so we regenerate them cleanly
  const nonActorFrames = existingManifest.frames.filter(
    (f) =>
      !f.id.startsWith('player_') &&
      !f.id.startsWith('rivallie_') &&
      !f.id.startsWith('creature_') &&
      !f.id.startsWith('npc_'),
  );

  const nonActorAppearances = existingManifest.appearances.filter(
    (a) => a.kind !== 'origin' && a.kind !== 'species' && a.kind !== 'npc',
  );

  const frames: SourceManifest['frames'] = [...nonActorFrames];
  const appearances: SourceManifest['appearances'] = [...nonActorAppearances];
  const clips: SourceManifest['clips'] = [];

  const addFrames = (
    prefix: string,
    relDir: string,
    facings: readonly Facing[],
    frameCount: number,
    anchor: { x: number; y: number },
  ) => {
    for (const facing of facings) {
      for (let i = 0; i < frameCount; i++) {
        const id = `${prefix}_idle_${facing}_${i}`;
        const path = `exports/${relDir}/idle_${facing}_${i}.png`;
        const fullPath = resolve(root, 'art/source', path);
        if (!existsSync(fullPath)) {
          throw new Error(`Missing required render frame: ${fullPath}`);
        }
        frames.push({
          id,
          path,
          anchor,
        });
      }
    }
  };

  const addClip = (appearanceId: string, prefix: string, facing: Facing, frameCount: number) => {
    const frameIds = Array.from({ length: frameCount }, (_, i) => `${prefix}_idle_${facing}_${i}`);
    clips.push({
      id: `${appearanceId.replace(/:/g, '_')}_idle_${facing}`,
      appearanceId,
      state: 'idle',
      facing,
      frameIds,
      fps: 6,
      playback: 'loop',
    });
  };

  // 1. Player Origins (Aqualia, Pyrador, Zephyria)
  const origins = [
    { id: 'aqualia', dir: 'player_aqualia', prefix: 'player_aqualia' },
    { id: 'pyrador', dir: 'player_pyrador', prefix: 'player_pyrador' },
    { id: 'zephyria', dir: 'player_zephyria', prefix: 'player_zephyria' },
  ];

  for (const o of origins) {
    const appearanceId = `origin:${o.id}`;
    addFrames(o.prefix, o.dir, FACINGS, 6, { x: 0.5, y: 0.92 });
    const clipIds: string[] = [];
    for (const facing of FACINGS) {
      addClip(appearanceId, o.prefix, facing, 6);
      clipIds.push(`${appearanceId.replace(/:/g, '_')}_idle_${facing}`);
    }
    appearances.push({
      id: appearanceId,
      kind: 'origin',
      contentId: o.id,
      quality: 'hd',
      clipIds,
    });
  }

  // 2. All 8 Creature Species
  const speciesList = [
    { id: 'rivallie', dir: 'rivallie', prefix: 'rivallie' },
    ...SPECIES.filter((s) => s.id !== 'human' && s.id !== 'rivallie').map((s) => ({
      id: s.id,
      dir: `creatures/${s.id}`,
      prefix: `creature_${s.id}`,
    })),
  ];

  for (const s of speciesList) {
    const appearanceId = `species:${s.id}`;
    addFrames(s.prefix, s.dir, FACINGS, 6, { x: 0.5, y: 0.9 });
    const clipIds: string[] = [];
    for (const facing of FACINGS) {
      addClip(appearanceId, s.prefix, facing, 6);
      clipIds.push(`${appearanceId.replace(/:/g, '_')}_idle_${facing}`);
    }
    appearances.push({
      id: appearanceId,
      kind: 'species',
      contentId: s.id,
      quality: 'hd',
      clipIds,
    });
  }

  // 3. All 30 Villagers
  // The 7 Aqualia slice NPCs have full 6-frame idle breathing cycles
  // The remaining 23 villagers have 1 key idle frame per facing (full 8 directions turnaround)
  const sliceNpcIds = new Set([
    'npc:neris',
    'npc:reed',
    'npc:willa',
    'npc:oren',
    'npc:lark',
    'npc:dara',
    'npc:finn',
  ]);

  for (const p of NPC_PROFILES) {
    const cleanId = p.id.replace(/^npc:/, '');
    const isSlice = sliceNpcIds.has(p.id);
    const frameCount = isSlice ? 6 : 1;
    const appearanceId = `npc:${p.id}`; // 'npc:npc:neris'
    const prefix = `npc_${cleanId}`;

    addFrames(prefix, `npcs/${cleanId}`, FACINGS, frameCount, { x: 0.5, y: 0.92 });
    const clipIds: string[] = [];
    for (const facing of FACINGS) {
      addClip(appearanceId, prefix, facing, frameCount);
      clipIds.push(`${appearanceId.replace(/:/g, '_')}_idle_${facing}`);
    }
    appearances.push({
      id: appearanceId,
      kind: 'npc',
      contentId: p.id,
      quality: 'hd',
      clipIds,
    });
  }

  const newManifest: SourceManifest = {
    schemaVersion: 1,
    frames,
    appearances,
    clips,
    portraits: existingManifest.portraits,
  };

  // Validate schema
  SourceManifestSchema.parse(newManifest);

  await writeFile(
    resolve(root, 'art/source/manifest.json'),
    JSON.stringify(newManifest, null, 2),
    'utf8',
  );

  console.log('Source manifest generated successfully:');
  console.log(`- Frames: ${frames.length}`);
  console.log(`- Appearances: ${appearances.length}`);
  console.log(`- Clips: ${clips.length}`);
  console.log(`- Portraits: ${newManifest.portraits?.length ?? 0}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
