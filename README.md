# mother

**A local-first documentation app — a cross between Obsidian and Notion, with live
collaborative editing.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org)

mother is **a local website, not a desktop app**. You run it on your own machine and open
`localhost:3000` in a browser tab — Next.js front, Hono backend, no installer. It works
against a local clone of a vault repo. Markdown files on disk are the source of truth; git
is the history and the backup. A config page points it at a remote and it syncs
automatically.

The one thing Obsidian can't do — and the reason this exists — is **live collaborative
editing**. Today we export to Google Docs to work on something together and then paste it
back. That round trip goes away.

## Contents

- [Principles](#principles)
- [Architecture](#architecture)
- [Requirements](#requirements)
- [Getting started](#getting-started)
- [Projects, profiles and vaults](#projects-profiles-and-vaults)
- [Status](#status)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## Principles

- **Files, not a database.** Plain `.md` in a plain git repo. Obsidian, `grep`, and any
  editor keep working on the same folder.
- **Local-first.** Everything works offline. The network is only for sharing.
- **Small.** One process, one dependency-light UI, no accounts, no server to babysit
  except a stateless relay.
- **Keyboard-first.** Dense, monospace, command-palette driven — closer to a CLI than to
  a document suite.

## Architecture

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

Both processes bind loopback only — the vault is unauthenticated, so nothing is served to
the network.

## Requirements

- **Node.js 22 or newer** (npm workspaces, ESM)
- **git** on your `PATH` — it is the history and the backup, not an optional extra

## Getting started

```bash
git clone git@github.com:Proprium-Bioscience/mother.git
cd mother
npm run setup            # install dependencies and put `mother` on your PATH
```

Then run it from anywhere:

```bash
mother                   # start the backend and the site; ctrl-c stops both
mother ~/path/to/vault   # ... or point it straight at one vault
```

Your browser opens at <http://127.0.0.1:3000> once the site is ready. On a fresh machine
mother asks who you are before anything else, then where you want to work.

From inside this directory, `npm run dev` does the same thing without installing anything
onto your `PATH`.

### Environment variables

| Variable       | Default     | What it does                             |
| -------------- | ----------- | ---------------------------------------- |
| `MOTHER_HOME`  | `~/.mother` | Where projects, profiles and config live |
| `MOTHER_VAULT` | _unset_     | Open this vault instead of the last one  |

## Projects, profiles and vaults

`~/.mother/` holds projects; a project holds vaults and works as a profile.

```
~/.mother/
├── config.json           # this machine: which project and vault are open, sync settings
├── profiles/
│   ├── michael.json      # who you commit as, and the credentials you do it with
│   └── work.json
├── proprium/
│   ├── project.json      # { "profile": "work" }
│   ├── proprium-docs/    # a vault
│   └── notes/            # a vault
└── side-thing/
    ├── project.json      # { "profile": "michael" }
    └── handbook/
```

**Every folder in `~/.mother/` is a project, and every folder inside one is a vault** — drop
either in by hand and it shows up, no registration step. The folder name _is_ the project
name, so renaming a project is renaming the folder. `profiles/` is the one name a project
cannot have, because that is where the profiles live.

**A profile is who you are; a project is where you work.** Profiles are files in
`~/.mother/profiles/`, shared by every project rather than owned by one, so the identity you
set up once — git author, presence colour, the SSH key git offers and the
`CLAUDE_CONFIG_DIR` its terminals run with — serves every project that picks it. A project
names its profile in `project.json`; one dropped in by hand names none until you pick one.
Both are chosen from the same menu at the head of the tree.

**There is no default profile.** On a fresh machine mother asks who you are before it does
anything else, rather than inventing an identity from your OS user and leaving a stranger in
the menu, and then where you want to work. After that the project is detected, not
registered: whatever was active last, or the first folder in the home. Switching project
switches vaults with it, since a vault belongs to the project it sits in.

With no argument `mother` reopens whatever you had open last, or the first vault in the
active project; with no vaults it opens the vault picker. `⌘K → Switch or create vault` gets
back to the picker at any time.

Creating a vault asks for a git remote, because git is the history and the backup and a
vault with nowhere to push is a vault you lose. The remote is checked before anything is
written to disk: an existing branch is cloned, an empty one is initialised with a first
commit for the next sync to push. Vaults outside `~/.mother/` still open fine — pass a path
or set `MOTHER_VAULT`; `MOTHER_HOME` moves the home itself.

## Status

Local editing works end to end: vault tree, open, edit, save to disk, git sync, settings,
command palette. Files on disk stay the source of truth in both directions — a write from a
shell, from Obsidian or from a sync pull shows up in the open document, not just in the
tree. Live collaboration is built and tested as a package but is **not yet wired into the
app** — editing is currently local-only.

Everything targets one laptop. No deployment, no hosting, no CI — `npm run dev` and a
browser tab.

- [plans/](plans/README.md) — six implementation plans, partitioned so they can be built in
  parallel without collisions
- [changes/](changes/README.md) — what actually shipped, chunk by chunk, with the commits

### Planned

- **Live collaborative editing** — wire the CRDT session in `packages/collab` into the
  editor: shared cursors, presence, and concurrent edits over the websocket relay
- **Server hosting** — run the relay, and optionally the vault, on a machine everyone can
  reach, so collaboration works beyond one laptop

## Development

### Layout

```
apps/
├── server/     Hono backend — vault I/O, git sync, websocket relay, terminals
└── web/        Next.js site — the UI you open in a browser tab
packages/
├── collab/     CRDT session: Yjs documents, presence, update transport
├── editor/     CodeMirror setup, live preview, keymaps
├── markdown/   Markdown codec — parse and serialise, round-trip safe
└── shared/     Types and contracts both sides depend on
```

### Scripts

| Command             | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Backend and site together, watching for changes |
| `npm test`          | Vitest across every workspace                   |
| `npm run typecheck` | `tsc --noEmit` over the whole monorepo          |
| `npm run build`     | Typecheck, then build the site                  |
| `npm run check`     | Typecheck and test — run this before committing |
| `npm run format`    | Prettier over everything                        |

## Contributing

Issues and pull requests are welcome. Run `npm run check` before opening one, and read the
conventions below — they are the ones reviewers will hold a change to.

### Code style

Write the minimum code that implements what was described — not the minimum that could be
extended to something larger. No speculative abstractions, no options nobody asked for, no
layers with a single caller.

Elegant and short, but never at the cost of readability. Clever beats verbose; clear beats
clever. If shortening a function makes a reader stop and work it out, it was already short
enough.

Comments are close to non-existent. Names, types, and structure carry the meaning. The
exceptions are narrow: a non-obvious _why_ (a workaround, a spec quirk, an ordering that
looks wrong but isn't), or a subtlety a reader would otherwise reintroduce as a bug.

Match the file you're in — consistency with the surrounding code outranks everything above.
When a convention isn't obvious, go read what's already here. This repo is young, so
sometimes there is no precedent — then make the call and say which convention you
established and why.

### Git

Commit messages are one-liners, and a commit covers one functional chunk of work.

Every commit gets an entry in [changes/](changes/README.md) — what shipped and why, named
with the commits it covers. Extend the entry for the chunk you're in if one already covers
it; start a new numbered file and add a row to the table if not. The commit message says
what changed in one line; the entry says why, and what you decided against. A commit with
no entry is work nobody can reconstruct in six months.

### Agent context

`.agents/` holds shared agent context — see [`.agents/README.md`](.agents/README.md) for the
layout.

[`.agents/LESSONS.md`](.agents/LESSONS.md) records mistakes agents have made here more than
once. Read it before starting work. When you catch yourself repeating a correction already
made in this repo, add an entry. Once is a fix; twice is a lesson. Nothing goes in
preemptively.

Per-agent context (Codex, Cursor, anything else we try) is one file or directory in
`.agents/`, named after the tool, and holds tool-specific guidance only.

No Claude coauthor line in commits.

## License

[MIT](LICENSE) © Proprium Bioscience
