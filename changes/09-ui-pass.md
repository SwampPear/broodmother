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
- **Browser identity.** The tab title is `Mother`, and `app/icon.png` / `app/apple-icon.png`
  (Next's file convention) put the logo on a `#1f1f1f` tile with a 15% corner radius. The
  bare logo is a cream glyph on transparency — on a light tab strip it disappears, so the
  favicon carries its own background rather than borrowing the browser's.
- **The vault no longer follows your shell.** `scripts/mother.mjs` was resolving
  `argv[2] ?? MOTHER_VAULT ?? process.cwd()` and always exporting `MOTHER_VAULT`, which the
  server treats as the highest-priority source — so running `mother` from any folder pinned
  that folder as the vault and overwrote the remembered one. Only an explicit argument sets
  it now; with none, the env var is not exported at all and the server falls through to the
  profile's saved `vaultPath`, then the first vault in `~/.mother`. This is what
  [README](../README.md) already claimed the command did.

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
