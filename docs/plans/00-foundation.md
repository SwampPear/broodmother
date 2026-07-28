# 00 — Foundation

**Runs first, alone. The other five are blocked until this lands.**

## Goal

Workspace, shared types, all dependencies, empty package shells — so nobody else has to
touch a shared file.

## Owns

```
package.json   package-lock.json   tsconfig.base.json   .gitignore
packages/shared/**
```

Plus the empty shell (directory, `package.json`, `tsconfig.json`, stub `src/index.ts`) of:
`packages/markdown`, `packages/editor`, `packages/collab`, `apps/server`, `apps/web`.

## Deliverables

1. **npm workspaces** — `apps/*` and `packages/*`. TypeScript strict, `@docs/*` path
   aliases, Vitest at the root.
2. **Scaffolds** — the five shells above, each compiling and empty. For `apps/web`, include
   the Next.js skeleton with all route files (`/`, `/doc/[...path]`, `/settings`) already
   created so nobody adds one later and collides.
3. **All dependencies installed now**, even though nothing imports them yet:
   ```
   next react react-dom hono @hono/node-server ws zod execa chokidar
   @tiptap/core @tiptap/react @tiptap/pm  (+ the extensions the schema needs)
   yjs y-prosemirror y-protocols
   markdown-it prosemirror-markdown prosemirror-model
   typescript vitest tsx concurrently @types/node @types/react @types/ws
   ```
   Anyone running `npm install` later rewrites the lockfile under four other agents.
4. **`packages/shared`** — types only, one file per domain:

   | File | Contents |
   | --- | --- |
   | `vault.ts` | `VaultPath` (POSIX, relative to root), `VaultEntry`, `VaultEvent` |
   | `doc.ts` | `DocNode`, `Mark`, and **`SCHEMA_SPEC`** |
   | `sync.ts` | `SyncState` — `idle \| syncing \| conflict \| error \| offline` |
   | `config.ts` | `DocsConfig` — vault path, remote, branch, sync on/off, relay URL, display name, presence color, git author |
   | `collab.ts` | `RoomId`, `Peer`, `SessionState` — `solo \| connecting \| live \| divergent` |
   | `api.ts` | The web↔server wire: route paths with request/response types, plus the websocket message union |

5. **`SCHEMA_SPEC`** — the exact markdown subset, and the most important thing in this
   plan. Nodes: `doc`, `paragraph`, `text`, `heading` (1–4), `bulletList`, `orderedList`,
   `listItem`, `taskList`, `taskItem`, `codeBlock`, `blockquote`, `table` + row/cell/header,
   `horizontalRule`, `image`. Marks: `bold`, `italic`, `code`, `strike`, `link`,
   `wikiLink`. Nothing else. Plan 01 serializes exactly this set and plan 02 lets the user
   type exactly this set — that pairing is what makes round-tripping lossless, so the list
   lives in one place and this is it.

## Done when

- `npm install && npm test` is green at the root with every package empty.
- `import type { DocNode } from '@docs/shared'` resolves anywhere.
- The other five plans can start without editing a file you own.

## Not this plan

Any implementation. If you're writing logic outside `packages/shared`, it belongs to
someone else.
