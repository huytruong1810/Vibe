---
from: visitor
to: visitor
date: 2026-11-05T05:15:00Z
subject: Argon Session 2 Handoff — Engineering Lane (C33, C34, C3g, C17) + Acting-Director Review (V3, V5, V6, V7)
---

# Argon (`visitor`) Session 2 Handoff (`2026-11-05T05:15Z`)

## 1. Role, Authority, and Expanded Engineering Lane (`TEAM-4.2`, `e285fe4b`)

- **Identity**: `visitor` (Gemini 4 Argon on Machine A, running with `HEARTHWILD_ROLE=visitor`; **never** run `set-role.mjs` because `.agents/state/role` belongs to `blender`).
- **Dual Mandate until `2026-11-11T00:00Z`**:
  1. **Acting Director (`TEAM-4.2`, Directive 017)**: Review and decide art/audio packets (`docs/team/comms/director/approvals/*.md`) via `uv run --project art/source/forge python art/source/forge/forge.py approve-record`, triage `docs/team/queue/{blender,communicator,visitor}.md`, and maintain `docs/team/status-board.md`.
  2. **Engineer beside Codex & Claude (`TEAM-4.2`, commit `e285fe4b`, `2026-11-05T0625--to-visitor--engineering-lane-granted.md`)**:
     - **Allowed Engineering Writes**: `src/**`, `scripts/**`, `tests/**`, `docs/engineering/**`, `docs/operations/**`, `art/source/forge/forge.py`, `art/source/forge/forgelib/**`, `art/source/forge/tools/**`, `art/source/forge/pyproject.toml`.
     - **Forbidden Writes**: `docs/doctrine/**`, `.agents/hooks/**`, `art/source/forge/spec/**`, `docs/team/briefs/**`, `.github/**`, art sources (`art/source/{references,masters,ui,tiles,blender,recipes,exports,staging}/**`, `art/source/forge/models.json`), `art/source/manifest.json`, and other members' comms folders.
- **5 Mandatory Engineering Laws (`visitor.md` & `2026-11-05T0625`)**:
  1. **Claim first**: Set `status: in-progress (visitor)` on the ticket in `docs/team/queue/codex.md` and push that commit **before** editing any code.
  2. **Test first**: Write a failing unit test or `*_selftest.py` first, then implement the fix.
  3. **Green checks before every push**: Run `npm run check` (plus `uv run --project art/source/forge python art/source/forge/forgelib/<name>_selftest.py` for forge code), `npx prettier --write <touched-files>`, `npm run check:hygiene`, and `npm run format:check`.
  4. **Safe multi-agent commits on Machine A**: Run `git fetch && git merge --no-edit origin/studio/doctrine-v1` before each commit, verify `git status --short` has no uncommitted edits from `blender`/`claude` in your target files, and commit with `git commit --only <your-files>`.
  5. **Conflict-of-interest rule (`TEAM-4.2` rule 5)**: Never approve your own code, and **never record `director-approved` on art packets produced by code you engineered** (for example, once you implement `C33` in `forgelib/portrait.py`, `communicator` or `claude` decides `B25` portrait packets).

---

## 2. What Was Completed in Session 1 (`7b2e0344`, `4d175582`, `91699d7e`) + Claude's Latest Commits (`e285fe4b`, `657a440b`)

1. **Art Packet Decisions (`7b2e0344`, `4d175582`)**:
   - `B23` 17 inventory icons (`icons-items--2026-11-04-icons-items-1.md`): `director-approved`.
   - `B28` `steamshell` 180° yaw fix (`steamshell--2026-11-05-steamshell.md`): `director-approved` (staged at `art/source/staging/blender/steamshell.json`).
   - `B29` initial 8 creature face packets: 3 `director-approved` (`rivallie`, `bramblefang`, `mireling`), 5 `changes-requested` (`steamshell`, `ignicap`, `zephyrit`, `cindermoth`, `marshstalker`).
   - `B20` 9 C26 readability re-bakes (`2026-11-05-*`):
     - **7 `director-approved`** (`rivallie`, `bramblefang`, `marshstalker`, `mireling`, `item:hatchet`, `npc:oren`, `npc:reed`) with the 7 replaced records marked `decision: superseded` (`superseded-by:`).
     - **2 `changes-requested`** (`item:copper-sword`, `item:shortbow`), keeping their `2026-11-04` approvals active and staged.
2. **Claude's Latest Commits on `studio/doctrine-v1` (`e285fe4b`, `657a440b`)**:
   - `e285fe4b`: Granted `visitor` the engineering lane in `.agents/hooks/lib.mjs`, `docs/doctrine/10-team-charter.md`, and `docs/team/briefs/visitor.md`.
   - `657a440b`: Completed **`C36`** (`orient.inflate: "thin"` in `art/source/forge/blender/item_orient.py` and `recipes/item-{copper-sword,shortbow}.json`), unblocking `blender` to re-render `item:copper-sword` and `item:shortbow`!
3. **Leave `art/source/forge/forgelib/faces.py` to Codex & Claude**:
   - Per `2026-11-05T0625`, Codex (`5655aa23`) and Claude (`6e283fb9`) are reconciling the two versions of `forgelib/faces.py` during Codex's merge of `studio/doctrine-v1` into `eng/hd-presentation`. Do **not** edit `forgelib/faces.py`.

---

## 3. Exact Execution Order for Session 2 (`V8` (`C33`) → `V9` (`C34`) → `V10` (`C35`) → `V11` (`C3g`) → `V12` (`C17`/`C32`) + `V5`/`V6`/`V3` Reviews)

Claude is now at rest after committing `e285fe4b` and `657a440b` (`C36`). Director Huy handed `C33`, `C34`, and `C35` (alongside `C3g`, `C32-worldforge`, and `C17` tests) to `visitor`. **`C33` is already claimed (`status: in-progress (visitor)`) and pushed in `docs/team/queue/codex.md`**, so you can start writing the failing test in `portrait_selftest.py` immediately on startup!

### Step 1: `V8` / `C33` — Portrait Identity Lock in `art/source/forge/forgelib/portrait.py` (Top Priority, Unblocks `B25`)

1. Read `docs/team/briefs/visitor.md`, `art/source/forge/forgelib/portrait.py`, and `art/source/forge/forgelib/portrait_selftest.py`. (`C33` is already marked `status: in-progress (visitor)` in `docs/team/queue/codex.md`).
2. In `art/source/forge/forgelib/portrait_selftest.py`, write failing GPU-free synthetic unit tests verifying:
   - **Feathered interior face mask**: Compositing an img2img emotion edit over the `neutral` portrait preserves exact `neutral` pixels outside the interior facial mask (hair, clothing, silhouette, background, and the 2-px border).
   - **Neutral-locked LAB palette quantization**: Quantizes the edited interior against the `neutral` portrait's own LAB palette colors plus outline and eye-highlight tokens (rather than all 64 doctrine colors), preventing orange/peach skin-tone drift.
   - **QA checks (`skinChroma` & `expressionDelta`)**:
     - `skinChroma`: Mean LAB skin delta-E between `neutral` and each expression is `<= 2.5` (hard fail when `> 2.5`).
     - `expressionDelta`: At least `3.5%` of pixels inside the eye+brow+mouth mask region differ from `neutral` (and pairwise between `thoughtful`, `concerned`, and `sad`) so micro-expressions do not collapse at 96×96 px.
3. Implement those three mechanisms in `art/source/forge/forgelib/portrait.py`.
4. Run:
   ```bash
   uv run --project art/source/forge python art/source/forge/forgelib/portrait_selftest.py
   npm run check:hygiene
   npm run format:check
   ```
5. Update `docs/team/queue/codex.md` (`C33` -> `status: candidate (visitor)`) and `docs/team/queue/blender.md` (`B25` -> unblocked for all 19 actors), commit with `git commit --only`, and push. *(Note: `communicator` decides `B25` packets once `C33` is yours per `TEAM-4.2` rule 5).*

### Step 2: `V9` / `C34` — Fixed-Domain Hybrid Retrieval & Commitment Pinning (`docs/engineering/memory-and-context.md` §3.3)

1. Claim `C34` in `docs/team/queue/codex.md` (`status: in-progress (visitor)`) and push first.
2. Update `docs/engineering/memory-and-context.md` §3.3 per Proposal `005` (`docs/team/proposals/005-villager-model-tiers-and-eval-gate.md`):
   - **Stage 1 (Deterministic Commitment & Relationship Pinning, up to 4 slots)**: Always include active `commitment` and `relationship` records for the current interlocutor (or named entities) in both prompt retrieval and session-end `ADD/UPDATE/INVALIDATE` extraction.
   - **Stage 2 (Fixed-Domain Hybrid Scoring, remaining slots up to 8 total)**:
     $$\text{score}(m) = 0.35 \cdot \text{Recency}(m) + 0.35 \cdot \text{Importance}(m) + 0.65 \cdot \text{Relevance}(m)$$
     with $\text{Recency}(m) = 0.995^{\max(0, \text{hoursSince}(m.\text{createdAtTick}))}$ (passive retrieval reads do not reset `createdAtTick`), $\text{Importance}(m) = m.\text{importance}/10$, and $\text{Relevance}(m) = \max(0, (\cos(\mathbf{q}, \mathbf{m}) - 0.30)/0.70)$.
   - Document the 5-metric `npm run test:villagers` evaluation gate (`M1` Action-Prose Fidelity, `M2` Multi-Session & Superseded-Commitment Recall, `M3` In-Character Boundary & Anti-Sycophancy, `M4` Persona Lexical Distinctness, `M5` Warm Latency P95).
3. Once Codex's branch merge lands on `studio/doctrine-v1`, add unit tests in `tests/agents.test.ts` and implement the retrieval/extraction update in `src/domain/agents.ts` + `npm run test:villagers`.

### Step 3: `V10` / `C35` — Commercial Status Enforcement in `forge.py doctor` (`forgelib/core.py` & `forge.py`)

1. Claim `C35` in `docs/team/queue/codex.md` (`status: in-progress (visitor)`) and push first.
2. Write a failing selftest in `art/source/forge/forgelib/` verifying that `forge.py doctor` validates and prints `commercialStatus` (`apache-2.0`, `mit`, `commercial-licensed`, `dev-only-noncommercial`, `unverified`), `territoryRestrictions`, `licenseName`, and `licenseUrl` for every model entry (storing the defaults in `forgelib/core.py` so `art/source/forge/models.json` does not need to be edited outside `LANES.visitor`).
3. Implement in `art/source/forge/forgelib/core.py` and `art/source/forge/forge.py`, and document the GGUF SHA256 digests in `docs/operations/operations.md` (Proposal `006`).

### Step 4: `V11` / `C3g` Follow-ups & `V12` / `C17` + `C32-worldforge`

1. Once Codex merges `eng/hd-presentation` back to `studio/doctrine-v1`:
   - Claim `C3g` follow-up in `docs/team/queue/codex.md` (`status: in-progress (visitor)`), write failing tests in `tests/assets-v2.test.ts`, and implement alpha bounding-box sprite trimming (`{ trimX, trimY, trimW, trimH, sourceW, sourceH }`), content-hash frame deduplication, and `turntable`/`ExpressionSheet` review-clip exclusion in `scripts/assets-build.ts` + pivot offset reconstruction in `src/presentation/renderer.ts`.
   - Claim and implement the delegated `C17` artifact item-class tests (`tests/`) and `C32` `worldforge compare` tooling (`2026-11-05T0625`).

### Step 4: Interleaved Acting-Director Reviews (`V5`, `V6`, `V3`, `V7`)

- Whenever `blender` posts new packets in `docs/team/comms/blender/` (`B29` creature faces + re-bound `rivallie`/`bramblefang`/`mireling`/`npc:oren`/`npc:reed` faces, or `B20` `item:copper-sword` and `item:shortbow` re-baked with `657a440b`):
  1. Inspect `contact.png` (and `registered.png` for faces) at 1× (`PRD-5`).
  2. Run `forge.py approve-record` (superseding the older record with `superseded-by:` when approving a replacement packet).
  3. Verify `uv run --project art/source/forge python art/source/forge/forge.py approve-record`, `npm run check:hygiene`, and `npm run format:check` before pushing.

---

## 4. Recommended Prompt to Start the Fresh Session

Copy-paste this into the new Argon (`visitor`) session:

> Please read `docs/team/briefs/visitor.md`, `docs/team/comms/visitor/2026-11-05T0515--to-visitor--argon-session-2-handoff.md`, `docs/team/comms/claude/2026-11-05T0625--to-visitor--engineering-lane-granted.md`, and `docs/team/queue/visitor.md`. Take the top open engineering ticket (`V8` / `C33` in `forgelib/portrait.py` -> `V9` / `C34` -> `V10` / `C3g` -> `V11`) while handling incoming acting-director art reviews (`V5`, `V6`, `V3`, `V7`).
