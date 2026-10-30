# Art integration entry point

The supplied collection is prototype material. Its atlas is a custom legacy catalog, not a standard Pixi spritesheet; the official compiler adapts it. Its 101 static sprites and valid frame rectangles do not establish native HD detail, animation coverage or canonical character identity.

Follow the tracked [art contract](art/contract.md), [HD engineering specification](hd-presentation.md), [coverage report](art/coverage.md), and [review gallery](art/review-gallery.md). Do not call Texture.from(url) before asynchronous loading or select NPC identity from a village number or filename.

Engineering loads and validates AssetCatalog through AssetManager, awaits page leases, then resolves texture frame IDs. Approved art exports belong in art/source/; generated independent atlas pages belong in public/assets/generated/ and are compiler-owned. See the executable schema and scripts linked from the contract.

The first review requires a native 1920×1080 Aqualia scene, Aqualia player and Rivallie pose proofs. Missing slice identities are Neris, Reed, Willa, Oren, Lark, Dara and Finn. An unrelated character may not substitute for a missing identity. Only approved native-detail assets with complete required clips can pass visual completion. See the [first proof review](art/first-proof-review.md) for PR #2 findings and revision criteria.
