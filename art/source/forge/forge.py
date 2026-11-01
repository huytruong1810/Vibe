"""Hearthwild Sprite Forge CLI (doctrine PRD-1). Maintained by codex (DOC-5); agents run it, never patch it.

    uv run --project art/source/forge python art/source/forge/forge.py <command> [--asset ID]

Commands:
  doctor                 environment check plus readiness per asset class (creatures, humans, items, environment)
  selftest [--kind human|creature|item|all]   run built-in calibration fixtures and assert invariants
  status --asset ID      stage table for one asset
  next --asset ID        print the exact next command, or BLOCKED: <reason>
  prep|gen3d|clean|texture|rig|animate|bake|pixelize|qa|packet|publish --asset ID   run one stage
  faces --asset ID       separate human/creature decal candidate; never re-bakes a body
  item-plan --asset item:ID  validate an existing model and write the draft 8x8 grip/icon pose plan
  items --asset item:ID      render a separate existing prop through all 65 poses and QA
  Items run prep|gen3d|clean|texture|orient|items|packet|publish (all runs through items).
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
STAGES = ["prep", "gen3d", "clean", "texture", "rig", "animate", "bake", "pixelize", "qa", "packet", "publish"]
# Held items (C9b): a prop sheet becomes a canonical source model, then 64 held poses + icon.
ITEM_STAGES = ["prep", "gen3d", "clean", "texture", "orient", "items", "packet", "publish"]


def stages_for(asset: str) -> list[str]:
    return ITEM_STAGES if asset_kind(asset) == "item" else STAGES
# Readiness per asset class (doctor). A class is ready when every stage it needs up to `packet` exists.
CLASSES = {
    "creatures": {"ready": True, "pending": [], "templates": ["quadruped"]},
    "humans": {"ready": True, "pending": ["fit (modular garment parts; outfits baked from the sheet need none)"], "templates": ["humanoid"]},
    "items": {"ready": True, "pending": [], "templates": ["held-item"]},
    "environment": {"ready": False, "pending": ["environment kind: canvas, depth stretch, layers, footprint QA"], "ticket": "codex C10"},
}


def _rel(p: Path) -> str:
    return str(p.relative_to(REPO))


# Built-in recipes for the forge's own fixtures (selftest); never placed in recipes/.
SELFTEST_RECIPES = {
    "selftest-human": {"asset": "selftest-human", "kind": "human", "heightArtPx": 56,
                       "ramps": {"skin": "skin-warm", "shirt": "teal", "pants": "leather", "hair": "hair-teal"}},
    "selftest-creature": {"asset": "selftest-creature", "kind": "creature", "heightArtPx": 31,
                          "ramps": {"body": "teal", "belly": "cream", "fins": "glass"}},
}


def _recipe(asset: str) -> dict:
    if asset == "selftest-creature" and (core.RECIPES / "rivallie.json").exists():
        return {**SELFTEST_RECIPES[asset], "heightArtPx": load_recipe("rivallie")["heightArtPx"]}  # fixture copies Rivallie's mesh
    if asset in SELFTEST_RECIPES:
        return SELFTEST_RECIPES[asset]
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
    record(asset, "gen3d", inputs, [out, wd / "gen3d" / "preview.png"], {**extra, **meta}, digest_extra=extra)
    return f"{meta['faces']} faces in {meta['seconds']}s; LOOK at {_rel(wd / 'gen3d' / 'preview.png')}"


def st_clean(asset: str) -> str:
    r, wd, cv = _recipe(asset), work_dir(asset), _canvas(asset)
    rs = spec("render_spec")
    height = r["orient"]["lengthArtPx"] if asset_kind(asset) == "item" else r["heightArtPx"]
    params = {"heightArtPx": height, "canvas": cv["size"], "anchor": cv["anchor"],
              "artPxPerUnit": rs["camera"]["artPixelsPerWorldUnit"], "elevationDeg": rs["camera"]["elevationDeg"],
              "targetFaces": r.get("targetFaces", 14000)}
    pfile = wd / "clean_params.json"
    pfile.write_text(json.dumps(params))
    src, out = wd / "gen3d" / "mesh.glb", wd / "clean.blend"
    if core.is_fresh(asset, "clean", [src, pfile]):
        return "fresh (cached)"
    core.run_blender("clean.py", [str(src), str(out), str(pfile)], wd / "logs" / "clean.log")
    info = json.loads([l for l in (wd / "logs" / "clean.log").read_text().splitlines() if l.startswith("CLEAN ")][-1][6:])
    record(asset, "clean", [src, pfile], [out], info, digest_extra=None)
    return f"{info['faces']} faces"


def st_texture(asset: str) -> str:
    wd = work_dir(asset)
    prep_rec = core.stage_record(asset, "prep")
    chosen = _recipe(asset).get("texture", {}).get("views") or prep_rec["extra"]["views"]
    views = {v: str(wd / "prep" / f"{v}_fill.png") for v in chosen}
    vfile = wd / "views.json"
    views_param = {**views, "_mirrorSides": _recipe(asset).get("texture", {}).get("mirrorSides", asset_kind(asset) == "creature")}
    vfile.write_text(json.dumps(views_param))
    src, out = wd / "clean.blend", wd / "texture.blend"
    inputs = [src, vfile, core.BLENDER_SCRIPTS / "texture.py", *[Path(p) for p in views.values()]]
    if core.is_fresh(asset, "texture", inputs):
        return "fresh (cached)"
    core.run_blender("texture.py", [str(src), str(out), str(vfile)], wd / "logs" / "texture.log")
    core.run_blender("preview.py", [str(out), str(wd / "texture_preview.png")], wd / "logs" / "texture_preview.log")
    info = json.loads([l for l in (wd / "logs" / "texture.log").read_text().splitlines() if l.startswith("TEXTURE ")][-1][8:])
    record(asset, "texture", inputs, [out, wd / "texture_preview.png"], info, digest_extra=None)
    return f"covered {info['covered']:.0%}; LOOK at {_rel(wd / 'texture_preview.png')}"


def _template(asset: str) -> dict:
    kind = asset_kind(asset)
    if kind == "human":
        return json.loads((core.SPEC_DIR / "skeletons" / "humanoid.json").read_text())
    if kind != "creature":
        raise ForgeError(f"No rig for asset kind '{kind}' ({CLASSES['environment']['ticket']}).")
    name = "rivallie" if asset == "selftest-creature" else slug(asset)
    for f in sorted((core.SPEC_DIR / "skeletons").glob("*.json")):
        t = json.loads(f.read_text())
        tname = t.get("species", {}).get(name)
        if tname:
            tf = core.SPEC_DIR / "skeletons" / f"{tname}.json"
            if not tf.exists():
                raise ForgeError(f"{asset} uses the '{tname}' template, which is not built yet (codex). Ask codex.")
            return json.loads(tf.read_text())
    raise ForgeError(f"No skeleton template lists species '{name}' (spec/skeletons/*.json). Ask codex.")


def _preview_strip(png_dir: Path, names: list[str], out: Path) -> None:
    from PIL import Image, ImageDraw
    ims = [Image.open(png_dir / f"rig_{n}.png").convert("RGB") for n in names]
    w, h = ims[0].size
    sheet = Image.new("RGB", (w * len(ims), h + 18), (30, 32, 40))
    d = ImageDraw.Draw(sheet)
    for i, (n, im) in enumerate(zip(names, ims)):
        sheet.paste(im, (i * w, 18))
        d.text((i * w + 4, 3), n.replace("_", " "), fill=(220, 220, 220))
    sheet.save(out)


def st_rig(asset: str) -> str:
    r, wd = _recipe(asset), work_dir(asset)
    t = _template(asset)
    rr = r.get("rig", {})
    pfile = wd / "rig_params.json"
    humanoid = t.get("kind") == "humanoid"
    params = {"template": t, "yawDeg": rr.get("yawDeg"), "landmarks": rr.get("landmarks", {})}
    if humanoid:
        params["library"] = str(_ual_library())
    pfile.write_text(json.dumps(params))
    src, out, pdir = wd / "texture.blend", wd / "rig.blend", wd / "rig_preview"
    script = "rig_humanoid.py" if humanoid else "rig.py"
    if core.is_fresh(asset, "rig", [src, pfile, core.BLENDER_SCRIPTS / script]):
        return "fresh (cached)"
    shutil.rmtree(pdir, ignore_errors=True)
    core.run_blender(script, [str(src), str(out), str(pfile), str(pdir)], wd / "logs" / "rig.log", timeout=1800)
    info = json.loads([l for l in (wd / "logs" / "rig.log").read_text().splitlines() if l.startswith("RIG ")][-1][4:])
    _preview_strip(pdir, info["previews"], wd / "rig_preview.png")
    record(asset, "rig", [src, pfile, core.BLENDER_SCRIPTS / script], [out, wd / "rig_preview.png"], {**info, "rigId": t["rigId"]}, digest_extra=None)
    warn = f"; warnings: {'; '.join(info['warnings'])}" if info["warnings"] else ""
    return (f"{info['bones']} bones, oriented by {info['orient']} ({info['yawDeg']} deg), {info['unweightedVerts']} unweighted verts{warn}; "
            f"LOOK at {_rel(wd / 'rig_preview.png')}: landmarks on the body, no tearing in the test poses")


def _ual_library() -> Path:
    """UAL1 + UAL2 imported once into work/_cache/ual_library.blend, rebuilt when a GLB changes."""
    hs = json.loads((core.SPEC_DIR / "clips" / "humanoid.json").read_text())["libraries"]
    glbs = [core.FORGE / hs["ual2"]["glb"], core.FORGE / hs["ual1"]["glb"]]
    for g in glbs:
        if not g.exists():
            raise ForgeError(f"UAL library missing: {_rel(g)}. Run doctor; ask codex to run gen3d/setup.sh.")
    cache, meta = core.WORK / "_cache" / "ual_library.blend", core.WORK / "_cache" / "ual_library.json"
    want = [core.sha256_file(g) for g in glbs]
    if cache.exists() and meta.exists() and json.loads(meta.read_text()).get("glbSha256") == want:
        return cache
    cache.parent.mkdir(parents=True, exist_ok=True)
    core.run_blender("ual_library.py", [str(glbs[0]), str(glbs[1]), str(cache)], core.WORK / "_cache" / "ual_library.log", timeout=1800)
    meta.write_text(json.dumps({"glbSha256": want}))
    return cache


def _clip_plan(asset: str) -> list[dict]:
    rs = spec("render_spec")
    kind = asset_kind(asset)
    player = asset.startswith(("player", "selftest-human"))
    human_src = json.loads((core.SPEC_DIR / "clips" / "humanoid.json").read_text())["clips"] if kind == "human" else {}
    overrides = (_recipe(asset).get("clips") or {}) if kind == "human" else {}
    out = []
    for name, c in rs["clips"].items():
        if (c.get("playerOnly") and not player) or (c.get("humansOnly") and kind != "human"):
            continue
        key, cv = canvas_for(asset, name)
        clip = {"name": name, "frames": c["frames"], "facings": rs["facings"]["sets"][c["facingSet"]],
                "phases": c.get("phases"), "fps": c.get("fps"), "playback": c["playback"], "runtime": c["runtime"],
                "canvas": {"key": key, "size": cv["size"], "anchor": cv["anchor"]}}
        if kind == "human":
            clip["segments"] = (overrides.get(name) or human_src[name])["segments"]
        out.append(clip)
    return out


def st_animate(asset: str) -> str:
    wd = work_dir(asset)
    t = _template(asset)
    clips = _clip_plan(asset)
    pfile = wd / "animate_params.json"
    params = {"template": t, "clips": clips}
    if t.get("kind") == "humanoid":
        hs = json.loads((core.SPEC_DIR / "clips" / "humanoid.json").read_text())
        params.update({"library": str(_ual_library()), "libraries": hs["libraries"],
                       "boneMapUal1": json.loads((core.SPEC_DIR / hs["libraries"]["ual1"]["boneMap"]).read_text())["bones"]})
    pfile.write_text(json.dumps(params))
    src, out = wd / "rig.blend", wd / "animate.blend"
    gaits = core.BLENDER_SCRIPTS / ("retarget.py" if t.get("kind") == "humanoid" else "gaits.py")
    if core.is_fresh(asset, "animate", [src, pfile, gaits, core.BLENDER_SCRIPTS / "animate.py"]):
        return "fresh (cached)"
    core.run_blender("animate.py", [str(src), str(out), str(pfile)], wd / "logs" / "animate.log", timeout=1800)
    info = json.loads([l for l in (wd / "logs" / "animate.log").read_text().splitlines() if l.startswith("ANIMATE ")][-1][8:])
    rs = spec("render_spec")
    strides = ({k: t["gait"][k]["strideUnits"] for k in ("walk", "run") if "strideUnits" in t["gait"].get(k, {})} if "gait" in t
               else {k: rs["clips"][k]["strideTiles"] for k in ("walk", "run")})
    record(asset, "animate", [src, pfile, gaits, core.BLENDER_SCRIPTS / "animate.py"], [out],
           {**info, "plan": clips, "strideTiles": strides, "rigId": t["rigId"]}, digest_extra=None)
    n = sum(len(c["frames"]) * len(c["facings"]) for c in info["clips"])
    return f"{len(info['clips'])} clips, {n} frames to bake (stepped keys, ART-9.2)"


def st_bake(asset: str) -> str:
    wd, cv, rs = work_dir(asset), _canvas(asset), spec("render_spec")
    anim = core.stage_record(asset, "animate")
    if anim:
        src = wd / "animate.blend"
        clips = [{"name": c["name"], "action": c["action"], "frames": c["frames"], "facings": c["facings"], "canvas": c.get("canvas")}
                 for c in anim["extra"]["clips"]]
    else:
        src = wd / "texture.blend"
        clips = [{"name": "rest", "action": None, "frames": [1]}]
    params = {"canvas": cv["size"], "anchor": cv["anchor"], "artPxPerUnit": rs["camera"]["artPixelsPerWorldUnit"],
              "elevationDeg": rs["camera"]["elevationDeg"], "facings": rs["facings"]["zRotationDeg"],
              "clips": clips, "sockets": rs["bake"]["exportSocketTracks"]}
    pfile = wd / "bake_params.json"
    pfile.write_text(json.dumps(params))
    out = wd / "bake"
    if core.is_fresh(asset, "bake", [src, pfile]):
        return "fresh (cached)"
    shutil.rmtree(out, ignore_errors=True)
    out.mkdir()
    core.run_blender("bake.py", [str(src), str(out), str(pfile)], wd / "logs" / "bake.log", timeout=5400)
    record(asset, "bake", [src, pfile], sorted(out.rglob("*.png")) + [out / "tracks.json"], {"clips": [c["name"] for c in clips]}, digest_extra=None)
    return f"{len(list(out.rglob('*_albedo.png')))} frames across {len(clips)} clips"


def st_pixelize(asset: str) -> str:
    from forgelib import pixelize
    r, wd = _recipe(asset), work_dir(asset)
    bake_files = sorted((wd / "bake").rglob("*.png")) + [wd / "bake" / "tracks.json"]
    extra = {"ramps": r["ramps"], "detailSlots": r.get("detailSlots", [])}
    if r.get("rampShift"):  # only when used, so existing caches and digests are unchanged
        extra["rampShift"] = r["rampShift"]
    out = wd / "pix"
    code = [core.FORGE / "forgelib" / "pixelize.py"]
    if core.is_fresh(asset, "pixelize", bake_files + code + [core.SPEC_DIR / "render_spec.json", core.SPEC_DIR / "palette.json"], extra):
        return "fresh (cached)"
    shutil.rmtree(out, ignore_errors=True)
    pixelize.run_dir(wd / "bake", out, r["ramps"], r.get("detailSlots", []), r.get("rampShift"))
    record(asset, "pixelize", bake_files + code + [core.SPEC_DIR / "render_spec.json", core.SPEC_DIR / "palette.json"],
           sorted(out.rglob("*.png")), extra)
    return f"{len(list((out).glob('*/*.png')))} frames"


def st_qa(asset: str) -> str:
    from forgelib import qa
    r, wd, cv = _recipe(asset), work_dir(asset), _canvas(asset)
    ref = wd / "prep" / "front_cutout.png"
    anim = core.stage_record(asset, "animate")
    plan = [{"name": c["name"], "frames": len(c["frames"]), "facings": c["facings"]} for c in anim["extra"]["clips"]] if anim else None
    report, signature = qa.run(asset, wd / "pix", wd / "bake", r["ramps"], cv, asset_kind(asset), r["heightArtPx"], ref, plan)
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
    from forgelib import qa
    gifs = qa.clip_gifs(wd / "pix", _canvas(asset), pdir / "clips")
    from forgelib.review import export_packet
    export_packet(wd, pdir, asset, spec("render_spec"), _canvas(asset))
    if (wd / "rig_preview.png").exists():
        shutil.copy2(wd / "rig_preview.png", pdir / "rig_preview.png")
    (pdir / "README.md").write_text(
        f"# {asset}: review packet (status: candidate)\n\n"
        f"- Contact sheet: `contact.png` (4x: rest pose in 8 facings on grey and grass, then one row per clip; red marks = anchor)\n"
        f"- Turntable: `turntable.gif`\n- Clips: `clips/<clip>.gif` ({len(gifs)} clips, every facing side by side at clip fps, 4x)\n"
        f"- Rig: `rig_preview.png` (landmarks and test poses)\n- QA: `qa_report.json` ({len(report['checks'])} checks)\n"
        "- In-scene candidate preview: `review.json` with registered 2x frames and socket tracks (development gallery)\n"
        f"- Forge inputs: `art/source/references/{slug(asset)}/`, `art/source/forge/recipes/{slug(asset)}.json`\n\n"
        f"Approval is the director's alone (L7): `docs/team/comms/director/approvals/{slug(asset)}--{pdir.name}.md`.\n")
    return f"packet {_rel(pdir)}; message the communicator and director with what you saw"


def _turntable(wd: Path, out: Path) -> None:
    from PIL import Image
    from forgelib.qa import ORDER, _frames, rest_clip_of
    scale = spec("render_spec")["qa"]["contactSheetScale"]
    rest = rest_clip_of(_frames(wd / "pix"))
    tiles = []
    for f in ORDER:
        p = wd / "pix" / rest / f"{f}_0.png"
        bg = Image.new("RGBA", Image.open(p).size, (110, 114, 128, 255))
        bg.alpha_composite(Image.open(p).convert("RGBA"))
        tiles.append(bg.resize((bg.width * scale, bg.height * scale), Image.NEAREST).convert("P"))
    tiles[0].save(out, save_all=True, append_images=tiles[1:], duration=350, loop=0)


def approval_for(asset: str) -> tuple[Path, Path] | None:
    """(record, packet dir) of a director-approved record whose packetDigest matches its packet's
    current review.json sourceDigest (PRD-9). A record for regenerated frames matches nothing."""
    for rec in sorted(core.APPROVALS.glob(f"{slug(asset)}--*.md")):
        text = rec.read_text()
        meta = dict(l.split(":", 1) for l in text.split("---")[1].strip().splitlines() if ":" in l) if text.startswith("---") else {}
        meta = {k.strip(): v.strip() for k, v in meta.items()}
        if meta.get("decision") != "director-approved":
            continue
        pdir = REPO / meta.get("packet", "").strip().rstrip("/")
        review = pdir / "review.json"
        if review.exists() and json.loads(review.read_text()).get("sourceDigest") == meta.get("packetDigest"):
            return rec, pdir
    return None


def _blender_version() -> str:
    import re
    version = subprocess.run([core.blender_bin(), "--version"], capture_output=True, text=True, check=True).stdout
    match = re.search(r"Blender (4\.2\.\d+)", version)
    if not match:
        raise ForgeError("This stage needs the pinned Blender 4.2.x binary")
    return match[1]


def st_publish(asset: str) -> str:
    if asset_kind(asset) == "item":
        found = approval_for(asset)
        if not found:
            raise ForgeError(f"No director-approved record matches the current item packet of {asset} (L7, PRD-9).")
        from forgelib.publish import publish_item
        wd = work_dir(asset)
        path = publish_item(REPO, wd, found[1], found[0], asset, _item_config(asset), _blender_version())
        record(asset, "publish", [found[0], found[1] / "review.json"], [path], {"scope": ["held-item", "icon"]})
        return f"staged {_rel(path)}; runtime composition reads it from the source manifest"
    if asset_kind(asset) not in ("creature", "human"):
        raise ForgeError(f"No body publication for {asset_kind(asset)} assets")
    found = approval_for(asset)
    if not found:
        raise ForgeError(f"No director-approved record in {_rel(core.APPROVALS)} whose packetDigest matches the current "
                         f"packet of {asset} (L7, PRD-9). Regenerated frames need a new approval; wait for the director.")
    from forgelib.publish import publish_body
    wd = work_dir(asset)
    path = publish_body(REPO, wd, found[1], found[0], asset, spec("render_spec"), _canvas(asset), _blender_version())
    record(asset, "publish", [found[0], found[1] / "review.json"], [path], {"scope": ["body", "clips"]})
    return f"staged {_rel(path)}; faces need separate approval; gameplay activation is not changed"


def st_faces(asset: str) -> str:
    """Sidecar workflow: do not insert faces into the approved body's stage chain."""
    kind = asset_kind(asset)
    if kind not in ("human", "creature"):
        raise ForgeError("Faces require a human or creature body packet")
    from forgelib.faces import build_faces
    found = approval_for(asset)
    packets = sorted(core.REVIEW.glob(f"*-{slug(asset)}/review.json"))
    if not found and not packets:
        raise ForgeError("Faces need an existing body review packet with head sockets")
    packet = found[1] if found else packets[-1].parent
    code = core.FORGE / "forgelib/faces.py"
    inputs = [code, packet / "review.json", core.SPEC_DIR / "palette.json", core.SPEC_DIR / "render_spec.json"]
    recipe = core.RECIPES / f"{slug(asset)}.json"
    if kind == "human" and recipe.is_file():
        inputs.append(recipe)
    revision = core.digest(inputs)[:12]
    output = core.REVIEW / f"{time.strftime('%Y-%m-%d', time.gmtime())}-{slug(asset)}-faces-{revision}"
    report = build_faces(packet, output, asset, spec("render_spec"), spec("palette"),
                         kind=kind, face=_recipe(asset).get("face") if kind == "human" else None)
    outputs = [output / "faces.json", output / "contact.png"]
    if (output / "registered.png").is_file():
        outputs.append(output / "registered.png")
    record(asset, "faces", inputs, outputs,
           {"status": report["status"], "scope": ["faces"]})
    return f"{report['status']}: {_rel(output)}; OPEN contact.png and registered.png; request a separate faces decision"


ORIENT_FIELDS = {"lengthArtPx", "gripFraction", "flipHead", "flipForward", "minFeaturePx"}


def st_orient(asset: str) -> str:
    """Item source model: the textured prop, rigidly oriented and scaled (forgelib/item_orient.py)."""
    if asset_kind(asset) != "item":
        raise ForgeError("orient is the held-item source stage; bodies use rig")
    r, wd = _recipe(asset), work_dir(asset)
    o = r.get("orient")
    if not isinstance(o, dict) or "lengthArtPx" not in o or set(o) - ORIENT_FIELDS:
        raise ForgeError(f"Item recipe needs orient: {{lengthArtPx, [gripFraction, flipHead, flipForward]}} ({sorted(ORIENT_FIELDS)})")
    rs = spec("render_spec")
    held = rs["canvases"]["layer.heldItem"]
    margin = rs["marginsArtPixels"]["min"]
    reach = min(held["anchor"][0], held["size"][0] - held["anchor"][0], held["anchor"][1], held["size"][1] - held["anchor"][1]) - margin
    icon = rs["canvases"]["icon.item"]["size"]
    params = {**o, "artPxPerUnit": rs["camera"]["artPixelsPerWorldUnit"], "maxReachArtPx": reach,
              "iconSizePx": min(icon), "marginPx": margin}
    pfile = wd / "orient_params.json"
    pfile.write_text(json.dumps(params, sort_keys=True))
    src, out = wd / "texture.blend", wd / "item_model.blend"
    script = core.BLENDER_SCRIPTS / "item_orient.py"
    inputs = [src, pfile, script, core.FORGE / "forgelib/item_orient.py"]
    if core.is_fresh(asset, "orient", inputs):
        return "fresh (cached)"
    log = wd / "logs" / "orient.log"
    core.run_blender("item_orient.py", [str(src), str(out), str(pfile)], log)
    line = [l for l in log.read_text().splitlines() if l.startswith("ITEM_ORIENT ")]
    if not line:
        raise ForgeError(f"orient failed; see {_rel(log)}")
    info = json.loads(line[-1][len("ITEM_ORIENT "):])
    core.run_blender("preview.py", [str(out), str(wd / "orient_preview.png")], wd / "logs" / "orient_preview.log")
    record(asset, "orient", inputs, [out, wd / "orient_preview.png"], info, digest_extra=None)
    return (f"reach {info['reachArtPx']} art px of {reach}; head up, blade forward; "
            f"LOOK at {_rel(wd / 'orient_preview.png')} (flip with orient.flipHead/flipForward)")


def _item_config(asset: str) -> dict:
    """Recipe item block with `model`, `grip` and `iconPivot` filled from orient when "auto"."""
    r = _recipe(asset)
    if r.get("kind") != "item":
        raise ForgeError("Item recipe must declare kind: item")
    config = dict(r.get("item") or {})
    rec = core.stage_record(asset, "orient")
    needs = config.get("model", "auto") == "auto" or "auto" in (config.get("grip"), config.get("iconPivot"), config.get("iconScale"))
    if needs and not rec:
        raise ForgeError(f"Run orient first ({CMD} orient --asset {asset}); the recipe asks for auto values")
    if config.get("model", "auto") == "auto":
        config["model"] = (work_dir(asset) / "item_model.blend").relative_to(REPO / "art/source").as_posix()
    for key in ("grip", "iconPivot", "iconScale"):
        if config.get(key) == "auto":
            config[key] = rec["extra"][key]
    return config


def st_item_plan(asset: str) -> str:
    from forgelib.items import item_pose_plan, write_item_plan
    if asset_kind(asset) != "item":
        raise ForgeError("Use item:<canonical-id> for item pose planning")
    recipe = _recipe(asset)
    if recipe.get("kind") != "item":
        raise ForgeError("Item recipe must declare kind: item")
    # Validate the asset/model before work_dir can create any path from this ID.
    config = _item_config(asset)
    item_pose_plan(REPO, asset, config, spec("render_spec"))
    path = work_dir(asset) / "item_plan.json"
    plan = write_item_plan(REPO, asset, config, spec("render_spec"), path)
    # This is not part of the body stage chain and does not invalidate body art.
    return f"draft: {_rel(path)}; {len(plan['poses'])} mesh poses; items runs technical render/QA; no items-ready grant"


def st_items(asset: str) -> str:
    from forgelib.items import item_pose_plan
    from forgelib.item_render import render_items
    if asset_kind(asset) != "item":
        raise ForgeError("Item rendering needs item:<slug> and a separate prop source")
    recipe = _recipe(asset)
    if recipe.get("kind") != "item":
        raise ForgeError("Item recipe must declare kind: item")
    config = _item_config(asset)
    item_pose_plan(REPO, asset, config, spec("render_spec"))
    directory = render_items(REPO, work_dir(asset), asset, config, recipe["ramps"],
                             spec("render_spec"), _blender_version(), detail_slots=recipe.get("detailSlots"))
    review = json.loads((directory / "item-review.json").read_text())
    return (f"{review['status']}: {_rel(directory)}; OPEN contact.png (rows = grip buckets, columns = facings, "
            f"last row = icon) and qa_report.json, then packet")


def _item_generation(asset: str) -> Path:
    rec = core.stage_record(asset, "items")
    if not rec:
        raise ForgeError(f"Run items first ({CMD} items --asset {asset})")
    return REPO / rec["extra"]["directory"]


def st_item_packet(asset: str) -> str:
    gen = _item_generation(asset)
    review = json.loads((gen / "item-review.json").read_text())
    if review["status"] != "candidate":
        raise ForgeError("Item QA status is draft: fix inputs per qa_report.json (orient levers, recipe ramps, lengthArtPx)")
    wd = work_dir(asset)
    marker = wd / "contact.viewed"
    if not marker.exists() or marker.read_text().strip() != core.sha256_file(gen / "contact.png"):
        raise ForgeError(f"Open {_rel(gen / 'contact.png')} with read_file first (PRD-5), then write its sha256 to "
                         f"{_rel(marker)}; the packet needs a viewed contact sheet.")
    pdir = REPO / "art" / "review" / f"{time.strftime('%Y-%m-%d', time.gmtime())}-{slug(asset)}"
    if pdir.exists():
        shutil.rmtree(pdir)
    for f in review["files"]:
        if f["path"] in ("source.blend",) or f["path"].startswith("bake/"):
            continue  # sources travel with publish; the packet is what the reviewer looks at
        target = pdir / f["path"]
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(gen / f["path"], target)
        if core.sha256_file(target) != f["sha256"]:
            raise ForgeError("Generation file changed while packeting")
    shutil.copy2(gen / "item-review.json", pdir / "review.json")
    if (wd / "orient_preview.png").exists():
        shutil.copy2(wd / "orient_preview.png", pdir / "orient_preview.png")
    (pdir / "README.md").write_text(
        f"# {asset}: held-item review packet (status: candidate)\n\n"
        "- Contact sheet: `contact.png` (rows = grip buckets 0-7, clockwise from up; columns = facings; last row = inventory icon)\n"
        "- Source model: `orient_preview.png` (canonical pose: head up, working edge forward)\n"
        f"- QA: `qa_report.json`; frames and registration in `review.json` ({len(review['frames'])} frames)\n"
        f"- Forge inputs: `art/source/references/{slug(asset)}/`, `art/source/forge/recipes/{slug(asset)}.json`\n\n"
        f"Approval record: `docs/team/comms/director/approvals/{slug(asset)}--{pdir.name}.md` (scope: [held-item, icon]).\n")
    record(asset, "packet", [gen / "item-review.json"], [pdir / "review.json"], {"packet": _rel(pdir)})
    return f"packet {_rel(pdir)}; message --to-claude-- (standing review delegation) with what you saw"


RUNNERS = {"prep": st_prep, "gen3d": st_gen3d, "clean": st_clean, "texture": st_texture, "rig": st_rig, "animate": st_animate, "bake": st_bake,
           "pixelize": st_pixelize, "qa": st_qa, "packet": lambda a: (st_item_packet if asset_kind(a) == "item" else st_packet)(a),
           "publish": st_publish, "orient": st_orient, "items": st_items}


# ---------------------------------------------------------------- next / status / doctor
def _next_item(asset: str) -> str:
    try:
        core.load_sheet(asset)
    except ForgeError as e:
        return f"BLOCKED: {e}"
    if not (core.RECIPES / f"{slug(asset)}.json").exists():
        return f"BLOCKED: write the recipe art/source/forge/recipes/{slug(asset)}.json (recipes/README.md, item section)."
    if approval_for(asset):
        return "item staged" if core.stage_record(asset, "publish") else f"{CMD} publish --asset {asset}"
    for st in ITEM_STAGES:
        rec = core.stage_record(asset, st)
        if st == "items" and rec and rec["extra"].get("status") != "candidate":
            return f"BLOCKED: item QA is draft. Fix inputs per its qa_report.json, then {CMD} orient --asset {asset}"
        if st == "packet" and not rec:
            gen = _item_generation(asset)
            marker = work_dir(asset) / "contact.viewed"
            if not marker.exists() or marker.read_text().strip() != core.sha256_file(gen / "contact.png"):
                return (f"OPEN {_rel(gen / 'contact.png')} with read_file and describe it, write its sha256 to "
                        f"{_rel(marker)}, then: {CMD} packet --asset {asset}")
            return f"{CMD} packet --asset {asset}"
        if st == "publish":
            return "BLOCKED: waiting for an approval record. Message --to-claude-- with the packet path."
        if not rec:
            return f"{CMD} {st} --asset {asset}"
    return "nothing to do"


def next_step(asset: str) -> str:
    if asset_kind(asset) == "item":
        return _next_item(asset)
    # Approved bodies must not be sent back through prep merely because this machine
    # lacks machine-A stage caches. Publishing validates the originals on machine A.
    if approval_for(asset):
        published = core.stage_record(asset, "publish")
        if not published:
            return f"{CMD} publish --asset {asset}"
    try:
        core.load_sheet(asset)
    except ForgeError as e:
        return f"BLOCKED: {e}"
    if not (core.RECIPES / f"{slug(asset)}.json").exists():
        return f"BLOCKED: write the recipe art/source/forge/recipes/{slug(asset)}.json (recipes/README.md)."
    for st in STAGES:
        rec = core.stage_record(asset, st)
        if st in ("rig", "animate") and not rec:
            try:
                _template(asset)
            except ForgeError as e:
                return f"BLOCKED: {e}"
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
            if rec:
                output = next(iter(rec["outputs"]), None)
                path = REPO / output if output else None
                if path and path.is_file() and core.sha256_file(path) == rec["outputs"][output]:
                    return "body/clips staged; face candidates and their approval are separate"
            if approval_for(asset):
                return f"{CMD} publish --asset {asset}"
            return "BLOCKED: waiting for the director's approval record (L7). Message the director with the packet path."
        if not rec:
            return f"{CMD} {st} --asset {asset}"
    return "nothing to do"


def status(asset: str) -> str:
    rows = []
    for st in stages_for(asset)[:-2]:
        rec = core.stage_record(asset, st)
        rows.append(f"  {st:9s} {'done ' + rec['at'] if rec else '-'}")
    return "\n".join(rows)


def _selftest_fixture(asset: str) -> None:
    """texture.blend for a selftest asset: the A-posed UAL2 mannequin, or a copy of Rivallie's textured mesh."""
    wd = work_dir(asset)
    out = wd / "texture.blend"
    if asset == "selftest-creature":
        src = work_dir("rivallie") / "texture.blend"
        if not src.exists():
            raise ForgeError("selftest creature needs art/source/forge/work/rivallie/texture.blend (run rivallie to texture once)")
        if not out.exists() or core.sha256_file(src) != core.sha256_file(out):
            shutil.copy2(src, out)
        return
    script = core.BLENDER_SCRIPTS / "fixture_mannequin.py"
    if out.exists() and out.stat().st_mtime > script.stat().st_mtime:
        return
    lib, cv, rs = _ual_library(), _canvas(asset), spec("render_spec")
    glb = wd / "gen3d" / "mesh.glb"
    glb.parent.mkdir(exist_ok=True)
    (wd / "logs").mkdir(exist_ok=True)
    core.run_blender("fixture_mannequin.py", ["glb", str(lib), str(glb)], wd / "logs" / "fixture.log")
    pfile = wd / "clean_params.json"
    pfile.write_text(json.dumps({"heightArtPx": _recipe(asset)["heightArtPx"], "canvas": cv["size"], "anchor": cv["anchor"],
                                 "artPxPerUnit": rs["camera"]["artPixelsPerWorldUnit"], "elevationDeg": rs["camera"]["elevationDeg"]}))
    core.run_blender("clean.py", [str(glb), str(wd / "clean.blend"), str(pfile)], wd / "logs" / "clean.log")
    core.run_blender("fixture_mannequin.py", ["finish", str(wd / "clean.blend"), str(out)], wd / "logs" / "fixture.log")


def selftest(which: str) -> int:
    """Run rig -> animate -> bake -> pixelize -> qa on fixtures and assert the structural invariants.
    Run it after any forge change (codex) or when the forge behaves oddly (agents). Exit 0 = healthy."""
    if which == "item":
        return selftest_item()
    kinds = ["human", "creature"] if which == "all" else [which]
    worst = 0
    for k in kinds:
        asset = f"selftest-{k}"
        wd = work_dir(asset)
        t0 = time.time()
        report: dict = {"asset": asset, "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "asserts": []}
        try:
            _selftest_fixture(asset)
            for st in ("rig", "animate", "bake", "pixelize", "qa"):
                print(f"  [{asset} {st}] {_run(asset, st).splitlines()[0]}")
            rig = core.stage_record(asset, "rig")["extra"]
            qa = {c["check"]: c for c in json.loads((wd / "qa_report.json").read_text())["checks"]}
            hi = rig["heightUnits"] * 1.05
            asserts = [
                ("rig: every vertex weighted", rig["unweightedVerts"] == 0, f"{rig['unweightedVerts']} unweighted"),
                ("rig: landmarks detected without fallbacks", not rig["warnings"], "; ".join(rig["warnings"]) or "none"),
                ("rig: landmarks inside the body height", all(-0.02 <= v[2] <= hi for v in rig["landmarks"].values()), "z range ok"),
            ] + [(f"qa: {c}", qa[c]["pass"], qa[c]["detail"]) for c in ("clipMatrix", "canvas", "margins", "anchorDrift", "orphans", "paletteMembership")]
            report["asserts"] = [{"assert": a, "pass": bool(ok), "detail": d} for a, ok, d in asserts]
            report["verdict"] = "pass" if all(ok for _, ok, _ in asserts) else "fail"
        except ForgeError as e:
            report["verdict"], report["error"] = ("skipped" if "needs art/source" in str(e) else "fail"), str(e)
        report["seconds"] = round(time.time() - t0, 1)
        (wd / "selftest_report.json").write_text(json.dumps(report, indent=1))
        fails = [a for a in report["asserts"] if not a["pass"]]
        print(f"selftest {k}: {report['verdict'].upper()} in {report['seconds']}s"
              + (f"; failed: {'; '.join(a['assert'] + ' (' + a['detail'] + ')' for a in fails)}" if fails else "")
              + (f"; {report['error']}" if "error" in report else "")
              + f"; LOOK at {_rel(wd / 'rig_preview.png')} and {_rel(wd / 'contact.png')}")
        worst = max(worst, 1 if report["verdict"] == "fail" else 0)
    return max(worst, selftest_item()) if which == "all" else worst


def selftest_item() -> int:
    """PRD-2 calibration proxy only; never generates a production model."""
    from forgelib.item_render import render_items
    asset, version = "item:selftest", _blender_version()
    wd = work_dir(asset)
    script = core.BLENDER_SCRIPTS / "fixture_item.py"
    model = wd / "fixture.blend"
    inputs = [script, core.SPEC_DIR / "palette.json"]
    if not core.is_fresh(asset, "fixture-item", inputs, {"blender": version}):
        core.run_blender("fixture_item.py", [str(model)], wd / "logs/fixture.log")
        record(asset, "fixture-item", inputs, [model], {"blender": version})
    config = {"model": model.relative_to(REPO / "art/source").as_posix(), "grip": [0, 0, 0],
              "iconPivot": [0, 0, 0], "supportGrip": [0, 0, 0.125], "socket": "Socket_Hand.R"}
    directory = render_items(REPO, wd, asset, config, {"fixture": "wood"}, spec("render_spec"), version)
    review = json.loads((directory / "item-review.json").read_text())
    report = {"asset": asset, "verdict": "pass" if review["status"] == "candidate" else "fail",
              "frames": len(review["frames"]), "qa": review["qa"], "directory": _rel(directory)}
    (wd / "selftest_report.json").write_text(json.dumps(report, indent=2))
    print(f"selftest item: {report['verdict'].upper()}; 65 calibration poses; OPEN {_rel(directory / 'contact.png')}; not artwork")
    return 0 if report["verdict"] == "pass" else 1


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
    for name, ok, fix in checks:
        print(f"  [{'ok' if ok else 'FAIL'}] {name}" + ("" if ok else f"  -> {fix}"))
    bad = [c for c in checks if not c[1]]
    print(f"doctor: {len(checks) - len(bad)}/{len(checks)} environment checks ok")
    print("asset classes (produce only a READY class named in a --to-blender--go-<class> message):")
    for cls, c in CLASSES.items():
        state = "READY" if c["ready"] and not bad else "not ready"
        extra = f"; still to build: {', '.join(c['pending'])}" if c["pending"] else ""
        print(f"  {cls:12s} {state}{extra}" + (f" ({c['ticket']})" if not c["ready"] else ""))
    return 1 if bad or not any(c["ready"] for c in CLASSES.values()) else 0


def _invalidate_after(asset: str, stage: str) -> None:
    """A stage that really ran makes every later record stale; drop them so `next` re-runs them."""
    order = stages_for(asset)
    for st in order[order.index(stage) + 1:]:
        if st != "publish":  # a publication record is never silently dropped
            (work_dir(asset) / f"{st}.json").unlink(missing_ok=True)
    if order.index(stage) < order.index("qa" if "qa" in order else "items"):
        (work_dir(asset) / "contact.viewed").unlink(missing_ok=True)


def _run(asset: str, st: str) -> str:
    before = (core.stage_record(asset, st) or {}).get("outputs")
    msg = RUNNERS[st](asset)
    after = (core.stage_record(asset, st) or {}).get("outputs")
    if msg != "fresh (cached)" and st not in ("packet", "publish") and before != after:
        _invalidate_after(asset, st)  # only when the stage's outputs really changed
    return msg


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("command", choices=["doctor", "selftest", "status", "next", "all", "faces", "item-plan", "items", "orient", *STAGES])
    ap.add_argument("--asset")
    ap.add_argument("--kind", choices=["human", "creature", "item", "all"], default="all", help="selftest fixture kind")
    a = ap.parse_args()
    if a.command == "doctor":
        return doctor()
    if a.command == "selftest":
        try:
            return selftest(a.kind)
        except ForgeError as e:
            print(f"FORGE ERROR [selftest]: {e}", file=sys.stderr)
            return 2
    if not a.asset:
        ap.error("--asset is required")
    try:
        if asset_kind(a.asset) == "item" and a.command not in (*ITEM_STAGES, "item-plan", "next", "status", "all"):
            raise ForgeError(f"Items use {', '.join(ITEM_STAGES)} (plus item-plan); {a.command} is a body stage")
        if a.command == "orient" and asset_kind(a.asset) != "item":
            raise ForgeError("orient is the held-item source stage")
        if a.command == "next":
            print(next_step(a.asset))
        elif a.command == "status":
            print(status(a.asset))
        elif a.command == "faces":
            print(st_faces(a.asset))
        elif a.command == "item-plan":
            print(st_item_plan(a.asset))
        elif a.command in ("items", "orient"):
            print(f"[{a.command}] {_run(a.asset, a.command)}")
            print("next:", next_step(a.asset))
        elif a.command == "all":
            if approval_for(a.asset):
                raise ForgeError("This body has a matching director approval; use publish or faces, not an all-stage rerun (PRD-9).")
            for st in stages_for(a.asset)[:-2]:
                print(f"[{st}] {_run(a.asset, st)}")
            print("next:", next_step(a.asset))
        else:
            print(f"[{a.command}] {_run(a.asset, a.command)}")
            print("next:", next_step(a.asset))
    except (ForgeError, OSError, ValueError, KeyError) as e:
        print(f"FORGE ERROR [{a.command}]: {e}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
