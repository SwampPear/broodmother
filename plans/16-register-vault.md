# 16 — Register the vault

Registering a repository on the lair is today a CLI errand — `lair sites add <name>
<remote>` — asking the operator to retype two facts the app already holds: the open
vault's name and its git remote. This plan makes the Repositories section of the lair
panel live: it shows the lair's sites and their pull state, shows the deploy key with a
copy button, and offers one button that registers the open vault under its own name and
remote. The lair itself does not change.

## Goal

1. Open Settings → Lair with a key stored and see the lair's sites — name, remote, how
   the last pull went — and the lair's public deploy key, copyable, with the hint about
   adding it to the forge.
2. Press **register this vault** and the open vault appears as a site, cloned from the
   same remote the vault syncs with. A vault already registered says so instead of
   offering the button; a vault without a remote is told why there is nothing to press.
3. The dream editor's empty site picker points at the panel instead of the CLI.

## Decisions

**The lair's gate stands.** `PUT /sites` demands the admin token, and this plan does not
demote it: a key holder who can register remotes can make the lair clone — and later push
to — anything its deploy key reaches. The app's stored key may _be_ the admin token
(`keyed()` accepts it everywhere), so on a personal lair the button just works. On a
shared lair a plain key gets the lair's own refusal, worded in the panel: registering
takes the admin token, pasted here or spoken through the CLI.

**Name and remote are derived, not typed.** The site name is the vault folder's name,
the remote is the vault's `origin` — both read server-side at press time, never sent up
from the browser. A name the lair would reject (its `NAME` regex, now shared) or a
missing remote disables the button with the reason; a remote already among the sites
renders as "registered as `<name>`". The lair's own idempotency covers the race: same
name and remote answers the existing site, same name elsewhere answers its error.

**Only the open vault.** Registering is an act about where you are standing, like every
other act in the app. Other vaults are a loop over this later, not a picker now.

## 1 · `packages/shared`

- `siteNameOk` beside the lair types: the `NAME` regex from `apps/lair/src/sites/core.ts`
  moves to `api/lair.ts` and the lair imports it — one truth about what a site can be
  called, testable without a lair.
- Two local routes in `routes.ts`:
  - `GET /api/lair/sites` — `{ sites: LairSite[]; publicKey: string; vault: { name:
string; remote: string | null } | null }`. The lair's answer plus what the open
    vault would register as; `vault` null when none is open.
  - `PUT /api/lair/site` — request `null`, response `{ site: LairSite }`. Derivation
    happens on the server at press time.

## 2 · `apps/server`

- `askLair` grows an optional per-call timeout. `GET /status` keeps its 15s; the
  register call rides 615s — the lair allows a clone ten minutes, and the proxy hanging
  up first would report a failure the lair never had.
- `context.ts`: `lairSites()` asks `GET /sites` and `GET /key` together and joins the
  open vault's name and `Git.remoteUrl()`; `registerVaultSite()` re-derives both,
  refuses plainly when no vault is open, the name will not do, or there is no remote,
  and otherwise forwards to `PUT /sites`. `LairRefused` keeps its wording — that is the
  admin-token story reaching the panel.
- `app.ts`: the two routes, in the existing lair block.

## 3 · `apps/web`

- `state.tsx`: `lairSites()` and `registerSite()` beside `lairDreams()`, same shapes.
- `settings/lair.tsx`: the Repositories section trades its prose for the live view,
  fetched when the panel opens and refetched after a register. Sites list with pull
  verdicts, the deploy key with a copy button and the forge hint, and the one button —
  busy as "cloning…" while the lair works, since a first clone of a real repository is
  not a beat. Without a stored key the section keeps a one-line version of today's hint.
- `dream/core.tsx`: the empty picker's label becomes "no sites yet — register one in
  Settings → Lair".

## Tests

Shared: `siteNameOk` accepts and rejects. Lair: `sites/core.test.ts` keeps passing with
the imported regex — no behavior change. Server: against the fake lair, `lairSites()`
joining sites, key and vault; register deriving from a temp vault with a file remote;
each refusal — no vault, no remote, bad name — answered without asking the lair;
`LairRefused` passing through. Web: the panel showing sites and key, the button's three
disabled states and the registered state, against the mock client.

## Order

Shared, then server, then web — each green before the next. The lair ships nothing.

## Not in this plan

- Registering vaults other than the open one, or projects as their own sites — a project
  lives inside its vault's clone already.
- Adding the deploy key to the forge for you. The profile's GitHub connection could do it
  for GitHub remotes — a follow-up with its own consent story, not a rider here.
- Demoting `PUT /sites` to keyed, or any lair auth change.
- Removing sites from the app. The lair has no `DELETE /sites`; when it grows one, the
  panel can speak it.

## Dependencies

None.
