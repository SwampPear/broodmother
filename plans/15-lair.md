# 15 — The lair

The deployed half. Everything so far runs on one laptop; this plan builds the one process
that runs anywhere else. The lair is broodmother's server away from home: it relays live
collaboration between laptops, hosts dreams so they run while every laptop is closed, and
runs the agents those dreams call. A small CLI administers it, and the app gains a place
to point at one.

This revives [07](07-p2p-collab.md) and absorbs its relay: the rooms planned for
`apps/relay` become one socket route on the lair, and everything plan 07 says about
sessions, seeding, divergence and degradation stands unless amended here.

## Goal

1. Share a document from the app and send the invite; a teammate joins and both edit at
   once, each seeing the other's cursor and selection, tinted and named from their
   profile. Closing the laptop loses nothing — every participant writes their own vault.
2. Push a dream to the lair and it runs there: interval and time triggers fire with every
   laptop shut, `agent.claude` steps run in the lair's clone of the vault or project, and
   `agent.note` output comes home through the git sync that already exists.
3. A `lair` CLI stands the thing up and runs its errands: mint an access key for a
   person, list and revoke keys, register the repositories dreams run against, print the
   deploy key.
4. Settings grows a Server section: paste a URL and a key, press Check, and be told
   plainly which of three states you are in — unreachable, refused, or connected. The
   status line carries the answer from then on.

## Shape

```
laptop A                          the lair                          laptop B
┌──────────────┐        ┌──────────────────────────┐        ┌──────────────┐
│ broodmother  │─ wss ─▶│  rooms      blind pipes  │◀─ wss ─│ broodmother  │
│  whole doc   │        ├──────────────────────────┤        │  whole doc   │
│  own vault   │─ https▶│  dreams     runs, store  │        │  own vault   │
└──────────────┘        │  agents     claude -p    │        └──────────────┘
      ▲                 │  sites      git clones   │                ▲
      │                 └──────────┬───────────────┘                │
      └────────── git sync ────────┴──────── git sync ──────────────┘
```

Both laptops dial out, so nothing changes about anyone's machine: no inbound port, no
NAT traversal. The lair is the only process on a network, and git — already the way a
vault travels — is how a hosted dream's output gets back to every desk.

## Decisions

**One process, two trust levels.** The collab rooms stay exactly what plan 07 designed:
blind pipes that hold no document and, after the encryption phase, move bytes they cannot
read. The dreams surface is the opposite — it holds clones, runs agents, keeps run
history — and every route on it demands a key. The two share a port and a process but no
state, so trusting the lair with your repositories never means trusting it with the
content of a live editing session.

**The lair is its own app, composed by allowlist.** Not a mode flag on `apps/server` —
that server is thirty unauthenticated routes with full disk access, and a flag that must
guard every one of them fails open the day someone adds route thirty-one. `apps/lair`
builds its own Hono app and imports what it needs from `@broodmother/server` the way
`apps/desktop` already imports `startServer`: the `Dreams` orchestrator, `RunStore`,
`TriggerStore`, the blocks. The local server keeps its `HOST = '127.0.0.1'` comment true;
nothing about it becomes reachable.

**Keys are minted by the lair, hashed at rest, shown once.** First boot writes an admin
token to the lair's home at 0600 and prints it once. The admin token mints per-person
access keys through the CLI; the lair stores only their sha256, so its disk never holds a
usable credential. This is the github-token rule from `profiles.ts` applied server-side:
a secret is a file at 0600 or a hash, never a field in synced JSON.

**The app's key lives beside the github token, and the browser never sees it.** `PUT
/api/lair` stores `{ url, key }` in the profile file the way `writeAccount` stores the
github token; the shared `Profile` grows `lair: string | null` — the URL only. Every
lair call the browser needs is proxied through the local server, which attaches the key.
A secret that reaches the browser is a secret in a screenshot.

**Sites are clones, and git carries outputs home.** A hosted dream runs against a site: a
clone the lair maintains from a registered remote. At first boot the lair generates its
own ed25519 key, plan-08 style; `lair key` prints the public half and the operator adds
it as a deploy key wherever the repositories live. Before a run the site pulls; after an
`agent.note` step writes, the site commits and pushes, and the note arrives on every desk
through the vault sync that already runs. No new transport, no upload route for results.

**Invites stay bearer.** Joining a room needs no lair account: the invite carries the
lair's URL, the room id, the admission token, and — in the fragment, which never reaches
the lair — the encryption key. Minting a room is the authenticated act, done by the
sharer's local server with its key. This keeps "join me for an hour" from requiring "get
provisioned on my server."

**Scheduling moves in-process on the lair.** The crontab-and-curl loop is a laptop's
answer to a process that might not be running when the clock strikes. The lair is a
long-lived process, so the schedule half of `Dreams.tick()` becomes injectable: the
laptop keeps today's crontab writer, the lair supplies a timer built on the same beat
parsing that fires `run()` directly. One orchestrator, two clocks.

## Owns

```
packages/shared/src/collab/**        RoomId, Invite, RelayMessage, Peer — per plan 07
packages/shared/src/api/lair.ts      the lair contract: status, keys, sites, hosted dreams
packages/collab/src/**               session, transport, presence — per plan 07
apps/lair/src/**                     the process: auth, rooms, sites, hosted dreams
apps/lair/bin/lair.mjs               the CLI
apps/web/src/components/collab/**    share and join, live-document wiring, peers
apps/web/src/components/settings/lair.tsx   the Server panel
plus seams: profiles.ts, context.ts, app.ts, dreams/core.ts, editor/core.tsx,
doc/core.tsx, dream editor toolbar, status-line.tsx, palette, state.tsx
```

## 1 · `packages/shared` — the contracts

`collab/` lands as plan 07 wrote it: `RoomId`, `Invite`, `parseInvite`/`formatInvite`,
the relay message union, `Peer`. One amendment: the awareness payload carries the cursor
as Yjs relative positions (anchor and head), because absolute offsets go stale the moment
a remote edit lands, and `Peer` carries `name` and `color` lifted from `Profile` — the
identity type already holds both.

`api/lair.ts` types both surfaces. The lair's own routes: `GET /status`, the key routes,
`PUT /sites`, `GET /sites`, `PUT /dreams`, `DELETE /dreams`, `POST /dream/run`,
`GET /dream/runs` — the dream shapes reusing `DreamRun` and `DreamSummary` from
`api/dreams.ts` unchanged, because the lair runs the same orchestrator. And the local
server's client routes: `GetLair`, `PutLair`, `PostLairCheck` (answering
`'connected' | 'refused' | 'unreachable'`, the `git/check` pattern), `PostLairShare`,
`PutLairDream`, `GetLairDreams`.

`Profile` grows `lair: string | null` — the URL, never the key.

## 2 · `packages/collab` — the session

Plan 07 phase 1, unchanged and binding: `createSession` with every collaborator injected,
seed-vs-adopt earning the most tests, divergence refusing to merge, the ~500ms flush
through injected io, degradation to `solo`. Tests use a fake transport, a fake io, no
React, no network.

`presence/core.ts` maps the local `Identity` and Monaco selection into the awareness
payload and reads peers back out, translating relative positions to offsets against the
current `Y.Text`. This is the module the cursor rendering stands on.

## 3 · `apps/lair` — the process

A second entry-point app in the workspace mold: Hono over `@hono/node-server`, `ws` with
the same `noServer` upgrade table and heartbeat as `apps/server/src/index.ts`, state in
`LAIR_HOME` (default `~/.lair`):

```
~/.lair/
  admin.token      minted at first boot, 0600, printed once
  keys.json        { id, name, sha256, createdAt }[] — hashes only
  key, key.pub     the lair's ed25519, ssh-keygen exactly as profiles.ts does it
  sites/<name>/    one clone per registered remote
  dreams/<site>/   hosted .dream files, serialized canonically
  dreams.db        the same RunStore schema, reused
  runs/            scratch, one folder per run
```

- **Auth middleware.** Every route except the socket upgrade takes `authorization:
Bearer`; key routes demand the admin token, the rest any live key. A failed key
  answers 401 with a JSON error — that is what lets Check distinguish refused from
  unreachable.
- **Rooms.** Plan 07 phase 2 verbatim: `join(room, token, socket)`, rebroadcast to the
  rest, wrong token or oversized frame destroyed, an empty room forgotten. Minting a
  room (`POST /rooms`, keyed) answers `{ room, token }`; the E2E key is minted by the
  sharer and never sent here.
- **Sites.** `PUT /sites { name, remote }` clones shallow-less into `sites/<name>` with
  `GIT_SSH_COMMAND` pointed at the lair's key — the same helper `git/core.ts` already
  exports. A site that cannot pull reports it on `GET /sites` rather than at run time.
- **Hosted dreams.** `PUT /dreams { site, path, dream }` validates with `parseDream` and
  writes the file under `dreams/<site>/`; the same `Dreams` class scans that folder as
  its `sites()`, with the timer scheduler from section 5, `scratch()` under `runs/`, and
  a pull-before-run, commit-and-push-after wrapper around each walk. `agent.claude` runs
  the bare `claude -p` exactly as `blocks/claude.ts` does today — the operator installs
  the CLI on the box and sets `ANTHROPIC_API_KEY` in the process environment, credentials
  from the environment and never from a file. Personas resolve from the site's own
  `personas/` folder, so a dream that names one works wherever it runs.
- **Boot.** `npm run lair` for a box with node; a small Dockerfile beside it for a box
  without, one stage, `LAIR_HOME` on a volume. TLS is a fronting proxy's job and stays
  out of this repo.

## 4 · the CLI — `apps/lair/bin/lair.mjs`

The `scripts/broodmother.mjs` mold: `#!/usr/bin/env node`, plain ESM, no argument-parser
dependency, wired as `"bin": { "lair": "./bin/lair.mjs" }` in `apps/lair/package.json`.
It reads `LAIR_URL` and `LAIR_ADMIN_TOKEN` from the environment and speaks the typed
contract:

```
lair status                     version, uptime, sites, whether the claude CLI answers
lair keys mint <name>           prints the key once; the lair keeps only the hash
lair keys ls                    id, name, created — never the key
lair keys revoke <id>
lair sites add <name> <remote>  register and clone
lair sites ls                   each site and whether its last pull succeeded
lair key                        the public deploy key, for pasting into a forge
```

Every command is one authenticated fetch and one formatted answer; the CLI holds no
state and writes no file.

## 5 · `apps/server` — the lair client

- **Scheduler extraction.** The schedule half of `Dreams.tick()` moves behind an
  injected `Scheduler`; `crontabScheduler` wraps today's `Crontab` and `scheduleLines`
  untouched, `timerScheduler` computes the next firing from the same beat parsing and
  calls `run()` in-process. `context.ts` wires the crontab one; the lair wires the
  timer. No behavior change on the laptop.
- **Storage.** `readLair`/`writeLair` beside `readAccount`/`writeAccount` in
  `profiles.ts`: `{ url, key }` in the profile file at 0600, `lair` in the shared
  `Profile` carrying the URL only.
- **Routes.** `GET /api/lair` answers the URL and whether a key is held. `PUT /api/lair`
  stores both. `POST /api/lair/check` calls the lair's `/status` and maps the outcome to
  `connected | refused | unreachable` with the failure's text, the `git/check` shape.
  `POST /api/lair/share { root, path }` mints a room on the lair, mints the E2E key
  locally, and answers a formatted invite. `PUT /api/lair/dream { root, path, site }`
  reads the file, `parseDream`s it, and pushes it up. `GET /api/lair/dreams` proxies the
  hosted list with each dream's last run, polled by the UI the way local runs already
  are.

## 6 · `packages/editor` — cursors

Plan 07 phase 3, now with its point sharpened: `Editor` gains one optional prop,
`session?: CollabSession`. With it the `value`→model reconciliation and the `onChange`
emit stand down and `y-monaco` binds the model, and — the part this plan is for — the
awareness renders as remote cursors: a caret in each peer's `color`, a selection wash of
the same at low alpha, and a small name flag that fades after the peer's last motion.
Colors arrive through injected class rules per peer, the way Monaco decorations expect.
Without the prop, `Editor` is byte-for-byte what it is today.

An addition to a package's public surface, which `CLAUDE.md` says to agree first.

## 7 · `apps/web` — the surfaces

- **Settings.** A `server` entry in `SECTIONS` and a `lair.tsx` panel: URL field, key
  field that never echoes a stored key back, a Check button whose three answers render
  as plain sentences, and the deploy-key hint for operators. Gated `open` on a profile
  being active, like the profile panel.
- **Status line.** Peers land beside sync while a session is live — one dot per peer in
  their color, name on hover. The lair's reachability shows only when a lair is
  configured and only when something is wrong, the sync-conflict rule applied to a new
  neighbor.
- **Share and join.** Palette commands and `FlowCtx` methods per plan 07 phase 4: share
  mints and copies an invite, join takes a pasted one, divergence is a modal with both
  versions and two ways out. `DocView` hands the buffer to the session while live and
  takes it back on close.
- **Dreams.** The dream editor's toolbar grows a placement control: `runs here` /
  `runs on <lair>`. Choosing the lair opens a site picker fed from `GET /api/lair/dreams`
  and pushes; a hosted dream's card on the dreams page shows the lair's runs, polled
  through the proxy, in the same run chrome local dreams wear.

## 8 · Tests

Shared: invite round-trip, relative-position round-trip, lair contract parsing. Collab:
plan 07's list verbatim — convergence, seed-vs-adopt asserted directly, divergence never
merging, transport death and resync, no network and no React anywhere in the package.
Lair: auth middleware refusing absent, wrong and revoked keys; key minting storing only
hashes; rooms with two plain ws clients; hosted-dream lifecycle against a file remote
(`git init --bare` in a temp dir) with a stubbed agent — push, trigger, run, and the
output commit arriving in the bare remote. Server: scheduler extraction leaves crontab
tests green; check-route mapping of the three states; share and push proxies against a
fake lair. Web: the panel, the placement control and peer rendering against the mock
client. CLI: each command against a fake lair over loopback.

## Order

Shared contracts first, then collab-session and lair in parallel (the session needs no
network; the lair's rooms need no CRDT), then the editor binding, then the two surface
phases — collab in the app, dreams on the lair — in either order. Blinding the relay
(plan 07 phase 5) closes it out, and stays last because everything before it works
unencrypted on a lair you run yourself.

## Not in this plan

- Discovery, or anything that outlives the window: rooms die with their last socket,
  plan 07's cuts stand.
- Ad-hoc agent runs on the lair — a one-node dream is already that, and a bare
  prompt-in-answer-out route is an agent API this repo has not decided to have.
- Multi-tenancy. One lair is one team; keys gate access, they do not partition it.
- Push updates for hosted runs — polling through the proxy, as local runs poll today.
- TLS, domains, and where the lair lives. It is a plain node process; the Dockerfile is
  a convenience, not a deploy system.
- `trigger.file` and `trigger.http` firing on the lair against laptop paths — a hosted
  dream's file triggers watch the site's clone, and that difference is documented, not
  papered over.

## Dependencies

New, and `CLAUDE.md` says to agree these first: `yjs`, `y-protocols`, `y-monaco` —
client side, in `packages/collab` and `packages/editor`. The lair adds none: `ws`,
`execa` and `node:sqlite` are already in the workspace, and the CLI is dependency-free
on the `broodmother.mjs` precedent.
