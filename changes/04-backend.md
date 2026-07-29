# 04 · Backend

`5f277ee` hono server, vault, git sync, config, backlinks, yjs relay

## What landed

`apps/server` — the only process that touches disk. Hono over `@hono/node-server`, bound to
`127.0.0.1` because there is no auth and full read/write access to the vault.

| Module       | Owns                                                                   |
| ------------ | ---------------------------------------------------------------------- |
| `app.ts`     | every HTTP route, typed against `ApiRoutes`                            |
| `vault.ts`   | list / read / write / move / delete, skipping `.git` and ignored files |
| `paths.ts`   | the vault boundary                                                     |
| `git.ts`     | status, pull, commit, push, remote probing                             |
| `sync.ts`    | the idle-triggered sync loop                                           |
| `config.ts`  | Zod-validated config with field-level repair                           |
| `links.ts`   | the backlink index and link rewriting on move                          |
| `watcher.ts` | chokidar over the vault                                                |
| `relay.ts`   | the Yjs websocket relay                                                |
| `context.ts` | wires it together; the one place the vault can be swapped              |

## Path safety

`resolveInVault` is the only place the vault boundary exists. Paths arrive from a browser,
so escapes are rejected **after** symlink resolution, not by inspecting the string: it
realpaths the deepest existing ancestor and re-checks containment. A symlink inside the
vault pointing out of it is caught; a string that merely looks safe is not trusted.
`.git` and `.mother` are reserved segments.

## Destructive git is refused by construction

`assertNonDestructive` runs on every argv before it reaches git, rejecting `reset`, `clean`,
`checkout`, `restore`, `rm`, `stash`, `gc`, `prune`, `filter-branch`, and any `--force`.
The guard is the promise, not the convention — the app syncs a repo full of the only copy of
some documents.

## The sync loop

Pull, commit, push once the vault has been quiet for `syncIdleMs` **and** no live session is
open. Commit before pulling, because rebasing onto a dirty tree fails and the conflict worth
surfacing is between two commits. Commit messages are generated from the changed paths
(`docs: update Handbook/Overview`).

**A conflict latches:** nothing syncs again until it is explicitly cleared. A loop that
retried would keep producing conflicted states while the user was trying to read one.

## Config repair

A malformed config file costs only the bad fields. `repair()` validates field by field and
reports which were reset, because refusing to start would strand the user with no UI in
which to fix the file.
