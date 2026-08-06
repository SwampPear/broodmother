# Recall

What claude can find. The brief ([10](10-agent-brief.md)) taught an agent where the vault
is; nothing yet tells it what the vault says. Today an agent looking for "that note about
the sync conflict" greps from its cwd, and a question phrased differently than the note
was written finds nothing. The search index was cut from the original eighteen plans
"deferred entirely" — this plan is it coming back deliberately.

It comes back as **hybrid retrieval exposed as a route**: a SQLite index of every document
chunk, searchable by keyword (FTS5/BM25) and by meaning (embeddings in sqlite-vec), fused
by rank. The agent gets one new line in its brief — a search route — and calls it when it
wants to, the way it already calls `/api/links`. Nothing is stuffed into the prompt ahead
of time.

## What changes for the agent

The brief's **Asking the app** section gains one route:

```
  GET /api/recall    ?q=&k=&root=   search every document by keyword and by meaning;
                                    returns path, heading, snippet, line — read the file
                                    for the rest
```

and **The trees** gains a scent of what is in them — the vault's document count and the
handful most recently touched:

```
  vault    ~/.broodmother/you/handbook/local    218 documents, lately:
             notes/sync-conflicts.md, journal/2026-08-01.md, people/ada.md
```

That is the whole prompt change. Retrieval is a tool the agent reaches for, not paragraphs
poured over it: the agent knows its own question, asks, reads what comes back, follows the
path to the file when a snippet is not enough. Pre-filling top-k chunks into the brief was
considered and rejected — the brief is composed before the agent has said anything, so
there is no question to retrieve for yet.

## Decisions

**One database, beside dreams.db.** `~/.broodmother/recall.db`, rows keyed by
`(profile, vault, root, path)`. The alternative — an index file per vault — changes the
on-disk layout under every vault for no gain; `RunStore` already establishes the
one-file-in-home pattern. Deleting the file is a full reindex and nothing else.

**better-sqlite3, not node:sqlite.** The built-in module on macOS is compiled without FTS5
and with extension loading omitted (`OMIT_LOAD_EXTENSION`), so it can run neither half of
the index. better-sqlite3 bundles its own SQLite with FTS5 on and loads sqlite-vec as an
extension. `dreams/db.ts` stays on `node:sqlite` — no reason to touch it. This plan adds
three dependencies (`better-sqlite3`, `sqlite-vec`, `@huggingface/transformers`) and that
is the ask the root CLAUDE.md requires; nothing else in the workspace grows a dep.

**Hybrid, fused by rank.** FTS5 finds `SyncLoop` and `ENOENT` — the rare exact terms
embeddings blur. Vectors find "why do edits vanish when two people type" in a note that
never uses those words. Each side returns its top 20; reciprocal rank fusion
(`1/(60+rank)`, summed) merges them without comparing scores, because BM25 scores and
cosine distances share no scale and normalizing them is a losing game.

**Chunks are headed sections.** A document splits at its headings; runt sections merge
into their neighbor, oversized ones split at paragraph seams (aim 100–1000 words). Each
chunk stores path, heading breadcrumb (`Sync › Conflicts`), start line, and a content
hash. Notebook cells are one chunk each. `.dream` files are graphs, not prose — skipped.
Headed sections beat fixed windows because the heading is the author already saying
"this part is about—", and it rides along as retrievable context.

**Embeddings are local and lazy.** `@huggingface/transformers` running EmbeddingGemma-300M
(quantized ONNX, ~200 MB fetched once into the HF cache, CPU inference well under 100 ms
a chunk) — no API key, no network after first download, which is the deal this app has
made everywhere else. Embedding runs on a debounced background queue (the `SyncLoop`
shape: note the edit, wait for idle, work through the dirty list). The FTS half of the
index updates synchronously on every write, so keyword search is never stale and never
waits on a model; a chunk whose hash is unchanged is never re-embedded, so vault open
after the first is cheap. The embedder is handed to the index as an async function —
tests pass a deterministic fake and never download anything (rule 4).

**Brute force, no ANN.** A vault is thousands of documents, maybe tens of thousands of
chunks. sqlite-vec scans that in milliseconds. Approximate indexes buy speed at six
figures of vectors and cost recall; when a vault earns one, that is a new decision.

**The index follows the watcher.** `onTreeEvent` already tells `LinkIndex` about every
create, write, and unlink; `Recall` subscribes at the same seam. Vault open enqueues a
reconcile (hash every document, index what changed) rather than a rebuild.

## 1 · `packages/shared/src/api/recall.ts` — the contract

The route registry opens for one entry, the same single-commit way it did for dreams and
branches:

```ts
export interface RecallHit {
  root: DocRoot
  path: DocPath
  heading: string // breadcrumb, '' at document top
  line: number // first line of the chunk
  snippet: string // the matched chunk, trimmed to ~500 chars
  score: number // fused rank score, higher is better
}

export interface RecallSearch {
  query: { q: string; k?: number; root?: DocRoot }
  response: { hits: RecallHit[]; indexed: number; pending: number }
}
```

`pending` is how many chunks still await embedding — an honest answer while the queue
drains beats pretending the semantic half is complete.

## 2 · `apps/server/src/recall/` — the index

The shape every area has: `core.ts` and a barrel, plus the parts —

- `chunk.ts` — `chunk(markdown, path): Chunk[]`. Pure; splits at headings, merges runts,
  carries breadcrumb and start line. Its own tests.
- `embed.ts` — `Embedder = (texts: string[]) => Promise<Float32Array[]>`, and the one real
  implementation over `@huggingface/transformers`. EmbeddingGemma is asymmetric: documents
  embed under its document prompt, queries under its query prompt — `embed.ts` owns both
  spellings so nobody else knows them.
- `store.ts` — better-sqlite3 + sqlite-vec. Tables: `chunks` (path, root, heading, line,
  hash, text), `chunks_fts` (FTS5, external content on `chunks`), `chunks_vec` (vec0,
  rowid-joined to `chunks`). `CREATE TABLE IF NOT EXISTS` in the constructor, the
  `RunStore` way.
- `core.ts` — `class Recall`: `reconcile()`, `update(root, path)`, `forget(root, path)`,
  `search(q, k, root?)`, the debounced embed queue, `close()`. Collaborators (tree reader,
  embedder, clock for the debounce) arrive as constructor arguments.

`search()` runs the FTS query and — when the query's embedding is ready — the vector
query, fuses, joins back to `chunks` for snippets. Search never blocks on indexing.

## 3 · `apps/server/src/context.ts` and `app.ts` — the wiring

`AppContext` builds one `Recall` beside `RunStore` with `path.join(home, 'recall.db')`.
`useVault()` points it at the new tree and enqueues `reconcile()`; `onTreeEvent()` calls
`update`/`forget` where it already calls the link index. `app.ts` gains
`GET /api/recall` reading `q`, `k`, `root` from the query string, the shape every GET here
has. Errors are `{ error }` like everywhere else.

## 4 · `apps/server/src/brief/` — the one new line and the scent

`asking()` adds the `/api/recall` line shown above. `BriefState.vault` gains
`documents: number` and `recent: DocPath[]` (capped at five), read off the tree state
`briefState()` already holds — no disk, still pure, still synchronous. `trees()` renders
them. Dream agents get the same route line appended to the protocol block in
`dreams/blocks/claude.ts`, so a workflow step can search the vault it is about to write
into.

## 5 · Order of work

FTS first, vectors second. Steps 1–4 with the store's vector half stubbed out ship a
working keyword search — useful the day it lands, no model download, no new concepts.
Then `embed.ts`, the queue, and fusion turn the same route hybrid without the contract
moving. If EmbeddingGemma disappoints on real notes, the embedder is one function to swap
(nomic-embed-text is the fallback, same interface).

## 6 · Tests

`chunk.test.ts` — headings split, runts merge, breadcrumbs and line numbers land right,
a notebook's cells come out one chunk each.

`store.test.ts` / `core.test.ts` — over a temp db and a fake embedder that hashes text
into a small deterministic vector:

- index two documents, search a rare keyword: the right path and line come back
- search a paraphrase only the fake-vector side can match: it comes back once embedded,
  and `pending` says so before
- edit a document: the changed chunk re-embeds, the unchanged one keeps its hash and does
  not
- unlink: its chunks stop matching
- `root=` filters to one tree
- fusion: a hit found by both halves outranks a hit found by one

`brief/core.test.ts` gains: the recall route is named, the vault line carries its count
and recent documents, no vault open renders neither.

Run `npm run check`, then the app with a throwaway `BROODMOTHER_HOME`: open a vault, ask
the claude tab a question its notes answer in different words than the question uses.
