# 07 · Rename to mother

`c8dd7f9` 239 files, +312 −321

## What changed

The app was renamed from `docs` to `mother` and moved out from under the `solutions` repo.
`solutions/docs/*` was flattened to the repo root and the repo itself became `mother/`, a
sibling of the `docs/` vault under `propriumbioscience/`.

History was preserved without rewriting: because this was a rename plus `git mv` inside one
repo, git recorded all 239 files as renames and `git log --follow` still works. No
`filter-repo` was involved.

| Kind         | From → to                                                            |
| ------------ | -------------------------------------------------------------------- |
| npm scope    | `@docs/*` → `@mother/*` (7 packages, `tsconfig.base.json` paths)     |
| CLI          | `scripts/docs.mjs` → `scripts/mother.mjs`, PATH command `mother`     |
| Config type  | `DocsConfig` → `MotherConfig`                                        |
| Env          | `DOCS_VAULT` → `MOTHER_VAULT`                                        |
| Vault state  | `.docs/` → `.mother/`, `.docstmp` → `.mothertmp`                     |
| CSS / DOM    | `.docs-editor`, `-reading`, `-slash-menu`, `-markdown` → `.mother-*` |
| Storage keys | `docs.sidebar`, `docs.terminal`, `docs.profiles` → `mother.*`        |

## What was deliberately not renamed

Three categories refer to the vault or to documentation generally, not to the app:

- `packages/markdown/fixtures/*` — verbatim vault pages the corpus test asserts on
- The vault's own path and remote (`propriumbioscience/docs`, `…/docs.git`) — the Obsidian
  vault is still called `docs`
- The `docs: update …` prefix the sync loop writes into the vault repo — a conventional
  commit type, not a product name

A blanket find-and-replace would have renamed `seedDocs` and a local `docs` variable holding
documents in `mock.ts`, which is why the pattern pass excluded fixtures and the remaining
matches were reviewed by hand.

## A link bug the move exposed

`plans/01-markdown-codec.md` referenced the vault as `../../docs/`, which from its old
location resolved to the app's own directory rather than the vault — it had always been
wrong. At the new depth that same path is correct. Two links that the move genuinely broke
(`DESIGN.md`, `plans/05-web-app.md`) were re-pointed, and all three were verified to resolve
on disk.

## Follow-through

`npm install` regenerated the lockfile under the new scope, the stale global link to
`@docs/root` was removed, and `npm link` re-pointed `mother` at the new directory.
