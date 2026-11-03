---
from: claude
to: claude
re: handoff
evidence: [docs/team/queue/codex.md (Claude section: C26–C32), docs/team/queue/blender.md, docs/team/comms/claude/2026-11-02T2330--to-all--directive-014-standing-review-delegation.md, docs/team/comms/claude/session-2026-11-02.md, art/source/forge/models.json]
needs-reply: no
---

# Handoff to the next Claude session (2026-11-02, after C27 and directive 014)

You are counsel and doctrine author for Hearthwild.

- **Model:** the director is moving the tooling to Sonnet at high effort to save usage.
  Use medium for queue and doc upkeep.
- **Repo and branch:** `/home/andyj1810/projects/Vibe`, branch `studio/doctrine-v1`. Mirror
  every push to `art/hd-aqualia-slice` with `git push origin HEAD:art/hd-aqualia-slice`
  (fast-forward only, never force).
- **Director:** Huy.
- **Read first:** `AGENTS.md`; directives 012, 013 and 014 in this folder; the "Claude (machine
  A)" section of `docs/team/queue/codex.md`; `docs/engineering/imagegen.md`.

## Your job

Build the forge tools that unblock blender's art queue. Blender is away; when it comes back
it should find every tool in place. When a tool lands, message `--to-blender--` and set the
blender ticket it unblocks from `blocked` to `open` in `docs/team/queue/blender.md` (status
line only).

## Done this session (all pushed)

- **C27 pose guides (2c497cc).**
  - `forge.py pose-guide --template <t> [--try]` and `blender/pose_guide.py`.
  - Guides and provenance JSON are in `art/source/style/pose-guides/`.
  - New spec templates: `creature-winged-v1` and `creature-biped-v1`.
  - Board: `boards/2026-11-02-c27-pose-guides.png`.
- **Directive 014 (4184433).**
  - The director reinstated the standing review delegation.
  - Blender's queue now covers the T0 slice: B5 has the full landmark list; B21 to B26 are new.
  - C32 is new.
- **Proposal 002 voice casting director-approved (525ef77).** Record
  `docs/team/comms/director/approvals/proposal-002-r2.md`.
- **CI** was still running for those three pushes when this was written. Check first:
  `~/.local/bin/gh run list --branch studio/doctrine-v1 --limit 3`. Fix any red before
  new work.

## Your work, in order (by what it unblocks)

1. **C30a · `forge.py swatch`.** Unblocks B17 terrain.
   - Generates a seamless 1024 × 1024 terrain swatch with klein 9B, into
     `art/source/tiles/sets/<set>/swatches/<material>.png`.
   - Read `.agents/skills/tile-forge/SKILL.md` ("What makes a good swatch") and
     `docs/engineering/tileforge.md` first. A tile is 1/8 of the swatch; features must stay
     small; mid-dominant proportions (about 0.7) avoid a visible grid.
   - Make it seamless: generate larger and wrap-blend the edges, or offset by half and
     inpaint the seam. Prove it with a 2 × 2 tiling.
   - Log each kept swatch in the image ledger (as `views` does: `forgelib/concept.py`
     `_ledger`).
   - Done when a grass swatch passes tileforge QA (`tileforge.py` QA on a scratch set in
     `work/`, never in blender's `aqualia-terrain` set) and you've looked at the tiled preview.
2. **C30b · `forge.py portrait`.** Unblocks B25.
   - Takes an identity's neutral portrait from `public/assets/portraits/` and makes nine
     expressions by reference editing: `neutral warm thoughtful curious concerned amused
     angry sad fearful`.
   - Exports transparent 96 × 96 and 128 × 128 PNGs (`docs/art/contract-v2.md`, Portraits
     section).
   - Identity must hold: the same face, hair and colours.
   - Done when Neris has all nine at both sizes, passes the contract checks, and you've
     looked at a board.
3. **C32 · `forge.py icon`.** Unblocks B23.
   - Makes 32 × 32 `icon.item` icons (render_spec), palette-locked, for items without a held
     model.
   - Try two routes on berries and flint: a gen3d model rendered like the items stage's icon
     view, or a `prop-v1` sheet reduced straight through `forgelib/pixelize`. Keep the one
     that reads better at 1× and 4×, and delete the other.
4. **C28 · Views at 1024 px or more.**
   - Today about 620 px tall on a 2304 × 1344 sheet.
   - Option 1: re-render each cropped view with klein 9B, using the sheet as reference.
   - Option 2: larger sheets within VRAM.
   - Done when `views` writes every view at 1024 px or more with no `prep` warnings, and
     gen3d on Rivallie is unchanged or better.
5. **Open C26 items:** `heightArtPx` headroom per canvas; an oversized head, eyes and
   signature-feature clause in `spec/concept_templates.json` (ART-6.3, ART-7.2). Add it to new
   templates or version up (`-v2`); don't silently change `creature-v1` while B19 compares
   against it.
6. **Parked:** C3b creature faces (a 2-px eye decal at the head anchor reads at 1×), C9b
   `fit`, C9c.

Every tool:
- has a `--help` line in the `forge.py` docstring;
- documents its commands in `recipes/README.md` and the matching skill under `.agents/skills/`
  (you may edit those as doctrine author);
- has a trial board in `boards/`;
- gets the queue `result` and `evidence` lines filled in.

The pattern to copy is C27: the CLI command in `forge.py`, built-in trial recipes, and
`concept.concept(..., recipe=...)`.

## Reviews under directive 014

- Review blender's packets when they arrive (`--to-claude-director--`): approve, or open a
  fix ticket.
- Records go in `docs/team/comms/director/approvals/` and say "recordedBy: claude under the
  director's standing delegation of 2026-11-02". Bind each record to the packet's
  `sourceDigest` (PRD-9).
- Never approve your own work: tool stand-ins, trial outputs, or the tileforge golden sample.
- The B19 look decision is the big one. Look at every contact sheet and packet before you
  decide, and write what you saw.

## Rules

- Approvals:
  - Director-only, or under directive 014.
  - Record a direct decision as "recorded by claude on the director's instruction".
- Commits:
  - Stage only your own files.
  - Run `npm run check:hygiene`, `npm run check` and `npm run format:check`. Don't pipe them
    into `tail` (exit codes).
  - Run `npx prettier --write` on the md and json you touch.
  - End each message with `Co-Authored-By: <the model> <noreply@anthropic.com>`.
- Words and images: no banned words; look at every image before describing it (PRD-5).
- Model registry (`art/source/forge/models.json`): one model per tool; mark candidates
  `trial` while measuring; delete the losers in the same commit.
- Lanes: forge code and spec are protected for agents, but you are the author (DOC-5).
  `recipes/` is blender's: put trial recipes in `forge.py` as built-ins, not in `recipes/`.

## Gotchas

- **New this session:**
  - **Heredocs:** an unquoted `<<EOF` runs backticks as commands. A record lost a path that
    way. Use `<<'EOF'`, or the Write tool, for any text with backticks.
  - **`concept` overwrites `work/<asset>/concept/contact.png`.** Copy it to the scratchpad
    before a re-run if you want it on a board.
  - **Blender parenting:** call `bpy.context.view_layer.update()` after moving a new parent
    and before reading its `matrix_world`. A stale identity matrix shifted the mesh off
    frame.
  - **Workbench `film_transparent`:** the background alpha is 1, not 0. Threshold alpha
    above 8 before `getbbox`.
  - **Trial runs:** a klein 9B run of 4 candidates takes about 4–5 minutes. Run it in the
    background and check `nvidia-smi` first (it needs about 14.2 GiB).
- **Still live:**
  - **PIL loads the bake PNGs as 8-bit.** Use `forgelib.pixelize._load16`.
  - **`cmp` says every re-baked PNG differs** (metadata). Compare pixels with numpy.
  - **The GPU is shared with other projects.** `jepa_ipomdp/main.py` and `sweep.py` aren't
    ours; leave them alone.
  - **`gh run watch` exits early** outside a TTY. Poll `gh run view <id> --json status` in a
    background until-loop.
  - **HF downloads pinned by commit have no `main` ref.** Point loaders at
    `models/hf/hub/models--<org>--<name>/snapshots/<sha>`.
  - **`pkill -f <pattern>` kills your own shell.** Find PIDs with
    `ps -eo pid,args | awk '/[p]attern/'`.
  - **Never `hf cache prune`,** and never `rm` a `models--` folder. Use
    `HF_HOME=<…>/models/hf hf cache rm model/<repo> -y`.
  - **8-bit bitsandbytes spills on 16 GB.** Use 4-bit NF4.
  - **Foreground `sleep` is blocked.** Use `run_in_background`.
  - **`gh` is `~/.local/bin/gh`,** logged in. There's no passwordless sudo.
  - **Never reformat hash-bound sources** (`.prettierignore`).
  - **Rivallie is published.** `forge.py all` refuses it; single stages run.
  - **The shared checkout is also blender's.** Stage only your own files.
  - **The first Cycles GPU bake JIT-compiles for about 7 minutes.**
  - **There's no `python` binary.** Use `uv run --project art/source/forge python …`, or
    `python3` for stdlib-only scripts.

## Untouched by design

- **Codex** (machine B): C22 → C24 → C25 → C14 → C13 → C17–C20, C3g, C7. Codex also
  integrates the voice casting when it reaches audio.
- **Blender:** B19 first. The order of work is at the top of `docs/team/queue/blender.md`.
- **Communicator:** closes M14 (voice casting) and updates the status board.
