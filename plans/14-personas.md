# Vault personas

A voice for a dream's agent — code reviewer, archivist, whatever the vault needs — filed
in the vault so a dream's Claude node can wear it. The format follows skills: a folder per
persona under `<checkout>/personas/`, a `PERSONA.md` whose frontmatter carries one
`description:` line and whose body is the persona itself, in the SOUL.md mould. A
`agent.claude` node names a persona and the run passes the body to the agent as
`--append-system-prompt` — layered on the agent's own system prompt, so its tools keep
working and the node's prompt stays the task.

## What changes for a dream

`ClaudeNode` gains an optional `persona`, the inspector gains a picker fed by
`GET /api/personas`, and `claudeAgent` grows the flag. A node with no persona runs exactly
as before; a node naming one the vault does not have fails its step loudly — a run in the
wrong voice is worse than an error.

## Decisions

**The vault carries the personas, not the profile.** Same reasoning as skills: inside the
clone, so the folder syncs, branches, follows the vault, and shows in the sidebar — a
`PERSONA.md` is markdown, so editing a persona is editing a document. And the same rule as
`agent.note`: personas are a vault idea wherever the dream lives, so a dream in a project
checkout still resolves them from the open vault.

**The folder name is the name.** The frontmatter may carry a `name:`; it is not read.

**A fence-less file works whole.** A `SOUL.md`-style file copied in as `PERSONA.md` — no
frontmatter — is listed with the fallback description and its whole text becomes the
body. The corpus this feature exists to hold has no frontmatter, so the format bends,
not the corpus.

**The list is light, the body is read at run time.** `scanPersonas` carries only name and
description — for the brief-style cache on `OpenVault` and the picker's payload — and
`readPersona` reads the body when a run needs it, so an edit between scan and run is
never stale. The name comes from a hand-editable `.dream` file, so `readPersona` refuses
anything that is not a plain folder name rather than reaching outside `personas/`.

**Append, not replace.** `--append-system-prompt` layers the persona on Claude Code's own
system prompt. Replacing it would be purer role-play and a worse agent.

**Seeded only where broodmother writes the first commit.** Same paths as skills, same
placeholder-as-documentation trick: the `hello` persona announces itself in everything it
writes, so the end-to-end proof is one run.

**Not in the brief, for now.** The stated purpose is dreams. A `## Personas` section
beside `## Skills` in the brief is a decision for when a terminal agent needs to know the
voices — the seam (`BriefState`, `briefState()`) is one field away.

## 1 · `packages/shared` — the schema and the route

`ClaudeNode` gains `persona?: string`; the validator accepts a string or its absence, and
`serializeDream` emits the key only when it is worn, so old dreams round-trip
byte-identical. `api/personas.ts` carries `Persona { name, description }` and
`GetPersonas`, registered as `GET /api/personas` — shared rather than server-only because
the inspector's picker needs the list.

## 2 · `apps/server/src/vault/personas.ts` — scan, read, seed

The skills.ts shape: `scanPersonas(checkout)` sorted by folder name, description off the
same one-regex fence; `readPersona(checkout, name)` answering the body with the fence
stripped, or null; `seedPersonas(checkout)` writing `personas/hello/PERSONA.md`. All three
leave through the vault barrel; `createVault` seeds on both first-commit paths.

## 3 · `apps/server/src/dreams` — wearing it

`DreamsDeps` gains `persona?(name)`, closed over in `context.ts` beside `vault()` and
answering off the open vault. `perform` resolves the node's persona before dispatch and
throws `DreamError` when the name resolves to nothing — the step errors, downstream
skips, and the route's existing `DreamError` mapping answers 400. `claudeAgent` takes the
resolved body and appends the flag. `OpenVault` caches `personas` the way it caches
`skills`, refreshed by the same watcher seam, and `GET /api/personas` in `app.ts` answers
the cache — empty when no vault is open, because that is the picker's right answer.

## 4 · `apps/web/src/components/dream/core.tsx` — the picker

The canvas fetches the list once on mount; the inspector's `agent.claude` block gains a
`persona` select under the prompt — `none` clears the field back to absent, and a name
the vault no longer has stays visible as `(missing)` rather than snapping silently to
none on the next edit.

## 5 · Tests

`packages/shared/src/dream/core.test.ts`: a worn persona serializes, round-trips, and is
absent when unworn; a non-string persona is refused.

`apps/server/src/vault/personas.test.ts`, the skills.test.ts suite plus `readPersona`:
fence stripped, fence-less file whole, missing name null, path tricks null.

`apps/server/src/dreams/core.test.ts`: the harness agent records its persona argument —
the body reaches the agent, an unworn node passes null, a missing persona fails the step
and the run.

`apps/server/src/vault/vaults.test.ts`: the placeholders land beside the README and in
the first commit.

`apps/web/src/components/dream/core.test.tsx`: the picker offers the mock's personas,
writes the pick into the file, and `none` takes it back out.

Run `npm run check`, then `npm run localhost` against a throwaway `BROODMOTHER_HOME`:
make a vault, confirm `personas/hello/`, wear `hello` on a Claude node in a `.dream`,
run it, and read the step output announce the persona — then point the node at a name
that is not there and watch the run error.
