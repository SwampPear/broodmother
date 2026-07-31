# Implementation plans

Wave 1 is six plans: one runs first, the other five run in parallel. Wave 2 is
[06](06-editors-and-viewers.md), which starts once wave 1 is wired together. Wave 3 is
[07](07-p2p-collab.md), which revives the collab session 03 planned and never built.

Waves 1 and 2 target **one laptop**. No deployment, no CI, no Docker, no auth. Done means
`npm run dev` works on your machine. Wave 3 adds the one exception and names it as one: a
relay, which is a process on a network so that two laptops can reach each other.

| #   | Plan                                           | Owns                                                      | Wave         |
| --- | ---------------------------------------------- | --------------------------------------------------------- | ------------ |
| 00  | [Foundation](00-foundation.md)                 | root config, `packages/shared/`, scaffolding, deps        | first, alone |
| 01  | [Markdown codec](01-markdown-codec.md)         | `packages/markdown/`                                      | parallel     |
| 02  | [Editor](02-editor.md)                         | `packages/editor/`                                        | parallel     |
| 03  | [Collab session](03-collab-session.md)         | `packages/collab/`                                        | parallel     |
| 04  | [Backend](04-backend.md)                       | `apps/server/`                                            | parallel     |
| 05  | [Web app](05-web-app.md)                       | `apps/web/`                                               | parallel     |
| 06  | [Editors & viewers](06-editors-and-viewers.md) | viewer registry, `packages/editor/` rebuilt on CodeMirror | wave 2       |
| 07  | [Live collab over a relay](07-p2p-collab.md)   | `packages/collab/`, `apps/relay/`                         | wave 3       |
| 08  | [Git credentials](08-git-credentials.md)       | ssh, the access check, key generation                     | built        |
| 09  | [Active scope](09-active-scope.md)             | one root the tabs, terminals and branches all follow      | planned      |

## Rules

1. **Edit only your owned paths.** If the work seems to need someone else's file, it
   doesn't — you're missing a type in `packages/shared`.
2. **`packages/shared` is frozen after plan 00.** Need something added? Ask, and use a
   local `// TODO` type meanwhile. Plan 06 opens it once, in a single commit before its
   own parts begin.
3. **Never run `npm install`.** Plan 00 installs everything; a second install rewrites the
   lockfile under everyone else.
4. **Your tests pass alone**, with no other plan implemented. Take collaborators as
   arguments rather than importing them.

## What got cut

Earlier drafts had eighteen plans. These went away, and are worth naming so they can come
back deliberately rather than by accident: a separate relay service (now a route on the
backend), a theme package, a palette package, a settings-ui package, a testkit package
(each plan writes its own fixtures), a search index (deferred entirely), a link-graph
package (folded into the backend), and a CI/deploy plan (there is no deploy).
