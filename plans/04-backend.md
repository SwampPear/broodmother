# 04 — Backend

**Parallel.** Owns `apps/server/**`. Reads `packages/shared/**`.

## Goal

The Hono server on `:3001` — the only process that touches disk. Vault, git sync, config,
backlinks, and the collab relay, all in one local process.

Build against `packages/shared` types; where you'd call plan 01's codec, take it as an
argument so you're not blocked on it.

## Deliverables

1. **Hono on `@hono/node-server`, bound to loopback only.** Not `0.0.0.0` — there's no
   auth and full read/write access to the vault, so binding to a network interface would
   hand the whole vault to anyone on the same wifi.
2. **Vault** — list (skipping `.git`, `.mother`, gitignored), read, write, move, delete,
   attachments. Two things that matter more than they look:
   - **Reject any path that escapes the root** after resolution, symlinks included. Paths
     arrive from a browser; this is the only place that boundary exists.
   - **Atomic writes** — temp file, fsync, rename. The editor saves on a 500ms debounce, so
     a crash lands mid-save often, and a half-written note is lost work.
3. **Watcher** — chokidar over the vault, debounced ~100ms, with suppression so the app's
   own writes don't echo back as external changes.
4. **Git** — shell out to the real binary via `execa`: `status --porcelain=v2` (v2 because
   vault paths have spaces in them), `pull --rebase`, `commit`, `push`. Never run a
   destructive command — no `reset --hard`, no `clean`, no force-push, anywhere.
5. **Sync loop** — after ~10s of no edits *and* no live session, pull → commit → push. The
   session check isn't optional; syncing mid-session commits half a paragraph. Commit
   messages from changed paths (`docs: update ECSEQ-1/Whitepaper`). **Conflicts latch:**
   stop all automatic syncing until explicitly cleared, and never guess a resolution.
   Distinguish offline from diverged — collapsing them makes the status line lie.
6. **Config** — `.mother/config.json` validated with Zod. Defaults complete enough that first
   run works with no setup. On a malformed file, reset the bad fields, keep the good ones,
   and report what was reset; refusing to start would strand you with no UI to fix it in.
   Reject remotes with embedded credentials.
7. **Wikilinks & backlinks** — extract links from documents, resolve Obsidian-style (exact
   path, then filename, then filename without extension), expose backlinks. On a rename,
   rewrite links in every document that pointed at the old path.
8. **Relay** — a `ws` route hosting Yjs rooms in memory, forwarding updates and awareness,
   **destroying the room when the last client leaves.** No persistence, no snapshots — the
   design can't have a second source of truth, and durability is git's job.
9. **API** — the routes and websocket typed in `shared/src/api.ts`. Validate every body
   with Zod at the boundary.

## Done when

- Every route in `api.ts` works, with matching response shapes.
- Loopback-only binding is verified by test.
- Path traversal attempts are rejected — test `../`, absolute paths, symlink escapes.
- Killing the server mid-write leaves no corrupt file.
- Conflict latches and stays latched until cleared.
- Two websocket clients in a room converge; the room frees when both leave.
- Tests use real temp vaults and a real temp bare repo. Don't mock git — the point is
  agreeing with the actual binary.

## Not this plan

Any UI. Deployment, Docker, CI, auth — all explicitly out; this runs on one laptop.
