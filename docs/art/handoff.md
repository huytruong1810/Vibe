# Copyable art-agent handoff

Engineering draft PR: [#1](https://github.com/huytruong1810/Vibe/pull/1).

> Base `art/hd-aqualia-slice` on **[e57bb92d8f78f3aba81873d6cb58f941992c5bd7](https://github.com/huytruong1810/Vibe/commit/e57bb92d8f78f3aba81873d6cb58f941992c5bd7)** from `eng/hd-presentation`. Use a separate worktree so engineering can continue in its existing checkout. Follow the tracked [art contract](contract.md), clip matrix and [coverage report](coverage.md). Target native 1080p detail: 64-pixel terrain units, approximately 96×144 human frames, and eight authored movement/combat directions. Preserve Hearthwild's portrait anatomy and identity.
>
> First submit an Aqualia target scene plus player and Rivallie pose proofs. The slice also needs correct assets for Neris, Reed, Willa, Oren, Lark, Dara and Finn; do not substitute unrelated character identities. Supply native-resolution exports, anchor metadata and pose previews. Own source art and approved UI views; leave simulation, worker, adapters, renderer and generated catalogs to engineering. Run asset validation and attach gallery captures before requesting integration review. Target your art PR at `eng/hd-presentation` (engineering draft PR [#1](https://github.com/huytruong1810/Vibe/pull/1)).

At the contract commit, run `npm ci`, `npm run assets:build`, `npm run check:assets`,
then `npm run dev` and visit `/gallery.html`. After runtime integration the same
gallery is also available at `/?gallery=1`. The strict `check:assets:hd` gate will
remain red until required native source art is supplied and reviewed.
