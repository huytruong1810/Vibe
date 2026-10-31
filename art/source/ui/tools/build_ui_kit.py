"""Build the Hearthwild UI kit (doctrine UI-1, UI-2, UI-7) from palette-indexed pixel grids.

    uv run --project art/source/forge python art/source/ui/tools/build_ui_kit.py

Writes art/source/ui/kit/<part>.png at art-pixel size and kit/export/<part>.png at the exact
2x display size (L1), plus kit/hud_mock.png: a 1920x1080 composition over the Aqualia target
scene for director review. Colours come only from spec/palette.json ramps.
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
KIT = ROOT / "kit"
PAL = json.loads((REPO / "art/source/forge/spec/palette.json").read_text())["ramps"]
THEME = json.loads((REPO / "art/source/forge/spec/ui_theme.json").read_text())
FONT = ROOT / "fonts" / "Silver.ttf"


def c(ramp: str, step: str) -> tuple[int, int, int, int]:
    h = PAL[ramp]["steps"][step]
    return int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255


# palette keys used by the grids ('.' = transparent)
K = {
    "o": c("outline-neutral", "deep"), "O": c("outline-neutral", "shadow"),
    "n": c("navy", "deep"), "b": c("navy", "shadow"), "m": c("navy", "mid"), "M": c("navy", "light"),
    "g": c("gold", "shadow"), "G": c("gold", "mid"), "h": c("gold", "light"), "H": c("gold", "highlight"),
    "d": c("gold", "deep"),
    "t": c("teal", "shadow"), "T": c("teal", "light"), "w": c("glass", "highlight"),
}


def grid(rows: list[str]) -> Image.Image:
    img = Image.new("RGBA", (len(rows[0]), len(rows)), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != ".":
                img.putpixel((x, y), K[ch])
    return img


# --- 9-slice frames: edge profiles (outer -> inner) for the lit (top/left) and shadow
# (bottom/right) sides, so light always comes from the upper left (ART-3.1). Ornate frames add
# a diamond corner boss with a teal gem (Zenonia-style hardware, UI-1.1).
ORNATE_EDGE_TOP = ["o", "h", "H", "G", "G", "g", "o", "m"]
ORNATE_EDGE_BOTTOM = ["o", "g", "G", "g", "g", "d", "o", "b"]
STANDARD_EDGE_TOP = ["o", "h", "G", "g", "o", "M"]
STANDARD_EDGE_BOTTOM = ["o", "G", "g", "d", "o", "b"]
THIN_EDGE_TOP = ["o", "m", "n"]
THIN_EDGE_BOTTOM = ["o", "b", "n"]
BOSS_RADIUS = {"ornate": 5, "standard": 3}


def boss(r: int) -> Image.Image:
    """Diamond stud of radius r with a gem, lit from the upper left."""
    size = 2 * r + 1
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    p = img.load()
    for y in range(size):
        for x in range(size):
            dx, dy = x - r, y - r
            m = abs(dx) + abs(dy)
            if m > r:
                continue
            upper_left = dx + dy < 0
            if m == r:
                key = "o"
            elif m == r - 1:
                key = "H" if upper_left else "g"
            elif m >= r - 2 and r > 3:
                key = "h" if upper_left else "G"
            elif m == 0:
                key = "w" if r > 3 else "T"
            elif m == 1:
                key = "T" if upper_left else "t"
            else:
                key = "o" if m == 2 and r > 3 else ("T" if upper_left else "t")
            p[x, y] = K[key]
    return img


def frame(boss_r: int | None, top: list[str], bottom: list[str], w: int, h: int) -> Image.Image:
    """Assemble a w x h frame from a corner grid and edge profiles."""
    s = len(top)
    img = Image.new("RGBA", (w, h), K["n"])
    px = img.load()
    for y in range(h):
        for x in range(w):
            dt, db, dl, dr = y, h - 1 - y, x, w - 1 - x
            d = min(dt, db, dl, dr)
            if d >= s:
                continue
            light = (dt == d or dl == d) and not (db == d or dr == d)
            if (dt == d and dr == d) or (db == d and dl == d):
                light = dt == d if dt == d else False
            key = (top if light else bottom)[d]
            px[x, y] = K[key]
    if boss_r:
        stud = boss(boss_r)
        c0 = len(top) // 2 - boss_r + 1
        for cx, cy in ((c0, c0), (w - c0 - stud.width, c0), (c0, h - c0 - stud.height), (w - c0 - stud.width, h - c0 - stud.height)):
            img.alpha_composite(stud, (cx, cy))
    # round the outer corners: transparent outside the outline
    for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        px[x, y] = (0, 0, 0, 0)
    return img


def _shade(img: Image.Image, strength: int = 1) -> Image.Image:
    """Darken gold one step on corners facing away from the light."""
    down = {K["H"]: K["h"], K["h"]: K["G"], K["G"]: K["g"], K["g"]: K["d"], K["T"]: K["t"]}
    out = img.copy()
    p = out.load()
    for y in range(out.height):
        for x in range(out.width):
            v = p[x, y]
            for _ in range(strength):
                v = down.get(v, v)
            p[x, y] = v
    return out


def bar(kind: str, w: int = 84, h: int = 9, fill: float = 0.72) -> Image.Image:
    ramp = {"hp": "crimson", "stamina": "ochre", "xp": "glass", "need": "teal"}[kind]
    img = frame(None, ["o", "O"], ["o", "O"], w, h)
    p = img.load()
    inner_w = w - 4
    for x in range(2, w - 2):
        for y in range(2, h - 2):
            on = (x - 2) < round(inner_w * fill)
            if not on:
                p[x, y] = K["n"]
                continue
            step = "light" if y == 2 else ("shadow" if y == h - 3 else "mid")
            p[x, y] = c(ramp, step)
            if kind in ("hp", "stamina") and (x - 2) % 8 == 7:
                p[x, y] = c(ramp, "shadow")
        if (x - 2) == round(inner_w * fill) - 1:
            for y in range(2, h - 2):
                p[x, y] = c(ramp, "highlight")
    return img


def slot(rarity: str, size: int = 30) -> Image.Image:
    ramp = THEME["rarity"][rarity]
    img = frame(None, ["o", "O", "o"], ["o", "O", "o"], size, size)
    p = img.load()
    for i in range(3, size - 3):
        for (x, y) in ((i, 3), (3, i), (i, size - 4), (size - 4, i)):
            light = y == 3 or x == 3
            p[x, y] = c(ramp, "light" if light else "shadow")
    return img


def ring(d: int, band: int = 2, inner: str | None = "n") -> Image.Image:
    """Medallion ring: outline, gold band lit from upper left, navy interior."""
    img = Image.new("RGBA", (d, d), (0, 0, 0, 0))
    p = img.load()
    r = d / 2
    for y in range(d):
        for x in range(d):
            dx, dy = x + 0.5 - r, y + 0.5 - r
            dist = (dx * dx + dy * dy) ** 0.5
            if dist > r:
                continue
            if dist > r - 1:
                p[x, y] = K["o"]
            elif dist > r - 1 - band:
                lit = (dx + dy) < 0
                p[x, y] = K["h"] if lit and dist > r - 2 else (K["G"] if lit else K["g"])
            elif dist > r - 2 - band:
                p[x, y] = K["o"]
            elif inner:
                p[x, y] = K[inner]
    return img


def text(draw: ImageDraw.ImageDraw, xy, s: str, fill, font) -> None:
    draw.fontmode = "1"  # never anti-alias pixel text (UI-7)
    draw.text(xy, s, fill=fill, font=font)


def key_button(label: str, d: int, font) -> Image.Image:
    img = ring(d, band=2, inner="b")
    dr = ImageDraw.Draw(img)
    bbox = dr.textbbox((0, 0), label, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    text(dr, ((d - tw) // 2 - bbox[0], (d - th) // 2 - bbox[1]), label, c("cream", "highlight"), font)
    return img


def save(img: Image.Image, name: str) -> None:
    KIT.mkdir(exist_ok=True)
    (KIT / "export").mkdir(exist_ok=True)
    img.save(KIT / f"{name}.png")
    img.resize((img.width * 2, img.height * 2), Image.NEAREST).save(KIT / "export" / f"{name}.png")


def main() -> None:
    font = ImageFont.truetype(str(FONT), 19)
    parts = {
        "frame_ornate": frame(BOSS_RADIUS["ornate"], ORNATE_EDGE_TOP, ORNATE_EDGE_BOTTOM, 48, 48),
        "frame_standard": frame(BOSS_RADIUS["standard"], STANDARD_EDGE_TOP, STANDARD_EDGE_BOTTOM, 32, 32),
        "frame_thin": frame(None, THIN_EDGE_TOP, THIN_EDGE_BOTTOM, 24, 24),
        "bar_hp": bar("hp"), "bar_stamina": bar("stamina", fill=0.55), "bar_xp": bar("xp", 84, 6, 0.4),
        "bar_need": bar("need", 16, 6, 0.6),
        "medallion_player": ring(52, band=3, inner=None), "medallion_companion": ring(36, band=2, inner=None), "minimap_ring": ring(76, band=3, inner="b"),
        "button_strike": key_button("J", 44, font), "button_element": key_button("K", 34, font),
        "button_dash": key_button("Spc", 30, font),
    }
    for r in THEME["rarity"]:
        parts[f"slot_{r}"] = slot(r)
    for name, img in parts.items():
        save(img, name)
    hud_mock(parts, font)
    print(f"ui kit: {len(parts)} parts -> {KIT.relative_to(REPO)}")


def nine(src: Image.Image, w: int, h: int, inset: int) -> Image.Image:
    out = Image.new("RGBA", (w, h))
    sw, sh = src.size
    cells = [(0, inset), (inset, sw - inset), (sw - inset, sw)]
    rows = [(0, inset), (inset, sh - inset), (sh - inset, sh)]
    tx = [(0, inset), (inset, w - inset), (w - inset, w)]
    ty = [(0, inset), (inset, h - inset), (h - inset, h)]
    for (sy0, sy1), (dy0, dy1) in zip(rows, ty):
        for (sx0, sx1), (dx0, dx1) in zip(cells, tx):
            piece = src.crop((sx0, sy0, sx1, sy1))
            if dx1 - dx0 > 0 and dy1 - dy0 > 0:
                tile = Image.new("RGBA", (dx1 - dx0, dy1 - dy0))
                for yy in range(0, dy1 - dy0, piece.height):
                    for xx in range(0, dx1 - dx0, piece.width):
                        tile.paste(piece, (xx, yy))
                out.paste(tile, (dx0, dy0))
    return out


def _portrait(path: Path, d: int) -> Image.Image:
    """Circular crop of a HUD portrait to sit inside a medallion of diameter d."""
    src = Image.open(path).convert("RGBA").resize((d, d), Image.NEAREST)
    mask = Image.new("L", (d, d), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, d - 1, d - 1], fill=255)
    out = Image.new("RGBA", (d, d), (0, 0, 0, 0))
    out.paste(src, (0, 0), mask)
    return out


def hud_mock(p: dict, font) -> None:
    """960x540 art-px composition of the UI-2 layout over the target scene, exported 1920x1080."""
    gen = REPO / "public/assets/generated"
    src = Image.open(REPO / "art/source/proofs/aqualia-target-scene.png").convert("RGBA")
    base = src.crop((0, 140, 1560, 1018)).resize((960, 540), Image.NEAREST)  # crop away concept UI
    hud = Image.new("RGBA", (960, 540), (0, 0, 0, 0))
    d = ImageDraw.Draw(hud)
    cream, pale, accent = c("cream", "highlight"), c("cream", "light"), c("teal", "light")
    M = THEME["layout"]["safeMarginArtPx"]

    # top-left: player medallion, bars, companion medallion with needs (UI-2.1),
    # seated on standard plates so text keeps contrast over any scene (UI-1.1)
    hud.alpha_composite(nine(p["frame_standard"], 152, 64, 8), (M + 26, M - 2))
    hud.alpha_composite(nine(p["frame_standard"], 116, 38, 8), (M + 24, M + 62))
    hud.alpha_composite(_portrait(gen / "portrait_origin_aqualia_96.png", 46), (M + 3, M + 3))
    hud.alpha_composite(p["medallion_player"], (M, M))
    text(d, (M + 62, M + 1), "Aqualia", cream, font)
    text(d, (M + 138, M + 1), "Lv 7", c("gold", "highlight"), font)
    hud.alpha_composite(p["bar_hp"], (M + 62, M + 23))
    hud.alpha_composite(p["bar_stamina"], (M + 62, M + 34))
    hud.alpha_composite(p["bar_xp"], (M + 62, M + 45))
    riv = sorted((REPO / "public/assets/portraits/creatures").glob("*rivallie*"))
    if riv:
        hud.alpha_composite(_portrait(riv[0], 30), (M + 11, M + 61))
    hud.alpha_composite(p["medallion_companion"], (M + 8, M + 58))
    text(d, (M + 50, M + 63), "Rivallie", pale, font)
    for i in range(5):
        hud.alpha_composite(bar("need", 16, 6, (0.9, 0.7, 0.4, 0.8, 0.25)[i]), (M + 50 + i * 18, M + 84))

    # top-right: minimap ring with day, phase, weather (UI-2.2)
    mm = p["minimap_ring"]
    hud.alpha_composite(mm, (960 - M - mm.width, M))
    hud.alpha_composite(nine(p["frame_standard"], 66, 50, 8), (960 - M - mm.width - 64, M + 2))
    text(d, (960 - M - mm.width - 56, M + 5), "Day 3", cream, font)
    text(d, (960 - M - mm.width - 56, M + 23), "Dawn", pale, font)

    # bottom-right: action cluster and the two hand slots (UI-2.3)
    j, k, sp = p["button_strike"], p["button_element"], p["button_dash"]
    hud.alpha_composite(j, (960 - M - j.width, 540 - M - j.height))
    hud.alpha_composite(k, (960 - M - j.width - k.width + 4, 540 - M - j.height - k.height + 10))
    hud.alpha_composite(sp, (960 - M - j.width + 6, 540 - M - j.height - sp.height - 4))
    items = REPO / "public/assets/sprites/items"
    for i, (rar, item) in enumerate((("common", "item_hatchet.png"), ("rare", "item_reeds.png"))):
        sl = p[f"slot_{rar}"]
        x = 960 - M - j.width - k.width - 12 - (2 - i) * (sl.width + 4)
        y = 540 - M - sl.height
        hud.alpha_composite(sl, (x, y))
        ic = Image.open(items / item).convert("RGBA")
        ic.thumbnail((20, 20), Image.NEAREST)
        hud.alpha_composite(ic, (x + (sl.width - ic.width) // 2, y + (sl.height - ic.height) // 2))
        text(d, (x + 2, y - 18), "LR"[i], pale, font)

    # dialogue: ornate box, standard portrait frame, thin name plate (UI-4.1)
    dlg = nine(p["frame_ornate"], 600, 104, 12)
    dx, dy = 180, 540 - M - 104
    hud.alpha_composite(dlg, (dx, dy))
    pf = nine(p["frame_standard"], 84, 84, 8)
    hud.alpha_composite(pf, (dx + 12, dy + 10))
    neris = Image.open(gen / "portrait_npc_npc_neris_128.png").convert("RGBA").resize((68, 68), Image.NEAREST)
    hud.alpha_composite(neris, (dx + 20, dy + 18))
    plate = nine(p["frame_thin"], 78, 22, 3)
    hud.alpha_composite(plate, (dx + 104, dy - 12))
    text(d, (dx + 114, dy - 14), "Neris", accent, font)
    text(d, (dx + 108, dy + 16), "The river's high today. Mind the ferry rope", cream, font)
    text(d, (dx + 108, dy + 36), "when you cross; it bites cold hands.", cream, font)
    text(d, (dx + 560, dy + 76), "E", c("gold", "highlight"), font)

    # bottom-left: context prompt (UI-2.4)
    tip = nine(p["frame_thin"], 100, 24, 3)
    hud.alpha_composite(tip, (M, 540 - M - 24))
    text(d, (M + 8, 540 - M - 25), "E  Talk", cream, font)

    out = base.copy()
    out.alpha_composite(hud)
    out.resize((1920, 1080), Image.NEAREST).save(KIT / "hud_mock.png")


if __name__ == "__main__":
    main()
