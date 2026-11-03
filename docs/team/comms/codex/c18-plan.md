# C18 implementation plan

Prepared before C18 runtime edits. Binding inputs: [ticket](../../queue/codex.md#c18--the-written-word-book-screen-villager-reading-and-writing),
[artifact specification](../../../engineering/authored-artifacts.md) §§4–5, 8.1, 11,
and [AGT-7/8](../../../doctrine/11-living-minds.md). C13 is a separate change.

1. Establish a player book slice first. Add strict write/page/seal commands to the
   existing worker command path. Validate carried slot, kind, authorship, sealing and
   all existing caps before mutation. Allocate the artifact only on the first valid
   edit. Reject invalid edits atomically. Keep frames metadata-only and use the existing
   on-demand content query, with authoritative player reach validation.
2. Build a UI-kit book modal reached from inventory Use and displayed-item Inspect.
   Render one note or a two-page book spread; edit one page, with title, line/character
   counters, 500 ms debounce and serialized flush on page changes/close/seal. Preserve
   draft text on rejected saves. Seal has confirmation. Support focus return, arrows,
   Home/End and gamepad shoulders. Prove a three-page write/seal/reopen journey before
   adding NPC behavior; measure opening a full 48-page book and render only its spread.
3. Add a bounded literacy domain service. It owns NPC-carried artifact item references,
   durable daily read/note/page quotas and continuation ranges. Keep NPC combat equipment
   separate. Reach is NPC hands, nearby displayed text, their home displays, or the
   dialogue partner's carried text during that conversation. Notes given to the player
   require range and inventory room; otherwise reject without consuming a quota.
4. Add strict READ_TEXT/WRITE_NOTE/WRITE_PAGE proposals. Exactly one matching range
   kind is required; reject excessive spans and invalid starts, clamp only the end.
   Writing sanitizes URLs, markup and controls and validates named content references
   against canonical NPC/species/place/item names. Prose never performs another action.
   WRITE_PAGE only appends to an unsealed book authored by that NPC and held/at home.
5. Implement the second reading job. An accepted READ_TEXT replaces other effects of
   that response. Snapshot artifact identity/revision and the actual excerpt range;
   bound excerpt to 600 estimated tokens and complete prompt to 2000, cutting whole
   lines with an explicit unread count. JSON-quote data and use a strict response
   schema with no action field. Revalidate session/NPC/artifact revision/reach before
   applying a sourced reading memory or dialogue line. Continuing requires another
   validated proposal and consumes another read quota. New dialogue preempts reading;
   canceled/stale work never writes memory. Preserve C24 compaction and C25 extraction.
6. Add metadata-only readables (nearest five, combined 120-token cap) and continuation
   facts, trimmed before other prompt facts. Permit only literacy proposals as optional
   background-plan actions. Motivate Lark's diary and Neris's tide notices in profiles;
   Neris is the existing ferry keeper filling the ticket's dock-master role. Supply a
   blank NPC-authored diary in Lark's home display; do not script model calls or prose.
7. Introduce save v9 only for the new literacy state, preserving every v1–v8 migration,
   C13 mind/motion state, C14 director state and C25 memories. Extend artifact reference
   validation to NPC hands; extend reading-memory provenance with artifact ID, revision
   and pages/lines while retaining old records. Validate quotas/references/ranges on load.
8. Validate command atomicity, caps, ownership/seals, reach, durable quotas, grounding,
   stale results and prompt injection. Property-test arbitrary capped text against the
   2000-token reading bound. Test scheduling/preemption and save continuation. Capture
   and inspect the 1080p spread; run full four-worker checks and relevant regressions.
   Extend test:ollama with reading latency and request Blender's machine-A measurement;
   publish machine-B results and the external AGT-7 gap without claiming live inference.

Delivery is a candidate with Changed / Evidence / Gaps, a current handoff and separate
C18 commit. No painting-provider work, training, art production or approval is included.
