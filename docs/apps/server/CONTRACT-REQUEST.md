# Contract requests — plan 04 (server)

Nothing here blocks the server; it all works today. These are places where `packages/shared`
under-specifies the wire and the server had to decide. Recorded so the decisions can be
moved into the shared types (or overruled) rather than living only in this app.

## 1. `ServerMessage.divergence` and `ClientMessage.resolveDivergence` are close to dead

Plan 03 does the seed-vs-adopt comparison entirely client-side, so the relay never sends
`{ type: 'divergence' }` — it has no reason to read a file it is only relaying updates for.
The server does handle `resolveDivergence`: `keepLocal` is treated as a `leave` (leaving the
session and keeping the local file is a real server-side action), and `adoptRoom` is a no-op
because adopting room state happens in the client. If plan 03 never sends the message either,
both `DivergenceReport` and `DivergenceChoice` can come out of `collab.ts` / `api.ts`.

## 2. `RoomId` has no readable `repoId`

`RoomId` is documented as `${repoId}/${vaultPath}` but `DocsConfig` exposes nothing to build
one from, so clients send a bare vault path. Per coordination with plan 05, the server
qualifies it: `repoId` is the first 12 hex characters of `sha1(remoteUrl ?? vaultPath)`, and
every `session` / `update` / `awareness` message echoes the qualified id. Incoming messages
are accepted either way (already-qualified ids pass through unchanged). If this should be
stable and readable instead, add a `repoId: string` to `DocsConfig` and the relay will use it
verbatim.

## 3. `Peer.selection` is always `null` from the server

The relay forwards awareness payloads verbatim and never decodes them, so it cannot report a
selection — mapping a y-prosemirror relative position to `{ anchor, head }` needs the document
and the ProseMirror mapping, which live in the client. Cursors still work, because clients
render them from the awareness stream directly; the `peers` list is for identity and counting.
If nothing wants the field, `Peer.selection` could be dropped.

## 4. Request encoding is not in `ApiRoutes` (resolved, worth writing down)

Implemented to match plan 05: GET and DELETE take their fields as query parameters, POST and
PUT as a JSON body, and every non-2xx response carries an `ApiError` body. Only `api.ts` says
what the payloads are, so nothing stops a future client from sending a DELETE body.

## 5. Config file location vs `DocsConfig.vaultPath`

The config file is `<bootstrap root>/.docs/config.json`, where the bootstrap root is
`DOCS_VAULT` or the process cwd; `config.vaultPath` then selects the vault that documents are
read from and defaults to that same root. With no `DOCS_VAULT` set the two coincide and the
file sits in the vault exactly as DESIGN.md describes. They separate only if someone changes
`vaultPath` from the settings page, and the config file deliberately stays put so the next
start can still find it. Not a shared-types issue — flagged in case the settings UI wants to
say where the file lives.
