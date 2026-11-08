import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const stagingDir = resolve(root, 'art/source/staging/blender');
const envExportDir = resolve(root, 'art/source/exports/environment');
const manifestPath = resolve(root, 'art/source/manifest.json');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

// Mapping from staging json id -> runtime environment id
const MAPPINGS: Record<string, string> = {
  'env-house-aqualia': 'house_aqualia',
  'env-tree-oak': 'tree_oak',
  'env-well': 'landmark_well',
  'env-landmark-waystone': 'landmark_waystone',
  'env-prop-hearth': 'prop_hearth',
  'env-boardwalk': 'boardwalk',
  'env-reed-clump': 'reed_clump',
  'env-lantern-post': 'lantern_post',
  'env-bell-post': 'bell_post',
  'env-mill-waterwheel': 'mill_waterwheel',
  'env-crates-barrels': 'crates_barrels',
  'env-willow-footbridge': 'willow_footbridge',
  'env-stilt-hut': 'stilt_hut',
  'env-studio-lark': 'studio_lark',
  'env-gauge-tower': 'gauge_tower',
  'env-divers-pool': 'divers_pool',
  'env-notice-board': 'notice_board',
  'env-lantern-bridge': 'lantern_bridge',
  'env-fungi-ring': 'fungi_ring',
  'env-ferry-landing': 'ferry_landing',
  'env-sluice-gate': 'sluice_gate',
  'env-shrine-spring': 'shrine_spring',
  'env-kite-oak': 'kite_oak',
};

// Add flora
const FLORA = ['ashgrass', 'berries', 'fungi', 'nectar', 'reeds', 'wheat'];
const STATES = ['healthy', 'harvested', 'burnt'];
for (const f of FLORA) {
  for (const s of STATES) {
    MAPPINGS[`env-flora-${f}-${s}`] = `flora_${f}_${s}`;
  }
}

async function run() {
  console.log('Upgrading environment assets from director-approved 3D-baked staging packets...');
  let updatedCount = 0;

  for (const [stageId, runtimeId] of Object.entries(MAPPINGS)) {
    const stagePath = join(stagingDir, `${stageId}.json`);
    if (!existsSync(stagePath)) continue;

    const data = JSON.parse(readFileSync(stagePath, 'utf8'));
    const frames = data.frames as {
      id: string;
      file: string;
      layer: string;
      anchorPx: { x: number; y: number };
      sourceSize: { w: number; h: number };
    }[];

    const baseFrame = frames.find((f) => f.layer === 'base');
    if (!baseFrame) continue;

    const basePath = resolve(root, 'art/source', baseFrame.file);
    if (!existsSync(basePath)) continue;

    const roofFrame = frames.find((f) => f.layer === 'roof');
    const canopyFrame = frames.find((f) => f.layer === 'canopy');

    const destFile = join(envExportDir, `${runtimeId}.png`);

    if (roofFrame) {
      const roofPath = resolve(root, 'art/source', roofFrame.file);
      if (existsSync(roofPath)) {
        await sharp(basePath).composite([{ input: roofPath }]).toFile(destFile);
      } else {
        await sharp(basePath).toFile(destFile);
      }
    } else {
      await sharp(basePath).toFile(destFile);
    }

    // Special case for tree_oak canopy
    if (stageId === 'env-tree-oak' && canopyFrame) {
      const canopyPath = resolve(root, 'art/source', canopyFrame.file);
      const destCanopy = join(envExportDir, 'canopy_oak.png');
      if (existsSync(canopyPath)) {
        await sharp(canopyPath).toFile(destCanopy);
      }
    }

    // Update manifest frame entry
    const frameId = `env_${runtimeId}`;
    const normX = Math.round((baseFrame.anchorPx.x / baseFrame.sourceSize.w) * 10000) / 10000;
    const normY = Math.round((baseFrame.anchorPx.y / baseFrame.sourceSize.h) * 10000) / 10000;

    const mFrame = manifest.frames.find((f: any) => f.id === frameId);
    if (mFrame) {
      mFrame.path = `exports/environment/${runtimeId}.png`;
      mFrame.anchor = { x: normX, y: normY };
    } else {
      manifest.frames.push({
        id: frameId,
        path: `exports/environment/${runtimeId}.png`,
        anchor: { x: normX, y: normY },
        legacy: true,
      });
    }

    // Update manifest appearance entry
    const app = manifest.appearances.find(
      (a: any) => a.kind === 'environment' && a.contentId === runtimeId,
    );
    if (!app) {
      manifest.appearances.push({
        id: `environment:${runtimeId}`,
        kind: 'environment',
        contentId: runtimeId,
        quality: 'hd',
        clipIds: [],
        frameId,
        legacy: true,
      });
    } else {
      app.quality = 'hd';
      app.frameId = frameId;
    }

    updatedCount++;
  }

  // Update canopy_oak frame in manifest
  const canopyMFrame = manifest.frames.find((f: any) => f.id === 'env_canopy_oak');
  if (canopyMFrame) {
    canopyMFrame.anchor = { x: 0.5, y: 0.9718 };
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Updated ${updatedCount} environment assets in art/source/manifest.json.`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
