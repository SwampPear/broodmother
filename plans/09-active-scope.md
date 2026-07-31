# Active scope

One question the whole app answers together: **which root am I working in — the vault, or
one of its projects?** Today that question is asked four times and answered differently
each time. The sidebar draws the vault and the one open project; the branch selector shows
both repositories at once; the tab strip is filed under a key that mixes all four
coordinates; and a terminal always opens in the project when there is one, whatever you
were reading. This plan makes it one fact, set by clicking into a tree, and read by
everything downstream.

## What changes for the user

The sidebar lists the vault and **every** project linked to it. Clicking into any of them —
the root row, a folder inside it, a file inside it — makes it the active scope, and the app
moves with you:

| Surface           | Follows the scope by                                                   |
| ----------------- | ---------------------------------------------------------------------- |
| Tab strip         | Each scope keeps its own tabs; switching swaps the strip and the route |
| Terminal tab      | A shell spawns in the scope's checkout                                 |
| Terminal panel    | Same, at spawn time                                                    |
| Branch selector   | Lists only the scope's branches, and wears the scope's branch          |
| Vault menu anchor | Names the scope's project beside the vault                             |

A folder in the sidebar that is a project says so, with a `project` tag on its row — the
same pill a file wears for its extension. With one project it was obvious which folder was
the repository; with four of them under the vault's documents it is not, and a row that
looks like an ordinary folder but switches the whole app when clicked has to say so.

The vault menu stops listing projects to switch between — the tree does that now — and keeps
`New project…`. Everything else about a project moves into the sidebar with it: unlinking
onto the project's own row, and linking a new one onto the right-click behind the rows,
beside `New note`.

## Decisions

**Every project's tree is served at once.** `GET /api/tree` answers the vault and all linked
projects, so a project can be expanded and read without becoming the scope.

**Only the vault and the active project are watched.** `TreeWatcher` is chokidar over the
whole folder — `ignored` filters `RESERVED` only, so a code repository's `node_modules` is
watched today for the one open project. Multiplying that by every linked project is the one
cost in this plan worth refusing. A background project's tree can go stale; it is refetched
when the scope lands on it.

**Branch selection is scope-only**, not two lists with one in front. Switching the vault's
branch means clicking into the vault first, which is the same gesture that already changes
everything else.

**A running shell never moves.** The scope decides where a pty is spawned and nothing else.
Sending `cd` into a shell someone is typing in is not a state change, it is an interruption.

**Nothing moves on disk.** `config.project[vaultPath]` keeps its shape and very nearly its
meaning — it was "the project open in this vault, null for none", it becomes "the project
the scope is in, null for the vault". `config.projectBranch` is already keyed
`<vault>#<project>`, which is exactly what per-project branches need. No migration.

## 1 · `packages/shared` — the address widens

`DocRoot` is the whole change. A path was half an address when there were two trees; with N
projects the root has to name which one.

```ts
// tree/core.ts
/** Which tree a path is in: the vault's markdown, or one of its projects' files. */
export type DocRoot = 'vault' | `project:${string}`

export const projectRoot = (name: string): DocRoot => `project:${name}`

/** The project a root names, or null when it names the vault. */
export function projectOf(root: DocRoot): string | null {
  return root === 'vault' ? null : root.slice('project:'.length)
}
```

Every `root === 'vault'` in the repo stays correct. Every `root === 'project'` becomes
`projectOf(root)` — there are six, all listed below. The URL `/doc/<root>/<path>` still
works: `/doc/vault/inbox.md`, `/doc/project:my-repo/src/index.ts`.

| File              | Change                                                                                          |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| `tree/core.ts`    | `DocRoot` as above, plus `projectRoot` and `projectOf`                                          |
| `tree/index.ts`   | export both helpers                                                                             |
| `index.ts`        | export both helpers                                                                             |
| `api/tree.ts`     | `response: { vault: TreeEntry[]; projects: { name: string; entries: TreeEntry[] }[] }`          |
| `api/scope.ts`    | new: `PostScope { request: { root: DocRoot }; response: { config: BroodmotherConfig } }`        |
| `api/projects.ts` | `PostProjectOpen` deleted; `active` drops from `GetProjects` and `DeleteProjects` — derived now |
| `api/routes.ts`   | `POST /api/scope` in, `POST /api/projects/open` out                                             |
| `api/ws.ts`       | unchanged in shape; `root` now carries the project's name                                       |
| `api/branches.ts` | unchanged in shape; `Of.root` now names a project                                               |

## 2 · `apps/server` — every project open, one scope recorded

**`context.ts`** is the bulk of it.

- `projectOpen: OpenProject | null` → `projectsOpen = new Map<string, OpenProject>()`.
- `useProject(name)` → `useProjects()`: opens a `Tree` and a `Git` for every listed project
  whose folder is there, at whichever checkout `config.projectBranch` names. Called from
  `useVault`, and after a project is added, unlinked or moved onto another branch.
- `watchProject(name | null)`: closes the previous project watcher and opens one on the
  scope's project. Called from `setScope` and from `useProjects`.
- `rootOf(root)`: `'vault'` → `this.open`; otherwise `projectsOpen.get(projectOf(root))`,
  throwing `NoProjectError` naming the project when it is not there.
- `checkoutsFor(root)`, `listBranches(root)`, `activeBranch(root)`, `moveInto(root, branch)`:
  all take the named project instead of "the open one". `moveInto` reopens just that
  project rather than the whole vault.
- `scope` getter and `setScope(root)`: writes `config.project[vaultPath]`, re-points the
  watcher. Replaces `openProject`. `removeProject` falls the scope back to the vault when it
  unlinks the one you are in.
- `session(root)` replaces `session()`: the cwd is that root's checkout, still falling back
  to the vault and then the home.
- `onTreeEvent(root, event)` is handed `projectRoot(name)`, so the broadcast names the
  project.
- `trees()`: the vault's entries and one entry per open project, for `GET /api/tree`.

**`app.ts`**

- `rootSchema` widens: `'vault'`, or a string matching `/^project:.+$/`, parsed to `DocRoot`.
  The error message becomes `root must be "vault" or "project:<name>"`.
- `GET /api/tree` returns `{ vault, projects }`.
- `POST /api/scope` replaces `POST /api/projects/open`; body `{ root }`.
- `GET/DELETE /api/projects` drop `active` from their answers.

**`sockets/terminal.ts` + `index.ts`**

- `Terminals` takes `session: (root: DocRoot) => TerminalSession`; `accept(socket, root)`.
- The upgrade handler already parses the URL — it reads `?root=` off it, defaults to the
  recorded scope when absent, and hands it to `accept`.

## 3 · `apps/web/src/state.tsx` — one scope, one set of branches

```ts
/** The root everything scoped is about: the vault, or one of its projects. Set by clicking
 *  into either tree, and by opening a document in one. */
scope: DocRoot
setScope(root: DocRoot): Promise<Failure>
```

- `entries: { vault: TreeEntry[]; projects: Record<string, TreeEntry[]> }`.
- `vaultBranches` / `vaultBranch` / `projectBranches` / `projectBranch` collapse to
  **`branches: Branch[]`** and **`branch: string | null`** — the scope's, fetched from
  `GET /api/branches?root=<scope>`. Four fields and two requests become two and one.
- `project: ProjectSummary | null` stays, derived: `projects.find(p => p.name ===
projectOf(scope))`. The shell and the vault anchor go on reading it.
- `checkout` → **`scopeKey`**: `` `${config?.vaultPath ?? ''}#${scope}#${branch ?? ''}` ``.
  Switching the vault's branch no longer discards the project's tabs, because the project's
  key never mentioned the vault's branch.
- `openProject` → `setScope`, which posts `/api/scope` and reloads branches and the tree.
- `loadPlace` loses its `loadProjects`/`loadBranches` split for the two roots.

## 4 · `apps/web` — the surfaces

**`components/shell/checkout-tabs.ts` → `scope-tabs.ts`** (`useCheckoutTabs` →
`useScopeTabs`). The mechanism is unchanged — tabs and last-route filed under a key, the
`#`-prefixed placeholder carried forward once the vault answers — the key is just
`scopeKey`. `currentDoc` parses `vault` or a `project:`-prefixed root instead of an
allowlist of two.

**`components/tree/`**

- `core.tsx` takes `scope: DocRoot` and `onScope(root)`. Activating any row — file, folder,
  or a project's own root row — calls `onScope(row.root)` before opening or toggling. The
  active root's rows carry `data-scope`, and `TreeRow` passes it through for styling.
- `core.tsx`'s `paneMenu` — the right-click behind the rows — gains `New project…` beside
  `New note`, on a new `onCreateProject` prop the shell wires to the same `setCreating(true)`
  the vault menu's row calls. The empty pane is where a project goes for the same reason it
  is where a note goes: it is the part of the sidebar that belongs to no row, and linking a
  repository is now a sidebar act rather than a menu one. `New note` goes on landing in the
  vault's root, matching what a drop onto that same empty space already does.
- `paths.ts` needs nothing: `flatten` already draws a labelled root as a row of its own
  (`rootEntry`), which is exactly how N projects render.
- `row.tsx` gains `unlink` in `TreeCommand`, offered on a project's root row only, and the
  `project` tag. The row already knows it is one — `isRoot` is `entry.path === ''`, and only
  a labelled root draws that row — so the tag is the existing `.tag` span the file arm
  renders, moved out of the `entry.kind === 'file'` guard:

  ```tsx
  {
    isRoot ? (
      <span className="tag">project</span>
    ) : (
      tag && <span className="tag">{tag}</span>
    )
  }
  ```

  No CSS: `.tree > ul .tag` already pushes the pill to the end of the row and uppercases it.

**`components/branch/menu.tsx`** loses `groups` for one scope: `label`, `branches`,
`active`, and `onSelect(name)` / `onCreate(name)` / `onDelete(name)` without a root. The
menu holds the scope's branches and no others — a vault's branches are not listed, greyed or
sorted below while a project is in front, they are not there, and while the vault is in
front no project's are. Only one repository is in the menu, so the `front` calculation and
the `New branch in X…` naming both go: `New branch…` is unambiguous again.

**`components/vault/menu.tsx`** drops `projectSection`, the `project` arm of `Drilled`, and
the props `activeProject` / `onSelectProject` / `onUnlinkProject`. `New project…` stays. The
anchor keeps naming the scope's project beside the vault.

**`components/shell/core.tsx`** builds `roots` from the vault plus every project, wires
`onScope`, hands `BranchMenu` the one group, and passes the scope to the terminal.

**`components/terminal/`** — `TerminalPanel`, `TerminalTab` and `Session` take `root:
DocRoot` and pass it to `client.terminal(root, …)`. Spawn-time only.

**`api/client.ts` + `http.ts` + `mock.ts`** — `terminal(root, onMessage, onClose)` opens
`/terminal?root=<encoded>`. The mock grows a per-project file map, the new tree shape, and
`POST /api/scope`.

**`components/palette/`** — `choices.ts` prefixes a project ref with the project's name
instead of the literal `project`. `flows.ts`'s `projects()` becomes `switchScope()`: a pick
list of the vault and every project, so ⌘K still moves the scope without the mouse.

**`app/doc/[...path]/page.tsx`** — the root parse widens the same way `currentDoc` does.

## 5 · Tests

Updated:

- `shell/core.test.tsx` — "keeps a tab set per branch" and "swaps the tabs when you switch
  project" become scope tests; "gives the vault and the project a branch selector each"
  becomes one selector that follows the scope.
- `branch/menu.test.tsx` — one group.
- `vault/menu.test.tsx` — the project-picking and project-unlinking cases move to the tree.
- `server/app.test.ts` — the tree shape, `/api/scope`, project-named branch roots.
- `sockets/terminal.test.ts` — `accept(socket, root)`.

New:

- Clicking a row in a project that is not the scope moves the scope, the tabs and the route.
- A project's row wears a `project` tag; a plain folder inside it does not.
- The empty pane's menu opens the new-project flow, and its `New note` still lands in the
  vault.
- Two projects keep their tabs apart, and returning to one restores its tabs and its page.
- The branch menu lists the scope's branches and nothing else.
- A terminal opened in a project scope spawns in that project's checkout.
- `GET /api/tree` answers every linked project, and a missing folder is listed without one.

## 6 · Order

1. `packages/shared` — types first; everything else typechecks against them.
2. `apps/server` — context, routes, terminal.
3. `apps/web/src/state.tsx` — scope, entries, branches, `scopeKey`.
4. `apps/web` surfaces — tree, branch menu, vault menu, tabs, terminal, palette, doc page.
5. `npm run check`, `npm run format`, then run the app: link two projects to one vault,
   click between them and the vault, and watch the tabs, the branch selector and a fresh
   terminal follow.

## Not in this plan

- **The sidebar still draws every root at once.** Collapsing it to the active root only was
  considered and refused: the notes about the thing and the thing itself sitting side by
  side is what the sidebar is for.
- **Sync stays the vault's alone.** Committing markdown you are typing is what it is for;
  committing a code repository nobody asked it to is a different program.
- **Git settings and the git state stay vault-scoped.** `GET /api/git` is unchanged.
- **Moving a live shell between scopes.** A pty spawns where the scope was and stays there.
- **Watching every project.** See the decision above; a background tree can be stale.
