"""Vectorised sRGB <-> OKLab conversion and palette helpers (doctrine ART-4)."""

from __future__ import annotations

import numpy as np

from .core import spec


def srgb_to_linear(c: np.ndarray) -> np.ndarray:
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def rgb8_to_oklab(rgb: np.ndarray) -> np.ndarray:
    """rgb: (..., 3) uint8 -> (..., 3) float OKLab."""
    lin = srgb_to_linear(rgb.astype(np.float64) / 255.0)
    m1 = np.array([[0.4122214708, 0.5363325363, 0.0514459929],
                   [0.2119034982, 0.6806995451, 0.1073969566],
                   [0.0883024619, 0.2817188376, 0.6299787005]])
    lms = np.cbrt(np.clip(lin @ m1.T, 0, None))
    m2 = np.array([[0.2104542553, 0.7936177850, -0.0040720468],
                   [1.9779984951, -2.4285922050, 0.4505937099],
                   [0.0259040371, 0.7827717662, -0.8086757660]])
    return lms @ m2.T


def hex_to_rgb8(h: str) -> tuple[int, int, int]:
    return int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16)


def ramp(name: str) -> dict[str, tuple[int, int, int]]:
    pal = spec("palette")
    if name not in pal["ramps"]:
        raise KeyError(f"Unknown palette ramp '{name}'. Valid ramps are listed in spec/palette.json.")
    return {step: hex_to_rgb8(h) for step, h in pal["ramps"][name]["steps"].items()}


def is_glossy(name: str) -> bool:
    return bool(spec("palette")["ramps"][name]["glossy"])


def all_palette_rgb() -> set[tuple[int, int, int]]:
    out: set[tuple[int, int, int]] = set()
    for r in spec("palette")["ramps"].values():
        out.update(hex_to_rgb8(h) for h in r["steps"].values())
    return out
