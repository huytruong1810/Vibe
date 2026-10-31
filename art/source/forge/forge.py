"""Hearthwild Sprite Forge CLI (doctrine PRD-1). Maintained by Claude; agents run it, never patch it.

    uv run --project art/source/forge python art/source/forge/forge.py <command> [--asset ID]

Commands:
  doctor                 environment check (must exit 0 before production)
  status --asset ID      stage table for one asset
  next --asset ID        print the exact next command, or BLOCKED: <reason>
  prep|gen3d|clean|texture|bake|pixelize|qa|packet|publish --asset ID   run one stage
  all --asset ID         run every runnable stage in order (stops at the first block)
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.dont_write_bytecode = True  # workspace hygiene (TEAM-9)
sys.path.insert(0, str(Path(__file__).resolve().parent))

from forgelib import core  # noqa: E402
from forgelib.core import REPO, ForgeError, asset_kind, canvas_for, load_recipe, record, slug, spec, work_dir  # noqa: E402

CMD = "uv run --project art/source/forge python art/source/forge/forge.py"
STAGES = ["prep", "gen3d", "clean", "texture", "bake", "pixelize", "qa", "packet", "publish"]
RIG_PENDING = "rig/animate stages are not built yet (forge bring-up); bake renders the rest pose only"
UNBUILT = ["rig", "animate", "faces", "items", "publish"]  # claude removes entries as stages land


def _rel(p: Path) -> str:
    return str(p.relative_to(REPO))


def _recipe(asset: str) -> dict:
    r = load_recipe(asset)
    if r.get("asset") != asset:
        raise ForgeError(f"Recipe asset id '{r.get('asset')}' does not match '{asset}'.")
    return r


def _canvas(asset: str) -> dict:
    key, c = canvas_for(asset)
    return {"key": key, "size": c["size"], "anchor": c["anchor"], "display": c.get("display")}


# ---------------------------------------------------------------- stages
def st_prep(asset: str) -> str:
    from forgelib import prep
    rec = prep.run(asset)
    w = rec["extra"]["warnings"]
    return "views " + ",".join(rec["extra"]["views"]) + (f"; warnings: {'; '.join(w)}" if w else "")


def st_gen3d(asset: str) -> str:
    r = _recipe(asset)
    g = r.get("gen3d", {})
    wd = work_dir(asset)
    prep_rec = core.stage_record(asset, "prep")
    if not prep_rec:
        raise ForgeError("Run prep first.")
    views = g.get("views") or prep_rec["extra"]["views"]
    inputs = [wd / "prep" / f"{v}.png" for v in views]
    out = wd / "gen3d" / "mesh.glb"
    out.parent.mkdir(exist_ok=True)
    extra = {"views": views, "seed": g.get("seed", 1234), "steps": g.get("steps", 50)}
    if core.is_fresh(asset, "gen3d", inputs, extra):
        return "fresh (cached)"
    if not core.GEN3D_PY.exists():
        raise ForgeError("gen3d environment missing (art/source/forge/gen3d/.venv). Run doctor; ask claude to run setup.")
    cmd = [str(core.GEN3D_PY), str(core.GEN3D_DIR / "run_shape.py"), "--views",
           *[f"{v}={wd / 'prep' / f'{v}.png'}" for v in views], "--out", str(out),
           "--seed", str(extra["seed"]), "--steps", str(extra["steps"])]
    log = wd / "logs" / "gen3d.log"
    log.parent.mkdir(exist_ok=True)
    with open(log, "w") as f:
        p = subprocess.run(cmd, stdout=f, stderr=subprocess.STDOUT, timeout=3600,
                           env={**__import__("os").environ, "PYTHONDONTWRITEBYTECODE": "1", "HF_HOME": str(core.GEN3D_HF_HOME)})
    if p.returncode != 0:
        raise ForgeError(f"gen3d failed; see {_rel(log)}")
    meta = json.loads([l for l in log.read_text().splitlines() if l.startswith("{")][-1])
    core.run_blender("preview.py", [str(out), str(wd / "gen3d" / "preview.png")], wd / "logs" / "gen3d_preview.log")
    record(asset, "gen3d", inputs, [out, wd / "gen3d" / "preview.png"], {**extra, **meta})
    return f"{meta['faces']} faces in {meta['seconds']}s; LOOK at {_rel(wd / 'gen3d' / 'preview.png')}"


def st_clean(asset: str) -> str:
    r, wd, cv = _recipe(asset), work_dir(asset), _canvas(asset)
    rs = spec("render_spec")
    params = {"heightArtPx": r["heightArtPx"], "canvas": cv["size"], "anchor": cv["anchor"],
              "artPxPerUnit": rs["camera"]["artPixelsPerWorldUnit"], "elevationDeg": rs["camera"]["elevationDeg"],
              "targetFaces": r.get("targetFaces", 14000)}
    pfile = wd / "clean_params.json"
    pfile.write_text(json.dumps(params))
    src, out = wd / "gen3d" / "mesh.glb", wd / "clean.blend"
    if core.is_fresh(asset, "clean", [src, pfile]):
        return "fresh (cached)"
    core.run_blender("clean.py", [str(src), str(out), str(pfile)], wd / "logs" / "clean.log")
    info = json.loads([l for l in (wd / "logs" / "clean.log").read_text().splitlines() if l.startswith("CLEAN ")][-1][6:])
    record(asset, "clean", [src, pfile], [out], info)
    return f"{info['faces']} faces"


def st_texture(asset: str) -> str:
    wd = work_dir(asset)
    prep_rec = core.stage_record(asset, "prep")
    views = {v: str(wd / "prep" / f"{v}_fill.png") for v in prep_rec["extra"]["views"]}
    vfile = wd / "views.json"
    vfile.write_text(json.dumps(views))
    src, out = wd / "clean.blend", wd / "texture.blend"
    inputs = [src, vfile, *[Path(p) for p in views.values()]]
    if core.is_fresh(asset, "texture", inputs):
        return "fresh (cached)"
    core.run_blender("texture.py", [str(src), str(out), str(vfile)], wd / "logs" / "texture.log")
    core.run_blender("preview.py", [str(out), str(wd / "texture_preview.png")], wd / "logs" / "texture_preview.log")
    info = json.loads([l for l in (wd / "logs" / "texture.log").read_text().splitlines() if l.startswith("TEXTURE ")][-1][8:])
    record(asset, "texture", inputs, [out, wd / "texture_preview.png"], info)
    return f"covered {info['covered']:.0%}; LOOK at {_rel(wd / 'texture_preview.png')}"


def st_bake(asset: str) -> str:
    wd, cv, rs = work_dir(asset), _canvas(asset), spec("render_spec")
    params = {"canvas": cv["size"], "anchor": cv["anchor"], "artPxPerUnit": rs["camera"]["artPixelsPerWorldUnit"],
              "elevationDeg": rs["camera"]["elevationDeg"], "facings": rs["facings"]["zRotationDeg"],
              "clips": [{"name": "rest", "action": None, "frames": [1]}]}
    pfile = wd / "bake_params.json"
    pfile.write_text(json.dumps(params))
    src, out = wd / "texture.blend", wd / "bake"
    if core.is_fresh(asset, "bake", [src, pfile]):
        return "fresh (cached)"
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir()
    core.run_blender("bake.py", [str(src), str(out), str(pfile)], wd / "logs" / "bake.log", timeout=3600)
    record(asset, "bake", [src, pfile], sorted(out.rglob("*.png")) + [out / "tracks.json"], {"note": RIG_PENDING})
    return f"{len(list(out.rglob('*_albedo.png')))} frames ({RIG_PENDING})"


def st_pixelize(asset: str) -> str:
    from forgelib import pixelize
    r, wd = _recipe(asset), work_dir(asset)
    bake_files = sorted((wd / "bake").rglob("*.png")) + [wd / "bake" / "tracks.json"]
    extra = {"ramps": r["ramps"]}
    out = wd / "pix"
    if core.is_fresh(asset, "pixelize", bake_files + [core.SPEC_DIR / "render_spec.json", core.SPEC_DIR / "palette.json"], extra):
        return "fresh (cached)"
    shutil.rmtree(out, ignore_errors=True)
    pixelize.run_dir(wd / "bake", out, r["ramps"])
    record(asset, "pixelize", bake_files + [core.SPEC_DIR / "render_spec.json", core.SPEC_DIR / "palette.json"],
           sorted(out.rglob("*.png")), extra)
    return f"{len(list((out).glob('*/*.png')))} frames"


def st_qa(asset: str) -> str:
    from forgelib import qa
    r, wd, cv = _recipe(asset), work_dir(asset), _canvas(asset)
    ref = wd / "prep" / "front_cutout.png"
    report, signature = qa.run(asset, wd / "pix", wd / "bake", r["ramps"], cv, asset_kind(asset), r["heightArtPx"], ref)
    (wd / "qa_report.json").write_text(json.dumps(report, indent=1))
    (wd / "qa_signature.json").write_text(json.dumps(signature))
    qa.contact_sheet(asset, wd / "pix", cv, report, ref, wd / "contact.png")
    (wd / "contact.viewed").unlink(missing_ok=True)
    pix = sorted((wd / "pix").rglob("*.png"))
    record(asset, "qa", pix, [wd / "qa_report.json", wd / "contact.png"], {"status": report["status"]})
    fails = [f"{c['check']} ({c['rule']}): {c['detail']}" for c in report["checks"] if not c["pass"]]
    head = f"status {report['status']}; OPEN {_rel(wd / 'contact.png')} and describe it (PRD-5)"
    return head + ("\n  failed:\n   - " + "\n   - ".join(fails) if fails else "")


def st_packet(asset: str) -> str:
    wd = work_dir(asset)
    report = json.loads((wd / "qa_report.json").read_text())
    if report["status"] != "candidate":
        raise ForgeError("QA status is draft: fix the failed checks first (sprite-forge skill, references/qa-fixes.md).")
    marker = wd / "contact.viewed"
    if not marker.exists() or marker.read_text().strip() != core.sha256_file(wd / "contact.png"):
        raise ForgeError(f"Open {_rel(wd / 'contact.png')} with read_file first (PRD-5); the packet needs a viewed contact sheet.")
    date = time.strftime("%Y-%m-%d", time.gmtime())
    pdir = REPO / "art" / "review" / f"{date}-{slug(asset)}"
    pdir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(wd / "contact.png", pdir / "contact.png")
    shutil.copy2(wd / "qa_report.json", pdir / "qa_report.json")
    _turntable(wd, pdir / "turntable.gif")
    (pdir / "README.md").write_text(
        f"# {asset}: review packet (status: candidate)\n\n"
        f"- Contact sheet: `contact.png` (4x, every facing; grey and grass rows; red marks = anchor)\n"
        f"- Turntable: `turntable.gif`\n- QA: `qa_report.json` ({len(report['checks'])} checks)\n"
        f"- Forge inputs: `art/source/references/{slug(asset)}/`, `art/source/forge/recipes/{slug(asset)}.json`\n\n"
        f"Approval is the director's alone (L7): `docs/team/comms/director/approvals/{slug(asset)}--{pdir.name}.md`.\n")
    return f"packet {_rel(pdir)}; message the communicator and director with what you saw"


def _turntable(wd: Path, out: Path) -> None:
    from PIL import Image
    from forgelib.qa import ORDER
    scale = spec("render_spec")["qa"]["contactSheetScale"]
    tiles = []
    for f in ORDER:
        p = wd / "pix" / "rest" / f"{f}_0.png"
        bg = Image.new("RGBA", Image.open(p).size, (110, 114, 128, 255))
        bg.alpha_composite(Image.open(p).convert("RGBA"))
        tiles.append(bg.resize((bg.width * scale, bg.height * scale), Image.NEAREST).convert("P"))
    tiles[0].save(out, save_all=True, append_images=tiles[1:], duration=350, loop=0)


def st_publish(asset: str) -> str:
    approvals = sorted(core.APPROVALS.glob(f"{slug(asset)}--*.md"))
    ok = [a for a in approvals if "decision: director-approved" in a.read_text()]
    if not ok:
        raise ForgeError(f"No director-approved record in {_rel(core.APPROVALS)} for {asset} (L7). Wait for the director.")
    raise ForgeError("publish is not built yet (forge bring-up): it lands with rig/animate. Tell claude.")


RUNNERS = {"prep": st_prep, "gen3d": st_gen3d, "clean": st_clean, "texture": st_texture, "bake": st_bake,
           "pixelize": st_pixelize, "qa": st_qa, "packet": st_packet, "publish": st_publish}


# ---------------------------------------------------------------- next / status / doctor
def next_step(asset: str) -> str:
    try:
        core.load_sheet(asset)
    except ForgeError as e:
        return f"BLOCKED: {e}"
    if not (core.RECIPES / f"{slug(asset)}.json").exists():
        return f"BLOCKED: write the recipe art/source/forge/recipes/{slug(asset)}.json (recipes/README.md)."
    for st in STAGES:
        rec = core.stage_record(asset, st)
        if st == "qa" and rec and rec["extra"].get("status") != "candidate":
            return f"BLOCKED: QA status is draft. Fix inputs per qa_report.json (references/qa-fixes.md), then {CMD} prep --asset {asset}"
        if st == "packet":
            marker = work_dir(asset) / "contact.viewed"
            if not marker.exists():
                return f"OPEN art/source/forge/work/{slug(asset)}/contact.png with read_file and describe it, then: {CMD} packet --asset {asset}"
            if not any((REPO / "art" / "review").glob(f"*-{slug(asset)}/qa_report.json")):
                return f"{CMD} packet --asset {asset}"
            continue
        if st == "publish":
            return "BLOCKED: waiting for the director's approval record (L7). Message the director with the packet path."
        if not rec:
            return f"{CMD} {st} --asset {asset}"
    return "nothing to do"


def status(asset: str) -> str:
    rows = []
    for st in STAGES[:-2]:
        rec = core.stage_record(asset, st)
        rows.append(f"  {st:9s} {'done ' + rec['at'] if rec else '-'}")
    return "\n".join(rows)


def doctor() -> int:
    checks = []

    def chk(name, ok, fix):
        checks.append((name, ok, fix))

    try:
        out = subprocess.run([core.blender_bin(), "-b", "--factory-startup", "--version"], capture_output=True, text=True, timeout=120).stdout
        chk("blender 4.2.x", "Blender 4.2" in out, "Install Blender 4.2 LTS at ~/.local/bin/blender")
    except Exception as e:  # noqa: BLE001
        chk("blender 4.2.x", False, str(e))
    for name in ("render_spec", "palette", "body_types"):
        try:
            spec(name)
            chk(f"spec/{name}.json", True, "")
        except Exception as e:  # noqa: BLE001
            chk(f"spec/{name}.json", False, str(e))
    chk("gen3d venv", core.GEN3D_PY.exists(), "Ask claude to run gen3d setup (gen3d/README.md)")
    if core.GEN3D_PY.exists():
        r = subprocess.run([str(core.GEN3D_PY), "-c", "import torch;print(torch.cuda.is_available(), 'sm_120' in torch.cuda.get_arch_list())"],
                           capture_output=True, text=True, timeout=300)
        chk("gen3d torch CUDA sm_120", r.stdout.strip() == "True True", "nvidia-smi must list the GPU; torch must be a cu128+ build")
    chk("gen3d model weights", any(core.GEN3D_HF_HOME.glob("hub/models--tencent--Hunyuan3D-2mv/snapshots/*/hunyuan3d-dit-v2-mv")),
        "Ask claude to download the Hunyuan3D-2mv weights")
    chk("gen3d code", (core.GEN3D_DIR / "vendor" / "Hunyuan3D-2" / "hy3dgen").exists(), "Ask claude to vendor Hunyuan3D-2")
    chk("Quaternius UAL (humans)", (core.VENDOR / "ual").exists(), "Ask claude to run setup (vendor/ual)")
    chk("forge stages complete", not UNBUILT, f"Under construction by claude: {', '.join(UNBUILT)}. Production stays gated (blender brief).")
    for name, ok, fix in checks:
        print(f"  [{'ok' if ok else 'FAIL'}] {name}" + ("" if ok else f"  -> {fix}"))
    bad = [c for c in checks if not c[1]]
    print(f"doctor: {len(checks) - len(bad)}/{len(checks)} ok")
    return 1 if bad else 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=["doctor", "status", "next", "all", *STAGES])
    ap.add_argument("--asset")
    a = ap.parse_args()
    if a.command == "doctor":
        return doctor()
    if not a.asset:
        ap.error("--asset is required")
    try:
        if a.command == "next":
            print(next_step(a.asset))
        elif a.command == "status":
            print(status(a.asset))
        elif a.command == "all":
            for st in STAGES[:-2]:
                print(f"[{st}] {RUNNERS[st](a.asset)}")
            print("next:", next_step(a.asset))
        else:
            print(f"[{a.command}] {RUNNERS[a.command](a.asset)}")
            print("next:", next_step(a.asset))
    except ForgeError as e:
        print(f"FORGE ERROR [{a.command}]: {e}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
