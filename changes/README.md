# Changes

What was built, in the order it was built, reconstructed from the git history. One file per
chunk of work; each names the commits it covers so the diff is one `git show` away.

This is a record of _what shipped and why_, not a spec — `DESIGN.md` and `plans/` hold
intent, and the code holds the truth. Where the two disagree, the code wins and the entry
here should be corrected.

| #                                    | Chunk                        | Commits                                 |
| ------------------------------------ | ---------------------------- | --------------------------------------- |
| [01](01-foundation-and-contracts.md) | Workspace, contracts, plans  | `96b8958` `859073e`                     |
| [02](02-markdown-codec.md)           | Markdown codec               | `ff172ee`                               |
| [03](03-collab-session.md)           | Collaborative session        | `e47a9d7` `ad704a2`                     |
| [04](04-backend.md)                  | Backend                      | `5f277ee`                               |
| [05](05-web-app.md)                  | Web app and integration      | `84ba81f` `abcc373` `7007b64` `32ae15a` |
| [06](06-editor-rewrite.md)           | CodeMirror rewrite, terminal | `c8d878e`                               |
| [07](07-rename-to-mother.md)         | Rename to mother             | `c8dd7f9`                               |
| [08](08-vault-home.md)               | Vault home at `~/.mother`    | `6401a89`                               |
| [09](09-ui-pass.md)                  | UI pass and terminal fix     | `607cd09`                               |

## Where it landed

Everything runs on one laptop: a Hono backend on `127.0.0.1:3001` that is the only thing
touching disk, and a Next.js site on `127.0.0.1:3000`. Markdown files in a git working tree
are the source of truth.

```
apps/server    hono, vault, git sync, config, backlinks, relay, pty     152 tests
apps/web       next app, shell, tree, palette, settings, terminal        67 tests
packages/markdown   markdown ⇄ document codec                           276 tests
packages/editor     codemirror editor, live preview, math               22 tests
packages/collab     yjs session, divergence, disk flush                 19 tests
packages/shared     types every side shares                             —
```

536 tests across 30 files. `npm run check` runs the typechecker and the suite;
`npm run build` also builds the site.

## Still open

- Live collaboration is built and tested as a package but is **not wired into the app** —
  editing is local-only.
- `apps/server/CONTRACT-REQUEST.md` and `apps/web/CONTRACT-REQUEST.md` record contract gaps
  raised during the build. The config-location ambiguity in the server's §5 was resolved by
  [08](08-vault-home.md); the `repoId` question is still open.
