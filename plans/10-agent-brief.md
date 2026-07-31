# Agent brief

What claude is told when a terminal tab opens it. Today that is one paragraph, written in
the browser, that names the app and says nothing about the machine it woke up on: not the
vault, not the projects, not where any of them are on disk, not that there is a backend on
loopback answering questions the filesystem cannot. This plan makes the brief **dynamic**
— composed on the server, from the state the server already holds — and gives it the two
things it is missing: **where everything is**, and **how to ask the app**.

## What changes for the agent

It wakes up knowing the shape of the room. Instead of

> You are running in a terminal inside broodmother, a documentation app… The working
> directory is a checkout of a docs repo, one of the folders a broodmother project holds.

— which is true of every machine and specific to none — it gets the paragraph, then the
addresses, then the API. Roughly this, rendered for a real vault:

```
You are running in a terminal inside broodmother, a Mac app for reading and writing a
folder of markdown. The .md files on disk are the source of truth and git is the history,
so edit the files directly rather than reaching for a database. Someone may have the file
you are editing open in the browser beside you — the editor follows the file on disk, so
prefer small edits over rewriting a document out from under them.

## Where you are

  profile   you
  vault     handbook   ~/.broodmother/you/handbook
  scope     project:broodmother
  cwd       ~/.broodmother/you/handbook/broodmother/local
  sync      off

## The trees

  vault              ~/.broodmother/you/handbook/local          markdown, the documents
  project broodmother  ~/.broodmother/you/handbook/broodmother/local   ← you are here
  project pipeline     ~/.broodmother/you/handbook/pipeline/local

A project is a code repository the vault's documents are about. The vault is the notes.

## Asking the app

The backend is at http://127.0.0.1:3001 — loopback, no auth, JSON. GET and DELETE take
their parameters in the query string, POST and PUT take a JSON body, and a failure comes
back as {"error": "..."}.

Read and write documents on disk; the app is watching and the browser follows. Use the
API for the four things the filesystem cannot do:

  POST /api/doc/move    {root, from, to}   moves a document and rewrites the wikilinks
                                           pointing at it — `mv` leaves them broken
  GET  /api/links       ?path=             backlinks and outbound links for a document
  POST /api/branches/open {root, name}     opens a branch, making its checkout if new
  POST /api/sync/now    {}                 commits, pulls and pushes the open vault now

And for state, when this brief has gone stale under you:

  GET /api/config    what is open: vault, profile, scope, checkouts, per-vault git
  GET /api/vaults    every vault of this profile, and the one that is open
  GET /api/projects  the open vault's projects
  GET /api/tree      the vault's tree and every project's, as the sidebar draws them
  GET /api/branches  ?root=       branches of a root, and which one is checked out
  GET /api/sync      whether sync is on, when it last ran, what is conflicted

  curl -s http://127.0.0.1:3001/api/links?path=notes/sync.md

## Here

Never commit or push unless asked — the vault may be syncing on a timer and a commit of
yours rides out with it. Never edit ~/.broodmother/config.json by hand; POST /api/scope
and the routes above are how it changes.

## Who you are, in the words of the person you are working with

<the profile's soul — or, where nobody has written one, the default soul>
```

Every line under **Where you are** and **The trees** is read off the live context when the
shell spawns. Nothing else about the terminal changes: the tab still runs `claude
--dangerously-skip-permissions`, still types it once the shell has spoken, still takes its
state once and never moves.

## Decisions

**The server composes it, not the browser.** The state is the server's — `vaultOpen.path`,
`projectsOpen`, `scope`, `gitSettings`, `activeProfile` are all fields on `AppContext`, and
`session()` already reads three of them to place the shell. The browser holds copies of
some of it and none of the checkout paths. Composing where the truth is also deletes the
client's copy of the brief rather than growing it.

**It rides in on the environment.** `TerminalSession.env` gains `BROODMOTHER_BRIEF`, and
the typed command shrinks to

```sh
claude --dangerously-skip-permissions --append-system-prompt "$BROODMOTHER_BRIEF"
```

The alternative — keep interpolating the whole text into the command line — means typing
two or three kilobytes of shell-quoted prose through a pty one keystroke at a time, into a
line editor that redraws on every wrap. The current `quoted()` helper, which flattens
newlines to spaces so the line survives, exists only because of that; on the environment
the brief keeps its blank lines and the helper goes away. The variable is always set, so
the expansion is never empty.

**A snapshot, not a subscription.** The brief is read once, when the pty is spawned — the
same rule the cwd and the soul already follow, and for the same reason: a shell someone is
typing in is not somewhere to send an update. Staleness is why `GET /api/config` is in the
brief; the agent can ask.

**Six routes to act with, six to look with.** Not the thirty in `ApiRoutes`. Profiles,
GitHub device flow, vault creation and `DELETE /api/data` are things a person does in the
app, and an agent that finds them in its system prompt is an agent that might use them.
Adding a route to the brief is a decision, not a consequence of adding a route.

**Paths are shown with `~`, absolute underneath.** The home prefix is most of every path
here and carries no information. `cd` on the printed path still works.

## 1 · `apps/server/src/brief/` — the text

New folder, the shape every area here has: `core.ts` and an `index.ts` barrel.

```ts
// core.ts
export interface BriefState {
  home: string
  profile: string | null
  soul: string | null
  vault: { name: string; path: string } | null
  vaultCheckout: string | null
  projects: { name: string; path: string }[]
  scope: DocRoot
  cwd: string
  sync: 'off' | 'on' | 'conflicted'
  api: string
}

export function brief(state: BriefState): string
```

A pure function over a plain snapshot: no `AppContext`, no disk, no clock. That is the
whole testable surface, and it is why the state arrives as an argument rather than as a
context to read.

Inside, three constants and a join: the opening paragraph, the API section (fixed prose —
the routes do not vary by machine), and the closing rules. Between them the two rendered
tables. A vault that is not open renders `vault  none — nothing is open yet` and no trees;
first run is a state the app allows, so it is a state the brief has to describe.

The soul keeps its heading and its position — last, after the room, which is the order the
existing prompt already puts them in.

**A profile with no soul gets the default one**, `soul.ts` beside it: how an agent works
here when nobody has said otherwise, which is every profile on a fresh machine. It carries
its own `# SOUL` heading and so is emitted as it stands, where a written soul is prose in
somebody's voice and is introduced as one. `soul: null` stops meaning "say nothing extra"
and starts meaning "the default" — the price is that no soul at all is no longer a state a
profile can be in, which is a state worth losing.

## 2 · `apps/server/src/context.ts` — handing it over

`session()` gains four lines and stays synchronous:

```ts
private session(root: DocRoot | null): TerminalSession {
  const name = root ? projectOf(root) : projectOf(this.scope)
  const project = name ? this.projectsOpen.get(name) : null
  const claudeCfgDir = this.activeProfile?.claudeCfgDir
  const cwd = project?.path ?? this.vaultOpen?.path ?? this.home
  return {
    cwd,
    env: {
      ...(claudeCfgDir ? { CLAUDE_CONFIG_DIR: expandHome(claudeCfgDir) } : {}),
      BROODMOTHER_BRIEF: brief(this.briefState(cwd, root)),
    },
  }
}
```

`briefState` is a private getter beside it, reading what is already there:
`config.vaultPath`, `config.checkouts[vaultPath]` for the vault's open checkout folder,
`[...projectsOpen.values()]` for the trees, `scope`, `gitSettings.enabled` and
`sync.status` for the one sync word, `activeProfile` for the name and the soul.

The branch of each checkout is deliberately not in it. `listBranches` shells out to git and
`session()` is called on a socket upgrade; the checkout folder name is the branch name with
its slashes flattened, which is enough to say where you are, and `GET /api/branches` is in
the brief for when it is not.

**The API address.** The brief has to print a port, and the context does not know it —
`startServer` does, after `listen`. It already calls `context.start()` there; that call
takes the url and stashes it, defaulting to `http://127.0.0.1:3001` for a context nobody
started. One field.

## 3 · `apps/web/src/components/terminal/kinds.ts` — the command shrinks

`BRIEF` and `quoted()` are deleted. `command` loses its argument:

```ts
export function command(kind: TerminalKind): string | null {
  if (kind !== 'claude') return null
  return `claude --dangerously-skip-permissions --append-system-prompt "$BROODMOTHER_BRIEF"\r`
}
```

The double quotes are the point: the expansion arrives as one argument with its newlines
intact. `core.tsx` stops reading `app.profile?.soul` for the shell it opens — one fewer
reason for the terminal to touch app state.

`Profile.soul`'s comment in `packages/shared` still reads "markdown appended to the system
prompt of claude shells opened here", which stays true. `packages/shared` is not otherwise
touched.

## 4 · Tests

`apps/server/src/brief/core.test.ts`, over the pure function:

- a vault with two projects names both, marks the one the scope is in, and prints the cwd
- no vault open says so and lists no trees
- a written soul appears under its heading, in place of the default
- no soul, an empty one and a whitespace one all fall back to the default
- the API section names `/api/doc/move` and does not name `/api/data` or `/api/profiles`
- paths under the home are shown with `~`

`apps/server/src/sockets/terminal.test.ts` gains one: a spawned shell's env carries
`BROODMOTHER_BRIEF`, and it is not empty.

`apps/web/src/components/terminal/core.test.tsx` loses the two soul tests — that behaviour
moved — and the remaining one asserts the short command: `--dangerously-skip-permissions`,
`--append-system-prompt "$BROODMOTHER_BRIEF"`, one line, typed only after the shell has
spoken.

Run `npm run check` and open the app: `⌘J`, the claude tab, then `/status` or asking it
where it is standing.
