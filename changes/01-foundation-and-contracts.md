# 01 · Workspace, contracts, plans

`96b8958` design, plans, agent context · `859073e` workspace and scaffolding

## What landed

An npm workspace over `apps/*` and `packages/*`, TypeScript strict throughout, with
`@mother/*` (then `@docs/*`) resolving through a `paths` entry in `tsconfig.base.json` so
`import type { VaultEntry } from '@mother/shared'` works from anywhere without a build step.

`packages/shared` came first and holds nothing but types — the vocabulary both sides agree
on before either exists:

| File          | Owns                                                    |
| ------------- | ------------------------------------------------------- |
| `vault.ts`    | `VaultPath`, `VaultEntry`, `VaultEvent`, `VaultSummary` |
| `api.ts`      | `ApiRoutes` — every HTTP route, keyed `METHOD path`     |
| `config.ts`   | `MotherConfig`, `GitAuthor`                             |
| `collab.ts`   | `RoomId`, `Peer`, `SessionState`, `DivergenceReport`    |
| `doc.ts`      | the document model the codec reads and writes           |
| `sync.ts`     | `SyncStatus`                                            |
| `terminal.ts` | the pty message pair                                    |
| `math.ts`     | math span types                                         |

## Why `ApiRoutes` is shaped that way

It is one interface mapping `'PUT /api/doc'` to a `{ request, response }` pair. The server
builds its handler table from `ApiRoute` and the web client's `request()` is generic over
the same key, so a route added on one side and not the other is a type error rather than a
404 found at runtime. The mock client in `apps/web/src/api/mock.ts` is typed the same way —
it cannot drift from the real server without failing to compile.

This is why the vault-home work in [08](08-vault-home.md) needed no integration debugging:
adding three routes to `ApiRoutes` immediately broke the mock until it implemented them.

## Also here

`plans/` — six implementation plans partitioned so they could be built in parallel without
collisions, plus a seventh added later for editors and viewers. `.agents/` — shared agent
context, with `LESSONS.md` reserved for mistakes made more than once.
