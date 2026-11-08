"""Generate the doctrine master palette (art/source/forge/spec/palette.json).

Each ramp is derived from one authored mid colour. Steps are placed in OKLCH:
lightness steps down/up, shadows hue-shift toward blue-violet and lights toward
warm yellow (doctrine ART-4.2), chroma peaks around the mid step. Colours are
gamut-mapped by reducing chroma, never by clipping channels.

Run:  uv run --project art/source/forge python art/source/forge/tools/gen_palette.py [--swatch out.png]
Only Claude/director edit this file or its output (doctrine DOC-1).
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

SPEC_DIR = Path(__file__).resolve().parents[1] / "spec"

# name -> (mid hex, group, glossy)
RAMPS: dict[str, tuple[str, str, bool]] = {
    # skin
    "skin-porcelain": ("#f0c4a2", "skin", False),
    "skin-warm": ("#d69c76", "skin", False),
    "skin-tan": ("#b37650", "skin", False),
    "skin-deep": ("#7a4a31", "skin", False),
    # hair
    "hair-ink": ("#34324a", "hair", True),
    "hair-brown": ("#6e4832", "hair", True),
    "hair-auburn": ("#9c4b2f", "hair", True),
    "hair-blonde": ("#d6ae66", "hair", True),
    "hair-silver": ("#b5b9c6", "hair", True),
    "hair-teal": ("#3a9fa0", "hair", True),
    # eyes
    "eye-blue": ("#4f80ba", "eye", True),
    "eye-brown": ("#6e4b2f", "eye", True),
    "eye-green": ("#4f8b5c", "eye", True),
    "eye-amber": ("#c98a2e", "eye", True),
    # Aqualia accents
    "teal": ("#2f9d99", "aqualia", False),
    "navy": ("#2e4066", "aqualia", False),
    "reed": ("#8ba65b", "aqualia", False),
    "timber": ("#8c5b3b", "aqualia", False),
    "sand": ("#d8c098", "aqualia", False),
    # Pyrador accents
    "ember": ("#c4482f", "pyrador", False),
    "ochre": ("#c98b3a", "pyrador", False),
    "basalt": ("#56576a", "pyrador", False),
    "glass": ("#7cc6bf", "pyrador", True),
    # Zephyria accents
    "sky": ("#6fa7d8", "zephyria", False),
    "cream": ("#ece0c2", "zephyria", False),
    "sage": ("#9cb489", "zephyria", False),
    "sail": ("#e4e0d3", "zephyria", False),
    # materials
    "leather": ("#7b5337", "material", False),
    "iron": ("#7d8696", "material", True),
    "copper": ("#b9713f", "material", True),
    "gold": ("#c9a044", "material", True),
    "wood": ("#9b6c43", "material", False),
    "stone": ("#8f8b85", "material", False),
    "linen": ("#d6d2c6", "material", False),
    "plum": ("#6e4b7b", "material", False),
    "crimson": ("#c3443c", "material", False),
    "foliage": ("#5f8f3f", "nature", False),
    "foliage-deep": ("#3f6b3b", "nature", False),
    "water": ("#3eaec3", "nature", True),
    "blossom": ("#e2a2b7", "nature", False),
    "moss": ("#6f8a4a", "nature", False),
    # neutral outline / flash ramp
    "outline-neutral": ("#4b455a", "neutral", False),
}

STEPS = ("deep", "shadow", "mid", "light", "highlight")
# Lightness: fraction of the distance from mid toward the floor/ceiling, so dark
# ramps never collapse to black (ART-4.3) and light ramps keep distinct steps.
L_FLOOR, L_CEIL, MIN_GAP = 0.22, 0.965, 0.055
FRAC = {"deep": 0.62, "shadow": 0.30, "mid": 0.0, "light": 0.36, "highlight": 0.70}
DC = {"deep": 0.72, "shadow": 1.0, "mid": 1.0, "light": 0.88, "highlight": 0.62}
SHADOW_HUE, LIGHT_HUE = 275.0, 85.0
HUE_PULL = {"deep": 0.22, "shadow": 0.12, "mid": 0.0, "light": 0.10, "highlight": 0.18}


def srgb_to_linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def linear_to_srgb(c: float) -> float:
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def hex_to_oklch(h: str) -> tuple[float, float, float]:
    r, g, b = (srgb_to_linear(int(h[i : i + 2], 16) / 255) for i in (1, 3, 5))
    l_ = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
    m_ = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
    s_ = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    A = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    return L, math.hypot(A, B), math.degrees(math.atan2(B, A)) % 360


def oklch_to_rgb(L: float, C: float, H: float) -> tuple[float, float, float]:
    A, B = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
    l_ = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
    m_ = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
    s_ = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3
    return (
        4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
        -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
        -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_,
    )


def to_hex(L: float, C: float, H: float) -> str:
    L = min(max(L, 0.08), 0.97)
    while True:
        rgb = oklch_to_rgb(L, C, H)
        if all(-1e-4 <= c <= 1 + 1e-4 for c in rgb) or C < 1e-3:
            break
        C *= 0.95
    return "#" + "".join(f"{round(min(max(linear_to_srgb(max(c, 0)), 0), 1) * 255):02x}" for c in rgb)


def pull_hue(h: float, target: float, amount: float) -> float:
    d = ((target - h + 540) % 360) - 180
    return (h + d * amount) % 360


def step_lightness(L: float) -> dict[str, float]:
    shadow = min(L - FRAC["shadow"] * (L - L_FLOOR), L - MIN_GAP)
    deep = max(min(L - FRAC["deep"] * (L - L_FLOOR), shadow - MIN_GAP), 0.20)
    light = max(L + FRAC["light"] * (L_CEIL - L), L + MIN_GAP)
    highlight = max(L + FRAC["highlight"] * (L_CEIL - L), light + 0.04)
    return {
        "deep": deep,
        "shadow": shadow,
        "mid": L,
        "light": min(light, L_CEIL - 0.04),
        "highlight": min(highlight, L_CEIL),
    }


def build_ramp(mid_hex: str) -> dict[str, str]:
    L, C, H = hex_to_oklch(mid_hex)
    lights = step_lightness(L)
    out = {}
    for step in STEPS:
        darker = STEPS.index(step) < 2
        target = SHADOW_HUE if darker else LIGHT_HUE
        # near-greys barely carry hue; keep a subtle temperature shift only
        h = pull_hue(H, target, HUE_PULL[step]) if C > 0.02 else target
        c = C * DC[step] if C > 0.02 else 0.012 + 0.004 * darker
        out[step] = to_hex(lights[step], c, h)
    out["mid"] = mid_hex.lower()
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--swatch", type=Path)
    args = ap.parse_args()

    ramps = {
        name: {"group": group, "glossy": glossy, "steps": build_ramp(mid)}
        for name, (mid, group, glossy) in RAMPS.items()
    }
    doc = {
        "schemaVersion": 1,
        "doctrine": "ART-4",
        "generator": "art/source/forge/tools/gen_palette.py",
        "steps": list(STEPS),
        "rules": {
            "maxColorsActor": 24,
            "maxColorsCreature": 20,
            "maxColorsEnvironment": 32,
            "forbidden": ["#000000", "#ffffff"],
            "regionAccents": {
                "aqualia": ["teal", "navy", "reed", "timber", "sand"],
                "pyrador": ["ember", "ochre", "basalt", "glass"],
                "zephyria": ["sky", "cream", "sage", "sail"],
            },
        },
        "ramps": ramps,
    }
    (SPEC_DIR / "palette.json").write_text(json.dumps(doc, indent=2) + "\n")
    print(f"wrote {len(ramps)} ramps x {len(STEPS)} steps")

    if args.swatch:
        from PIL import Image, ImageDraw

        cell, label = 24, 120
        img = Image.new("RGB", (label + cell * len(STEPS), cell * len(ramps)), "#202028")
        d = ImageDraw.Draw(img)
        for row, (name, r) in enumerate(ramps.items()):
            d.text((4, row * cell + 6), name, fill="#d0d0d0")
            for col, step in enumerate(STEPS):
                x = label + col * cell
                d.rectangle([x, row * cell, x + cell - 1, row * cell + cell - 1], fill=r["steps"][step])
        img.save(args.swatch)
        print(f"swatch {args.swatch}")


if __name__ == "__main__":
    main()
