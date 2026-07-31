<p align="center">
  <img src="apps/web/public/logo.png" alt="" width="72" height="72" />
</p>

<h1 align="center">broodmother</h1>

<p align="center"><strong>Local markdown optimized for collaboration between people and agents.</strong></p>

broodmother is a Mac app for reading and writing a folder of markdown files. The files on
disk are the source of truth, and git — when you want it — is the history and the backup. It
carries its own editor, backend and terminals in one window.

## Download

**[Download broodmother for macOS →](https://github.com/SwampPear/broodmother/releases/latest)**

Click that, take the `.dmg` off the release, and open it. Then:

1. **Drag broodmother onto Applications**, and eject the disk image.
2. **Approve it the first time.** The build is not signed by Apple yet, so the first
   double-click is refused outright. Open System Settings → Privacy & Security, find the
   note saying broodmother was blocked, and click **Open Anyway**. Once only; every launch
   after that is a normal one. On macOS 14 and earlier, right-clicking the app and choosing
   Open does the same job — macOS 15 removed that shortcut, so it is no longer the answer
   to give first.

Apple silicon only for now.

## First run

broodmother asks one question before it shows you anything.

**Who you are — a profile.** A name, the git author name and email your commits carry, a
colour you are shown in, and optionally a `CLAUDE_CONFIG_DIR` for the terminals to run with.
One profile is enough; make more when you want work and personal commits signed differently.
It is asked because it is the one thing the app cannot invent: a vault is created working as
a profile, so there has to be one to name.

**Nothing is asked about credentials.** broodmother pushes with whatever git and ssh already
have on this machine — your agent, the keys in `~/.ssh`, and the credential helper git is
configured with, which on a Mac is the login keychain. If you have ever pushed from a
terminal, you are already set up. See [Git access](#git-access) for the two buttons that
exist for when you are not.

Then it gets out of the way. An app with nothing in it is a state you are allowed to stand
in, and there is no second gate.

**Where you work — a vault.** A folder of markdown, with as much git behind it as you want.
Making one is `New vault…` in the selector at the head of the tree — the same row the tenth
one comes from, and it opens whether or not you have any. It asks for a name and how much
git: none at all, a repository with no remote, or one that syncs. Given a remote, it is
checked before anything is written, because a vault that was asked to sync and cannot is
worse than one that was never asked — an existing branch is cloned, an empty one is
initialised and pushed on the first sync.

After that the window is a file tree, tabs, and the document. **⌘K opens everything**: it
searches your documents and the app's commands in one list, so a file name and "Toggle
terminal" are the same keystroke away. **⌘J** shows the terminal panel, and a tab can be a
shell or Claude Code running inside the vault — **⌘D** splits that tab beside itself and
**⌘⇧D** below, with **⌘[** and **⌘]** between the panes.

Sync is off until you turn it on, in Settings, and it is set per vault — one can push on
every quiet moment while the next keeps its history to itself. Under the switch are the
steps it is made of: whether to commit for you, whether to pull, whether to push, and how
long the vault has to be quiet first. A vault with no repository has nothing to set.

## Vaults, projects, branches and profiles

`~/.broodmother/` is the home, and everything broodmother has is inside it: profiles hold
vaults, and vaults hold projects. Nothing is stored anywhere else, and no folder is ever
typed in — a name is all any of them takes.

```
~/.broodmother/
├── config.json             # this machine: who you are working as, which vault is open,
│                           # which checkout in it, which project inside it, how each syncs
├── personal/               # a profile
│   ├── profile.json        # who you commit as, and the credentials you do it with
│   ├── profile.key         # the key broodmother made for it, if it has one
│   ├── handbook/           # a vault
│   │   ├── local/          # the clone, on the default branch
│   │   ├── fix-docs/       # a branch you have opened, checked out here
│   │   ├── spike-auth/     # another
│   │   └── .projects/
│   │       └── api/        # a project
│   │           ├── local/  # the repository itself
│   │           └── fix-login/  # a branch of it, checked out here
│   └── notes/              # another vault
│       └── local/
└── work/                   # another profile, with vaults of its own
    └── profile.json
```

### A vault is where you work

Every folder in a profile's folder is a vault — drop one in by hand and it shows up, no
registration step. The folder name _is_ the name, so renaming a vault is renaming the
folder. Which profile a vault commits as is which folder it is in, so the vaults you can
open are the ones belonging to the profile you are working as.

Switching between them, and making a new one, is the vault menu at the top of the tree — or
`Switch or create vault` from ⌘K.

Git is optional, and it is optional one vault at a time. A vault can be a plain folder of
markdown, a repository with no remote, or a clone that syncs — and nothing else in the app
changes between them: the same tree, the same tabs, the same `local/` you work in. Whether
a vault has a repository is never read out of the config; it is asked of the folder, so a
vault you `git init` in a terminal is git-backed from the next time it is opened, and one
whose remote you repoint is pointed there.

### A project is what the documents are about

Notes about a codebase are not the codebase. A **project** is a repository the vault's
documents are about, and it lives in the vault under `.projects/`. A docs repo usually
covers several, so a vault has as many projects as it needs; a project belongs to the one
vault, and goes wherever the vault goes.

`New project…` asks for a name, the vault it belongs to, and how much git it gets — the same
three amounts a vault is offered. Where it goes is not asked, because there is one answer.
Git is optional here as well: a folder of code with no repository still opens, and the
branch menu simply has nothing to offer. Deleting a project deletes the repository with it —
it is the only copy, so anything not pushed goes with it.

One project is open at a time. It is picked where the vault and the profile are picked —
the selector at the head of the tree, which is one list because it is one question: where
you are working, and who you are while you do it. `Switch project` from ⌘K opens the same
list. The open project's name sits beside the vault's, so neither has to be opened to be
read.

Its files appear in the sidebar under the vault's documents, and they open and edit like
any other file. Switching project swaps everything that belongs to where you are standing:
the tabs you had open there, the branch selector at the end of the tab bar, and the
directory a new terminal opens in — so an agent you start runs in the repository the work
is in.

### A branch is the same repository, checked out somewhere else

A vault holds checkouts rather than files. `local/` is the clone itself, on the default
branch, and it is the one every vault has. Beside it sit git worktrees: second checkouts of
the same repository, each on its own branch, each with its own files on disk. Switching
branch shows that branch's files and that branch's tabs. Nothing is stashed and nothing is
swapped — the branches are simply in different folders.

Projects work exactly the same way, one folder deeper: `.projects/<project>/local` is the
repository, on the default branch, and every other branch you open gets a worktree beside
it.

Each has its own branch menu, over the thing it changes: the vault's under the vault name at
the top of the tree, the project's at the end of the tab bar. Both list every branch the
repository knows, the ones that exist only on the remote included. Picking one is the whole
gesture: a branch you have opened before is the folder you left, and one you have not is
fetched and given a folder on the way in. You never name that folder — it follows the
branch, with the separators flattened, so `feat/sync` lives in `feat-sync/`.

`New branch…` cuts one from wherever the repository's own checkout is now. Removing a branch
removes its folder and git's record of it; the branch itself stays in the repository and
opening it again gives it a folder again, and git refuses rather than throw away work that
was never committed. The repository's own checkout cannot be removed — for a vault because
it is the clone the others point into, and for a project because it is your folder.

### A profile is who you are

A profile is a folder in the home, and its vaults are the folders in it — so the identity
you set up once (git author, colour, and the `CLAUDE_CONFIG_DIR` its terminals run with)
serves everything filed under it, and which profile a vault commits as is a fact about
where it sits rather than a note kept somewhere else. Working as someone else moves you to
their vaults.

The profile belongs to the vault, not to the project: the projects are the vault's, and
switching between them does not change who you are while you work.

Sync is the vault's alone. Committing markdown you are typing is what it is for; committing
a code repository nobody asked it to would be a different program, so a project's history is
yours to make.

### Git access

broodmother runs git the way your terminal does, so it authenticates with whatever is
already there: your ssh agent, the keys in `~/.ssh`, and the credential helper git is
configured with — `osxkeychain`, on a Mac with the command line tools. A key named on a
profile is offered _as well as_ those, not instead of them. If you have ever pushed from a
terminal, none of the rest of this section applies to you.

**Connect GitHub** in Settings → Profile is for when it does. It is GitHub's device flow:
the app shows an eight-character code, you type it into the page it opens, and that is the
whole of it — no password reaches broodmother, and there is nothing to paste back. What it
buys is the two walls in front of someone who has never used git from a terminal. A vault or
a project that syncs stops asking for a URL and offers your own repositories instead, with
"a new private repository" among them — made through GitHub's API, so the web is no longer a
step before this one. And pushing uses the connection, so there is no key to make and none
to add anywhere.

The token belongs to the profile, lives in its file at `0600` beside the key, and never
reaches the app in the browser — what the UI is told is the login it belongs to. Only `repo`
is asked for, which is what pushing to a private repository and making one need. Disconnect
from the same place; what was pushed stays pushed.

Connecting needs the build to carry a GitHub client id in `BROODMOTHER_GITHUB_CLIENT_ID`
(register an OAuth app with device flow enabled; the id is public, and the flow uses no
secret). A build without one shows no connect button at all.

Two buttons in Settings exist for the hosts this does not cover:

**Check access** asks the open vault whether it can actually reach its remote, and names
which of the answers it got: no repository, no remote, reachable, unreachable, or refused.
A refusal says what to do about it, and says something different for an SSH remote (add a
key to your host) than for an HTTPS one (`git push` once from a terminal fills the helper) —
because they fail identically and are fixed differently.

**Generate a key** is for the person who has none. It runs `ssh-keygen -t ed25519` into the
profile, points the profile at it, and shows you the **public** half with a copy button and
a link to GitHub's and GitLab's add-a-key pages. No passphrase: git runs here with no
terminal to answer a prompt on, so a passphrase would make a key that cannot be used rather
than one that is safer. It refuses to make a second key over the first, because replacing a
key silently takes away access to everything the old one opened.

### Homes from earlier versions

Earlier versions kept profiles as files in `profiles/`, vaults as folders beside it, and
projects as repositories anywhere on disk that a register in the vault pointed at. Opening
this version on one of those homes rearranges it — once, on the first launch. Each profile
becomes the folder it now is, each vault moves into the profile it was bound to, and every
repository the register named moves into its vault. Everything moves rather than being
copied, `.git` included, and every checkout is repaired afterwards, because a worktree
remembers where its repository was. Earlier still, the vault folder was the checkout itself:
that one moves down into `local/` on the way past.

## Environment

| Variable                       | Default          | What it does                            |
| ------------------------------ | ---------------- | --------------------------------------- |
| `BROODMOTHER_HOME`             | `~/.broodmother` | Where the profiles and the config live  |
| `BROODMOTHER_VAULT`            | _unset_          | Open this vault instead of the last one |
| `BROODMOTHER_GITHUB_CLIENT_ID` | _unset_          | OAuth app id the GitHub connection uses |

## Status

Local editing works end to end: the vault tree, linked projects, open, edit, save to disk,
git sync, settings, search, terminals. A write from anywhere else, a shell, another editor,
a sync pull, shows up in the open document, not just in the tree.

Live collaboration is intended in a future release.

## Contributions

Issues and pull requests are welcome and very much appreciated.
