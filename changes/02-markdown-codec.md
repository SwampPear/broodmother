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

This is the most heavily tested package in the repo, and `roundtrip.test.ts` carries it —
every construct the schema claims to support goes out and comes back.

## The corpus test

A second suite, `corpus.test.ts`, ran the same round trip over a `fixtures/` directory of
verbatim pages from a real vault: real frontmatter, tables, nested lists, math and
wikilinks, rather than fixtures written to be easy. It is what caught the math handling —
the round-trip assertions alone would have passed with the LaTeX mangled identically on
both sides, and only the node count noticed.

Both the fixtures and the test were removed in [16](16-open-source-scrub.md): the corpus
was a private vault and could not ship with the source.
