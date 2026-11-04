"""Paths, spec loading, asset ids and stage records shared by every forge stage."""

from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import time
from functools import lru_cache
from pathlib import Path

FORGE = Path(__file__).resolve().parents[1]
REPO = FORGE.parents[2]
SPEC_DIR = FORGE / "spec"
WORK = FORGE / "work"
VENDOR = FORGE / "vendor"
RECIPES = FORGE / "recipes"
BLENDER_SCRIPTS = FORGE / "blender"
REFERENCES = REPO / "art" / "source" / "references"
REVIEW = REPO / "art" / "review"
APPROVALS = REPO / "docs" / "team" / "comms" / "director" / "approvals"
GEN3D_DIR = FORGE / "gen3d"
GEN3D_PY = GEN3D_DIR / ".venv" / "bin" / "python"
GEN3D_HF_HOME = GEN3D_DIR / "models" / "hf"
# gen3d.backend in a recipe -> (python, runner script); every runner writes the same mesh.glb contract (C31, L12)
GEN3D_DEFAULT = "hunyuan-2mv"
GEN3D_BACKENDS = {
    "hunyuan-2mv": (GEN3D_PY, "run_shape.py"),
}

os.environ.setdefault("PYTHONDONTWRITEBYTECODE", "1")


class ForgeError(RuntimeError):
    """A stage failed for a reason the operator can act on; message says how."""


@lru_cache(maxsize=None)
def spec(name: str) -> dict:
    return json.loads((SPEC_DIR / f"{name}.json").read_text())


def slug(asset_id: str) -> str:
    """'npc:neris' -> 'npc-neris'; filesystem-safe and stable."""
    return asset_id.replace(":", "-").replace("/", "-").lower()


def work_dir(asset_id: str) -> Path:
    d = WORK / slug(asset_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


def reference_dir(asset_id: str) -> Path:
    return REFERENCES / slug(asset_id)


def load_sheet(asset_id: str) -> dict:
    p = reference_dir(asset_id) / "sheet.json"
    if not p.exists():
        raise ForgeError(
            f"No reference sheet at {p.relative_to(REPO)}. Generate it locally with `forge.py concept` "
            "then `forge.py views` (`reference-sheets` skill, PRD-3)."
        )
    return json.loads(p.read_text())


def load_recipe(asset_id: str) -> dict:
    p = RECIPES / f"{slug(asset_id)}.json"
    if not p.exists():
        raise ForgeError(f"No recipe at {p.relative_to(REPO)}. Write one (see recipes/README.md).")
    return json.loads(p.read_text())


# Template selftest fixtures (selftest-creature-<template>) bake on their species' canvas.
SELFTEST_TEMPLATE_CANVAS = {"shelled": "creature.large", "winged": "creature.small", "mushroom-biped": "creature.small"}


def asset_kind(asset_id: str) -> str:
    """human | creature | item | environment, from the id and spec canvases."""
    if asset_id.startswith("item:"):
        return "item"
    if asset_id.startswith("env:"):
        return "environment"
    if asset_id.startswith("selftest-creature"):
        return "creature"
    rs = spec("render_spec")["canvases"]
    for key, c in rs.items():
        if key.startswith("creature.") and asset_id in c.get("species", []):
            return "creature"
    return "human"


def canvas_for(asset_id: str, state: str = "idle") -> tuple[str, dict]:
    rs = spec("render_spec")["canvases"]
    kind = asset_kind(asset_id)
    if asset_id.startswith("selftest-creature"):
        key = SELFTEST_TEMPLATE_CANVAS.get(asset_id.removeprefix("selftest-creature-"), "creature.medium")
        return key, rs[key]
    if kind == "creature":
        for key, c in rs.items():
            if key.startswith("creature.") and asset_id in c.get("species", []):
                return key, c
    if kind == "human":
        for key, c in rs.items():  # human.combat, human.ground, ... by the states they list
            if key.startswith("human.") and key != "human.locomotion" and state in c.get("states", []):
                return key, c
        return "human.locomotion", rs["human.locomotion"]
    if kind == "item":
        return "layer.heldItem", rs["layer.heldItem"]
    raise ForgeError(f"No canvas for {asset_id} ({kind}); environment canvases are set per recipe.")


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def digest(paths: list[Path], extra: object = None) -> str:
    h = hashlib.sha256()
    for p in sorted(paths, key=str):
        h.update(str(p.relative_to(REPO) if p.is_absolute() and REPO in p.parents else p).encode())
        h.update(sha256_file(p).encode() if p.is_file() else b"missing")
    h.update(json.dumps(extra, sort_keys=True, default=str).encode())
    return h.hexdigest()


_SAME = object()


def record(asset_id: str, stage: str, inputs: list[Path], outputs: list[Path], extra: dict | None = None,
           digest_extra: object = _SAME) -> dict:
    """Write the stage record. The inputs digest must be computed exactly as the stage's
    is_fresh() call computes it: pass digest_extra when the stored extra holds results."""
    rec = {
        "asset": asset_id,
        "stage": stage,
        "inputsDigest": digest(inputs, extra if digest_extra is _SAME else digest_extra),
        "inputs": [str(p.relative_to(REPO)) for p in inputs],
        "outputs": {str(p.relative_to(REPO)): sha256_file(p) for p in outputs if p.is_file()},
        "extra": extra or {},
        "at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    (work_dir(asset_id) / f"{stage}.json").write_text(json.dumps(rec, indent=2) + "\n")
    return rec


def stage_record(asset_id: str, stage: str) -> dict | None:
    p = work_dir(asset_id) / f"{stage}.json"
    return json.loads(p.read_text()) if p.exists() else None


def is_fresh(asset_id: str, stage: str, inputs: list[Path], extra: dict | None = None) -> bool:
    rec = stage_record(asset_id, stage)
    if not rec or rec["inputsDigest"] != digest(inputs, extra):
        return False
    return all((REPO / o).is_file() and sha256_file(REPO / o) == h for o, h in rec["outputs"].items())


def blender_bin() -> str:
    for cand in (os.environ.get("BLENDER"), shutil.which("blender"), str(Path.home() / ".local/bin/blender")):
        if cand and Path(cand).exists():
            return cand
    raise ForgeError("Blender 4.2 not found. Expected ~/.local/bin/blender (sprite-forge troubleshooting).")


def run_blender(script: str, args: list[str], log: Path, timeout: int = 1800) -> None:
    """Run a forge bpy script headless with factory settings; output goes to `log`."""
    cmd = [blender_bin(), "-b", "--factory-startup", "-noaudio", "--python-exit-code", "3",
           "-P", str(BLENDER_SCRIPTS / script), "--", *args]
    env = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1", "FORGE_REPO": str(REPO)}
    log.parent.mkdir(parents=True, exist_ok=True)
    with open(log, "w") as f:
        proc = subprocess.run(cmd, stdout=f, stderr=subprocess.STDOUT, env=env, timeout=timeout)
    if proc.returncode != 0:
        tail = "\n".join(log.read_text(errors="replace").splitlines()[-25:])
        raise ForgeError(f"Blender script {script} failed (exit {proc.returncode}). Log: {log.relative_to(REPO)}\n{tail}")


# The GPU is shared with the jepa_ipomdp experiment queue (agreed 2026-11-03). Protocol: create PAUSE (its queue then
# starts no new seed), wait until GPU_BUSY (the seed running now) is gone, run, delete PAUSE. A seed takes 1-2 h.
GPU_PAUSE = Path.home() / "projects/jepa_ipomdp/runs/week/PAUSE"
GPU_BUSY = GPU_PAUSE.with_name("GPU_BUSY")


def _pid_alive(pid: int) -> bool:
    try:
        os.kill(pid, 0)
    except ProcessLookupError:
        return False
    except PermissionError:
        return True
    return True


def _pause_owner(path: Path) -> int | None:
    """PID stored in a PAUSE file, or None when the file is empty or foreign (written by another project)."""
    try:
        return int(path.read_text().strip().split()[0])
    except (OSError, ValueError, IndexError):
        return None


class gpu_window:
    """Context manager around a big GPU job (more than ~8 GB): pause the other project's queue, wait for its running seed.

    PAUSE holds the owner PID. A PAUSE whose recorded PID is dead (a forge process killed outright) is taken over;
    a PAUSE with no PID (someone else's) is left alone and never deleted.
    """

    def __init__(self, wait_s: int = 9000):
        self.wait_s, self.made = wait_s, False

    def __enter__(self):
        if not GPU_PAUSE.parent.is_dir():
            return self  # the other project isn't on this machine
        if GPU_PAUSE.exists():
            owner = _pause_owner(GPU_PAUSE)
            if owner is not None and not _pid_alive(owner):
                GPU_PAUSE.unlink(missing_ok=True)  # stale: its forge process died without cleanup
        if not GPU_PAUSE.exists():
            GPU_PAUSE.write_text(f"{os.getpid()}\n")
            self.made = True
        t0 = time.time()
        while GPU_BUSY.exists():
            if time.time() - t0 > self.wait_s:
                self.__exit__()
                raise ForgeError(f"{GPU_BUSY} still exists after {self.wait_s} s: another project's seed is running. Retry later.")
            time.sleep(15)
        return self

    def __exit__(self, *exc):
        if self.made:
            GPU_PAUSE.unlink(missing_ok=True)
            self.made = False
