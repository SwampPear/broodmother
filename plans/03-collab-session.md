# 03 — Collab session

**Parallel.** Owns `packages/collab/**`. Reads `packages/shared/src/collab.ts`, `doc.ts`.

## Goal

The client half of live editing — the feature this project exists for. Yjs document
lifecycle, the seed-versus-adopt decision, presence, and the debounced flush to disk.

## Deliverables

1. **`createSession({ roomId, transport, codec, io, identity })`** — every collaborator
   injected. That's what lets the whole package be tested with no relay, no filesystem, and
   no editor.
2. **Room lifecycle** — connect, sync, disconnect, reconnect. Rooms keyed
   `${repoId}/${vaultPath}`.
3. **Seed vs adopt** — the core rule: _first client in a room seeds it from its file; later
   clients adopt room state._ Implement the join handshake that decides which you are.
   Getting this wrong duplicates or erases a document, so it earns the most tests here.
4. **Divergence** — when a joiner's file differs from room state, don't merge. Enter
   `divergent` and hand the UI both versions. Silently merging two independently-edited
   files produces a document nobody wrote.
5. **Presence** — awareness carrying peer id, name, color, cursor; exposed as
   `SessionState.peers`.
6. **Disk flush** — every ~500ms, serialize through the injected codec and write through
   the injected I/O. Each participant writes their own disk, so anyone can close the laptop
   mid-session and lose nothing.
7. **Degradation** — losing the relay drops to `solo` and keeps editing. The relay is
   never a dependency; every participant already holds the whole document.

## Done when

- Two in-memory sessions over a fake transport converge after concurrent edits.
- First-in seeds, second-in adopts — asserted directly.
- A joiner with a differing file reaches `divergent` and never silently merges.
- Killing the transport mid-session degrades to `solo` with no loss.
- No real websocket, no real filesystem, no React in any test.

## Not this plan

The relay route (plan 04), the `y-prosemirror` binding (plan 02), the share UI (plan 05).
