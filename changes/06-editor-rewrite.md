# 06 · CodeMirror rewrite, terminal, profile menu

`c8d878e` 63 files, +3937 −2036

## What landed

The editor was rebuilt on **CodeMirror 6**, replacing the ProseMirror/Tiptap implementation
from the earlier plans. Deleted: `schema.ts`, `slash-menu.ts`, `task-item.ts`,
`wiki-link.ts`, `collab.ts` (the ProseMirror binding). Added: `syntax.ts`,
`live-preview.ts`, `commands.ts`.

The model changed with it. Rather than a rich-text document constrained to a markdown-shaped
schema, the buffer _is_ markdown, with a live-preview decoration layer over it — closer to
Obsidian's live preview than to Notion's block editor, and it removes the whole class of
bugs where the schema and the codec disagreed about what was representable.

`packages/editor` now exports `Editor`, `livePreview`, `markdownHighlight`, `COMMANDS`, and
the math widget.

## Terminal

A pty per websocket, `$SHELL -l` rooted in the vault, wired to xterm.js in a resizable
bottom panel on ⌘J. The server kills the shell when the socket closes. See
[09](09-ui-pass.md) for the failure mode this shipped with.

## Also in this commit

- **Profile menu** — switches vault, remote, and git identity together
- **Pane resizer** — draggable sidebar and terminal panel, sizes persisted
- **Icons** — a local Lucide subset, the set Obsidian ships
- **Self-hosted fonts** — Inter and JetBrains Mono as `woff2`, no CDN

## Note

This work arrived as a single large uncommitted change set from a parallel session and was
committed as one chunk after verifying it typechecked and passed the suite. It is larger
than the repo's one-functional-chunk-per-commit convention would prefer.
