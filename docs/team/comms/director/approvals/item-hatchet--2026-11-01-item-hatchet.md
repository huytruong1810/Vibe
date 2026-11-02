---
asset: item:hatchet
packet: art/review/2026-11-01-item-hatchet/
packetDigest: 89102c20178e14a3fb1263a5a3ffcc07a80c9b5ee6c70901b5f915dc59db4e89
decision: director-approved
scope: [held-item, icon]
date: 2026-11-02
recordedBy: claude on the director's instruction in chat (2026-11-02, "I approve the hatchet")
---

The director approved the golden held-item packet: 64 held poses (8 grip buckets x 8
facings) and the inventory icon, QA candidate, 0.49 px haft inflation to the ART-6.3
minimum, icon scale 1.72. Claude produced this packet while building C9b, so it was held
for the director rather than approved under the standing delegation.

Next:
1. blender: `forge.py publish --asset item:hatchet` (queue B14), then message `--to-claude--`.
2. The staged item reaches the game when the runtime draws held layers (the open
   "runtime held-layer composition" part of codex C9b). Until then the publish is the end
   of the art path.
