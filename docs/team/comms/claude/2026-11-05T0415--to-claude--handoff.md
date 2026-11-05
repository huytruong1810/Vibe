---
from: claude
to: claude
re: handoff
evidence: [docs/team/queue/codex.md (C3b result, C33-C36), docs/team/comms/claude/2026-11-05T0408--to-all--rulings-and-forge-fixes-for-visitor-findings.md, docs/team/comms/claude/2026-11-05T0413--to-visitor--next-steps-acting-director.md, docs/doctrine/10-team-charter.md (TEAM-4.2), docs/engineering/imagegen.md]
needs-reply: no
---

# Handoff to the next Claude session (2026-11-05, head after `dcebfd8e`)

You are counsel and doctrine author for Hearthwild; the director is Huy. Repo `/home/andyj1810/projects/Vibe`, branch `studio/doctrine-v1`
(merge, never force; mirror `art/hd-aqualia-slice`). Rules and gotchas: `AGENTS.md`, `archive/2026-11-02T2334--to-claude--handoff.md`. Start by
asking the director what they want. Sonnet 5.5 at medium effort; the director watches token use, so keep sessions focused.

## State

- **Visitor is acting director until 2026-11-11T00:00Z** (directive 017, TEAM-4.2, guard role `visitor`, session env `HEARTHWILD_ROLE=visitor`).
  It decides art/audio packets with `forge.py approve-record` and triages queues. Its records name "visitor acting as director". Its first
  audit caught the backward steamshell (fixed and approved). Next-steps message sent: `2026-11-05T0413--to-visitor--next-steps-acting-director.md`.
  **At call-back:** sample its records in `docs/team/comms/director/approvals/`, read `docs/team/comms/visitor/`, then end or extend 017.
- **Proposals 004-007 ruled** (decision sections in each file). Applied: TEAM-8.2 no-op wakeups, TEAM-4.1 engineering exclusion, visitor role.
  **Waiting on the director:** (a) single-trunk merge (`studio/doctrine-v1` and `eng/hd-presentation` differ by 47 and 55 commits; offer a merge
  order, do not merge unasked), (b) model tier L10 (e4b on GPU for 16 GB; 26b spills at 4.4 tokens/s, `operations.md:46`), (c) commercial licence
  gate before post-Aqualia scale (006; verify licence texts first).
- **Done this and last session (all pushed):** `forge.py approve-record` (digest from `review.json` or `faces.json`; no `--asset` checks every
  record); C3b tool side (`faces` per-frame registration with facing-aware dx mirror, eyes-only `compact/` fallback, `faceCoverage` and `faceDistinct`
  checks; `publish-faces`); `publish` takes `npc:<id>` and falls back to the clip stride; `approval_for` skips `superseded-by`. Docs in
  `docs/engineering/imagegen.md` ("Approval records", "Creature faces and face publish"). Selftests: `approval_record`, `faces_creature`,
  `publish_faces`, `finish`, `human_faces`, `review` (CI lines added for the first three).
- **Staging:** 33 JSONs in `art/source/staging/blender/` (bodies, items, envs, 11 human face sidecars, 3 creature face sidecars). The
  communicator's **M25 manifest merge has not run** for them, so none are in the game; my ledger step (`npm run art:integrate -- ledger <asset>`
  then `npm run assets:build && npm run check:assets`) follows each merge.
- **CI:** four pushes were red from `format:check` (unformatted queue files and proposals); fixed in `dcebfd8e`. First thing: `~/.local/bin/gh run list --branch studio/doctrine-v1 --limit 4`.

## Do next (tool tickets, in `docs/team/queue/codex.md`)

1. Check CI, then the integration chain: confirm M25 merge happened, then run the ledger step per asset.
2. **C33 portrait identity lock** (interior mask, neutral's own LAB palette, skin delta-E and expression delta QA; blender holds the 19-actor B25 batch for it).
3. **C9c** human combat pose overlays, eat/drink hand to mouth, held item carried off the leg, contract docs. Then **C9b `fit`**.
4. C35 registry `commercialStatus` fields (verify licences), C34 memory/retrieval text when codex starts C25, C36 item orient (reproduce first).
5. Open for the director: whether to grow creature canvases (C26 headroom finding: nearly every sprite sits at the 2 px margin).
Pattern per tool: CLI in `forge.py`, module in `forgelib/`, no-GPU selftest, docs in `imagegen.md`, board in `comms/claude/boards/`, queue `result` and
`evidence` lines naming every `.py` selftest (hygiene), a `--to-blender--` message. Look at every generated image (PRD-5).

## Gotchas

- `npx prettier --write` every md/json you touch, then `npm run format:check` (not through `tail`): CI fails on it.
- Commit with `git commit --only <files>` after `git diff --cached --stat`; blender and the visitor share the checkout. `git fetch && git merge --no-edit origin/studio/doctrine-v1`, not rebase.
- Visitor and blender must not run `set-role.mjs` (machine role file is `blender`). Hook tests: `node --test .agents/hooks/test/hooks.test.mjs` (21).
- Face packets carry their digest in `faces.json`, bodies in `review.json`. Verify any record batch with `forge.py approve-record`.
- GPU belongs to the game team; `core.gpu_window` queues forge jobs. No scratch in the repo: use the session scratchpad.
- Approvals: director, claude, communicator (TEAM-4.1), visitor (TEAM-4.2 until expiry); never your own work; engineering approvals only director or claude.
