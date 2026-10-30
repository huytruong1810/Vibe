"""
Deterministic Master Rebuild CLI for Hearthwild Pixel-Art Assets.
Regenerates all code-authored frames, environment kit, architecture, layout proofs,
contact sheets, and animated GIFs from Python/Pillow source scripts under art/source/generators/.
"""

import os
import sys
import argparse
import hashlib
import json
import io
from typing import Dict, List, Tuple
from datetime import datetime, timezone
from pathlib import Path
from PIL import Image

# Ensure generators root is in sys.path
SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from art.source.generators.actors.humanoid import render_player_aqualia_frame, TARGET_W as P_W, TARGET_H as P_H
from art.source.generators.actors.rivallie import render_rivallie_frame, TARGET_W as R_W, TARGET_H as R_H
from art.source.generators.core.rig import HUMAN_ROOT, RIVALLIE_ROOT
from art.source.generators.core.preview import generate_contact_sheet, generate_animated_gif
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
from art.source.generators.environment.layout_proof import render_aqualia_layout_proof

def compute_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()

def get_file_sha256(path: Path) -> str:
    if not path.is_file():
        return ""
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    parser = argparse.ArgumentParser(description="Deterministic pixel-art rebuild tool")
    parser.add_argument("--check", action="store_true", help="Verify existing files match generated output without modifying disk")
    parser.add_argument("--dry-run", action="store_true", help="Generate assets in memory and print hashes without writing")
    args = parser.parse_args()

    art_source = REPO_ROOT / "art" / "source"
    exports_dir = art_source / "exports"
    proofs_dir = art_source / "proofs"
    manifest_path = art_source / "manifest.json"

    player_dir = exports_dir / "player_aqualia"
    rivallie_dir = exports_dir / "rivallie"
    env_dir = exports_dir / "environment"

    player_dir.mkdir(parents=True, exist_ok=True)
    rivallie_dir.mkdir(parents=True, exist_ok=True)
    env_dir.mkdir(parents=True, exist_ok=True)
    proofs_dir.mkdir(parents=True, exist_ok=True)

    facings = ["s", "se", "e", "n"]
    mismatches = []
    generated_manifest = {}

    def process_asset(img: Image.Image, out_path: Path, anchor: List[float]):
        buf = io.BytesIO()
        img.save(buf, format="PNG", optimize=True)
        img_bytes = buf.getvalue()
        sha = compute_sha256(img_bytes)
        
        rel_path = str(out_path.relative_to(REPO_ROOT)).replace("\\", "/")
        generated_manifest[rel_path] = {
            "sha256": sha,
            "size": len(img_bytes),
            "dimensions": [img.width, img.height],
            "anchor": anchor,
        }
        
        if args.check:
            existing_sha = get_file_sha256(out_path)
            if existing_sha != sha:
                mismatches.append(f"{rel_path}: disk {existing_sha[:10]} != gen {sha[:10]}")
            else:
                print(f"  [OK] {rel_path} matches")
        elif not args.dry_run:
            out_path.write_bytes(img_bytes)
            print(f"  [SAVED] {rel_path} ({len(img_bytes)} bytes, sha256={sha[:10]})")

    print("=== 1. Generating Player Aqualia Frames ===")
    player_frames = {}
    for f in facings:
        img = render_player_aqualia_frame(f)
        player_frames[f] = img
        out_path = player_dir / f"idle_{f}_0.png"
        process_asset(img, out_path, list(HUMAN_ROOT))

    print("\n=== 2. Generating Rivallie Frames ===")
    rivallie_frames = {}
    for f in facings:
        img = render_rivallie_frame(f)
        rivallie_frames[f] = img
        out_path = rivallie_dir / f"idle_{f}_0.png"
        process_asset(img, out_path, list(RIVALLIE_ROOT))

    print("\n=== 3. Generating Contact Sheet Proofs ===")
    p_pairs = [(f, player_frames[f]) for f in facings]
    p_sheet = generate_contact_sheet(p_pairs, (P_W, P_H), HUMAN_ROOT)
    p_sheet_path = proofs_dir / "player-aqualia-pose-proof.png"
    buf = io.BytesIO()
    p_sheet.save(buf, format="PNG")
    p_sheet_bytes = buf.getvalue()
    if not args.check and not args.dry_run:
        p_sheet_path.write_bytes(p_sheet_bytes)
        print(f"  [SAVED] {p_sheet_path.relative_to(REPO_ROOT)}")

    r_pairs = [(f, rivallie_frames[f]) for f in facings]
    r_sheet = generate_contact_sheet(r_pairs, (R_W, R_H), RIVALLIE_ROOT)
    r_sheet_path = proofs_dir / "rivallie-pose-proof.png"
    buf = io.BytesIO()
    r_sheet.save(buf, format="PNG")
    r_sheet_bytes = buf.getvalue()
    if not args.check and not args.dry_run:
        r_sheet_path.write_bytes(r_sheet_bytes)
        print(f"  [SAVED] {r_sheet_path.relative_to(REPO_ROOT)}")

    print("\n=== 4. Generating Turnaround Preview GIFs ===")
    p_turnaround = [
        player_frames["s"],
        player_frames["se"],
        player_frames["e"],
        player_frames["n"],
        player_frames["e"].transpose(Image.Transpose.FLIP_LEFT_RIGHT),
        player_frames["se"].transpose(Image.Transpose.FLIP_LEFT_RIGHT),
    ]
    p_gif_path = proofs_dir / "player-aqualia-turnaround.gif"
    if not args.check and not args.dry_run:
        generate_animated_gif(p_turnaround, str(p_gif_path), fps=4, scale_factor=3)
        print(f"  [SAVED] {p_gif_path.relative_to(REPO_ROOT)}")

    r_turnaround = [
        rivallie_frames["s"],
        rivallie_frames["se"],
        rivallie_frames["e"],
        rivallie_frames["n"],
        rivallie_frames["e"].transpose(Image.Transpose.FLIP_LEFT_RIGHT),
        rivallie_frames["se"].transpose(Image.Transpose.FLIP_LEFT_RIGHT),
    ]
    r_gif_path = proofs_dir / "rivallie-turnaround.gif"
    if not args.check and not args.dry_run:
        generate_animated_gif(r_turnaround, str(r_gif_path), fps=4, scale_factor=3)
        print(f"  [SAVED] {r_gif_path.relative_to(REPO_ROOT)}")

    print("\n=== 5. Generating Environment Kit (44 Assets) ===")
    env_definitions = []  # List of dicts for manifest registration

    # 5a. Ground Tiles
    ground_tiles = [
        ("ground_grass", render_ground_grass(), [0.5, 0.5]),
        ("ground_dirt", render_ground_dirt(), [0.5, 0.5]),
        ("ground_sand", render_ground_sand(), [0.5, 0.5]),
        ("ground_freshwater", render_ground_freshwater(), [0.5, 0.5]),
    ]
    for cid, img, anchor in ground_tiles:
        out_path = env_dir / f"{cid}.png"
        process_asset(img, out_path, anchor)
        env_definitions.append({
            "contentId": cid,
            "path": f"exports/environment/{cid}.png",
            "anchor": {"x": anchor[0], "y": anchor[1]}
        })

    # 5b. Freshwater Shoreline Masks (1..14)
    for mask_idx in range(1, 15):
        cid = f"shore_freshwater_mask_{mask_idx}"
        img = render_shore_freshwater_mask(mask_idx)
        out_path = env_dir / f"{cid}.png"
        process_asset(img, out_path, [0.5, 0.5])
        env_definitions.append({
            "contentId": cid,
            "path": f"exports/environment/{cid}.png",
            "anchor": {"x": 0.5, "y": 0.5}
        })

    # 5c. Cliffs and Ramps
    elevations = [
        ("cliff_grass", render_cliff_grass(), [0.5, 0.5]),
        ("ramp_grass", render_ramp_grass(), [0.5, 0.5]),
    ]
    for cid, img, anchor in elevations:
        out_path = env_dir / f"{cid}.png"
        process_asset(img, out_path, anchor)
        env_definitions.append({
            "contentId": cid,
            "path": f"exports/environment/{cid}.png",
            "anchor": {"x": anchor[0], "y": anchor[1]}
        })

    # 5d. Architecture, Landmarks, Foliage
    structures = [
        ("tree_oak", render_tree_oak(), [0.5, 0.94]),
        ("canopy_oak", render_canopy_oak(), [0.5, 0.94]),
        ("house_aqualia", render_house_aqualia(), [0.5, 0.94]),
        ("landmark_well", render_landmark_well(), [0.5, 0.925]),
        ("landmark_waystone", render_landmark_waystone(), [0.5, 0.9375]),
        ("prop_hearth", render_prop_hearth(), [0.5, 0.9]),
    ]
    for cid, img, anchor in structures:
        out_path = env_dir / f"{cid}.png"
        process_asset(img, out_path, anchor)
        env_definitions.append({
            "contentId": cid,
            "path": f"exports/environment/{cid}.png",
            "anchor": {"x": anchor[0], "y": anchor[1]}
        })

    # 5e. Flora (6 plants x 3 states = 18 sprites)
    flora_fns = [
        ("berries", render_flora_berries, [0.5, 0.85]),
        ("reeds", render_flora_reeds, [0.5, 0.9]),
        ("wheat", render_flora_wheat, [0.5, 0.9]),
        ("nectar", render_flora_nectar, [0.5, 0.85]),
        ("ashgrass", render_flora_ashgrass, [0.5, 0.85]),
        ("fungi", render_flora_fungi, [0.5, 0.85]),
    ]
    for plant, fn, anchor in flora_fns:
        for state in ["healthy", "harvested", "burnt"]:
            cid = f"flora_{plant}_{state}"
            img = fn(state)
            out_path = env_dir / f"{cid}.png"
            process_asset(img, out_path, anchor)
            env_definitions.append({
                "contentId": cid,
                "path": f"exports/environment/{cid}.png",
                "anchor": {"x": anchor[0], "y": anchor[1]}
            })

    print("\n=== 6. Generating Seed-42 Layout Proof (1920x1080) ===")
    layout_proof_img = render_aqualia_layout_proof()
    proof_path = proofs_dir / "aqualia-target-scene.png"
    buf = io.BytesIO()
    layout_proof_img.save(buf, format="PNG")
    proof_bytes = buf.getvalue()
    if not args.check and not args.dry_run:
        proof_path.write_bytes(proof_bytes)
        print(f"  [SAVED] {proof_path.relative_to(REPO_ROOT)} ({len(proof_bytes)} bytes)")

    print("\n=== 7. Updating Source Manifest (art/source/manifest.json) ===")
    if manifest_path.is_file():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        existing_frames = {f["id"]: f for f in manifest.get("frames", [])}
        existing_appearances = {a["id"]: a for a in manifest.get("appearances", [])}

        for ed in env_definitions:
            fid = f"env_{ed['contentId']}"
            aid = f"environment:{ed['contentId']}"
            
            existing_frames[fid] = {
                "id": fid,
                "path": ed["path"],
                "anchor": ed["anchor"],
            }
            existing_appearances[aid] = {
                "id": aid,
                "kind": "environment",
                "contentId": ed["contentId"],
                "quality": "hd",
                "clipIds": [],
                "frameId": fid,
            }

        manifest["frames"] = list(existing_frames.values())
        manifest["appearances"] = list(existing_appearances.values())

        if not args.check and not args.dry_run:
            manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
            print(f"  [UPDATED] {manifest_path.relative_to(REPO_ROOT)} ({len(manifest['frames'])} frames, {len(manifest['appearances'])} appearances)")

    # Provenance log
    provenance_path = art_source / "provenance.json"
    provenance_data = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "pipeline": "PIL code-authored procedural generators v1 (Stage 1 & 2)",
        "assets": generated_manifest,
    }
    if not args.check and not args.dry_run:
        provenance_path.write_text(json.dumps(provenance_data, indent=2), encoding="utf-8")
        print(f"\n[PROVENANCE] Updated {provenance_path.relative_to(REPO_ROOT)}")

    if args.check:
        if mismatches:
            print(f"\n[FAIL] Found {len(mismatches)} mismatches:")
            for m in mismatches:
                print(f"  - {m}")
            sys.exit(1)
        else:
            print("\n[SUCCESS] All code-authored exports match disk byte-for-byte.")

if __name__ == "__main__":
    main()
