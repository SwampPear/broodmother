<p align="center">
  <img src="apps/web/public/logo.png" alt="" width="72" height="72" />
</p>

<h1 align="center">broodmother</h1>

<p align="center"><strong>Local markdown optimized for collaboration between people and agents.</strong></p>

broodmother is a Mac app for reading and writing a folder of markdown files. The files on
disk are the source of truth and git is the history and the backup. It carries its own editor, 
backend and terminals in one window.

## Install

Take the disk image from the download page, drag the app to Applications, and right-click it
the first time and choose Open — the build is unsigned, so that first launch costs one extra
step.

## Running from a checkout

Needs **Node.js 22 or newer** and **git** on your `PATH`.

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

| Variable            | Default          | What it does                             |
| ------------------- | ---------------- | ---------------------------------------- |
| `BROODMOTHER_HOME`  | `~/.broodmother` | Where projects, profiles and config live |
| `BROODMOTHER_VAULT` | _unset_          | Open this vault instead of the last one  |

## Projects, profiles and vaults

`~/.broodmother/` holds projects; a project holds vaults and works as a profile.

```
~/.broodmother/
├── config.json           # this machine: which project and vault are open, sync settings
├── profiles/
│   ├── personal.json     # who you commit as, and the credentials you do it with
│   └── work.json
├── acme/
│   ├── project.json      # { "profile": "work" }
│   ├── handbook/         # a vault
│   └── notes/            # a vault
└── side-thing/
    ├── project.json      # { "profile": "personal" }
    └── wiki/
```

Every folder in the home is a project and every folder inside one is a vault — drop either
in by hand and it shows up, no registration step. The folder name _is_ the name, so renaming
a project is renaming the folder. `profiles/` is the one name a project cannot have, because
that is where the profiles live.

A profile is who you are, and a project is where you work. Profiles are shared by every project
rather than owned by one, so the identity you set up once, git author, presence colour, the
SSH key git offers and the `CLAUDE_CONFIG_DIR` its terminals run with, serves every project
that picks it. On a fresh machine broodmother asks who you are before it does anything else.

Creating a vault asks for a git remote, because a vault with nowhere to push is a vault you
lose. Vaults outside the home still open fine, pass a path or set `BROODMOTHER_VAULT`.

## Status

Local editing works end to end: vault tree, open, edit, save to disk, git sync, settings,
command palette, terminals. A write from anywhere else, a shell, another editor, a sync
pull, shows up in the open document, not just in the tree.

Live collaboration is intended in a future release.

## Contributions

Issues and pull requests are welcome and very much appreciated.