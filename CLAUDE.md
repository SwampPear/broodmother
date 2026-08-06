# broodmother — agent resources

A Mac app for reading and writing a folder of markdown. Everything runs on one laptop: no deployment, no CI, no auth.

## Read first

|                      |                                                    |
| -------------------- | -------------------------------------------------- |
| `.agents/STYLE.md`   | how code here is written — binding                 |
| `.agents/implement/` | the loop from a request to a finished change       |
| `.agents/REVIEW.md`  | how code here is reviewed                          |
| `.agents/LESSONS.md` | mistakes made more than once; read before starting |
| `plans/`             | the plans each package was built from              |
| `README.md`          | the app as a user meets it                         |

`.agents/`, `.claude/` and this file are gitignored — local context, not shipped.

## Workspace

npm workspaces, TypeScript 5.9, no build step: the shared code sits in a top-level `src/`
reached as `@/*`, and the two apps transpile it.

|                |                                                                          |
| -------------- | ------------------------------------------------------------------------ |
| `src/types`    | types and interfaces only: api, config, vault, project, tree, doc, dream |
| `src/core`     | paths, media, git defaults, tree roots, the notebook codec               |
| `src/doc`      | the markdown subset every package agrees on, and the inline-math rule    |
| `src/dream`    | the dream parser, serializer, run order and starters                     |
| `src/markdown` | markdown ↔ `DocNode` codec and markdown → HTML; markdown-it 14           |
| `src/editor`   | Monaco 0.56, live preview, editing commands                              |
| `apps/server`  | Hono 4: vault, project, git, sync, terminals                             |
| `apps/app`     | Next.js 16 and React 19, plus the Electron 43 shell in `electron/`       |

## Commands

From the root.

|                     |                                                          |
| ------------------- | -------------------------------------------------------- |
| `npm run check`     | typecheck and tests — the one to run before saying done  |
| `npm run localhost` | server and site together at 127.0.0.1:6767, hot reloaded |
| `npm run app`       | build everything and launch the Mac app                  |
| `npm run typecheck` | `tsc --noEmit` over the workspace                        |
| `npm test`          | vitest 4, both apps                                      |
| `npm run format`    | prettier                                                 |
| `npm run build`     | typecheck, then build the site                           |

`npm test -w @broodmother/app` runs one workspace.

## Boundaries

**Always** run `npm run check` before calling a change done, and `npm run format` after
writing.

**Ask first** before adding a dependency, changing a package's public surface, or changing
the on-disk layout under `~/.broodmother`.

**Never** commit or push unless asked, and never point a run at a real vault — set
`BROODMOTHER_HOME` to a throwaway directory instead.
