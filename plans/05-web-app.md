# 05 — Web app

**Parallel.** Owns `apps/web/**`. Reads `packages/shared/src/api.ts`.

## Goal

The Next.js website on `:3000` — layout, file tree, status line, command palette, settings.
The thing you actually open in a browser tab.

Build the whole UI against a mock API client so you're not blocked on plan 04. Wiring the
real one should be a one-import change.

## Deliverables

1. **Next.js App Router**, client-heavy on purpose. This is a local single-user website, so
   server components and caching buy nothing and add moving parts.
2. **No filesystem access.** Not from a route handler, not from a server component, not
   once. Everything goes over the API. Holding this line is what keeps the two-process
   split from decaying into a confusing hybrid.
3. **Theme** — Ubuntu Mono throughout, Funnel Display for headings, `--dark` ground,
   `--white` text, opal accents for presence cursors. All values from the vault's
   [Design Reference]. Self-host the fonts; the app has to work offline.
4. **Layout — three regions.** File tree left, document center, status line bottom. No
   toolbars, no ribbons. Dense and monospace.
5. **File tree** — folders and notes, keyboard navigation, create, rename, move, delete
   with confirm. Rename shows how many links got rewritten.
6. **Status line** — sync state and last sync time, session peers with their colors,
   conflict banner, errors. It's the app's only ambient feedback, so every `SyncState` and
   `SessionState` variant needs a rendering.
7. **Command palette** — `⌘K`, fuzzy-matched, keyboard-only. Not a power-user shortcut: the
   UI has no toolbars, so this is how everything gets invoked. Commands: open, create,
   move, delete, share, sync now, settings.
8. **Settings page** — vault path, remote, branch, sync toggle, relay URL, display name,
   presence color, git author. Test-remote and test-relay buttons that report a specific
   result; someone whose sync silently isn't working needs to find out here rather than
   from a status line stuck on `offline`. Show any fields the backend had to reset.
9. **Share flow** — a Share action that starts a session, plus the divergence dialog
   offering adopt-room or keep-local. That dialog is the one place work can be lost, so it
   has to say plainly what each choice discards.

## Done when

- The full UI runs against the mock API with no backend built.
- Every action works keyboard-only.
- Every `SyncState` and `SessionState` variant renders — test each.
- Zero `fs` or `child_process` imports under `apps/web`.

## Not this plan

Editor internals (plan 02), collab session logic (plan 03), backend (plan 04). Mount
`<Editor>`; don't reimplement it.

[Design Reference]: ../../docs/Business/Design/Design%20Reference.md
