# 11 · Profiles on disk

_uncommitted_

## What landed

Profiles moved out of the browser and onto disk, and there is no longer a default one.

`~/.mother/` used to hold vaults. It now holds **profiles**, and a profile holds its vaults:

```
~/.mother/
├── config.json           # this machine: active profile, open vault, sync settings
├── michael/
│   ├── profile.json      # { presenceColor, gitAuthor }
│   └── proprium-docs/    # a vault
└── work/
    ├── profile.json
    └── handbook/
```

The same rule applies one level down as before: every folder in the home is a profile, every
folder in a profile is a vault, and either can be dropped in by hand. A profile folder with
no `profile.json` is still a profile — its identity fills in from the folder name, field by
field, the way [08](08-vault-home.md)'s config repair works.

## Why there is no default

The visible symptom was a profile named _Ada_ that nobody remembered creating. It came from
`seed()` in the old `apps/web/src/profiles.ts`: profiles lived in `localStorage`, and on
first run one was invented from `config.displayName`, which `defaultConfig` had in turn
invented from the OS username. Three layers of guessing produced a stranger in the menu.

So identity is now something you state once and nothing infers:

- `defaultConfig` has no identity fields at all — `MotherConfig` lost `displayName`,
  `presenceColor` and `gitAuthor`, and gained `profile: string | null`.
- With no profile folders, `GET /api/profiles` answers `active: null` and the web app is a
  single blocking setup gate. Nothing else renders; `GET /api/vaults` answers 409.
- After that a profile is _detected_, not registered: whatever was active last, else the
  first folder in the home.

The folder name **is** the profile name and the display name. That kills the id/name/display
drift the localStorage version had — renaming a profile is renaming the folder, and there is
no third place for the two to disagree.

## Consequences worth knowing

**Switching profile switches vaults.** A vault belongs to the profile it sits in, so
`useProfile` keeps the open vault only if it is inside the new profile, and otherwise falls
to that profile's first vault, or the picker. This contradicts what the add-profile modal
said when it was written ("the vault, remote and branch you have open carry over") — that
copy is now wrong and has been replaced.

**Who commits.** `SyncLoop` took the author from the config; it now takes a
`author: () => GitAuthor | null` and refuses to commit without one, which is the honest
answer when no profile exists. `Relay` reads presence from the profile the same way.

**Settings.** The identity fields left the settings form's config draft and became a
`Profile` fieldset with its own save, because they now write to `profile.json` through
`PUT /api/profiles` rather than to `config.json`.

## Decided against

- **Profiles beside vaults** (`~/.mother/.profiles/<name>/`, vaults staying top-level). Keeps
  a profile independent of any vault, but then "a folder in the home" means two different
  things depending on where you look, and switching profile means nothing changes.
- **Profile == vault** (identity in `<vault>/.mother/profile.json`). Simplest to reach, but
  it forces one identity per vault and merges two menus that answer different questions.
- **Keeping identity in `config.json` as well**, mirrored for compatibility. Two sources of
  truth for the same fact is the bug this change removes.

## Not done here

The email field in the profile form is a plain text input rather than `type="email"`: native
constraint validation swallowed the submit before our own "needs an @" message could show,
so the check that produces a readable error is the one that runs.
