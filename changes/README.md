# Changes

What was built, in the order it was built, reconstructed from the git history. One file per
chunk of work; each names the commits it covers so the diff is one `git show` away.

Chunks 10-15 shipped together in `d4ca390`: they were built in sequence but committed at
once, and the edits interleave through the same files, so there was no honest way to split
them after the fact.

This is a record of _what shipped and why_, not a spec — `plans/` holds intent, and the
code holds the truth. Where the two disagree, the code wins and the entry
here should be corrected.

| #                                      | Chunk                               | Commits                                 |
| -------------------------------------- | ----------------------------------- | --------------------------------------- |
| [01](01-foundation-and-contracts.md)   | Workspace, contracts, plans         | `96b8958` `859073e`                     |
| [02](02-markdown-codec.md)             | Markdown codec                      | `ff172ee`                               |
| [03](03-collab-session.md)             | Collaborative session               | `e47a9d7` `ad704a2`                     |
| [04](04-backend.md)                    | Backend                             | `5f277ee`                               |
| [05](05-web-app.md)                    | Web app and integration             | `84ba81f` `abcc373` `7007b64` `32ae15a` |
| [06](06-editor-rewrite.md)             | CodeMirror rewrite, terminal        | `c8d878e`                               |
| [07](07-rename-to-mother.md)           | Rename to mother                    | `c8dd7f9`                               |
| [08](08-vault-home.md)                 | Vault home at `~/.mother`           | `6401a89`                               |
| [09](09-ui-pass.md)                    | UI pass and terminal fix            | `607cd09`                               |
| [10](10-menus-and-modals.md)           | Menus, modals, add a profile        | `d4ca390`                               |
| [11](11-profiles-on-disk.md)           | Profiles on disk, no default        | `d4ca390`                               |
| [12](12-first-run-polish.md)           | First run without the flash         | `d4ca390`                               |
| [13](13-tabs-and-profile-options.md)   | Tabs, delete a profile              | `d4ca390`                               |
| [14](14-projects-and-profiles.md)      | Projects, profiles with keys        | `d4ca390`                               |
| [15](15-open-documents-follow-disk.md) | Documents follow disk, terminal fix | `d4ca390`                               |
| [16](16-open-source-scrub.md)          | Open-source scrub                   | _uncommitted_                           |

## Where it landed

Everything runs on one laptop: a Hono backend on `127.0.0.1:3001` that is the only thing
touching disk, and a Next.js site on `127.0.0.1:3000`. Markdown files in a git working tree
are the source of truth.

```
apps/server    hono, vault, git sync, config, backlinks, relay, pty     167 tests
apps/web       next app, shell, tabs, tree, palette, settings, terminal 124 tests
packages/markdown   markdown ⇄ document codec                           95 tests
packages/editor     codemirror editor, live preview, math               27 tests
packages/collab     yjs session, divergence, disk flush                 19 tests
packages/shared     types every side shares                             —
```

432 tests across 35 files. `npm run check` runs the typechecker and the suite;
`npm run build` also builds the site.

## Still open

- Live collaboration is built and tested as a package but is **not wired into the app** —
  editing is local-only.
- `apps/server/CONTRACT-REQUEST.md` and `apps/web/CONTRACT-REQUEST.md` record contract gaps
  raised during the build. The config-location ambiguity in the server's §5 was resolved by
  [08](08-vault-home.md); the `repoId` question is still open.
