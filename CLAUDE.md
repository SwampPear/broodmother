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
reached as `@/*`, and the app transpiles it.

|                |                                                                          |
| -------------- | ------------------------------------------------------------------------ |
| `src/types`    | types and interfaces only: api, config, vault, project, tree, doc, dream |
| `src/core`     | paths, media, git defaults, tree roots, the notebook codec               |
| `src/doc`      | the markdown subset every package agrees on, and the inline-math rule    |
| `src/dream`    | the dream parser, serializer, run order and starters                     |
| `src/markdown` | markdown ↔ `DocNode` codec and markdown → HTML; markdown-it 14           |
| `src/editor`   | Monaco 0.56, live preview, editing commands                              |
| `src/collab`   | live sessions: Yjs, seed vs adopt, the sealed relay transport            |
| `apps/app`     | the whole app, in four folders                                           |
| `apps/relay`   | the one deployable thing: rooms as socket sets, holding no document      |
| `apps/cli`     | `broodmother` — start the app, run a relay, ask a deployed one           |

`apps/app` is one workspace holding the three things that run and the code they share:

|             |                                                                    |
| ----------- | ------------------------------------------------------------------ |
| `app/`      | the site: Next.js 16 routes                                        |
| `server/`   | the backend: Hono 4 — vault, project, git, sync, terminals         |
| `electron/` | the Mac shell: Electron 43, which starts the other two             |
| `src/`      | the React 19 client — `components/`, `hooks/`, `api/`, `state.tsx` |

## Commands

From the root.

|                     |                                                         |
| ------------------- | ------------------------------------------------------- |
| `npm run check`     | typecheck and tests — the one to run before saying done |
| `npm run localhost` | app and relay together; the site is 127.0.0.1:6767      |
| `npm run relay`     | the relay alone, 127.0.0.1:3002                         |
| `npm run app`       | build everything and launch the Mac app                 |
| `npm run typecheck` | `tsc --noEmit` over the workspace                       |
| `npm test`          | vitest 4, every project                                 |
| `npm run format`    | prettier                                                |
| `npm run build`     | typecheck, then build the site                          |

`npm run localhost` and `npm run start` both hand off to `apps/app`, which knows how to
run itself: `npm run server -w @broodmother/app` and `npm run site -w @broodmother/app`
start the two halves alone. Tests are one vitest project per folder — `--project server`,
`--project @broodmother/app`, `--project src`.

## Boundaries

**Always** run `npm run check` before calling a change done, and `npm run format` after
writing.

**Ask first** before adding a dependency, changing a package's public surface, or changing
the on-disk layout under `~/.broodmother`.

**Never** commit or push unless asked, and never point a run at a real vault — set
`BROODMOTHER_HOME` to a throwaway directory instead.
