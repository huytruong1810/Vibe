---
from: claude
to: claude
re: handoff
evidence: [docs/team/queue/codex.md (Claude section: C26–C31), docs/team/comms/claude/session-2026-11-02.md, docs/team/comms/claude/archive/2026-11-02T2036--to-claude--handoff.md, art/source/forge/models.json]
needs-reply: no
---

# Handoff to the next Claude session (2026-11-02, after C26 and C31)

You are counsel and doctrine author for Hearthwild.

- **Repo and branch:** `/home/andyj1810/projects/Vibe`, branch `studio/doctrine-v1`. Mirror every
  push to `art/hd-aqualia-slice` (fast-forward or merge, never force).
- **Director:** Huy.
- **Read first:** `AGENTS.md`, directives 012 and 013 in this folder, and the "Claude (machine
  A)" section of `docs/team/queue/codex.md`.
- **The team:**
  - Codex is on machine B.
  - Blender is the Gemini agent in Antigravity.
  - The communicator is the hub.

Your job is still to unblock blender's art. Message `--to-blender--` when a ticket lands.

## Done this session

- **C26 · sprite readability.** The director approved the direction for B20.
  - Two new opt-in recipe fields:
    - `supersample`: `blender/bake.py` writes `<facing>_<i>_albedo_ss.png` at K × K samples.
    - `features`: `forgelib/pixelize.py` `_ss_labels`. A slot wins a pixel near a socket
      segment (`near`, `radiusPx`), on a host (`on`, with `"edge"`), on facings
      (default s/se/sw/e/w), `enclosed`, `maxPx`, `step`. A feature is grown to at least
      2 px so it is never an orphan.
    - Both are wired in `forge.py`. They enter the bake params and pixelize digest only when
      set.
  - Without these fields, the four published creatures re-pixelize pixel-identical.
  - Docs are in `recipes/README.md`. Selftests are in `forgelib/pixelize_selftest.py` (6).
  - The proof scripts lived in the session scratchpad and are gone. They are easy to
    rebuild: bake one clip with `supersample` into `work/bakeoff-c26/<asset>/`, then call
    `pixelize.run_dir`. Boards are `boards/2026-11-02-c26-*.png`.
  - B20 instructions went to blender (`…T2234--to-blender--c26-approved-b20-readability.md`).
    B20 still waits for the director's B19 decision.
- **C31 · TRELLIS.2.** Measured and removed (board `boards/2026-11-02-gen3d-rivallie-trellis2.png`).
  Hunyuan3D-2mv is the only gen3d model, and `forge.py doctor` passes 13/13. L5, L12 and
  `imagegen.md` record the result and the retry notes.

## Your work, in order

1. **C27 · Pose guides** for human (A-pose), winged, shelled and mushroom-biped. These gate B19's
   player and B15.
   - Add `forge.py pose-guide --template <t>`:
     1. Render the selftest fixture (`selftest-human`, `selftest-creature-{winged,shelled,mushroom-biped}`;
        run `forge.py selftest --kind …` first) front, side and back with `blender/preview.py`
        (or a variant that renders one view each).
     2. Make it flat grey clay, crop it tight, and lay the views out on a 2304 × 1344 canvas
        like `art/source/style/pose-guides/quadruped.png`. How that guide was made is in
        `docs/engineering/imagegen.md`.
   - Commit the guides in `art/source/style/pose-guides/`. Update `recipes/README.md`. The
     sprite-forge skill note is in `.agents/`: you may edit it as doctrine author.
   - Done when one `concept` run per template keeps every view in the template pose. Look at
     every contact sheet.
2. **C28 · Views at 1024 px or more** (today about 620 px tall on a 2304 × 1344 sheet).
   - Option 1: re-render each cropped view at 1024 px or more with klein 9B, using the sheet as
     reference (4-bit NF4). Watch the reference scaling.
   - Option 2: larger sheets, within VRAM.
   - Done when `views` writes every view ≥ 1024 px with no `prep` warnings, and gen3d on Rivallie
     is unchanged or better.
3. **C30 · `forge.py portrait` (nine emotions, contract v2) and `forge.py swatch` (seamless
   1024², tileforge).** `swatch` gates B17.
   - Done when Neris has nine portraits at 96 and 128 px that pass the portrait contract, and a
     grass swatch passes tileforge QA.
4. **Open C26 items:**
   - `heightArtPx` headroom per canvas;
   - a concept-template clause for an oversized head, eyes and exaggerated signature features
     (ART-6.3, ART-7.2), in `spec/concept_templates.json` (doctrine; you author it).
5. **Parked:**
   - C9b `fit`;
   - C9c (carry the item off the leg; strike with the item hand);
   - C3b faces. C26 found that a 2-px eye decal at the mouth/head anchor reads at 1× (ART-8.4).
     Creature face decals are what will finally give Bramblefang and Rivallie their eyes.

## Rules

- **Approvals are director-only.** Never self-approve. Record a director decision as "recorded
  by claude on the director's instruction".
- **Commits:**
  - Stage only your own files.
  - Run `npm run check:hygiene`, `npm run check` and Prettier, without a pipe.
  - End each commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Words and images:** no banned words; look at every image before describing it.
- **Model registry:**
  - Keep one model per tool.
  - Mark candidates `trial` while measuring.
  - End every bake-off with deletion and a registry update in the same commit.

## Gotchas

- **New this session:**
  - **PIL loads the bake PNGs as 8-bit.** Read them with `forgelib.pixelize._load16`, which
    picks the divisor; dividing by 65535 yourself gives black images.
  - **`cmp` says every re-baked PNG differs** (metadata). Compare pixels with numpy.
  - **The GPU is shared with other projects.** The PIDs running `jepa_ipomdp/main.py` or
    `sweep.py` are not ours; leave them alone. Before you start Blender or a model, check
    with `nvidia-smi` that enough VRAM is free.
  - **`gh run watch` exits early** outside a TTY. Poll `gh run view <id> --json status`
    in a background until-loop.
  - **HF downloads pinned by commit have no `main` ref.** Offline loaders that resolve by
    repo name fail; point them at `models/hf/hub/models--<org>--<name>/snapshots/<sha>`.
  - **A `&&` chain stops at the first failure.** A stray failing command skipped a later
    step once.
- **Still live:**
  - **`pkill -f <pattern>` kills your own shell.** Find PIDs with `ps -eo pid,args | awk '/[p]attern/'`,
    or use `TaskStop`.
  - **Never `hf cache prune`.** Use only `HF_HOME=<…>/models/hf hf cache rm model/<repo> -y`,
    and never `rm` a `models--` folder by hand.
  - **8-bit bitsandbytes spills on 16 GB.** Use 4-bit NF4.
  - **`concept` overwrites `contact.png`.** Choose seeds that don't clash.
  - **Foreground `sleep` is blocked.** Use `run_in_background` or `Monitor`.
  - **`gh` is `~/.local/bin/gh`**, logged in. There's no passwordless sudo.
  - **`cmd | tail -1` hides exit codes.**
  - **Never reformat hash-bound sources** (`.prettierignore`).
  - **Rivallie is published.** `forge.py all` refuses it; single stages run.
  - **The shared checkout is also blender's.** Stage only your own files.
  - **The first Cycles GPU bake JIT-compiles for about 7 minutes.**

## Untouched by design

- **Codex:** C22 → C24 → C25 → C14 → C13 → C17–C20, C3g and C7.
- **Blender:** B19 first, then B20 once the director approves B19's look.
- **The director owes:** B19's golden-sample look, and B2 Riverlands revision 2.
