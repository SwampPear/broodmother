# 09 · UI pass and terminal disconnect

`607cd09`

## What changed

- **No more "Default" profile.** The first profile is seeded from the identity already
  configured and named after it. A placeholder called `Default` teaches nothing and is the
  first thing anyone renames.
- **Profile dropdown rebuilt.** Full keyboard navigation (↑ ↓ Home End Enter Escape, with
  wrap-around onto the add action), `aria-activedescendant` on the listbox, a check on the
  active row, an initial-on-presence-color avatar, name over email, and a section label.
  Hover and the arrow keys write to the same cursor state, so the pointer and the keyboard
  can never disagree about which row is highlighted.
- **Tighter, rounded styling** for the dropdown — smaller type, 8px panel and 5px rows.
- **White caret** in the editor instead of opal violet, `caret-color` and `.cm-cursor` both.
- **File-type tag** in the tree now uses the same family as everything around it rather than
  the mono stack.
- **Vault picker restyled** to match — rounded rows, a violet primary action, denser type.

## The terminal

Reported as "can't be typed in". Two distinct causes, both real:

**1. The backend was not running.** Port 3000 was serving the site; nothing was listening on 3001. xterm does not echo locally — the pty echoes — so with no backend, typing produces
absolutely nothing. A dead black box is indistinguishable from a broken terminal.

The fix is feedback, not plumbing: `Connection` now carries a close signal, wired to the
socket's `close` and `error` events, and the panel shows _"disconnected from the backend — is
`mother` still running?"_ instead of silently swallowing keystrokes.

**2. Focus.** Clicking the padding around xterm's own surface did not focus the shell, so the
panel could look focused while eating input. `onMouseDown` on the panel body now focuses the
terminal.

## One thing not fixed

While reproducing this, the pty was observed exiting immediately (code 0, no output) when the
server runs **orphaned** — detached from the session that started it. Under a normal
foreground launch (`mother`, or `npm run dev` from a terminal) it works: the shell starts and
echoes. This was not chased further because running the backend orphaned is not a supported
mode, but it is worth knowing if the server is ever daemonised.

Note also that a stale server process on 3001 confused the first round of diagnosis — a
`pkill` pattern matching `tsx apps/server/src/main.ts` does not match the real command line,
which is `node --require .../tsx/dist/preflight.cjs … src/main.ts`. Check with
`lsof -nP -iTCP:3001 -sTCP:LISTEN`.
