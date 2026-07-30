# 07 — Live collab over a relay

**Wave 3.** Revives [03](03-collab-session.md), which was planned and never built. Owns
`packages/collab/**`, `apps/relay/**`, `apps/web/src/components/collab/**`. Touches
`packages/shared/src/collab/**` and `packages/editor/src/editor/core.tsx`.

## Goal

Two or more people edit the same document at the same time and each one's edits show up in
everyone's window, on everyone's disk.

Every participant holds the whole document and writes their own vault, so anyone can shut the
laptop mid-session and lose nothing. Losing the connection drops to solo editing rather than
to a read-only page.

One new component sits between them: a relay. It is a pipe, not an authority — it holds no
document, touches no disk, and knows nothing about a vault.

## Shape

```
laptop A                      relay                      laptop B
┌──────────────┐          ┌───────────┐           ┌──────────────┐
│ broodmother  │── wss ──▶│  rooms as │◀── wss ──│ broodmother  │
│  whole doc   │          │  socket   │           │  whole doc   │
│  own vault   │◀─────────│   sets    │──────────▶│  own vault   │
└──────────────┘          └───────────┘           └──────────────┘
   flushes to               no document              flushes to
   its own disk             no disk                  its own disk
```

Both peers dial **out**, which is why this works at all: no inbound port on anyone's machine,
no NAT traversal, no STUN, no WebRTC signaling. The relay is the only thing on a network, and
it is the only thing that gets deployed anywhere.

## What is already here

- `Relay` (`apps/server/src/sockets/relay.ts`) broadcasts server→client only — "nothing is
  sent the other way". Same name, different job; it is a template, not the relay in this plan.
- `Terminals` (`apps/server/src/sockets/terminal.ts`) is the bidirectional-socket pattern to
  copy: a route table in `index.ts`, one session per socket, torn down on close.
- `PUT /api/doc` already does the whole write dance — `watcher.suppress`, `vault.write`,
  `links.update`, `sync.noteEdit`, broadcast. Flushes reuse it rather than reimplementing it.
- `DocView` owns a 500ms save debounce and adopts vault events for the open path. A live
  session takes both of those over.
- `Editor` owns its Monaco model and reconciles `markdown` into it as an edit. A live session
  binds that model instead.

## Decisions

**Yjs, one `Y.Text`.** The app stores text and the editor edits text, so the CRDT is a
`Y.Text` named `content` holding the markdown source. Plan 03 wanted the `DocNode` codec in
this path; it does not belong here — nothing between the two ends speaks anything but text.

**The relay holds no document.** A room is a set of sockets; every message is rebroadcast to
the room's other members. Late joiners are served by the Yjs sync protocol — step1 from the
joiner, step2 from whoever is already there — not by relay state. So the relay needs no CRDT
dependency, cannot corrupt a document it never parses, and its whole logic is a
`Map<RoomId, Set<WebSocket>>`.

**The browser dials the relay.** The session lives in the web client, so the socket goes
straight from there to the relay. `apps/server` gains nothing network-facing and stays
`127.0.0.1` — the comment on `HOST` says why it must ("there is no auth and full read/write
access to the vault"), and this plan does not touch that.

**A room is a random id, not a path.** Minted at share time and carried in the invite. Plan
03 keyed rooms `${repoId}/${vaultPath}`; that told the relay what people were writing and
where. A random 16 bytes tells it nothing, and it means peers can even file the document at
different paths in their own vaults.

**A share lasts as long as the window.** Nothing about a session is persisted, so nothing is
added under `~/.broodmother`. Surviving a reload is a later, additive change.

## Layout

```
packages/shared/src/collab/
  core.ts        RoomId, Invite, parseInvite, formatInvite, RelayMessage, Peer
  index.ts

packages/collab/src/
  session/core.ts       createSession, SessionState, seed-vs-adopt, divergence, flush
  session/index.ts
  transport/core.ts     Transport interface, relayTransport
  transport/index.ts
  presence/core.ts      awareness payload from a Profile
  presence/index.ts
  index.ts

apps/relay/
  src/rooms/core.ts     Rooms: join, leave, rebroadcast
  src/rooms/index.ts
  src/index.ts          the ws server and its one route
  package.json

apps/web/src/components/collab/
  core.tsx       useSession, the live-document wiring
  share.tsx      share and join modals
  peers.tsx      presence in the status line
  index.ts
```

## Phases

Each phase is verifiable on its own, and the ordering puts the mechanism before the network.

### 1 — Wire types and the session, alone

`packages/shared/src/collab/core.ts`: `RoomId`, `Invite`, `parseInvite`/`formatInvite`, the
relay message union, `Peer`.

`packages/collab/src/session/core.ts`: `createSession({ room, transport, io, identity })`,
every collaborator injected. `SessionState` is
`{ mode: 'solo' | 'live' | 'divergent', peers: Peer[], text: string }`.

- **Seed vs adopt.** First into a room seeds `content` from its file. A later joiner adopts
  room state and does not touch it with its own. Getting this backwards duplicates or erases
  a document, so it earns the most tests in the package.
- **Divergence.** A joiner whose file differs from the state it adopted enters `divergent` and
  hands the UI both versions. It never merges them — two independently-edited files merged by
  a CRDT produce a document nobody wrote.
- **Flush.** Debounced ~500ms, serialize `content`, write through the injected `io`.
- **Degradation.** Transport gone → `solo`, editing and flushing continue. Reconnect resyncs
  through state vectors; nothing is lost, because nothing was ever only in flight.

Tests use a fake in-memory transport, a fake `io`, and no React.

### 2 — The relay

`apps/relay`: a `ws` server and one route. `join(room, token, socket)`, `leave`, rebroadcast
to the rest of the room. No document, no disk, no vault, no CRDT dependency.

- Admission is by room id and token. Wrong token, unknown room, oversized frame → destroyed.
- An empty room is forgotten; the process holds nothing between sessions.
- Added to the root `dev` script so `npm run dev` runs server, web and relay together. The
  same component serves the local demo and a deployed one — there is no second code path.

Verifiable with two plain ws clients and no editor, no vault, no browser.

### 3 — The editor binding

`Editor` gains one optional prop, `session?: CollabSession`. With it, the `value`→model
reconciliation and the `onChange` emit both stand down, and the model binds to the session's
`Y.Text` through `y-monaco`. Awareness renders as remote cursors and selections. Without it,
`Editor` is exactly what it is today.

An addition to a package's public surface, which `CLAUDE.md` says to agree first.

### 4 — The document, live

`DocView` asks for a session when the open path is shared. While one is live it stops its own
debounce and stops adopting vault events for that path — the session owns the buffer, and two
things writing one Monaco model is the bug this avoids. The flush goes through
`PUT /api/doc`, which is already the correct write.

Share and join reach the palette (`palette/choices.ts`, `flows.ts`): share mints a room and
gives you an invite to send; join takes one. Peers land in the status line beside sync.
Divergence is a modal with both versions and two ways out — take the room's, or keep yours
and leave.

### 5 — Blind the relay

Encrypt update payloads with a key minted at share time and carried in the invite's fragment,
which is never sent to the relay. The relay then moves bytes it cannot read between rooms it
knows only by id.

Worth doing because of where a relay ends up living: without it, whoever runs the relay can
read every document that crosses it.

## Not this plan

Discovery — an invite is pasted. mDNS on a local network is a later, additive step.

Running the relay anywhere in particular. It is a plain node process; a laptop on the same
wifi, a box, or a host works the same. Where it lives is a deployment question and this repo
has no deployment.

Comments, suggestions, history, or anything that outlives a session. Git already carries a
document between people asynchronously; this plan is only about the live case.

Images and other binaries. A `Y.Text` of markdown source is the shared thing; `isImage` paths
keep the viewer they have.

## Known limits, stated up front

- **An external write during a session is not adopted.** Obsidian, an agent, or a `git pull`
  touching a live path raises a notice and is otherwise ignored, because the session's buffer
  is the truth for as long as it is live. Adopting it would mean merging two documents, which
  is what divergence exists to refuse.
- **The invite is a bearer secret.** Anyone holding it can edit that document until the room
  is closed. It admits one room, not a vault — but it should travel over something private.
- **This is peers over a relay, not literally peer-to-peer.** No peer owns the truth and no
  service holds the document, but the relay is a single point of failure while it is up:
  lose it and everyone drops to solo.

## Done when

- Two in-memory sessions over a fake transport converge after concurrent edits.
- First-in seeds, second-in adopts — asserted directly, not inferred from convergence.
- A joiner with a differing file reaches `divergent` and never silently merges.
- Killing the transport mid-session degrades to `solo` with no loss, and reconnecting resyncs.
- No real websocket, no real filesystem and no React in any `packages/collab` test.
- Two windows against a local relay edit one document in tandem, and both vaults hold it.
- Two machines do the same through one relay, and closing the room ends it.
- `apps/server` still binds `127.0.0.1` and exposes no new surface.

## Dependencies

New, and `CLAUDE.md` says to agree these first: `yjs`, `y-protocols`, `y-monaco` — client side
only, in `packages/collab` and `packages/editor`.

`apps/relay` adds none: it already has `ws` in the workspace, and holding no document is what
keeps it that way.

`@codemirror/*` sits in the root `package.json` and nothing imports it. Unrelated to this
plan, worth deleting separately.
