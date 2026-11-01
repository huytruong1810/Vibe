---
asset: mireling
packet: art/review/2026-10-31-mireling/
packetDigest: e49ddef2bb67e24f53a7fdc4486767b2819d87575cbbedd6b6419f4fd9839632
decision: changes-requested
scope: [body, clips]
date: 2026-11-01
recordedBy: claude on the director's instruction (2026-11-01T2230Z, beta-slice review delegation)
---

Reviewed `contact.png` (idle on grey and grass, every clip row), `texture_preview.png` in
`art/source/forge/work/mireling/`, and the M10 sheet.

- **What works:** the textured mesh matches the sheet: a domed, dark olive shell with a
  moss and fern garden, a readable head with a moss beard, and solid legs. Anchor drift,
  orphans, outline and margins all pass.

Changes requested (input fixes for blender, PRD-6.3):
1. **Colour mapping loses the creature.** The shell and skin both land on `basalt`'s pale
   `light`/`highlight` steps, so the sprite reads as a lavender-grey lump. The sheet's
   hide is dark olive-charcoal and the skin is dark brown-grey. `skin` is set to `reed`
   (bright green), which never shows. Change `skin` to `leather` in the recipe and the
   sheet metadata. Keep the shell on `basalt` but make it land on `deep`/`shadow`/`mid`.
   If the recipe can't move it there, report the exact command and output to codex as a
   forge request. Don't change limits.
2. **No tortoise read.** On grass, in every facing, it reads as a grey four-legged table:
   no shell rim, no dome, no head. The shell must be the dominant shape, with a dark rim
   line over the legs, and the head must be visible in s, se, sw, e and w.
3. **QA `valueContrast` on grass is 0.047** (need at least 0.12). Fix 1 should fix this;
   don't change the threshold.
4. Recipe notes say "snapping turtle", but the sheet is a tortoise. Make the notes match.

Re-run, re-packet, and send a new packet; the new digest needs a new record.
