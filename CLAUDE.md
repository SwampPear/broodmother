# broodmother — agent resources

A Mac app for reading and writing a folder of markdown. Everything runs on one laptop: no
deployment, no CI, no auth.

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

npm workspaces, TypeScript 5.9, no build step between packages: each package's `main` is
its `src/index.ts` and the apps transpile it.

|                     |                                                                              |
| ------------------- | ---------------------------------------------------------------------------- |
| `packages/shared`   | types every package agrees on: api, config, vault, project, tree, doc schema |
| `packages/markdown` | markdown ↔ `DocNode` codec and markdown → HTML; markdown-it 14               |
| `packages/editor`   | Monaco 0.56, live preview, editing commands                                  |
| `apps/server`       | Hono 4: vault, project, git, sync, terminals                                 |
| `apps/web`          | Next.js 16, React 19                                                         |
| `apps/desktop`      | Electron 43 shell                                                            |

## Commands

From the root.

|                     |                                                         |
| ------------------- | ------------------------------------------------------- |
| `npm run check`     | typecheck and tests — the one to run before saying done |
| `npm run localhost` | server and web together at 127.0.0.1:6767, hot reloaded |
| `npm run app`       | build everything and launch the Mac app                 |
| `npm run typecheck` | `tsc --noEmit` over the workspace                       |
| `npm test`          | vitest 4, every package                                 |
| `npm run format`    | prettier                                                |
| `npm run build`     | typecheck, then build web                               |

`npm test -w @broodmother/editor` runs one package.

## Boundaries

**Always** run `npm run check` before calling a change done, and `npm run format` after
writing.

**Ask first** before adding a dependency, changing a package's public surface, or changing
the on-disk layout under `~/.broodmother`.

**Never** commit or push unless asked, and never point a run at a real vault — set
`BROODMOTHER_HOME` to a throwaway directory instead.
