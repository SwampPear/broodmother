# 01 — Markdown codec

**Parallel.** Owns `packages/markdown/**`. Reads `packages/shared/src/doc.ts`.

## Goal

Lossless conversion between markdown text and the document tree. The highest-risk piece in
the project: if it round-trips imperfectly, every save quietly corrupts a file and
`git diff` fills with noise nobody can review.

## Deliverables

1. **`parse(md): DocNode`** — markdown-it mapped onto `SCHEMA_SPEC`. Anything markdown-it
   produces that isn't in the spec becomes literal text rather than being dropped.
2. **`serialize(doc): string`** — the inverse, deterministic: one blank line between
   blocks, `-` for bullets, fenced code with language, unpadded pipe tables. Determinism is
   what keeps git diffs small.
3. **Wikilinks** — `[[Page]]` and `[[Page|alias]]` round-trip byte-identically. The
   existing vault uses them and Obsidian has to keep reading the same files.
4. **Frontmatter** — preserved verbatim as an opaque string. Don't parse it, don't
   reformat it, don't reorder keys.
5. **Round-trip tests** — the real deliverable. `parse(serialize(d))` deep-equals `d`, and
   `serialize(parse(md))` equals `md` for normalized input.
6. **Corpus test** — copy the real vault's `.md` files from `../../docs/` into `fixtures/`
   and assert every one survives `serialize(parse(f))` unchanged. Real documents catch what
   generated cases don't.

## Done when

- Both round-trip properties hold, and the vault corpus produces zero diffs.
- Pure functions: no I/O, no React, no ProseMirror runtime.

## Not this plan

Rendering. You produce and consume trees; the editor displays them.
