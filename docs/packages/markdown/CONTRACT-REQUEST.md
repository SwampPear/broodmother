# Contract requests against `packages/shared/src/doc.ts`

Gaps found while building the codec against the real vault (89 files in `fixtures/`).
Each one is a case where `parse` cannot record something the source file carries, so
`serialize` cannot put it back. None is fixable inside `packages/markdown`.

Ordered by how much damage it does to a real file on save. Items 2–5 are still open.

## 1. Math — `$$…$$` and `$…$` — ACCEPTED AND IMPLEMENTED

Settled as two attr-less nodes rather than the one attr-carrying node requested below:
`mathBlock` for `$$…$$` and inline `math` for `$…$`, matching the editor's inline/block
split. The codec captures both verbatim. The vault's 276 math spans (12 `mathBlock`,
264 inline `math`) survive a round trip unchanged; 104 of those bodies contain sequences
the markdown parser used to rewrite. Original report kept below for the record.

`SCHEMA_SPEC` has no math node, so a `$$` block parses as a paragraph and its LaTeX goes
through inline markdown parsing. That rewrites it:

| source                 | after one save                            |
| ---------------------- | ----------------------------------------- |
| `\log\!\left(`         | `\log!\left(`                             |
| `Q\,(j\omega)`         | `Q,(j\omega)`                             |
| `\|Z\|_{\text{event}}` | `\|Z\|*{\text{event}}` (parsed as italic) |

`ECSEQ-1/Whitepaper/Whitepaper.md` and `Whitepaper/Appendix.md` have ~23 display-math
blocks between them, plus inline `$\eta$`-style math throughout. Opening either in the
editor and saving would silently break the equations.

Request: add `'math'` to `SCHEMA_SPEC.nodes` and

```ts
export interface MathAttrs {
  /** `$$` block when true, inline `$…$` when false. */
  display: boolean
}
```

with the LaTeX carried verbatim as a single `text` child and never inline-parsed — the same
treatment `codeBlock` already gets.

One thing the settled shape cannot record: `mathBlock` does not say whether a `$$` block was
written on one line or three. The codec always emits the fenced form, so
`ECSEQ-1/Peripheral Device.md`'s single one-line `$$S = …$$` becomes three lines on save.
Content is untouched, so this needs no follow-up unless the reflow is unwanted.

## 2. Backslash escapes the source did not need

markdown-it decodes `\$` → `$`, `\~` → `~`, `\<` → `<`, `\^` → `^` before the codec sees it,
and a `DocNode` has nowhere to say "this character was escaped". Escapes that _do_ change
the parse (`\*`, `\[`, `\_`) survive, because the serializer re-escapes anything that would
otherwise reparse differently — these are only the ones that are inert in CommonMark and so
look droppable.

They are not droppable in Obsidian: `\$` exists precisely to stop `$…$` becoming math.
14 vault files use them, `Business/Business Plan.md` and `Funding/Funding.md` most heavily
(`\~\$21 billion`, `\$40M`).

Request: a verbatim spelling on text nodes —

```ts
export interface DocNode {
  // …
  text?: string
  /** Source spelling of `text` when escaping makes them differ. Serializer output only. */
  raw?: string
}
```

The editor can ignore `raw` entirely and drop it on edit; the codec emits it when present
and it reparses to `text`.

## 3. List tightness

A list written loose (blank line between items, one paragraph each) is indistinguishable
from a tight one in `DocNode`, so it serializes tight and Obsidian stops wrapping the items
in `<p>`. `ECSEQ-1/Whitepaper/References.md` is the vault case.

Request: `tight: boolean` on bullet/ordered/task list attrs.

## 4. Hard breaks

`line  ⏎` and `line\⏎` become an ordinary newline — there is no `hardBreak` node. Low
urgency: the vault uses literal `<br>` (57 occurrences), which survives as text. Two files
have trailing double-spaces that get trimmed.

Request: `'hardBreak'` in `SCHEMA_SPEC.nodes`.

## 5. Table column alignment

`TableCellAttrs` carries `colspan`/`rowspan` but not alignment, so `| :--- | ---: |` cannot
round-trip. No vault file uses it today, so nothing is at risk yet — but any table a user
aligns in the editor loses it on save.

Request: `align: 'left' | 'center' | 'right' | null` on `TableCellAttrs`.

## Note for plan 02, not a request

The codec puts inline content directly inside `tableCell` / `tableHeader` with no paragraph
wrapper, because that is what markdown can express. ProseMirror table cells normally require
block content. If the editor schema wraps cells in a paragraph, one of the two sides has to
change — flagging so it is a decision rather than a surprise.
