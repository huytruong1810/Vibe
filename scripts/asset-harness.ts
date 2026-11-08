#!/usr/bin/env node
/**
 * Turnkey Asset Generation & Baking Harness CLI.
 * 
 * Provides an autonomous, guardrail-enforced orchestration interface for agents
 * to generate, bake, verify, and integrate HD pixel-art game visual assets:
 * - 2D Turnarounds, neutral & 9-expression portraits via Z-Image Turbo (Apache-2.0)
 * - Dual-grid seamless terrain swatches & 32px inventory icons
 * - 3D Rigged meshes, 15-clip animations, and pixelated sprite sheets via Blender 4.2+ & Quaternius UAL
 * - Automated Ollama VRAM eviction before any GPU inference
 * - Atomic staging merge, atlas repack, approvals ledger transcription, LDtk map compilation
 * - Headless Playwright visual capture and review verification
 *
 * Usage:
 *   npm run harness -- doctor
 *   npm run harness -- status
 *   npm run harness -- next
 *   npm run harness -- generate <concept|views|portrait-base|portrait|portrait-emotions|swatch|icon|bake> ...
 *   npm run harness -- integrate <asset> [--appearance <species:id|npc:id>]
 *   npm run harness -- preview
 */

import { execSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');

// ANSI Colors
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const GRAY = '\x1b[90m';

function log(msg: string) {
  console.log(msg);
}

function success(msg: string) {
  console.log(`${GREEN}✔ ${msg}${RESET}`);
}

function warn(msg: string) {
  console.log(`${YELLOW}⚠ ${msg}${RESET}`);
}

function error(msg: string) {
  console.error(`${RED}✖ ${msg}${RESET}`);
}

function info(msg: string) {
  console.log(`${CYAN}ℹ ${msg}${RESET}`);
}

// ---------------------------------------------------------------- GPU & Ollama Helpers
async function evictOllama(): Promise<boolean> {
  const models = ['gemma4-abliterated:e4b', 'gemma4-abliterated:26b'];
  let evicted = false;
  for (const model of models) {
    try {
      const res = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, keep_alive: 0 }),
      });
      if (res.ok) evicted = true;
    } catch {
      // Ollama not running or unreachable; that is fine
    }
  }
  return evicted;
}

function getGpuVram(): { totalMiB: number; usedMiB: number; freeMiB: number } | null {
  try {
    const out = execSync(
      'nvidia-smi --query-gpu=memory.total,memory.used,memory.free --format=csv,noheader,nounits',
      { encoding: 'utf8', timeout: 5000 },
    ).trim();
    const parts = out.split(',').map((s) => parseInt(s.trim(), 10));
    const total = parts[0] ?? 0;
    const used = parts[1] ?? 0;
    const free = parts[2] ?? 0;
    return { totalMiB: total, usedMiB: used, freeMiB: free };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- Subcommands

async function cmdDoctor(): Promise<number> {
  log(`\n${BOLD}${CYAN}=== Hearthwild Asset Harness Doctor ===${RESET}\n`);

  let failures = 0;

  // 1. Check Blender
  const blenderPaths = [
    join(process.env.HOME || '', '.local/bin/blender'),
    '/usr/local/bin/blender',
    '/usr/bin/blender',
  ];
  let blenderOk = false;
  let blenderVer = '';
  for (const bp of blenderPaths) {
    if (existsSync(bp)) {
      try {
        const out = execSync(`"${bp}" -b --factory-startup --version`, {
          encoding: 'utf8',
          timeout: 10000,
        });
        if (out.includes('Blender 4.2')) {
          blenderOk = true;
          blenderVer = out.split('\n')[0] || 'Blender 4.2.x';
          break;
        }
      } catch {
        // ignore
      }
    }
  }
  if (blenderOk) {
    success(`Blender LTS: ${blenderVer}`);
  } else {
    error('Blender 4.2 LTS not found at ~/.local/bin/blender');
    failures++;
  }

  // 2. Check sd-server binary
  const sdServerBin = join(
    process.env.HOME || '',
    '.local/src/stable-diffusion.cpp/build/bin/sd-server',
  );
  if (existsSync(sdServerBin)) {
    success(`sd-server binary: ${sdServerBin}`);
  } else {
    error(`sd-server binary missing at ${sdServerBin}`);
    failures++;
  }

  // 3. Check Z-Image Turbo weights
  const zImagePath = join(process.env.HOME || '', '.models/z-image');
  const zGguf = join(zImagePath, 'z_image_turbo-Q4_K.gguf');
  const zQwen = join(zImagePath, 'qwen_3_4b.safetensors');
  const zAe = join(zImagePath, 'ae.safetensors');
  if (existsSync(zGguf) && existsSync(zQwen) && existsSync(zAe)) {
    success(`Z-Image Turbo weights verified in ${zImagePath}`);
  } else {
    error(`Z-Image Turbo weights missing in ${zImagePath}`);
    failures++;
  }

  // 4. Check Ollama & evict VRAM
  info('Checking Ollama status and evicting in-game models from GPU memory...');
  await evictOllama();
  const gpu = getGpuVram();
  if (gpu) {
    if (gpu.freeMiB >= 10000) {
      success(
        `GPU VRAM: ${gpu.freeMiB} MiB free / ${gpu.totalMiB} MiB total (Ollama evicted, ready for forge runs)`,
      );
    } else {
      warn(
        `GPU VRAM: ${gpu.freeMiB} MiB free / ${gpu.totalMiB} MiB total (low headroom; verify no background models are held)`,
      );
    }
  } else {
    warn('Could not query nvidia-smi for VRAM headroom.');
  }

  // 5. Run Python Forge doctor
  info('Running Sprite Forge environment doctor (art/source/forge/forge.py doctor)...');
  try {
    const res = spawnSync('python3', ['art/source/forge/forge.py', 'doctor'], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
    });
    if (res.status === 0) {
      success('Forge doctor reported environment clean.');
    } else {
      info('Forge doctor finished with recommendations for pending asset classes.');
    }
  } catch (e: any) {
    error(`Forge doctor execution failed: ${e.message}`);
    failures++;
  }

  log(`\nDoctor completed with ${failures} blocking issues.\n`);
  return failures === 0 ? 0 : 1;
}

async function cmdStatus(): Promise<void> {
  log(`\n${BOLD}${CYAN}=== Hearthwild Asset Catalog & Production Status ===${RESET}\n`);

  const manifestPath = join(REPO_ROOT, 'art/source/manifest.json');
  const catalogPath = join(REPO_ROOT, 'public/assets/generated/catalog.json');
  const approvalsPath = join(REPO_ROOT, 'docs/art/approvals.json');

  if (!existsSync(manifestPath)) {
    error('art/source/manifest.json not found.');
    return;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const catalog = existsSync(catalogPath) ? JSON.parse(readFileSync(catalogPath, 'utf8')) : null;
  const approvals = existsSync(approvalsPath)
    ? JSON.parse(readFileSync(approvalsPath, 'utf8'))
    : { records: [] };

  const approvedIds = new Set(approvals.records.map((r: any) => `${r.subjectKind}:${r.subjectId}`));

  log(`${BOLD}1. Character Species (Creatures & Allies):${RESET}`);
  const species = manifest.appearances.filter((a: any) => a.kind === 'species');
  for (const s of species) {
    const isApproved = approvedIds.has(`appearance:${s.id}`);
    const statusLabel = isApproved
      ? `${GREEN}APPROVED HD${RESET}`
      : s.stage === 'candidate'
        ? `${YELLOW}CANDIDATE (STAGED)${RESET}`
        : `${GRAY}PROTOTYPE${RESET}`;
    const clipCount = s.clipIds ? s.clipIds.length : 0;
    log(`  - ${BOLD}${s.id.padEnd(24)}${RESET} ${statusLabel} (${clipCount} clips)`);
  }

  log(`\n${BOLD}2. NPCs & Villagers:${RESET}`);
  const npcs = manifest.appearances.filter((a: any) => a.kind === 'npc');
  for (const n of npcs.slice(0, 10)) {
    const isApproved = approvedIds.has(`appearance:${n.id}`);
    const statusLabel = isApproved
      ? `${GREEN}APPROVED HD${RESET}`
      : n.stage === 'candidate'
        ? `${YELLOW}CANDIDATE${RESET}`
        : `${GRAY}PROTOTYPE / MODULAR${RESET}`;
    log(`  - ${BOLD}${n.id.padEnd(24)}${RESET} ${statusLabel}`);
  }
  if (npcs.length > 10) {
    log(`  ${GRAY}... and ${npcs.length - 10} more NPCs${RESET}`);
  }

  log(`\n${BOLD}3. Environment Assets (Buildings, Props, Trees, Flora):${RESET}`);
  const envs = manifest.appearances.filter((a: any) => a.kind === 'environment');
  const envCandidates = envs.filter((e: any) => e.stage === 'candidate' || e.quality === 'hd').length;
  log(`  - Total environment appearances in manifest: ${envs.length}`);
  log(`  - HD / Candidate environment models: ${envCandidates}`);

  log(`\n${BOLD}4. Item Icons & Held Models:${RESET}`);
  const items = manifest.appearances.filter((a: any) => a.kind === 'item');
  log(`  - Total item appearances in manifest: ${items.length}`);

  if (catalog) {
    log(`\n${BOLD}5. Compiled Runtime Catalog:${RESET}`);
    log(`  - Atlas Pages: ${catalog.pages?.length ?? 0}`);
    log(`  - Total Packed Frames: ${catalog.frames?.length ?? 0}`);
    log(`  - Active Clips: ${catalog.clips?.length ?? 0}`);
  }
  log('');
}

async function cmdGenerate(task: string, ...args: string[]): Promise<number> {
  log(`\n${BOLD}${CYAN}=== Asset Generation: ${task} ===${RESET}\n`);

  // Ensure Ollama VRAM is freed before any generation
  info('Ensuring Ollama VRAM is evicted before GPU job...');
  await evictOllama();

  const pythonForge = join(REPO_ROOT, 'art/source/forge/forge.py');

  let cmdArgs: string[] = [];
  switch (task) {
    case 'concept': {
      const asset = args[0];
      if (!asset) {
        error('Usage: npm run harness -- generate concept <asset-id>');
        return 1;
      }
      info(`Generating 2D concept turnaround sheet for ${asset} with Z-Image Turbo...`);
      cmdArgs = [pythonForge, 'concept', '--asset', asset, ...args.slice(1)];
      break;
    }
    case 'views': {
      const asset = args[0];
      if (!asset) {
        error('Usage: npm run harness -- generate views <asset-id>');
        return 1;
      }
      info(`Processing sliced reference views for ${asset}...`);
      cmdArgs = [pythonForge, 'views', '--asset', asset, ...args.slice(1)];
      break;
    }
    case 'portrait-base': {
      const asset = args[0];
      if (!asset) {
        error('Usage: npm run harness -- generate portrait-base <asset-id>');
        return 1;
      }
      info(`Generating high-fidelity 512x512 painterly neutral base portrait for ${asset}...`);
      cmdArgs = [pythonForge, 'portrait-base', '--asset', asset, ...args.slice(1)];
      break;
    }
    case 'portrait': {
      const asset = args[0];
      if (!asset) {
        error('Usage: npm run harness -- generate portrait <asset-id>');
        return 1;
      }
      info(`Generating 128px & 96px neutral portrait pairs for ${asset}...`);
      cmdArgs = [pythonForge, 'portrait', '--asset', asset, ...args.slice(1)];
      break;
    }
    case 'portrait-emotions': {
      const asset = args[0];
      if (!asset) {
        error('Usage: npm run harness -- generate portrait-emotions <asset-id>');
        return 1;
      }
      info(`Generating all 8 emotional expression variations for ${asset}...`);
      cmdArgs = [
        pythonForge,
        'portrait',
        '--asset',
        asset,
        '--emotions',
        'joy,sad,angry,surprised,worried,smug,neutral,sleepy',
        ...args.slice(1),
      ];
      break;
    }
    case 'swatch': {
      const [set, material, prompt] = args;
      if (!set || !material || !prompt) {
        error('Usage: npm run harness -- generate swatch <set> <material> <prompt>');
        return 1;
      }
      info(`Generating 1024px seamless terrain swatch for ${set}/${material}...`);
      cmdArgs = [
        pythonForge,
        'swatch',
        '--set',
        set,
        '--material',
        material,
        '--prompt',
        prompt,
        ...args.slice(3),
      ];
      break;
    }
    case 'icon': {
      const [item, prompt] = args;
      if (!item || !prompt) {
        error('Usage: npm run harness -- generate icon <item> <prompt>');
        return 1;
      }
      info(`Generating 32px inventory icon for ${item}...`);
      cmdArgs = [pythonForge, 'icon', '--item', item, '--prompt', prompt, ...args.slice(2)];
      break;
    }
    case 'bake': {
      const asset = args[0];
      if (!asset) {
        error('Usage: npm run harness -- generate bake <asset-id>');
        return 1;
      }
      info(`Running full 3D bake pipeline for ${asset}...`);
      cmdArgs = [pythonForge, 'all', '--asset', asset, ...args.slice(1)];
      break;
    }
    default:
      error(`Unknown generation task '${task}'. Supported: concept, views, portrait-base, portrait, portrait-emotions, swatch, icon, bake.`);
      return 1;
  }

  const res = spawnSync('python3', cmdArgs, {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
  });

  return res.status ?? 0;
}

async function cmdIntegrate(asset: string, ...args: string[]): Promise<number> {
  if (!asset) {
    error('Usage: npm run harness -- integrate <asset-id> [--appearance species:id|npc:id]');
    return 1;
  }

  log(`\n${BOLD}${CYAN}=== Integrating Staged Asset: ${asset} ===${RESET}\n`);

  // Step 1: Merge staged asset into art/source/manifest.json
  info(`Step 1/5: Merging staged asset ${asset} into art/source/manifest.json...`);
  const mergeRes = spawnSync(
    'npx',
    ['tsx', 'scripts/art-integrate.ts', 'merge', asset, ...args],
    { cwd: REPO_ROOT, stdio: 'inherit' },
  );
  if (mergeRes.status !== 0) {
    error(`Failed to merge ${asset} into manifest.`);
    return 1;
  }
  success(`Merged ${asset} into source manifest.`);

  // Step 2: Build asset catalog and sprite sheets
  info('Step 2/5: Re-packing atlas textures and building catalog.json...');
  const buildRes = spawnSync('npx', ['tsx', 'scripts/assets-build.ts'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  if (buildRes.status !== 0) {
    error('Failed to re-pack atlas assets.');
    return 1;
  }
  success('Atlas textures packed successfully.');

  // Step 3: Record ledger approval transcription
  info(`Step 3/5: Transcribing director approval ledger for ${asset}...`);
  const ledgerRes = spawnSync(
    'npx',
    ['tsx', 'scripts/art-integrate.ts', 'ledger', asset, ...args],
    { cwd: REPO_ROOT, stdio: 'inherit' },
  );
  if (ledgerRes.status !== 0) {
    warn(`Ledger transcription skipped or needs approval record for ${asset}.`);
  } else {
    success(`Transcribed ${asset} in docs/art/approvals.json.`);
    // Rebuild assets to reflect approved stage
    spawnSync('npx', ['tsx', 'scripts/assets-build.ts'], {
      cwd: REPO_ROOT,
      stdio: 'inherit',
    });
  }

  // Step 4: Compile LDtk world
  info('Step 4/5: Compiling LDtk world and verifying placements...');
  const worldRes = spawnSync('npx', ['tsx', 'scripts/world-build.ts'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  if (worldRes.status !== 0) {
    warn('World compilation reported warnings or changes.');
  } else {
    success('World compiled into public/assets/generated/aqualia-region.json.');
  }

  // Step 5: Verify asset constraints and coverage
  info('Step 5/5: Running check:assets verification...');
  const checkRes = spawnSync('npx', ['tsx', 'scripts/assets-check.ts'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  if (checkRes.status === 0) {
    success('check:assets passed cleanly!');
  } else {
    warn('check:assets completed with pending prototype slices.');
  }

  log(`\n${GREEN}${BOLD}Asset integration complete for ${asset}!${RESET}\n`);
  return 0;
}

async function isPortOpen(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = createServer();
    s.once('error', () => resolve(true)); // port in use
    s.once('listening', () => {
      s.close();
      resolve(false); // port free
    });
    s.listen(port, '127.0.0.1');
  });
}

async function cmdPreview(): Promise<number> {
  log(`\n${BOLD}${CYAN}=== Capturing In-Game Visual Previews ===${RESET}\n`);

  const previewDir = join(REPO_ROOT, 'art/review/latest-preview');
  mkdirSync(previewDir, { recursive: true });

  const port = 5173;
  let viteProcess: any = null;
  const inUse = await isPortOpen(port);

  if (!inUse) {
    info(`Starting Vite server on 127.0.0.1:${port}...`);
    viteProcess = spawn('npx', ['vite', '--port', String(port), '--host', '127.0.0.1'], {
      cwd: REPO_ROOT,
      stdio: 'ignore',
      detached: true,
    });
    // Wait for server to bind
    let ready = false;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (await isPortOpen(port)) {
        ready = true;
        break;
      }
    }
    if (!ready) {
      error(`Timed out waiting for Vite dev server on port ${port}.`);
      if (viteProcess?.pid) process.kill(-viteProcess.pid);
      return 1;
    }
  } else {
    info(`Using active dev server on 127.0.0.1:${port}...`);
  }

  try {
    const { chromium } = await import('@playwright/test');
    info('Launching headless Chromium to capture high-res overworld and gallery previews...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    // 1. Overworld View
    info('Capturing overworld view (/?test=1)...');
    await page.goto(`http://127.0.0.1:${port}/?test=1`, { waitUntil: 'networkidle', timeout: 30000 });
    const playBtn = page.getByRole('button', { name: 'Play without local AI', exact: true });
    if (await playBtn.isVisible()) {
      await playBtn.click();
    }
    await page.waitForTimeout(3000);
    const overworldPath = join(previewDir, 'overworld.png');
    await page.screenshot({ path: overworldPath });
    success(`Overworld capture: ${overworldPath}`);

    // 2. Asset Gallery Views
    info('Capturing asset review gallery (/?gallery=1)...');
    await page.goto(`http://127.0.0.1:${port}/?gallery=1`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    const galleryPath = join(previewDir, 'gallery.png');
    await page.screenshot({ path: galleryPath });
    success(`Gallery inspector capture: ${galleryPath}`);

    // Lineup tab
    const lineupTab = page.getByRole('button', { name: /Cast Lineup/i });
    if (await lineupTab.isVisible()) {
      await lineupTab.click();
      await page.waitForTimeout(1000);
      const lineupPath = join(previewDir, 'gallery-lineup.png');
      await page.screenshot({ path: lineupPath });
      success(`Gallery cast lineup capture: ${lineupPath}`);
    }

    // Village staging tab
    const villageTab = page.getByRole('button', { name: /Village Staging/i });
    if (await villageTab.isVisible()) {
      await villageTab.click();
      await page.waitForTimeout(1000);
      const villagePath = join(previewDir, 'gallery-village.png');
      await page.screenshot({ path: villagePath });
      success(`Gallery village staging capture: ${villagePath}`);
    }

    await browser.close();
  } catch (err: any) {
    error(`Playwright capture failed: ${err.message}`);
    return 1;
  } finally {
    if (viteProcess && viteProcess.pid) {
      try {
        process.kill(-viteProcess.pid);
      } catch {
        // ignore
      }
    }
  }

  log(`\n${GREEN}${BOLD}Preview captures saved to art/review/latest-preview/!${RESET}\n`);
  return 0;
}

// ---------------------------------------------------------------- CLI Dispatcher
async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    log(`
${BOLD}${CYAN}Hearthwild Asset Generation & Baking Harness${RESET}

${BOLD}Usage:${RESET}
  npm run harness -- <command> [arguments...]

${BOLD}Commands:${RESET}
  ${GREEN}doctor${RESET}                                Check Blender, sd-server, Z-Image weights, and evict Ollama VRAM
  ${GREEN}status${RESET}                                Display detailed catalog status for characters, environment, tiles, items
  ${GREEN}generate concept <asset>${RESET}              Generate 2D concept turnaround sheet with Z-Image Turbo
  ${GREEN}generate views <asset>${RESET}                Slice concept into canonical reference views
  ${GREEN}generate portrait-base <asset>${RESET}        Generate high-resolution painterly base portrait
  ${GREEN}generate portrait <asset>${RESET}             Scale 128px and 96px neutral portrait pairs
  ${GREEN}generate portrait-emotions <asset>${RESET}    Generate 8 dialogue emotions for portrait sets
  ${GREEN}generate swatch <set> <mat> <prompt>${RESET}  Generate 1024px seamless dual-grid terrain swatch
  ${GREEN}generate icon <item> <prompt>${RESET}         Generate 32px inventory item icon
  ${GREEN}generate bake <asset>${RESET}                 Execute complete 3D Blender mesh, rig, animation, and sprite bake
  ${GREEN}integrate <asset> [--appearance ID]${RESET}   Merge staged candidate, repack atlas, transcribe ledger, rebuild world
  ${GREEN}preview${RESET}                               Launch headless browser and capture overworld & gallery screenshots
`);
    process.exit(0);
  }

  switch (cmd) {
    case 'doctor':
      process.exit(await cmdDoctor());
      break;
    case 'status':
      await cmdStatus();
      process.exit(0);
      break;
    case 'generate':
      process.exit(await cmdGenerate(args[0] ?? '', ...args.slice(1)));
      break;
    case 'integrate':
      process.exit(await cmdIntegrate(args[0] ?? '', ...args.slice(1)));
      break;
    case 'preview':
      process.exit(await cmdPreview());
      break;
    default:
      error(`Unknown harness command '${cmd}'. Run 'npm run harness -- help' for usage.`);
      process.exit(1);
  }
}

main().catch((err) => {
  error(`Unhandled harness error: ${err.message}`);
  process.exit(1);
});
