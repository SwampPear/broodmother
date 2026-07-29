# 14 · Projects, and profiles with credentials

`d4ca390`

## What landed

What used to be a profile is now a **project**, and profile means something else: who you
are, in a file of its own, carrying the credentials you work with. A project picks one. Both
are chosen from the same menu at the head of the tree.

## Why they had to split

A profile was doing two jobs at once. It was a folder in `~/.mother/` holding vaults — a
place — and it was also the identity that place committed as. That worked until the identity
had to hold more than a name: the SSH key git offers, the Claude login its terminals run as.
Those belong to a person and are the same wherever that person works, but a per-folder
identity meant retyping them for every folder, and a second project for the same person was
a second copy of the same credentials drifting apart.

So the folder kept the place and gave up the identity:

```
~/.mother/
├── config.json          # which project and vault are open, sync settings
├── profiles/
│   ├── ada.json     # identity + credentials, shared by every project
│   └── work.json
├── acme/
│   ├── project.json     # { "profile": "work" }
│   └── handbook/   # a vault
└── side-thing/
    ├── project.json
    └── notes/
```

Every folder in the home is still a project and every folder inside one is still a vault,
picked up by being there. `profiles/` is the one name a project cannot have, and it is
excluded from the listing rather than being allowed to shadow it. A project that arrives
without a `project.json` names no profile, which is a state the app asks about — never a
folder it refuses.

## Credentials are paths, not secrets

`Profile` gained `sshKeyPath` and `claudeConfigDir`. Both point at credentials that already
exist rather than holding one:

- `sshKeyPath` becomes `GIT_SSH_COMMAND` for that project's vaults, with `IdentitiesOnly`
  so the named key is the one offered rather than whichever the agent holds first.
- `claudeConfigDir` becomes `CLAUDE_CONFIG_DIR` in the environment of every shell the
  project opens.

Nothing secret is written into `~/.mother`, so a screenshot of the settings page is a
screenshot of two paths. `~` is expanded where the value is used, because `~` is what a
human types. Empty leaves git and Claude on their own defaults, which is what a profile with
nothing filled in should mean.

The key is fixed when a vault opens, so `setIdentity` reopens the vault rather than leaving
a stale one behind — cheap and honest against a rare edit.

## One menu, two questions

The tree head lists projects, then profiles, then what you can add. Picking a profile writes
it into the active project's `project.json`; making one from here selects it on the spot,
because a profile made from a project menu is one you meant to work as. The section with the
profiles in it is a radio group, so `New profile…` sits below with `Add a project…` rather
than among the people — a row in a radio group that is not one of the choices reads as one.

First run is two questions in the order they depend on each other: `ProfilePicker` (who you
are, with the profiles you already have to pick from — first run is the same modal with an
empty list), then `AddProject` (where you work, naming the profile it works as). Both are
modals over the empty home on the terms [13](13-tabs-and-profile-options.md) set. The picker
is also the answer for a project dropped in by hand, which names nobody: same question, and
this time the list is not empty.

## The rename

`profile` → `project` through the config file, the API, the context, the components and the
CSS. `POST /api/profiles/open` and `DELETE /api/profiles` are gone — opening is a project
concern now, and a profile is a file you can delete by hand where a project is a folder with
vaults in it that needs a confirmation naming the path. `PUT /api/projects` is the new one:
point the active project at another profile.

Old `~/.mother/<name>/profile.json` files are not migrated. They are ignored, the folder is
picked up as a project naming no profile, and the app asks — which is the same path a folder
dropped in by hand takes, so there is no migration-only code to keep working.

## Not done here

- Nothing reads the credentials beyond git and the terminal environment. A profile does not
  configure `git config user.*` in the vault itself, so a shell you type `git commit` into
  commits as whatever your global config says.
- Profiles cannot be renamed or deleted from the app. Both are one file operation in
  `~/.mother/profiles/`.
