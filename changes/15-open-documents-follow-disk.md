# 15 · An open document follows the file

`d4ca390`

## What landed

A document you are looking at now updates when something else writes the file — a shell in
the panel below it, Obsidian, a sync pull, another mother window. Until now the tree
followed those writes and the open document did not, so the pane showed a copy of a file
that had moved on underneath it.

## The half that was missing

The server has watched the vault since [04](04-backend.md): chokidar picks up a write,
`VaultWatcher` debounces it and drops the echo of mother's own writes, and the event goes out
over the socket to every client. The web app listened and reloaded the **tree**. Nothing
carried the event to the pane.

So `App` grew `vaultEvent` — the last change the vault reported — and `DocView` reads the
file again when an event touches the path it is showing. That is the whole mechanism; the
transport was already there and already tested. What was not tested was the path this feature
actually depends on: `relay.test.ts` proved a write made _through the API_ reaches the socket,
which is the route broadcasting its own write. There is now a test for a write made straight
to disk behind the server's back, which is the one a shell makes.

## Whose copy wins

Typing that has not reached disk yet. `DocView` debounces saves by 500ms, and adopting the
file mid-keystroke throws away what is being typed, so an event that arrives while a save is
pending is ignored and the local edit lands on top a moment later. That is the same
last-write-wins the app has always had — this makes it no worse, and it is the honest
trade until the CRDT session in `packages/collab` is wired in and there is a real answer.

With nothing pending, the file wins. A read that fails — the file was deleted or moved out
from under the view — shows why, which is the truth about what is on screen rather than a
stale document that no longer exists.

## The cursor stays put

`@mother/editor` already reconciled an incoming `markdown` prop into the live CodeMirror
document, but by replacing it end to end, which maps the caret to one end of the result. That
never showed up before because the prop only changed when the document did, and a new
document remounts the editor. Now that a file can change under an open cursor, the selection
is put back where it was, clamped to what is now there.

## The claude tab looked like it started twice

It did not — it was typed twice. A terminal that runs something on open sent the command the
moment the socket connected, which is before the login shell has printed anything. The tty is
still echoing raw at that point, so the command appeared once as that raw echo; then zsh
started, found a line already sitting in the buffer, and its line editor redrew it. Same
command on screen twice, one process behind it.

The command now waits for the shell to say something first. Driving a real pty the way the
app does shows the command twice for a send on connect and once for a send on first output,
five runs out of five with no delay after it — the wait is the whole fix, not a timer tuned
until it looked right.

## Smaller

- **The claude mark in the terminal panel is a hair smaller** — 1rem against the terminal
  glyph's 0.95rem, where it was 1.1rem. It fills its box corner to corner where the stroked
  glyphs do not, so it still needs more room than them, just less than it had.

## Not done here

- Only the open document follows the file. A background tab re-reads when you switch to it,
  because the read is per view and a tab that is not rendered has no view.
- A document renamed on disk leaves the tab pointing at the old path and the view saying the
  document is gone. The route is the source of truth for what is open, so following a move
  means routing, not re-reading.
