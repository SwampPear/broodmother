# Design

High-level design for the docs app. Deliberately minimal — every section below is the
smallest thing that satisfies the requirement.

## Requirements

1. Local, per-employee, like Obsidian. Files on disk.
2. Automatic sync to a git repo, configured from a settings page.
3. Live collaborative editing on a document, with presence.
4. Block/line-based editing like Notion.
5. Interface styled after a coding-agent CLI: dense, monospace, keyboard-driven.

## Architecture

**This is not a desktop app.** It is a local website. You run it on your own machine and
open `localhost:3000` in a normal browser tab. No Electron, no Tauri, no packaging, no
installers, no code signing — one `npm run dev` and a bookmark.

**Everything runs on one machine.** No deployment, no hosting, no CI, no Docker — the
whole thing is `npm run dev` on a laptop. Two local processes, started together:

```
  browser tab                 Next.js (:3000)          Hono (:3001)
  ------------  http/ws  -->  the website     --http-->  backend
                                                          |  fs     vault/*.md
                                                          |  git    pull / commit / push
                                                          |  ws     collab relay
```

Next.js renders the UI and nothing else — it holds no state and touches no files. Every
filesystem, git, and collaboration operation goes through the Hono backend, which is the
only thing that talks to the disk. Splitting them is what makes websockets and long-lived
file watchers straightforward; keeping the boundary at "Next.js never touches the disk"
is what keeps the split from costing anything.

### Storage

The vault is a git working tree. A note is a `.md` file; a folder is a folder;
attachments go in `attachments/`. Nothing about the format is ours — the current
`proprium-docs` vault opens as-is, and Obsidian can stay open on the same folder.

Per-vault app state (last opened, window layout, cached index) lives in `.docs/` and is
gitignored. Nothing in `.docs/` is load-bearing; deleting it costs a reindex.

### Editor

Tiptap (ProseMirror) with a schema constrained to exactly the markdown subset we support:
headings, paragraph, bullet/ordered/task list, code block, quote, table, image, link,
horizontal rule, and inline bold/italic/code/strike/wikilink. Blocks are lines, `/` opens
the block menu, drag handles reorder — the Notion feel.

The schema constraint is the important part. A rich-text editor that can represent things
markdown can't will silently mangle files on save. If it isn't in the schema, it can't be
typed, so serialization round-trips losslessly and `git diff` stays readable.

### Live collaboration

Yjs CRDT bound to the ProseMirror document (`y-prosemirror`), plus the awareness protocol
for cursors, selections, and who's here.

A **relay** carries updates between participants: rooms keyed by `repo-id/path`, forwarded
to everyone else in the room, held in memory only while someone is connected. It never
writes to disk and is not a source of truth — losing it drops you back to solo editing,
and every participant already has the full document.

**For now the relay is a websocket route on the local backend.** That means collaboration
works between browser tabs on one machine, which is enough to build and test the entire
seed/adopt/presence/flush path. Making it work *between people* is one deployment of that
same route to somewhere both laptops can reach, and changes no client code — the relay URL
is already a config field. That deployment is deliberately not in scope yet.

Session lifecycle:

1. Open a note → read the file → build the Yjs doc → join the room.
2. **First client in a room seeds it from its file. Later clients adopt room state.** If a
   joiner's file differs from what the room has, we don't merge — we show a banner with a
   diff and two choices: adopt the room, or leave the session and keep the local file.
   This is rare and needs to be visible, not silent.
3. While the session is live, every participant writes the serialized markdown to their
   own disk on a ~500ms debounce. Everyone's working tree stays current, so anyone can
   close the laptop mid-session without losing anything.
4. Last client leaves → room state is dropped.

Sharing is per-document and explicit: a Share action puts you in the room and gives you a
link others in the vault can open. There is no always-on sync of the whole vault; that's
what git is for.

### Git sync

Configured on the settings page, run by a background loop in the local process:

- On a change, wait for ~10s of no local edits and no live session.
- `git pull --rebase` → stage changed files → commit → push.
- Commit messages are generated from the changed paths (`docs: update ECSEQ-1/Whitepaper`).
- Conflicts are never auto-resolved. The loop stops, a banner appears, and the file is
  left in conflict state for the user to settle in the app or the terminal.

Conflicts should be uncommon in practice: the case that produces them — two people editing
the same doc at once — is the case the live session handles.

### Settings page

Vault path · remote URL and branch · sync on/off and interval · relay URL · display name
and presence color · git author identity. Stored in `.docs/config.json`.

## Interface

Styled after a coding-agent CLI, per the brand [Design Reference]: Ubuntu Mono throughout,
`--black`/`--dark` ground, `--white` text, opalescent accents used sparingly — presence
cursors get colors from the opal palette, which is what that palette is for.

Three regions: a file tree on the left, the document, and a status line at the bottom for
sync state, session participants, and errors. `⌘K` command palette does everything —
open, create, move, share, sync, settings. No toolbars, no ribbons, no modals that aren't
the palette.

*(Assumption flagged: I've read "like Superset, the CLI for coding agents" as the general
coding-agent-CLI aesthetic above — dense, monospace, keyboard-driven, minimal chrome. If
you mean something more specific about its layout, say so and I'll rework this section.)*

## Stack

TypeScript end to end.

| Layer | Choice | Why |
| --- | --- | --- |
| Website | **Next.js** (App Router) | Local website, not a desktop app. Already our stack on the marketing site. |
| Backend | **Hono** on Node | The current default for a TypeScript backend: tiny, fully typed routes, first-class websockets, no decorators or DI container to learn. Fastify is the reasonable alternative and NestJS is far too much machinery for this. |
| Editor | Tiptap (ProseMirror) | Block editing with a schema we can constrain. |
| Collaboration | Yjs + `y-protocols` | CRDT and presence. |
| Relay | a `ws` route on the backend | Local for now. Split it out when it needs to leave the laptop. |
| Git | the system `git` binary | Shelling out beats a JS reimplementation. |

Nothing else. No ORM, no state-management library, no component library, no auth
provider, no queue — the feature list doesn't need them and each one is a thing we'd
have to keep alive.

## Non-goals for v1

Anything that isn't running on one laptop: deployment, hosting, Docker, CI, installers,
multi-machine collaboration. Also out: permissions and ACLs · comments and suggestions ·
Notion-style databases and views · full-text search · mobile · a plugin API · WYSIWYG for
LaTeX/Mermaid beyond rendering them.

## Build order

1. **Local editor.** Vault tree, open, edit, save to disk. No git, no network. This alone
   replaces Obsidian for reading and writing.
2. **Git sync.** Settings page, background loop, conflict banner.
3. **Live collaboration.** Relay, Yjs binding, presence, share flow. This is the one that
   retires the Google Docs round trip.
4. **Polish.** Command palette, wikilinks and backlinks, attachments.

Each stage is usable on its own, and 1–2 together already cover everything the current
Obsidian + obsidian-git setup does.

For parallel execution, this is decomposed into six plans in [plans/](plans/README.md) —
one foundation, then five that can be built at the same time.

[Design Reference]: ../../docs/Business/Design/Design%20Reference.md
