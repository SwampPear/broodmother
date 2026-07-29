# 02 · Markdown codec

`ff172ee` schema conformance, math nodes, canonical mark order

## What landed

`packages/markdown` — the parse/serialize pair that turns a `.md` file into the document
model and back. Public surface is three functions:

```ts
parse(markdown) // markdown → document
serialize(document) // document → markdown
render(markdown) // markdown → HTML, for reading mode
```

Plus `wikilink.ts` for `[[Page Name]]` / `[[Page Name|label]]`, and `math.ts` for `$…$` and
`$$…$$` spans.

## The property that matters

The codec is the only thing standing between the editor and files a human also edits in
Obsidian, so the invariant is **round-tripping**: `serialize(parse(x))` must equal `x` for
anything we claim to support. Marks are emitted in a canonical order so that re-saving an
untouched document is a no-op rather than a diff — without that, opening a file would dirty
the git working tree and the sync loop would commit noise.

This is the most heavily tested package in the repo — 276 tests, the bulk of the suite —
split between `roundtrip.test.ts` and `corpus.test.ts`.

## The corpus test

`corpus.test.ts` runs the round-trip over `packages/markdown/fixtures/`, which are verbatim
copies of real pages from the `proprium-docs` vault — whitepaper notes, business plans,
research pages, meeting notes. Real documents with real frontmatter, tables, nested lists,
math, and wikilinks, rather than fixtures written to be easy.

**They must stay verbatim.** Reformatting them — including running Prettier over the repo,
which will happily reflow them — invalidates the test. Two separate passes during this
sprint had to revert exactly that.
