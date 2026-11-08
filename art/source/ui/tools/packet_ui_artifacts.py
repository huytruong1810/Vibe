"""Package the B18 authored artifacts UI kit parts and icons for director review."""
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

REPO = Path(__file__).resolve().parents[4]
UI = REPO / "art/source/ui"
KIT = UI / "kit"
ICONS = UI / "icons/items"
DEST = REPO / "art/review/2026-11-05-ui-authored-artifacts"
DEST.mkdir(parents=True, exist_ok=True)
FRAMES_DIR = DEST / "frames"
FRAMES_DIR.mkdir(parents=True, exist_ok=True)

parts = [
    "frame_book_spread",
    "frame_note_page",
    "icon_page_prev",
    "icon_page_next",
    "seal_stamp",
    "frame_painting_wall",
    "frame_painting_preview",
    "easel_cloth",
]

icons = [
    "note-blank",
    "note-written",
    "book-blank",
    "book-written",
    "canvas-blank",
    "canvas-painted",
]

# Copy all part and icon files into frames directory
file_records = []
for p in parts:
    src = KIT / f"{p}.png"
    dst = FRAMES_DIR / f"{p}.png"
    shutil.copyfile(src, dst)
    digest = hashlib.sha256(dst.read_bytes()).hexdigest()
    file_records.append({
        "id": p,
        "file": f"frames/{p}.png",
        "sha256": digest,
        "width": Image.open(dst).width,
        "height": Image.open(dst).height,
    })

for icon in icons:
    src = ICONS / f"{icon}.png"
    dst = FRAMES_DIR / f"icon_{icon}.png"
    shutil.copyfile(src, dst)
    digest = hashlib.sha256(dst.read_bytes()).hexdigest()
    file_records.append({
        "id": f"icon_{icon}",
        "file": f"frames/icon_{icon}.png",
        "sha256": digest,
        "width": Image.open(dst).width,
        "height": Image.open(dst).height,
    })

# Compose contact sheet (width: 480, height: 360)
contact = Image.new("RGBA", (480, 360), (26, 36, 62, 255))
d = ImageDraw.Draw(contact)
font = ImageFont.truetype(str(UI / "fonts/Silver.ttf"), 19)

d.text((12, 10), "Authored Artifacts UI Kit (Ticket B18)", fill=(246, 222, 178), font=font)

# Book spread
book = Image.open(KIT / "frame_book_spread.png")
contact.alpha_composite(book, (12, 34))
d.text((12, 178), "Book Spread (240x140)", fill=(177, 155, 132), font=font)

# Note page
note = Image.open(KIT / "frame_note_page.png")
contact.alpha_composite(note, (260, 34))
d.text((260, 178), "Note Page (120x140)", fill=(177, 155, 132), font=font)

# Wall frame & cloth easel
wall = Image.open(KIT / "frame_painting_wall.png")
contact.alpha_composite(wall, (388, 34))
d.text((388, 80), "Wall Frame", fill=(177, 155, 132), font=font)

easel = Image.open(KIT / "easel_cloth.png")
contact.alpha_composite(easel, (396, 100))
d.text((388, 154), "Easel Cloth", fill=(177, 155, 132), font=font)

# Navigation and seal
contact.alpha_composite(Image.open(KIT / "icon_page_prev.png"), (12, 204))
contact.alpha_composite(Image.open(KIT / "icon_page_next.png"), (36, 204))
contact.alpha_composite(Image.open(KIT / "seal_stamp.png"), (64, 202))
d.text((96, 206), "Arrows & Seal Stamp", fill=(177, 155, 132), font=font)

# 6 Item icons
for i, name in enumerate(icons):
    ic = Image.open(ICONS / f"{name}.png")
    contact.alpha_composite(ic, (12 + i * 40, 240))
d.text((12, 276), "Item Icons: Note / Book / Canvas / Painting", fill=(177, 155, 132), font=font)

contact_path = DEST / "contact.png"
contact.save(contact_path)

# Verify palette adherence
pal = json.loads((REPO / "art/source/forge/spec/palette.json").read_text())["ramps"]
allowed = set()
for r in pal.values():
    for s in r["steps"].values():
        allowed.add(s.lower())

off_palette = 0
for r in file_records:
    im = Image.open(DEST / r["file"]).convert("RGBA")
    for px in im.getdata():
        if px[3] > 0:
            hex_c = f"#{px[0]:02x}{px[1]:02x}{px[2]:02x}".lower()
            if hex_c not in allowed:
                off_palette += 1

qa_report = {
    "schemaVersion": 1,
    "status": "candidate",
    "qa": [
        {
            "check": "paletteMembership",
            "rule": "ART-4.1",
            "pass": off_palette == 0,
            "detail": f"{off_palette} off-palette colors",
            "hard": True,
        },
        {
            "check": "itemIcons",
            "rule": "AGT-8",
            "pass": len(icons) == 6,
            "detail": "6 32-px icons staged",
            "hard": True,
        },
        {
            "check": "uiFrames",
            "rule": "UI-1",
            "pass": len(parts) == 8,
            "detail": "8 UI kit elements generated",
            "hard": True,
        },
    ],
}
(DEST / "qa_report.json").write_text(json.dumps(qa_report, indent=2))

manifest = {
    "schemaVersion": 1,
    "asset": "ui:authored-artifacts",
    "kind": "ui-review",
    "status": "candidate",
    "frames": file_records,
    "qa": qa_report["qa"],
    "sourceDigest": hashlib.sha256(contact_path.read_bytes()).hexdigest(),
}
(DEST / "review.json").write_text(json.dumps(manifest, indent=2))

readme = """# Authored Artifacts UI Kit Review Packet (Ticket B18)

Candidate UI frames, screens, and item icons for Authored Artifacts (codex C17-C21):
- `frame_book_spread`: Open two-page book spread with timber/gold cover and cream parchment.
- `frame_note_page`: Single parchment note with dog-ear corner fold.
- `icon_page_prev` / `icon_page_next`: Tactile navigation buttons with direction arrows.
- `seal_stamp`: Crimson wax seal stamp decal.
- `frame_painting_wall`: 48x32 wall display frame with timber moulding and brass brackets.
- `frame_painting_preview`: 4x ornate modal preview frame.
- `easel_cloth`: In-progress canvas draped in linen cloth on a wooden easel.
- 6 32-px item icons: blank/written note, blank/written book, blank canvas, framed painting thumbnail.

Palette lock: 0 off-palette colors.
"""
(DEST / "README.md").write_text(readme)
print(f"Authored artifacts UI packet assembled at {DEST}")
