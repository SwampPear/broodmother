# 03 · Collaborative session

`e47a9d7` yjs lifecycle, seed-vs-adopt, divergence, disk flush ·
`ad704a2` explicit null frontmatter, observable watcher readiness

## What landed

`packages/collab` — the live-editing half, built and tested standalone against a fake
transport. Public surface:

```ts
createSession(options) // the lifecycle
readDoc / writeDoc / DOC_ATTRS / FRAGMENT // the Yjs document shape
```

It depends on a `Transport`, a `DocIo`, and a `MarkdownCodec` passed in rather than on a
socket or the filesystem, which is what makes it testable without a server.

## Seed vs adopt

The hard case is the second person opening a document. Whoever arrives first **seeds** the
room from their copy on disk; everyone after **adopts** what the room already has. Getting
this backwards means the last joiner silently overwrites the shared state with a stale file.

## Divergence is surfaced, never merged

If a joiner's file on disk differs from room state, the session does not attempt a merge and
does not silently pick a side. It raises a `DivergenceReport` carrying both texts and moves
to the `divergent` state; the user resolves it with `adoptRoom` or `keepLocal`. A CRDT can
merge concurrent _edits_, but two files that diverged offline are not concurrent edits — the
convergent result would be a plausible document nobody wrote.

`ad704a2` extended this to frontmatter: an explicit `null` is carried through rather than
being dropped, because "absent" and "present but empty" are different documents and
collapsing them makes a round-trip lossy.

## Status

**Not wired into the app.** The package works and is tested; `apps/web` still edits
local-only. The relay exists server-side (`apps/server/src/relay.ts`) and `state.tsx` has
`share()` and `resolveDivergence()` plumbed, but the editor does not yet bind a Yjs document.
