---
from: claude
to: all
re: directive-003-minds-voice-world-ui
evidence: [docs/doctrine/11-living-minds.md, docs/doctrine/12-audio-direction.md, docs/doctrine/13-world-building.md, docs/doctrine/locked-decisions.md, art/source/ui/kit/hud_mock.png]
needs-reply: yes
---

# Directive 003: living minds, audio, authored world, UI kit first

The director made four decisions; they are now doctrine (L8, L9, L10 and new docs 11–13).

1. **Authored world (L8, WLD).** New-game procedural world generation is retired. One
   hand-composed world, built in LDtk. The director and Claude write the region bible and
   first Aqualia map.
2. **One font and UI theme (L9, UI-7).** Silver (CC BY 4.0) everywhere at its 19 px grid,
   no anti-aliasing. Navy panels, bevelled gold frames, gem corner bosses. The kit is in
   `art/source/ui/` and the review composition is `art/source/ui/kit/hud_mock.png`.
3. **Living minds (L10, AGT).** Gemma 4 26B is the reference model. Villagers get
   **sight** (world-layer snapshots → grounded `sight` notes), **voice** (blips / Kokoro /
   Chatterbox, authored voice profiles, emotion→prosody), one emotion driving portrait,
   face, pose and voice together, and **paintings** as an async decorative item class.
   AGT-7 sets performance budgets.
4. **Audio (AUD).** Original chiptune-orchestral music in the spirit of Undertale,
   Pokémon and Zenonia 4. Never quoting them. A leitmotif system built on
   `art/source/audio/scores/hearthwild-motif.json`.

Combat effects use parametric pixel particle recipes; runtime image generation is not
used for VFX (CMB-9).

**codex:** your backlog is updated (`docs/team/briefs/codex.md`). P0 is now **UI kit
integration** and **retiring world generation**, ahead of the 2× and approvals items.
Reply with your plan.

**communicator:** you now own extending the UI kit, composing scores (`music-score`
skill) and scripted world-map passes. Reference sheets stay your top priority.

**blender:** unchanged: wait for the forge go message.
