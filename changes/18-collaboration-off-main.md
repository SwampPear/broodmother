# 18 · Collaboration off main

_uncommitted_ — the CRDT half moved to the `collab` branch and deleted from `main`

## What changed

Live collaboration was built early ([03](03-collab-session.md)), tested, and then never
wired into the app — the editor has always been local-only. It sat in the tree as a package
nothing imported, a relay nobody joined, a session state that was always `solo`, and a
settings field for a relay URL that did nothing.

It is now a future feature rather than dead weight. The whole of it is preserved on the
**`collab` branch**, cut from the commit before this one, and removed from `main`.

### Gone from main

| What                                                      | Was                                          |
| --------------------------------------------------------- | -------------------------------------------- |
| `packages/collab/`                                        | Yjs session, divergence, disk flush          |
| `packages/shared/src/collab.ts`                           | `RoomId`, `Peer`, `SessionState`, divergence |
| `ClientMessage`                                           | join / leave / update / awareness            |
| `ServerMessage` variants                                  | session, divergence, update, awareness       |
| `MotherConfig.relayUrl` and `POST /api/config/test-relay` | relay settings field and its test button     |
| `DivergenceDialog`                                        | adopt-room-or-keep-local prompt              |
| Palette `Share document`, `App.share`, `App.session`      | the only way into a room                     |
| `SyncDeps.hasLiveSession`                                 | sync held off while a room was live          |
| `yjs`, `y-protocols`, `y-codemirror.next`                 | dependencies                                 |

### What stayed, and why

- **`/ws` and `Relay`.** The socket is not only a collaboration channel: it is how the
  server pushes vault events and sync status to the open tab, which is what lets a document
  follow a write made from a shell ([15](15-open-documents-follow-disk.md)). `Relay` keeps
  the name and loses the rooms — it is a set of connections and a `broadcast`, and nothing
  is sent up it any more. `ClientMessage` is gone entirely; `/ws` is server-to-client only.
- **`presenceColor` on a profile.** Named for presence, but it is what the profile badge,
  the picker accent and the terminal palette are coloured with today. Removing it would
  have been a UI change dressed up as a feature removal.
- **The `syncIdleMs` quiet period.** The sync loop no longer asks whether a session is
  live, but it still waits for edits to settle.

### Tests

Down from 432 to 392. `relay.test.ts` keeps the two broadcast tests and adds one for
dropping a closed connection; the room, convergence, awareness and divergence tests went
with the branch. `sync.test.ts` loses "does not sync while a session is live".

## What was deliberately not done

The history stays. [03](03-collab-session.md) and `plans/03-collab-session.md` still
describe what was built and why — deleting the record of a feature is not the same as
deleting the feature, and the branch is the code those documents refer to.
