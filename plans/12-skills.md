# Vault skills

Workflows you run often enough to script — training a model on the cloud, deploying an
endpoint — filed in the vault so an agent can find them and run them. The format is the
Claude skills format: a folder per skill, a `SKILL.md` whose frontmatter carries one
`description:` line, the scripts beside it. The _discovery_ is broodmother's own — the
brief names the skills, not any agent's config directory — so a skill works the same
whichever agent wakes up in the terminal, and a skills folder copied in from elsewhere
works here unchanged.

## What changes for the agent

The brief grows a section between the trees and the API, rendered off the open checkout:

```
## Skills

Reusable workflows this vault carries, filed under
~/.broodmother/you/handbook/local/skills — one folder per skill, its scripts beside a
SKILL.md. The line here is only the trigger: read a skill's SKILL.md in full before
running it, and take what it needs — credentials, endpoints — from the environment,
never from a file.

  hello          prove the skills folder works — run it and read what it prints
  train-model    submit a training run to the cloud and watch it
```

One line per skill. The whole instruction set stays in the `SKILL.md`, read only when a
task matches — the same progressive disclosure the skills format was built around, paid
for once in the brief instead of once per agent runtime.

A vault with no `skills/` folder renders no section at all. Nothing else about the brief
moves.

## Decisions

**The vault carries the skills, not the profile.** `<checkout>/skills/` is inside the
clone, so the skills folder syncs with the vault, branches with it, follows it to the next
machine, and shows in the sidebar — a `SKILL.md` is markdown, so editing a skill is
editing a document. A profile-level skills folder would live on one machine and belong to
nothing; the vault whose notes are about ML work is the vault that should carry the ML
skills.

**The folder name is the name.** The same rule vaults and branches already follow. The
frontmatter may carry a `name:` — the skills format asks for one, and a folder copied
from a Claude config should not need editing — but it is not read. One authority, and it
is the one `mv` updates.

**Only `description:` is read, and unknown keys are ignored.** That is the whole
compatibility contract in both directions: any skills folder drops in, and a skill made
here works under Claude's native discovery if anyone ever points it there. The value is
one line — a description that needs more than a line belongs in the body.

**No YAML dependency.** One line between two `---` fences is a regex, not a parser. A
folder without a `SKILL.md` is not a skill and is skipped; a `SKILL.md` without a
description is listed as `no description — read its SKILL.md`, because a skill that
exists is worth naming even when nobody has said what for.

**Scanned on open, refreshed by the watcher.** `session()` is synchronous and stays so —
the scan cannot happen when a shell spawns. The list is read when the vault opens and
read again when a vault tree event lands under `skills/`, which the watcher already
reports; it is the `LinkIndex` shape, without the index. The brief stays a snapshot, and
a skill added mid-session reaches the next shell.

**Seeded only where broodmother writes the first commit.** A new plain vault and a new
repository get the placeholder beside their `README.md`; a cloned vault has whatever the
remote has, and writing into a clone would be inventing history. Existing vaults are
untouched — no migration, no section in their briefs until a `skills/` folder appears.

**The vault's alone, for now.** A project could carry skills the same way, rendered under
the vault's. Nobody has asked, and adding a location to the brief is a decision the way
adding a route is.

## 1 · `apps/server/src/vault/skills.ts` — the scan and the seed

New sibling of `links.ts`, which is the precedent: a disk-backed fact about the vault's
checkout, owned by the vault module.

```ts
export interface Skill {
  name: string
  description: string
}

export async function scanSkills(checkout: string): Promise<Skill[]>
export async function seedSkills(checkout: string): Promise<void>
```

`scanSkills` reads `<checkout>/skills/`, takes each directory holding a `SKILL.md`, and
returns `{ name, description }` sorted by name — the name from the folder, the
description from the first `description:` line inside the file's leading `---` fence,
trimmed, or the fallback when there is none. No `skills/` folder resolves to `[]`.

`seedSkills` writes the placeholder, `skills/hello/`:

**`SKILL.md`**

```markdown
---
name: hello
description: prove the skills folder works — run it and read what it prints
---

# hello

The placeholder every vault starts with, here to be copied and then deleted. A skill is a
folder under `skills/`: a SKILL.md whose `description:` line says when to reach for it,
and the scripts beside it that do the work.

Run it from this folder:

    python3 hello.py

Keep secrets out of skills. A script that needs a credential or an endpoint names the
environment variable it expects here, and the shell provides it.
```

**`hello.py`**

```python
print('hello from the skills folder — replace me with a workflow you actually run')
```

The placeholder is its own documentation: the first thing an agent reads when asked to
add a real skill is the example, in the format, saying so.

Both leave through the vault barrel.

## 2 · `apps/server/src/brief/core.ts` — the section

`BriefState` gains `skills: Skill[]`, the type imported from the vault barrel. `brief()`
gains a `skills(state)` between `trees` and `asking`; an empty list renders `''` and
the existing `filter(Boolean)` swallows it. The section is the fixed prose from the
rendered example above — the `filed under` path is `tilde()` of the vault checkout plus
`/skills` — and then the `section()` table, name against description.

`vault: null` renders nothing here too: no checkout, nowhere for a skills folder to be.

## 3 · `apps/server/src/context.ts` — wiring

`OpenVault` gains a mutable `skills: Skill[]`. `useVault` fills it with `scanSkills(target)`
where it builds the rest of the open vault. `briefState` reads
`this.vaultOpen?.skills ?? []` — one line, and `session()` is untouched.

`onTreeEvent` refreshes it: a vault event whose path — or destination, for a move — is
under `skills/` fires `scanSkills` again and replaces the array. The scan is a `readdir`
and a handful of small reads; rescanning whole costs less than being clever about which
half moved.

## 4 · `apps/server/src/vault/vaults.ts` — the placeholder

`createVault` calls `seedSkills(local)` beside the `README.md` write, on both paths that
write one: the plain folder, and the fresh repository — before `stageAll`, so the first
commit carries it. The clone path returns before either and stays as it is.

## 5 · Tests

`apps/server/src/vault/skills.test.ts`, over a temp directory:

- a folder with two skills names both, sorted, with their descriptions
- the name comes from the folder even when the frontmatter says otherwise
- a directory without a `SKILL.md` is not a skill
- a `SKILL.md` without a `description:` gets the fallback line
- no `skills/` folder at all scans to `[]`
- `seedSkills` then `scanSkills` round-trips: one skill named `hello`, with its description

`apps/server/src/brief/core.test.ts` gains:

- a state with skills renders the section: the `skills/` path with `~`, each name, each
  description
- an empty `skills` renders no `## Skills` at all

`apps/server/src/vault/vaults.test.ts` gains:

- a `none` vault is born with `skills/hello/SKILL.md` and `hello.py`
- a `local` vault's first commit includes them

`apps/server/src/sockets/terminal.test.ts` gains one: a shell spawned in a vault with a
skill carries its name in `BROODMOTHER_BRIEF`.

Run `npm run check`, then `npm run localhost` against a throwaway `BROODMOTHER_HOME`:
make a vault, `⌘J`, and ask the claude tab what skills it has — then add a folder under
`skills/` from a shell tab and ask a fresh one.
