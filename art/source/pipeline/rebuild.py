"""
Deterministic Master Rebuild Engine for Hearthwild Pixel-Art Assets.
Integrates master sheet visual authoring, automated segmentation, anchor registration,
and environment generation into a unified, reproducible CLI.

Usage:
  python art/source/pipeline/rebuild.py [--check] [--from-masters] [--dry-run]
"""

import os
import sys
import argparse
import hashlib
import json
import io
from datetime import datetime, timezone
from typing import Dict, List, Tuple, Optional
from pathlib import Path
from PIL import Image, ImageDraw

# Ensure repo root is on sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from art.source.pipeline.process_master_sheet import (
    register_actor_on_canvas,
    build_contact_sheet,
    segment_and_extract_figures,
    init_matting_session,
)
from art.source.generators.actors.breathing import (
    generate_humanoid_breathing_frames,
    generate_rivallie_breathing_frames,
)
from art.source.generators.actors.mesh_rig import (
    build_player_3d_mesh,
    build_rivallie_3d_mesh,
    render_actor_8way,
)
from art.source.generators.environment.terrain import (
    render_ground_grass, render_ground_dirt, render_ground_sand, render_ground_freshwater,
    render_shore_freshwater_mask, render_cliff_grass, render_ramp_grass
)
from art.source.generators.environment.resources import (
    render_flora_berries, render_flora_reeds, render_flora_wheat,
    render_flora_nectar, render_flora_ashgrass, render_flora_fungi
)
from art.source.generators.environment.buildings import (
    render_tree_oak, render_canopy_oak, render_house_aqualia,
    render_landmark_well, render_landmark_waystone, render_prop_hearth
)

def compute_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def get_file_sha256(path: Path) -> str:
    if not path.is_file():
        return ""
    return hashlib.sha256(path.read_bytes()).hexdigest()

def extract_from_masters_if_requested(from_masters: bool = False):
    """Optionally re-runs BiRefNet segmentation directly on raw master JPEGs."""
    if not from_masters:
        return
    masters_dir = REPO_ROOT / "art" / "source" / "masters"
    cutouts_dir = masters_dir / "cutouts"
    cutouts_dir.mkdir(parents=True, exist_ok=True)

    print("Running BiRefNet segmentation on master turnaround sheets...")
    session = init_matting_session()

    p_master = masters_dir / "player_aqualia_turnaround_master.jpg"
    if p_master.is_file():
        print("  Extracting Player Aqualia figures...")
        p_img = Image.open(p_master).convert("RGB")
        p_figs = segment_and_extract_figures(p_img, session=session, min_area=1000)
        assert len(p_figs) >= 4, f"Expected >= 4 player figures, got {len(p_figs)}"
        for i in range(4):
            p_figs[i].save(cutouts_dir / f"player_{i}.png", "PNG")

    r_master = masters_dir / "rivallie_turnaround_master.jpg"
    if r_master.is_file():
        print("  Extracting Rivallie figures...")
        r_img = Image.open(r_master).convert("RGB")
        r_figs = segment_and_extract_figures(r_img, session=session, min_area=1000)
        assert len(r_figs) >= 4, f"Expected >= 4 rivallie figures, got {len(r_figs)}"
        for i in range(4):
            r_figs[i].save(cutouts_dir / f"rivallie_{i}.png", "PNG")
    print("Master extraction complete.")

def main():
    parser = argparse.ArgumentParser(description="Deterministic pixel-art rebuild engine")
    parser.add_argument("--check", action="store_true", help="Verify existing files match generated output without modifying disk")
    parser.add_argument("--dry-run", action="store_true", help="Generate assets in memory and print hashes without writing")
    parser.add_argument("--from-masters", action="store_true", help="Re-run BiRefNet extraction on master sheets in art/source/masters/")
    args = parser.parse_args()

    extract_from_masters_if_requested(args.from_masters)

    art_source = REPO_ROOT / "art" / "source"
    exports_dir = art_source / "exports"
    proofs_dir = art_source / "proofs"
    masters_dir = art_source / "masters"
    cutouts_dir = masters_dir / "cutouts"
    provenance_path = art_source / "provenance.json"

    player_dir = exports_dir / "player_aqualia"
    rivallie_dir = exports_dir / "rivallie"
    env_dir = exports_dir / "environment"

    player_dir.mkdir(parents=True, exist_ok=True)
    rivallie_dir.mkdir(parents=True, exist_ok=True)
    env_dir.mkdir(parents=True, exist_ok=True)
    proofs_dir.mkdir(parents=True, exist_ok=True)

    facings = ["s", "se", "e", "n"]
    mismatches = []
    generated_provenance = {}

    def process_asset(img: Image.Image, out_path: Path, pixel_anchor: Tuple[int, int]):
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        img_bytes = buf.getvalue()
        sha = compute_sha256(img_bytes)

        rel_path = str(out_path.relative_to(REPO_ROOT)).replace("\\", "/")
        generated_provenance[rel_path] = {
            "sha256": sha,
            "size": len(img_bytes),
            "dimensions": [img.width, img.height],
            "anchor": [pixel_anchor[0], pixel_anchor[1]]
        }

        if args.check:
            existing_sha = get_file_sha256(out_path)
            if existing_sha != sha:
                mismatches.append(f"Content mismatch: {rel_path} (disk: {existing_sha[:8]} != gen: {sha[:8]})")
        elif not args.dry_run:
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_bytes(img_bytes)

    # 1. Process Player Aqualia Poses via 3D Geometric Mesh Rig (100% Volume Locked, All 8 Facings)
    p_pts, p_cols, p_norms = build_player_3d_mesh()
    p_rendered_8way = render_actor_8way(
        points=p_pts,
        colors=p_cols,
        normals=p_norms,
        target_canvas=(96, 144),
        ground_anchor=(48, 132),
        scale=1.06,
        tilt_x_deg=18.0,
        outline_dark=(24, 28, 38, 255)
    )
    player_frames = []
    for facing, registered in p_rendered_8way:
        breathing_frames = generate_humanoid_breathing_frames(
            base_frame=registered,
            target_canvas=(96, 144),
            ground_y=132,
            num_frames=6
        )
        for f_idx, frame_img in enumerate(breathing_frames):
            out_file = player_dir / f"idle_{facing}_{f_idx}.png"
            process_asset(frame_img, out_file, (48, 132))
        player_frames.append((facing, registered))

    # 2. Process Rivallie Otter Drake Poses via 3D Geometric Mesh Rig (100% Volume Locked, All 8 Facings)
    r_pts, r_cols, r_norms = build_rivallie_3d_mesh()
    r_rendered_8way = render_actor_8way(
        points=r_pts,
        colors=r_cols,
        normals=r_norms,
        target_canvas=(96, 96),
        ground_anchor=(48, 86),
        scale=1.22,
        tilt_x_deg=22.0,
        outline_dark=(12, 24, 40, 255)
    )
    rivallie_frames = []
    for facing, registered in r_rendered_8way:
        breathing_frames = generate_rivallie_breathing_frames(
            base_frame=registered,
            facing=facing,
            target_canvas=(96, 96),
            ground_y=86,
            num_frames=6
        )
        for f_idx, frame_img in enumerate(breathing_frames):
            out_file = rivallie_dir / f"idle_{facing}_{f_idx}.png"
            process_asset(frame_img, out_file, (48, 86))
        rivallie_frames.append((facing, registered))

    # 2.5 Process 7 Aqualia Villagers (Neris, Reed, Willa, Oren, Lark, Dara, Finn)
    villagers = ["neris", "reed", "willa", "oren", "lark", "dara", "finn"]
    villager_frames = []
    for name in villagers:
        cutout_path = cutouts_dir / f"npc_{name}.png"
        if cutout_path.is_file():
            cutout = Image.open(cutout_path)
            registered = register_actor_on_canvas(
                cutout=cutout,
                target_canvas=(96, 144),
                ground_anchor=(48, 132),
                target_height=116,
                max_width=88
            )
            breathing_frames = generate_humanoid_breathing_frames(
                base_frame=registered,
                target_canvas=(96, 144),
                ground_y=132,
                num_frames=6
            )
            for f_idx, frame_img in enumerate(breathing_frames):
                out_file = exports_dir / "npcs" / name / f"idle_s_{f_idx}.png"
                process_asset(frame_img, out_file, (48, 132))
            villager_frames.append((name, registered))

    # 3. Process Environment Tiles & Props (44 frames)
    center_anchor_64 = (32, 32)
    foot_anchor_64 = (32, 64)

    # Ground
    process_asset(render_ground_grass(), env_dir / "ground_grass.png", center_anchor_64)
    process_asset(render_ground_dirt(), env_dir / "ground_dirt.png", center_anchor_64)
    process_asset(render_ground_sand(), env_dir / "ground_sand.png", center_anchor_64)
    process_asset(render_ground_freshwater(), env_dir / "ground_freshwater.png", center_anchor_64)

    # Shoreline masks (1..14)
    for mask_id in range(1, 15):
        process_asset(render_shore_freshwater_mask(mask_id), env_dir / f"shore_freshwater_mask_{mask_id}.png", center_anchor_64)

    # Elevation
    process_asset(render_cliff_grass(), env_dir / "cliff_grass.png", center_anchor_64)
    process_asset(render_ramp_grass(), env_dir / "ramp_grass.png", center_anchor_64)

    # Flora (6 families x 3 states)
    flora_gens = [
        ("flora_berries", render_flora_berries),
        ("flora_reeds", render_flora_reeds),
        ("flora_wheat", render_flora_wheat),
        ("flora_nectar", render_flora_nectar),
        ("flora_ashgrass", render_flora_ashgrass),
        ("flora_fungi", render_flora_fungi),
    ]
    for prefix, gen_func in flora_gens:
        for state in ["healthy", "harvested", "burnt"]:
            process_asset(gen_func(state), env_dir / f"{prefix}_{state}.png", foot_anchor_64)

    # Architecture & Props
    process_asset(render_tree_oak(), env_dir / "tree_oak.png", (64, 120))
    process_asset(render_canopy_oak(), env_dir / "canopy_oak.png", (64, 64))
    process_asset(render_house_aqualia(), env_dir / "house_aqualia.png", (96, 120))
    process_asset(render_landmark_well(), env_dir / "landmark_well.png", foot_anchor_64)
    process_asset(render_landmark_waystone(), env_dir / "landmark_waystone.png", foot_anchor_64)
    process_asset(render_prop_hearth(), env_dir / "prop_hearth.png", foot_anchor_64)

    # 4. Generate Proofs & Contact Sheets
    # Contact sheets
    p_sheet = build_contact_sheet(player_frames, (96, 144), (48, 132))
    p_sheet_bytes = io.BytesIO()
    p_sheet.save(p_sheet_bytes, format="PNG")
    p_sheet_path = proofs_dir / "player-aqualia-pose-proof.png"

    r_sheet = build_contact_sheet(rivallie_frames, (96, 96), (48, 86))
    r_sheet_bytes = io.BytesIO()
    r_sheet.save(r_sheet_bytes, format="PNG")
    r_sheet_path = proofs_dir / "rivallie-pose-proof.png"

    v_sheet = build_contact_sheet(villager_frames, (96, 144), (48, 132))
    v_sheet_bytes = io.BytesIO()
    v_sheet.save(v_sheet_bytes, format="PNG")
    v_sheet_path = proofs_dir / "aqualia-villagers-pose-proof.png"

    # Animated GIFs
    p_gif_bytes = io.BytesIO()
    p_imgs = [f[1] for f in player_frames]
    p_imgs[0].save(p_gif_bytes, format="GIF", save_all=True, append_images=p_imgs[1:], duration=350, loop=0, disposal=2)
    p_gif_path = proofs_dir / "player-aqualia-turnaround.gif"

    r_gif_bytes = io.BytesIO()
    r_imgs = [f[1] for f in rivallie_frames]
    r_imgs[0].save(r_gif_bytes, format="GIF", save_all=True, append_images=r_imgs[1:], duration=350, loop=0, disposal=2)
    r_gif_path = proofs_dir / "rivallie-turnaround.gif"

    # Authoritative 1920x1080 target scene proof
    settlement_master = masters_dir / "aqualia_canal_settlement_master.jpg"
    if settlement_master.is_file():
        layout_img = Image.open(settlement_master).convert("RGB")
        target_scene = layout_img.resize((1920, 1080), Image.Resampling.LANCZOS)
    else:
        target_scene = Image.new("RGB", (1920, 1080), (30, 40, 55))
    target_scene_bytes = io.BytesIO()
    target_scene.save(target_scene_bytes, format="PNG")
    target_scene_path = proofs_dir / "aqualia-target-scene.png"

    proof_deliverables = [
        (p_sheet_path, p_sheet_bytes.getvalue()),
        (r_sheet_path, r_sheet_bytes.getvalue()),
        (v_sheet_path, v_sheet_bytes.getvalue()),
        (p_gif_path, p_gif_bytes.getvalue()),
        (r_gif_path, r_gif_bytes.getvalue()),
        (target_scene_path, target_scene_bytes.getvalue()),
    ]

    for p_path, p_bytes in proof_deliverables:
        if args.check:
            cur_sha = get_file_sha256(p_path)
            new_sha = compute_sha256(p_bytes)
            if cur_sha != new_sha:
                mismatches.append(f"Proof mismatch: {p_path.name}")
        elif not args.dry_run:
            p_path.write_bytes(p_bytes)

    # 5. Provenance reconciliation
    if provenance_path.is_file():
        prov_data = json.loads(provenance_path.read_text("utf-8"))
    else:
        prov_data = {
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "pipeline": "Master Art Pipeline Reboot v2 (Stage 1 & 2)",
            "assets": {}
        }

    prov_assets = prov_data.get("assets", {})
    prov_updated = False
    for rel_k, meta in generated_provenance.items():
        if rel_k not in prov_assets or prov_assets[rel_k].get("sha256") != meta["sha256"]:
            prov_assets[rel_k] = meta
            prov_updated = True

    if args.check:
        if prov_updated:
            mismatches.append("provenance.json has outdated metadata or hashes")
    elif not args.dry_run and prov_updated:
        prov_data["generatedAt"] = datetime.now(timezone.utc).isoformat()
        prov_data["pipeline"] = "Master Art Pipeline Reboot v2 (Stage 1 & 2)"
        prov_data["assets"] = prov_assets
        provenance_path.write_text(json.dumps(prov_data, indent=2) + "\n", "utf-8")

    if args.check:
        if mismatches:
            print(f"FAILED: Found {len(mismatches)} discrepancies during --check:")
            for m in mismatches[:10]:
                print(f"  - {m}")
            sys.exit(1)
        else:
            print("OK: All generated files match disk exactly.")
            sys.exit(0)
    else:
        print(f"Successfully generated {len(generated_provenance)} runtime assets and {len(proof_deliverables)} proofs.")

if __name__ == "__main__":
    main()
