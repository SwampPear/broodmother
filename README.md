<p align="center">
  <img src="apps/web/public/logo.png" alt="" width="72" height="72" />
</p>

<h1 align="center">broodmother</h1>

<p align="center"><strong>Local markdown optimized for collaboration between people and agents.</strong></p>

broodmother is a Mac app for reading and writing a folder of markdown files. The files on
disk are the source of truth and git is the history and the backup. It carries its own editor,
backend and terminals in one window.

## Download

**[Download broodmother for macOS →](https://github.com/SwampPear/broodmother/releases/latest)**

Click that, take the `.dmg` off the release, and open it. Then:

1. **Drag broodmother onto Applications**, and eject the disk image.
2. **Right-click the app in Applications and choose Open** — not a double-click. The build
   is not signed by Apple yet, so a double-click gets you a warning and nothing else, while
   the right-click gets you the same warning with an Open button on it. Once only; every
   launch after that is a normal one.

Apple silicon only for now. On anything else, run it from a checkout.

## First run

broodmother asks two questions before it shows you anything, and they are the two ideas the
whole app is built out of.

**Who you are — a profile.** A name, the git author name and email your commits carry, a
colour you are shown in, and optionally an SSH key for git to offer and a
`CLAUDE_CONFIG_DIR` for the terminals to run with. One profile is enough; make more when you
want work and personal commits signed differently.

**Where you work — a vault.** A folder of markdown with git behind it. Creating one asks for
a name, a git remote and a branch, and the remote is checked before anything is written,
because a vault with nowhere to push is a vault you lose. An existing branch is cloned; an
empty one is initialised and pushed on the first sync.

After that the window is a file tree, tabs, and the document. **⌘K opens everything**: it
searches your documents and the app's commands in one list, so a file name and "Toggle
terminal" are the same keystroke away. **⌘J** shows the terminal panel, and a tab can be a
shell or Claude Code running inside the vault.

Sync is off until you turn it on, in Settings, where the idle delay before it commits and
pushes lives too.

## Vaults, worktrees and profiles

`~/.broodmother/` is the home: it holds your vaults and the profiles they commit as.

```
~/.broodmother/
├── config.json           # this machine: which vault is open, which checkout in it, which
│                         # profile each commits as, sync settings
├── profiles/
│   ├── personal.json     # who you commit as, and the credentials you do it with
│   └── work.json
├── handbook/             # a vault
│   ├── local/            # the clone, on the default branch
│   ├── fix-login/        # a worktree, on its own branch
│   └── spike-auth/       # another
└── notes/                # a vault
    └── local/
```

### A vault is where you work

Every folder in the home is a vault — drop one in by hand and it shows up, no registration
step. The folder name _is_ the name, so renaming a vault is renaming the folder. `profiles/`
is the one name a vault cannot have, because that is where the profiles live. Vaults outside
the home still open fine: pass a path or set `BROODMOTHER_VAULT`.

Switching between them, and making a new one, is the vault menu at the top of the tree —
or `Switch or create vault` from ⌘K.

### A worktree is the same vault on another branch

A vault holds checkouts rather than files. `local/` is the clone itself, on the default
branch, and it is the one every vault has. Beside it sit git worktrees: second checkouts of
the same repository, each on its own branch, each with its own files on disk. Switching to
one shows that branch's files and that branch's tabs; switching back to `local` shows what
is checked out on the default branch. Nothing is stashed and nothing is swapped — the
branches are simply in different folders, which is what a worktree is.

Making one asks for a branch, new or existing, and the folder to put it in. Removing one
removes the folder and git's record of it; the branch stays in the repository, and git
refuses rather than throw away work that was never committed. `local/` cannot be removed,
because it is the repository the others point into.

### A profile is who you are

Profiles are shared by every vault rather than owned by one, so the identity you set up
once — git author, presence colour, the SSH key git offers and the `CLAUDE_CONFIG_DIR` its
terminals run with — serves every vault that picks it. Which profile a vault commits as is
recorded in `config.json` rather than in the vault, because a vault is a git working tree
and anything written inside one is something the sync loop would offer to commit.

Earlier versions put a project folder between the home and its vaults, and made the vault
folder the checkout itself. Opening this version on one of those homes moves the vaults up
into the home, carries each one's profile into `config.json`, and moves each vault's
checkout down into `local/` — once, on the first launch. Everything moves; nothing is
rewritten and nothing is deleted.

## Running from a checkout

The app above is the same thing packaged. Running it yourself needs **Node.js 22 or newer**
and **git** on your `PATH`.

```bash
git clone git@github.com:SwampPear/broodmother.git
cd broodmother
npm run setup            # install dependencies and put `broodmother` on your PATH
```

Then, from anywhere:

```bash
broodmother                   # start the backend and the site; ctrl-c stops both
broodmother ~/path/to/vault   # ... or point it straight at one vault
```

A browser opens at <http://127.0.0.1:6767> once the site is ready. Inside the checkout,
`npm run dev` does the same without installing anything onto your `PATH`.

| Variable            | Default          | What it does                            |
| ------------------- | ---------------- | --------------------------------------- |
| `BROODMOTHER_HOME`  | `~/.broodmother` | Where vaults, profiles and config live  |
| `BROODMOTHER_VAULT` | _unset_          | Open this vault instead of the last one |

## Status

Local editing works end to end: vault tree, open, edit, save to disk, git sync, settings,
search, terminals. A write from anywhere else, a shell, another editor, a sync pull, shows
up in the open document, not just in the tree.

Live collaboration is intended in a future release.

## Contributions

Issues and pull requests are welcome and very much appreciated.
