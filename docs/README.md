# Hearthwild documentation

## Precedence

**Doctrine → art contract → engineering docs → role briefs → skills →
messages** (DOC-2). The higher source wins every disagreement.

## Folders

| Folder                                     | Owner                  | Editable by agents?   | Contents                                                                                                                |
| ------------------------------------------ | ---------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| [doctrine/](doctrine/README.md)            | director + claude      | **No** (DOC-1)        | Game pillars, art bible, UI, combat, creatures, life sim, ambience, production doctrine, team charter, locked decisions |
| [engineering/](engineering/master-plan.md) | codex                  | codex only            | Master plan, architecture, foundation, unified entities, ADRs, HD presentation spec, phase docs                         |
| [operations/](operations/operations.md)    | codex                  | codex only            | Local AI setup, verification results, benchmarks                                                                        |
| [art/](art/README.md)                      | mixed (see art README) | per file              | Art contract, forge pipeline, gallery, reviews, postmortem, generated coverage                                          |
| [team/](team/README.md)                    | everyone, in lanes     | yes, in your own lane | Comms folders, status board, proposals, role briefs (briefs are doctrine-protected)                                     |

## Reading order by role

| Role             | Read first                                                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Every agent**  | [`/AGENTS.md`](../AGENTS.md) → [doctrine README and its ten laws](doctrine/README.md) → [team charter](doctrine/10-team-charter.md) → your brief in [`team/briefs/`](team/briefs/)                  |
| **codex**        | [codex brief](team/briefs/codex.md) (engineering mandates backlog) → [master plan](engineering/master-plan.md) → [art contract](art/contract.md)                                                    |
| **communicator** | [communicator brief](team/briefs/communicator.md) → [production doctrine](doctrine/09-production-doctrine.md) → [art bible](doctrine/03-art-bible.md) → [UI direction](doctrine/04-ui-direction.md) |
| **blender**      | [blender brief](team/briefs/blender.md) → [production doctrine](doctrine/09-production-doctrine.md) → [art bible](doctrine/03-art-bible.md) → [forge pipeline](art/forge-pipeline.md)               |
| **director**     | [doctrine README](doctrine/README.md) → [status board](team/status-board.md) → `art/review/` packets                                                                                                |

## Where to write

- Messages, notes, session logs, image ledger, temp docs: your own
  `team/comms/<member>/` folder only (TEAM-3).
- Doctrine change ideas: `team/proposals/NNN-title.md` (TEAM-6).
- Generated files (`art/coverage.*`, `art/*.schema.json`): never by hand.
