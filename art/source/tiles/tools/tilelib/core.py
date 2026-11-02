"""Shared paths, spec, palette and colour maths for tileforge (doctrine ART-11.2)."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np

TILES = Path(__file__).resolve().parents[2]  # art/source/tiles
REPO = TILES.parents[2]
SPEC_DIR = TILES / "spec"
SETS = TILES / "sets"
WORK = TILES / "work"
REVIEW = REPO / "art" / "review"
STAGING = REPO / "art" / "source" / "staging" / "tiles"
EXPORTS = REPO / "art" / "source" / "exports" / "environment"
MANIFEST = REPO / "art" / "source" / "manifest.json"
APPROVALS = REPO / "docs" / "team" / "comms" / "director" / "approvals"
PALETTE = REPO / "art" / "source" / "forge" / "spec" / "palette.json"
WORLD_SCHEMA = REPO / "art" / "source" / "world" / "spec" / "world_schema.json"
WORLD_PROJECT = REPO / "art" / "source" / "world" / "hearthwild.ldtk"


class TileError(ValueError):
    """An operator-facing failure: the message says which input to fix."""


def read(path: Path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8", newline="\n")


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def rel(path: Path) -> str:
    try:
        return Path(path).resolve().relative_to(REPO).as_posix()
    except ValueError:
        return str(path)


_SPEC = None
_PAL = None


def spec() -> dict:
    global _SPEC
    if _SPEC is None:
        _SPEC = read(SPEC_DIR / "tile_spec.json")
    return _SPEC


def palette() -> dict:
    global _PAL
    if _PAL is None:
        _PAL = read(PALETTE)["ramps"]
    return _PAL


def colour(ref: str) -> tuple[int, int, int]:
    """'water.mid' -> (r, g, b). Unknown names fail with the list of valid ramps."""
    ramp, _, step = ref.partition(".")
    ramps = palette()
    if ramp not in ramps:
        raise TileError(f"unknown ramp '{ramp}' in '{ref}'; valid ramps: {', '.join(sorted(ramps))}")
    steps = ramps[ramp]["steps"]
    if step not in steps:
        raise TileError(f"unknown step '{step}' in '{ref}'; valid steps: {', '.join(steps)}")
    h = steps[step].lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def srgb_to_linear(c):
    c = np.asarray(c, dtype=np.float64)
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def oklab_l(rgb) -> np.ndarray:
    """Perceptual lightness (Oklab L, 0..1) of sRGB values in 0..1, shape (..., 3)."""
    lin = srgb_to_linear(rgb)
    r, g, b = lin[..., 0], lin[..., 1], lin[..., 2]
    l_ = np.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    m_ = np.cbrt(0.2119034982 * r + 0.6806995158 * g + 0.1073969740 * b)
    s_ = np.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    return 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_


def ref_l(ref: str) -> float:
    return float(oklab_l(np.array(colour(ref)) / 255.0))


def shift(a: np.ndarray, dy: int, dx: int, wrap_x: bool, wrap_y: bool) -> np.ndarray:
    """a moved by (dy, dx); wrapped axes roll, others repeat the edge (no wrap-around)."""
    out = a
    if dx:
        if wrap_x:
            out = np.roll(out, dx, axis=1)
        else:
            pad = np.repeat(out[:, :1] if dx > 0 else out[:, -1:], abs(dx), axis=1)
            out = np.concatenate([pad, out[:, :-dx]] if dx > 0 else [out[:, -dx:], pad], axis=1)
    if dy:
        if wrap_y:
            out = np.roll(out, dy, axis=0)
        else:
            pad = np.repeat(out[:1] if dy > 0 else out[-1:], abs(dy), axis=0)
            out = np.concatenate([pad, out[:-dy]] if dy > 0 else [out[-dy:], pad], axis=0)
    return out


N4 = ((-1, 0), (1, 0), (0, -1), (0, 1))
N8 = N4 + ((-1, -1), (-1, 1), (1, -1), (1, 1))
