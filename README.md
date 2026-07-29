# mother

In-house documentation app. A cross between Obsidian and Notion.

**A local website, not a desktop app.** You run it on your own machine and open
`localhost:3000` in a browser tab — Next.js front, Hono backend, no installer. It works
against a local clone of a vault repo. Markdown files on disk are the source of truth; git
is the history and the backup. A config page points it at a remote and it syncs
automatically.

The one thing Obsidian can't do — and the reason this exists — is **live collaborative
editing**. Today we export to Google Docs to work on something together and then paste it
back. That round trip goes away.

## Principles

- **Files, not a database.** Plain `.md` in a plain git repo. Obsidian, `grep`, and any
  editor keep working on the same folder.
- **Local-first.** Everything works offline. The network is only for sharing.
- **Small.** One process, one dependency-light UI, no accounts, no server to babysit
  except a stateless relay.
- **Keyboard-first.** Dense, monospace, command-palette driven — closer to a CLI than to
  a document suite.

## Shape

```
proprium-docs/  (git clone on disk)   <-- source of truth
      |
   Hono backend (localhost:3001)  -- the only thing that touches disk
      |     |
      |     +-- git remote          async sync: pull, commit, push
      |     +-- relay (websocket)   live sync: CRDT updates + presence, nothing stored
      |
   Next.js website (localhost:3000)  -- open in a browser tab
```

## Running it

```
npm run setup            # install dependencies and put `mother` on your PATH
mother                   # start the backend and the site; ctrl-c stops both
mother ~/path/to/vault   # ... or point it straight at one vault
```

Your browser opens at http://127.0.0.1:3000 once the site is ready. Both processes bind
loopback only — the vault is unauthenticated, so nothing is served to the network.

From inside this directory, `npm run dev` does the same thing without installing anything.
`npm test` runs every package, `npm run build` typechecks and builds the site.

## Vaults

Vaults live in `~/.mother/`. **Every folder in there is a vault** — drop a clone in by hand
and it shows up, no registration step. With no argument `mother` reopens whatever you had
open last, or the first vault it finds; on a fresh machine it opens the vault picker
instead. `⌘K → Switch or create vault` gets back to the picker at any time.

Creating a vault asks for a git remote, because git is the history and the backup and a
vault with nowhere to push is a vault you lose. The remote is checked before anything is
written to disk: an existing branch is cloned, an empty one is initialised with a first
commit for the next sync to push. Vaults outside `~/.mother/` still open fine — pass a path
or set `MOTHER_VAULT`; `MOTHER_HOME` moves the home itself.

## Status

Local editing works end to end: vault tree, open, edit, save to disk, git sync, settings,
command palette. Live collaboration is built and tested as a package but is **not yet
wired into the app** — editing is currently local-only.

- [DESIGN.md](DESIGN.md) — high-level design and build order
- [plans/](plans/README.md) — six implementation plans, partitioned so they can be built in
  parallel without collisions
- [changes/](changes/README.md) — what actually shipped, chunk by chunk, with the commits

Everything targets one laptop. No deployment, no hosting, no CI — `npm run dev` and a
browser tab.

Business-wide context (ECSEQ-1, the vault, chip and model specs) lives in the parent
`propriumbioscience/CLAUDE.md`.

## Agent context

`.agents/` holds shared agent context — see `.agents/README.md` for the layout.

`.agents/LESSONS.md` records mistakes agents have made here more than once. Read it before
starting work. When you catch yourself repeating a correction already made in this repo,
add an entry. Once is a fix; twice is a lesson. Nothing goes in preemptively.

Per-agent context (Codex, Cursor, anything else we try) is one file or directory in
`.agents/`, named after the tool, and holds tool-specific guidance only.

## Code style

Write the minimum code that implements what was described — not the minimum that could be
extended to something larger. No speculative abstractions, no options nobody asked for, no
layers with a single caller.

Elegant and short, but never at the cost of readability. Clever beats verbose; clear beats
clever. If shortening a function makes a reader stop and work it out, it was already short
enough.

Comments are close to non-existent. Names, types, and structure carry the meaning. The
exceptions are narrow: a non-obvious *why* (a workaround, a spec quirk, an ordering that
looks wrong but isn't), or a subtlety a reader would otherwise reintroduce as a bug.

Match the file you're in — consistency with the surrounding code outranks everything above.
When a convention isn't obvious, go read what's already here, then the sibling projects in
the parent monorepo (`dodgson/`, `data/`, `strata/`, `website/`). This repo is young, so
sometimes there is no precedent — then make the call and say which convention you
established and why.

## Git

No Claude coauthor line in commits. Commit messages are one-liners, and a commit covers one
functional chunk of work.
