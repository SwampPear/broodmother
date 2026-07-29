# docs

In-house documentation app. A cross between Obsidian and Notion.

**A local website, not a desktop app.** You run it on your own machine and open
`localhost:3000` in a browser tab — Next.js front, Hono backend, no installer. It works against a local clone sof a docs repo. Markdown files on disk are the source of truth; git is the history and the backup. A config page points it at a remote and it syncs automatically.

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
npm run setup          # install dependencies and put `docs` on your PATH
docs ~/path/to/vault   # start the backend and the site; ctrl-c stops both
```

Your browser opens at http://127.0.0.1:3000 once the site is ready. With no argument,
`docs` treats the current directory as the vault, and prints which one it picked. Both processes bind loopback only — the vault is unauthenticated, so nothing is served to the network.

From inside this directory, `npm run dev` does the same thing without installing anything.
`npm test` runs every package, `npm run build` typechecks and builds the site.

## Status

Local editing works end to end: vault tree, open, edit, save to disk, git sync, settings,
command palette. Live collaboration is built and tested as a package but is **not yet
wired into the app** — editing is currently local-only.

- [DESIGN.md](DESIGN.md) — high-level design and build order
- [plans/](plans/README.md) — six implementation plans, partitioned so they can be built in
  parallel without collisions

Everything targets one laptop. No deployment, no hosting, no CI — `npm run dev` and a browser tab.
