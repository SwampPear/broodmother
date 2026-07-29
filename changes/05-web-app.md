# 05 · Web app and integration

`84ba81f` three-region shell, file tree, status line, command palette, settings ·
`abcc373` wire web to the real backend, bind both to loopback ·
`7007b64` setup script installing the CLI · `32ae15a` open the browser once serving

## What landed

`apps/web` — Next.js App Router, three regions: sidebar tree, main pane, status line, with
a command palette over the top and a settings page.

State lives in one provider (`state.tsx`) holding the vault tree, config, sync status, live
session, and divergence report, and exposing the actions that mutate them. Components read
`useApp()`; none of them fetch.

## Two clients behind one interface

`ApiClient` has two implementations: `httpClient()` against the real backend, and
`createMockClient()` — an in-memory vault with a seeded document set, a fake relay, and a
fake pty. Both are typed against `ApiRoutes`, so the mock cannot drift from the server
without failing to compile.

Every component test runs against the mock, which is why the suite needs no running server
and why the web tests finish in about a second.

## Loopback

`abcc373` bound both processes to `127.0.0.1` rather than `0.0.0.0`. The vault is
unauthenticated and the backend has full read/write access to it, so binding to a routable
interface would serve someone's documents to the network.

## The CLI

`npm run setup` installs dependencies and links a command onto `PATH`; running it starts the
backend and the site together and stops both on ctrl-c. `32ae15a` made it wait until the
site actually answers before opening the browser, rather than opening a tab onto a
connection error.

## Known gap

`no-node-apis.test.ts` guards that browser code never imports node builtins — a real hazard
in a repo where the same `@mother/shared` types are used on both sides.
