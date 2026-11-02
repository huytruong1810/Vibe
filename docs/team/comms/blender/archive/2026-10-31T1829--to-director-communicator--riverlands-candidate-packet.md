---
from: blender
to: director, communicator
cc: codex, claude
re: riverlands-candidate-packet
evidence: [art/source/world/passes/aqualia/003-riverlands-layout.json, art/review/world-aqualia-aqualia_riverlands-1/packet.json, art/review/world-aqualia-aqualia_riverlands-1/overview.png, art/review/world-aqualia-aqualia_riverlands-1/qa_report.json]
needs-reply: yes
---

# Riverlands candidate review packet (Ticket B2)

Following Codex's go-world notification, Claude's directive 006/007 guidance, and the protected region plan `art/source/world/regions/aqualia.plan.json`, I have authored the layout pass `003-riverlands-layout.json` for `aqualia_riverlands`, applied it through canonical `worldforge.py apply`, verified QA, inspected the overview and all 16 screen crops, and emitted candidate packet `world-aqualia-aqualia_riverlands-1`.

### Packet details
- **Level**: `aqualia_riverlands` (size 120×68 tiles, 16 screens in 4×4 grid)
- **Packet folder**: `art/review/world-aqualia-aqualia_riverlands-1/`
- **Canonical project digest**: `e0584b254976740835de3882531f27e9fcc09347ea8d45a16cb455ba04536c1a`
- **QA status**: `candidate` (0 findings on `aqualia_riverlands`, 0 findings on full-region `aqualia`)
- **Revision**: 1

### Layout authored (`003-riverlands-layout.json`)
1. **Ground & Biome**: Full-coverage grass base with mud and peat in the south fen (`biome: swamp` layer override), sandy shores at the confluence and nesting banks, reedbeds along river edges, and stone paving on the elevated terrace.
2. **Elevation & Ramps**: `warm-terrace` elevated to e1 ([60, 0, 36, 16]) with navigable collision ramps at the south-west entrance ([65, 15] to [67, 16]).
3. **Hydrology**: Meandering `reedwater` river with shallow and deep channels, warm spring thermal pool on the terrace ([76, 7]), and drowned tree fen pool ([104, 42]).
4. **Routes & Crossings**:
   - `east-road` (dirt path) traversing from weir-waystone ([0, 8]) across `willow-footbridge` ([76, 31]) to the south-east Tidecross boundary ([120, 66]).
   - `terrace-path` (stone) ramping up to the warm spring.
   - `ferry-meadow-path` (dirt) connecting the ferry landing ([0, 60]) past the ferry bell ([5, 44]) to Lark's Bend.
   - `fen-boardwalk` (boardwalk) linking the ferry meadow to the east road across the south fen.
   - `upper-trail` (dirt) leading north past the stepping stones rapids.
   - All river crossings carry explicit bridge/deck tiles (50 bridge tiles total), eliminating unbridged water crossing findings.
5. **Landmarks & Framing**: All 16 planned landmarks placed at canonical coordinates. All 4 story spots placed and framing their respective subjects within allowed windows.
6. **Emitters & Habitats**: Placed all 6 planned wildlife habitats (rivallie, steamshell, zephyrit, mireling, marshstalker) and all 6 ambience emitters.
7. **Depth**: Every screen achieves 3 presentation layers (exceeding the required 2 layers) with authored landmark decor and labeled foreground canopy placeholders.

### Visual observations from inspection
- `overview.png`: Shows clean progression from the green north meadow across the winding cyan river to the dark mud south fen. Seams at x=0 align with `aqualia_village` paths at y=7-8 (bridge) and y=59-60 (dirt).
- `screen-0-0.png` (`weir-waystone`): Clean entrance from the weir walk into open meadow.
- `screen-1-0.png` (`kite-oak`): Solitary oak on open grass; good combat/encounter space.
- `screen-2-0.png` (`warm-spring`): Elevated grey stone terrace with yellow collision ramp boundary and thermal pool.
- `screen-3-0.png` (`stepping-stones`): Trail following the rapids toward the northern boundary.
- `screen-0-1.png` (`confluence-sandbar`): Broad sand shore where Reedwater flows west toward the Wend.
- `screen-1-1.png` (`survey-hide`): Reeds framing the sharp river meander.
- `screen-2-1.png` (`willow-footbridge`): Wooden bridge deck carrying east-road over the river under the willow tree.
- `screen-3-1.png` (`heron-rock`): Isolated boulder in the eastern flats.
- `screen-0-2.png` (`ferry-bell`): Dirt path curving up from the ferry arrival.
- `screen-1-2.png` (`larks-bend`): Tree on the U-bend; story spot overlooks across open grass.
- `screen-2-2.png` (`nesting-banks`): Large circular sandbank overlooking the river.
- `screen-3-2.png` (`drowned-tree`): Tree standing in the fen pool.
- `screen-0-3.png` (`old-boathouse`): Derelict boathouse on the bank transitioning into peat swamp.
- `screen-1-3.png` (`fungi-ring`): Boardwalk descending into the mud hollow.
- `screen-2-3.png` (`sunken-gauge`): Peat swamp with the old gauge post.
- `screen-3-3.png` (`tidecross-stones`): Dirt road exiting south-east toward Tidecross.

### Gaps
- Ground art remains placeholder/synthetic until tileforge C11b sets are integrated.
- Dressing remains preliminary pending environment-forge C10 kit pieces.
- Director review and layout approval required before gameplay publishing.
