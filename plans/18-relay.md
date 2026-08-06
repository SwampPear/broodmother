# 18 — The relay: live collab, hosted

> **Built.** Five phases and the CLI. Where this document and the tree disagree, the tree is
> right; the three places they were always going to is recorded under
> [What changed on the way](#what-changed-on-the-way).

**Wave 4.** Supersedes [07](07-p2p-collab.md), which was written against the old `packages/`
layout and never built. Owns `apps/relay/**`, `apps/cli/**`, `src/collab/**`,
`apps/app/src/components/collab/**`. Touches `src/types/collab.ts`, `src/editor/editor.tsx`,
`apps/app/src/components/doc/core.tsx`, and the root `package.json` and `vitest.config.ts`.

## Goal

Two people edit the same document at the same time, and each one's edits show up in the
other's window and on the other's disk.

Every participant holds the whole document and writes their own vault, so anyone can shut the
laptop mid-session and lose nothing. Losing the connection drops to solo editing rather than
to a read-only page.

One new component sits between them, and it is the first thing this repo has ever deployed: a
relay. It is a pipe, not an authority — it holds no document, touches no disk, knows nothing
about a vault, and cannot read a byte that crosses it.

## Shape

```
laptop A                       relay                       laptop B
┌──────────────┐          ┌───────────────┐          ┌──────────────┐
│ broodmother  │── wss ──▶│   rooms as    │◀── wss ──│ broodmother  │
│  whole doc   │          │  socket sets  │          │  whole doc   │
│  own vault   │◀─────────│               │─────────▶│  own vault   │
│  holds key   │          │ no document   │          │  holds key   │
└──────────────┘          │ no disk       │          └──────────────┘
   flushes to             │ no key        │              flushes to
   its own disk           └───────────────┘              its own disk
```

Both peers dial **out**, which is why this works at all: no inbound port on anyone's machine,
no NAT traversal, no STUN, no WebRTC signalling. The relay is the only thing on a network, and
it is the only thing that gets deployed anywhere.

## What is already here

- **`Relay`** (`apps/app/server/sockets/relay.ts`) broadcasts server→client only — "nothing is
  sent the other way". Same word, different job. It stays where it is and keeps its name; the
  new app's class is `Rooms`, so nothing in the tree is called `Relay` twice.
- **`Terminals`** (`apps/app/server/sockets/terminal.ts`) is the bidirectional-socket pattern
  to copy: one session per socket, torn down on close.
- **The upgrade dispatch and heartbeat** (`apps/app/server/index.ts:36-91`) — a route table on
  one `WebSocketServer`, plus the two-rounds-of-silence ping that closes a socket whose other
  end went away. `apps/relay` needs exactly this and copies it rather than inventing a second
  one; a room full of sockets belonging to a slept laptop is the failure it prevents.
- **`PUT /api/doc`** (`apps/app/server/app.ts:315`) already does the whole write dance —
  `watcher.suppress`, `tree.write`, `links.update`, `sync.noteEdit`, broadcast. A flush reuses
  it through `app.save` (`apps/app/src/state.tsx:516`) rather than reimplementing it.
- **`DocView`** (`apps/app/src/components/doc/core.tsx`) owns the 500ms save debounce (`:13`,
  `:91-98`) and adopts tree events for the open path (`:72-83`). A live session takes both over.
- **`Editor`** (`src/editor/editor.tsx:280-291`) reconciles an outside `value` into its Monaco
  model as an edit. A live session binds the model instead of feeding it.
- **`Profile`** (`src/types/profile.ts`) already carries `name` and `color`. Presence needs no
  new identity, and no account anywhere.

## Decisions

**Yjs, one `Y.Text`.** The app stores text and the editor edits text, so the CRDT is a
`Y.Text` named `content` holding the markdown source. Plan 03 wanted the `DocNode` codec in
this path; it does not belong here — nothing between the two ends speaks anything but text.

**The relay holds no document.** A room is a set of sockets; every frame is rebroadcast to the
room's other members. Late joiners are served by the Yjs sync protocol — step1 from the
joiner, step2 from whoever is already there — not by relay state. So the relay needs no CRDT
dependency, cannot corrupt a document it never parses, and its whole logic is a
`Map<RoomId, Set<WebSocket>>`.

**The browser dials the relay.** The session lives in `apps/app`, so the socket goes straight
from there to the relay. `apps/app/server` gains nothing network-facing and stays `127.0.0.1` —
the comment on `HOST` says why it must ("there is no auth and full read/write access to the
project"), and this plan does not touch it.

**A room is a random 16 bytes, not a path.** Minted at share time and carried in the invite.
Plan 03 keyed rooms `${repoId}/${vaultPath}`, which told the relay what people were writing
and where. A random id tells it nothing, and it means two peers can even file the document at
different paths in their own vaults.

**Encrypted from phase one, not bolted on at the end.** 07 had this as a phase 5 that would
never have been reached. It is the difference between "a laptop on your wifi" and "a box
someone else runs", and the second is what hosted means: without it, whoever operates the
relay reads every document that crosses it. Doing it last would also mean designing the frame
format twice, because a relay that may not parse Yjs is a different relay from one that may.

**Awareness is encrypted too.** A cursor position is a claim about the text, and a name is a
claim about a person. Both ride the same sealed envelope as the updates.

**The session lives in `src/collab/`.** Client-only code in the top-level `src/` is already the
pattern — `src/editor` is app-only and sits there. It keeps the session testable with no
React, no Next, and no relay.

**One room, one process, nothing between sessions.** No store, no database, no `~/.broodmother`
entry. An empty room is forgotten. Restarting the relay ends every live session and loses
nothing, because no document was ever only there.

## The crypto, concretely

Small enough to state completely, and the part most likely to be got subtly wrong.

**The invite** is a URL whose fragment is the key:

```
https://relay.example/j/<roomId>#<key>
```

`roomId` is 16 random bytes, base64url. `key` is 32 random bytes, base64url. A fragment is
never sent to a server by a browser and never appears in the websocket URL, so the relay
cannot learn it by being the relay.

**The frames** are AES-GCM through `crypto.subtle`, with a fresh 12-byte IV per frame,
prepended to the ciphertext. What is sealed is the Yjs sync/awareness payload; what the relay
sees is opaque bytes with a room id on the front.

**Admission** is a token derived from the key rather than a second secret to carry:
`HKDF(key, 'broodmother/relay/admission')`. The client presents it on connect; the relay files
it against the room on first sight and destroys any later socket that presents a different
one. Deriving it one-way means holding the token gets you into the room and no closer to the
text — including for whoever runs the relay, who can join every room they know the id of and
receive ciphertext for their trouble.

**What the relay still learns**, and this is the honest limit: that a room exists, how many
sockets are in it, how big the frames are and when they arrive. Metadata, not content.

## Layout

```
src/types/collab.ts          RoomId, Invite, RelayMessage, Peer  (exported from types/index.ts)

src/collab/
  core.ts        createSession, SessionState — seed vs adopt, divergence, flush
  transport.ts   Transport interface, relayTransport
  crypto.ts      key generation, the HKDF token, seal / open
  invite.ts      formatInvite, parseInvite
  presence.ts    the awareness payload from a Profile
  index.ts

apps/relay/
  src/rooms/core.ts   Rooms: join, leave, rebroadcast
  src/rooms/index.ts
  src/index.ts        the ws server and its one route
  src/main.ts         host, port, and the line it logs
  package.json
  vitest.config.ts

apps/app/src/components/collab/
  core.tsx       useSession, the live-document wiring
  share.tsx      the share and join modals
  peers.tsx      presence in the status line
  index.ts
```

## Phases

Each phase is verifiable on its own, and the ordering puts the mechanism before the network.

### 1 — Types, crypto and the invite

`src/types/collab.ts`: `RoomId`, `Invite`, the relay message union, `Peer`.

`src/collab/crypto.ts` and `invite.ts`: key generation, token derivation, seal/open, and the
invite round trip. All pure, all `crypto.subtle`, none of it aware that a socket exists.

Verified by round-tripping: an invite formats and parses back to the same room and key, a
sealed frame opens under the right key and refuses the wrong one, and two independent derives
of the token from one key agree.

### 2 — The session, over a fake transport

`src/collab/core.ts`: `createSession({ room, transport, io, identity })`, every collaborator
injected. `SessionState` is `{ mode: 'solo' | 'live' | 'divergent', peers: Peer[], text: string }`.

- **Seed vs adopt.** First into a room seeds `content` from its file. A later joiner adopts
  room state and does not touch it with its own. Getting this backwards duplicates or erases a
  document, so it earns the most tests here.
- **Divergence.** A joiner whose file differs from the state it adopted enters `divergent` and
  hands the UI both versions. It never merges them — two independently-edited files run
  through a CRDT produce a document nobody wrote.
- **Flush.** Debounced ~500ms, written through the injected `io`.
- **Degradation.** Transport gone → `solo`, editing and flushing continue. Reconnect resyncs
  through state vectors; nothing is lost, because nothing was ever only in flight.

Tests use a fake in-memory transport, a fake `io`, and no React.

**These tests need a runner.** The root `vitest.config.ts` lists `projects: ['apps/*']` and
`src/` holds no test today, so a `src/vitest.config.ts` and a fourth project entry are part of
this phase. Without it `npm run check` would pass over the most important tests in the plan.

### 3 — The relay

`apps/relay`: a `ws` server and one route. `join(room, token, socket)`, `leave`, rebroadcast to
the rest of the room. No document, no disk, no vault, no CRDT dependency.

- Wrong token, malformed hello, oversized frame → destroyed, with no reply that distinguishes
  a wrong token from an unknown room.
- An empty room is forgotten; the process holds nothing between sessions.
- The heartbeat from `apps/app/server/index.ts:81-91`, so a slept laptop leaves its room.
- `GET /health` answering `200`, because something will be pointed at it.
- `RELAY_PORT` (3002) and `RELAY_HOST` — `127.0.0.1` by default, and the deployment sets
  `0.0.0.0`. Defaulting the other way makes a dev run reachable from the coffee shop.

Verified with two plain `ws` clients: no editor, no vault, no browser.

### 4 — The editor binding

`Editor` (`src/editor/editor.tsx`) gains one optional prop, `session?: CollabSession`. With it,
the `value`→model reconciliation (`:280-291`) and the `onChange` emit both stand down and the
model binds to the session's `Y.Text`. Awareness renders as remote cursors and selections.
Without it, `Editor` is exactly what it is today.

This is an addition to a package's public surface, which `CLAUDE.md` says to agree first.

**A risk to settle before the phase, not during it:** `y-monaco` is thinly maintained and its
Monaco peer range may not reach 0.56. Spike the binding against the installed Monaco in an
hour; if it does not hold, write the binding by hand — `Y.Text.observe` → `model.applyEdits`
one way, `model.onDidChangeContent` → `Y.Text` delta the other, with an origin flag to keep
them from echoing. That is about eighty lines and one fewer dependency, and it may be the
better answer regardless.

### 5 — The document, live

`DocView` asks for a session when the open path is shared. While one is live it stops its own
debounce (`:91-98`) and stops adopting tree events for that path (`:72-83`) — the session owns
the buffer, and two things writing one Monaco model is the bug this avoids. The flush goes out
through `app.save`, which is already the correct write.

Share and join reach the palette (`components/palette/choices.ts`, `flows.ts`): share mints a
room and gives you an invite to send; join takes one. Peers land in the status line beside
sync. Divergence is a modal holding both versions with two ways out — take the room's, or keep
yours and leave.

## Running it

- `npm run relay` starts it alone; `npm run localhost` gains it as a third process beside
  server and app, so the local demo and the deployed one are the same code path.
- `NEXT_PUBLIC_RELAY_URL`, defaulting to `ws://127.0.0.1:3002`. A build with none has no share
  command rather than a share command that fails.
- The deployed artifact is a plain node process. No Docker, no CI, no manifest in this repo —
  where it runs is a deployment question, and this repo still has no deployment.

## Dependencies

New, and `CLAUDE.md` says to agree these first: `yjs`, `y-protocols`, and `y-monaco` unless
phase 4's spike says otherwise. Client side only, in the root `package.json` where every
dependency here lives.

`apps/relay` adds nothing: `ws`, `@types/ws` and `tsx` are all present, and holding no document
is what keeps it that way. Adding the workspace is one `npm install`, which
`plans/README.md` rule 3 says to agree rather than assume.

## What changed on the way

**`y-monaco` was not used.** Phase 4 said to spike it and named the hand-rolled binding as the
fallback. The spike was not needed to make the call: the binding is `src/editor/collab.ts`, it
is a hundred lines, and it is the code that decides whether somebody's typing survives — worth
being able to read, and one fewer unmaintained dependency in the path. Only `yjs`, `y-protocols`
and `lib0` were added.

Writing it by hand also earned its own test (`src/editor/collab.test.ts`, a fake Monaco model
doing real line-and-column arithmetic), and that test immediately found a duplication bug: an
edit typed into the model was written into the `Y.Text`, whose observer then applied the same
delta back to the model. Both directions now carry an origin.

**There is a fourth mode, `joining`.** The plan's union was `solo | live | divergent`, which
left a joiner nothing honest to be between opening the socket and hearing what the room holds.
Binding the editor during that window is a flash of an empty document; writing during it is
worse. A joining peer shows its own file, binds nothing, and writes nothing.

**Frames are JSON with base64 payloads, not binary.** Every other socket in this repo is JSON,
the relay has to parse the hello either way, and a pipe that can be read with `wscat` while
debugging is worth a third more bytes on a markdown document.

**A `CLI` was added**, which the plan did not have. It is `apps/cli`, and `scripts/broodmother.mjs`
became a shim that hands its arguments to it:

```
broodmother                     start the app in the vault you had open
broodmother <vault>             start it in this one
broodmother relay               run a relay here
broodmother relay status [url]  ask a relay how it is, and what it is holding
broodmother relay peers <link>  how many people are in that document right now
broodmother invite [url]        mint a room and a key, as a link to send
```

`relay peers` is the one worth naming: it derives the admission token from the invite's own key
and shows it to `GET /rooms/<id>`, so asking proves you were told about the room while handing
the relay nothing that opens a frame. A room that is not there and a token that does not match
are the same 404, so it cannot be used to find out which rooms exist.

## Not this plan

**Discovery.** An invite is pasted. mDNS on a local network is a later, additive step.

**Persistence.** Everyone leaving ends the room. Joining a session hours later with nobody
else online is the authoritative-server design, and it costs a CRDT dependency, a store, and
the property that the operator cannot read your documents. Git already carries a document
between people asynchronously.

**Accounts.** The invite is the credential. Users, logins and per-document ACLs on a hosted
box are a different plan and a much larger one.

**Comments, suggestions, or anything that outlives a session.**

**Images and other binaries.** A `Y.Text` of markdown source is the shared thing; `isImage`
paths keep the viewer they have.

## Known limits, stated up front

- **An external write during a session is not adopted.** Obsidian, an agent, or a `git pull`
  touching a live path raises a notice and is otherwise ignored, because the session's buffer
  is the truth for as long as it is live. Adopting it would mean merging two documents, which
  is what divergence exists to refuse.
- **The invite is a bearer secret**, and it now carries the key as well as admission. Anyone
  holding it can read and edit that document until the room empties. It admits one room, not a
  vault — but it must travel over something private.
- **This is peers over a relay, not literally peer-to-peer.** No peer owns the truth and no
  service holds the document, but the relay is a single point of failure while it is up: lose
  it and everyone drops to solo.
- **The relay sees metadata.** Room ids, participant counts, frame sizes, timing.

## Done when

- An invite round-trips, and a frame sealed under one key does not open under another.
- Two in-memory sessions over a fake transport converge after concurrent edits.
- First-in seeds, second-in adopts — asserted directly, not inferred from convergence.
- A joiner whose file differs reaches `divergent` and never silently merges.
- Killing the transport mid-session degrades to `solo` with no loss, and reconnecting resyncs.
- No real websocket, no real filesystem and no React in any `src/collab` test — and
  `npm run check` runs them.
- Two plain `ws` clients join a room, exchange bytes, and a third with a wrong token is hung up
  on.
- Two windows against a local relay edit one document in tandem, and both vaults hold it.
- Two machines do the same through one hosted relay, and closing the last window ends the room.
- `apps/app/server` still binds `127.0.0.1` and exposes no new surface.
