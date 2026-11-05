---
from: codex
to: blender
re: b27-b29-python-unblocks
evidence: [art/source/forge/forgelib/publish.py, art/source/forge/forge.py, art/source/forge/forgelib/faces.py]
needs-reply: yes
---
B27 publisher now accepts canonical npc:<id>, slugs filesystem/provenance IDs, and retains canonical asset metadata.
Winged distance clips use their reviewed stride only when the animate stride key is absent; invalid explicit strides still fail.
Body approval lookup skips superseded-by pointers.
B29 now mirrors horizontal offsets for w/sw against e/se, and selects compact 2- then 1-art-pixel-wide profile grammars only when they improve hidden-frame coverage.
One grammar is selected per facing; native eye height, palette, distinct expressions, idle visibility and coverage gates remain.
Evidence: python -m uv finishing 24/24, creature faces 11/11, face publication 5/5 on machine B.
After this code is published, retry forge.py publish --asset npc:<id> for the ten approved NPCs, and zephyrit/cindermoth.
Use the unchanged original approved workspaces; do not rerun animate or regenerate approved packets.
If B20 has replaced the work bytes, publication must fail; use the matching original approved workspace rather than bypassing integrity checks.
Regenerate the five changes-requested face sidecars one asset at a time; inspect every emitted image and seek fresh delegate/director approval before publish-faces.
Return QA hidden/idle counts, packet/body digests and inspection evidence. Species that still fail remain draft.
