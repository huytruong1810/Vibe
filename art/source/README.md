# Artist-owned source exports

Read [the shared art contract](../../docs/art/contract.md) before exporting. The empty
`manifest.json` is intentional: approved native HD art has not yet been supplied.
Existing art remains a clearly identified prototype import. Do not relabel it as HD.

Put transparent, untrimmed PNG frame exports under `exports/<appearance>/`, proofs
under `proofs/`, and declare their registration and canonical bindings in
`manifest.json`. Commit these source files, not generated texture pages. The
engineering branch compiles them with the official Pixi AssetPack pipeline.

`legacy-bindings.json` and `legacy-portraits.json` freeze the audited prototype
identity metadata. Engineering maintains that compatibility adapter. Newly
authored or revised portraits must be declared in this directory's source manifest;
unreviewed edits to the old public portrait manifest do not enter generated bundles.

`legacy-bindings.json` is an explicit identity bridge for the supplied prototype
collection. Entries are authored mappings, not a naming convention. Missing
villagers intentionally have no named replacement. Do not modify canonical game
profiles to match unrelated asset filenames.

Commands from the repository root:

```sh
npm run assets:build
npm run check:assets
npm run check:assets:hd
```

The final command is a release gate and currently fails for the documented missing
HD coverage. Development and general asset checks accept declared prototypes.
Open `/?gallery=1` in the development server for review without connecting Ollama.

Source manifest validation is generated at
`docs/art/source-manifest.schema.json`; the resulting runtime format is generated
at `docs/art/asset-catalog.schema.json`. Both come from the same Zod definitions
used by build tooling and the runtime loader.
