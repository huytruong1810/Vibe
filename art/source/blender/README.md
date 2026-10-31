# Hearthwild 3D-to-Pixel-Art Blender Workflow

This directory contains the headless rendering pipeline and specifications for baking 3D character and creature models into zero-drift, 8-directional 2D pixel-art sprite sheets (_Dead Cells_ / Motion Twin style).

---

## 1. Directory Structure

```text
art/source/blender/
├── README.md                      # This manual
├── render_pixel_sprites.py        # Headless Blender Python batch renderer (bpy)
└── models/                        # Place .blend source models here
    ├── player_aqualia.blend
    └── rivallie.blend
```

Output frames are automatically written directly to:

- `art/source/exports/player_aqualia/idle_{facing}_0.png`
- `art/source/exports/rivallie/idle_{facing}_0.png`

---

## 2. Canvas & Technical Specifications

| Entity                  | Canvas (W x H)            | Ground Anchor (X, Y) | Camera Pitch | Ortho Scale | Required Border Padding       |
| :---------------------- | :------------------------ | :------------------- | :----------- | :---------- | :---------------------------- |
| **Player / Humanoids**  | $96 \times 144\text{ px}$ | $(48, 132)$          | $18.0^\circ$ | $2.0$       | $\ge 2\text{ px}$ transparent |
| **Rivallie (Creature)** | $96 \times 96\text{ px}$  | $(48, 86)$           | $22.0^\circ$ | $1.5$       | $\ge 2\text{ px}$ transparent |

### Facing Angles Baked by Script

1. `s` – South ($0^\circ$)
2. `se` – South-East ($45^\circ$)
3. `e` – East ($90^\circ$)
4. `ne` – North-East ($135^\circ$)
5. `n` – North ($180^\circ$)
6. `nw` – North-West ($225^\circ$)
7. `w` – West ($270^\circ$)
8. `sw` – South-West ($315^\circ$)

---

## 3. How to Render on the Blender Machine

Make sure `blender` is in your system `PATH` (Blender 3.x, 4.x, or LTS).

### Render Player Aqualia

```bash
blender -b art/source/blender/models/player_aqualia.blend -P art/source/blender/render_pixel_sprites.py
```

### Render Rivallie

```bash
blender -b art/source/blender/models/rivallie.blend -P art/source/blender/render_pixel_sprites.py
```

---

## 4. Compile Sprites & Verify

After rendering new frames into `art/source/exports/`, run the deterministic asset pipeline:

```bash
# 1. Run deterministic asset build & check
python art/source/pipeline/rebuild.py
python art/source/pipeline/rebuild.py --check

# 2. Build and validate runtime texture atlas
npm run assets:build
npm run check:assets

# 3. Run regression test suite
npm test
```

---

## 5. Git Synchronization Workflow

### On New Machine (First Time):

```bash
git clone https://github.com/huytruong1810/Vibe.git
cd Vibe
git checkout art/hd-aqualia-slice
npm install
```

### After Baking & Validating:

```bash
git add art/source/blender/models/
git add art/source/exports/
git add public/assets/generated/
git commit -m "feat(art): bake stylized 3D models for player and rivallie"
git push origin art/hd-aqualia-slice
```
