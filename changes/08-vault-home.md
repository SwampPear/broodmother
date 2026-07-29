# 08 · Vault home at `~/.mother`

`6401a89` 26 files, +905 −80

## What landed

Vaults live in `~/.mother/`. **Every plain folder there is a vault** — drop a clone in by
hand and it is picked up with no registration step. Files and dotted entries are skipped,
which is what stops `~/.mother/config.json` from being listed as one.

```
~/.mother/
├── config.json          # app state: which vault is open, identity, relay
├── handbook/       # a vault — a real git clone with an origin
└── scratch/             # another, discovered automatically
```

New surface: `apps/server/src/vaults.ts` (`vaultHome`, `listVaults`, `createVault`,
`assertVaultName`), three routes (`GET /api/vaults`, `POST /api/vaults`,
`POST /api/vaults/open`), and a `VaultPicker` in the web app reachable from
`⌘K → Switch or create vault`.

## A vault is always git-backed

Creating one requires a remote URL and branch. The remote is proven reachable **before
anything is written**, then:

- branch has commits → `git clone --branch <branch>`
- remote reachable, branch empty → `git init -b`, `git remote add origin`, seed a README,
  commit, and let the first sync push it

A failed remote leaves nothing behind. There is no unlinked vault to repair later, because
git is the history and the backup and a vault with nowhere to push is a vault you lose.

## Config moved out of the vault

It was `<bootstrap root>/.docs/config.json`; it is now `~/.mother/config.json` — beside the
vaults rather than inside one, so the choice of vault survives switching between them. This
resolved the ambiguity `apps/server/CONTRACT-REQUEST.md` §5 had raised.

## `vaultPath` became nullable

"No vault yet" is the honest first-run state, so `MotherConfig.vaultPath` is
`string | null`. `AppContext` holds an `OpenVault | null` and exposes `open`, which throws
`NoVaultError`; routes needing a vault answer **409** rather than pretending an empty one
exists. The web app shows the picker instead of an empty tree.

Resolution order on startup: explicit CLI argument → `MOTHER_VAULT` → the vault open last
time → the first vault in the home → none. The resolved choice is persisted, or the open
vault and the reported config would disagree.

## Per-vault remotes

Each vault is a real clone, so its own `origin` is the truth about where it syncs — not a
field in a single global config that would be wrong the moment you switched. `Git.remoteUrl()`
was added and `openVault()` adopts the remote of the vault it opens.

## Verified

14 unit tests, 6 route tests, 5 picker tests. Also smoke-tested against a live server and a
real bare remote: empty home → 409; create → cloned, committed, `origin` set, config
switched; a folder dropped in by hand appeared immediately; `config.json` stayed off the list.

Test isolation needed fixing at the same time — with the config file now in the vault home,
server tests would have written to the developer's real `~/.mother`. Every `startServer` call
in the suite now passes a temp `home`.
