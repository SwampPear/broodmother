# docs

In-house documentation app. A cross between Obsidian and Notion.

**A local website, not a desktop app.** You run it on your own machine and open
`localhost:3000` in a browser tab — Next.js front, Hono backend, no installer. It works
against a local clone of a docs repo. Markdown files on disk are the source of truth; git
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

## Status

Design phase. Nothing implemented yet.

- [DESIGN.md](DESIGN.md) — high-level design and build order
- [plans/](plans/README.md) — six implementation plans, partitioned so they can be built in
  parallel without collisions

Everything targets one laptop. No deployment, no hosting, no CI — `npm run dev` and a
browser tab.
