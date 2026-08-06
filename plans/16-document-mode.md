# Document mode

> **Not in the tree.** This was built and then removed — we are going with plain markdown
> for now. Kept for the reasoning, not as a description of the code. [17](17-document-style.md)
> supersedes its inline-HTML decision and was removed with it.

A button on a markdown note that turns it into a word processor. No syntax on screen, a
toolbar over the top, and the things people expect from Google Docs — styles, lists,
tables, links, images — applied to a selection rather than typed as punctuation.

Today a note has three modes ([06](06-editors-and-viewers.md) §3): **live**, the buffer
with syntax hidden until the cursor reaches it; **source**, the same buffer with the
decorations off; **reading**, rendered HTML with no editor at all. This plan adds a fourth
and makes it the one mode that is not a text buffer.

## The decision 06 took, and why this is not a reversal

Plan 06 moved the markdown editor **off** Tiptap deliberately, and the argument is still
right:

> That is not something a ProseMirror tree can imitate: Source mode would need a second
> editor, and every save would re-serialize the file, normalizing spacing and syntax the
> author chose.

Both halves hold. A tree cannot show you your own markdown, and a tree that saves rewrites
your file. If document mode replaced live preview, 06 would simply have been undone.

It does not replace it. **Live, source and reading keep the buffer and stay byte-exact.**
Document mode is a fourth mode you enter on purpose, on one document, by pressing a button
— and that deliberate act is the whole licence for what it costs. You asked for a word
processor; a word processor owns the document's formatting. The plan's job is to make that
cost small, visible, and never a surprise.

Three rules keep it honest:

1. **Entering document mode does not touch the file.** The document is parsed into a tree
   and drawn. Nothing is written. Leaving without editing leaves the bytes exactly as they
   were — no normalizing diff appears in git for having looked.
2. **The first real edit rewrites the whole file**, because serialization is whole-document.
   This is the one moment the author's spacing and syntax choices are replaced by the
   codec's. It is a normal edit: undo undoes it, and git shows it.
3. **Anything the codec cannot hold, document mode must not eat.** See _The ceiling_ below.

## What the codec already gives us

`src/markdown/convert` has done the hard half since [01](01-markdown-codec.md) and the app
has never called it. `parse(markdown) → DocNode` and `serialize(DocNode) → markdown` are
both there, and nothing in `apps/app` imports either — `render` is the only thing the site
takes from `@/markdown`.

`DocNode` is not merely tree-shaped, it is ProseMirror's own JSON:

```ts
interface DocNode {
  type: NodeName
  attrs?: NodeAttrs
  content?: DocNode[]
  text?: string
  marks?: Mark[]
}
```

`type`/`attrs`/`content`/`text`/`marks` is exactly what `ProseMirror.Node.toJSON()` emits,
and `SCHEMA_SPEC` in `src/doc` already enumerates the node and mark set with the canonical
mark nesting order. Plan 01 built a document tree for an editor that then went to a buffer.
This plan is that tree finding its editor.

So the seam is short and already exists:

```
markdown ──parse──▶ DocNode ──▶ ProseMirror doc ──▶ [ editing ]
                                        │
markdown ◀─serialize─ DocNode ◀─────────┘   debounced, into the same onChange(markdown)
```

The app stores text and hands the editor text. Document mode changes what happens between
those two points and nothing else — the save path, the dirty flag, sync and git are all
untouched.

## Decisions

**Tiptap 3, on top of ProseMirror.** The tree is already ProseMirror JSON, so the schema
mapping is a naming exercise rather than a translation, and Tiptap brings the parts that
make this feel like Google Docs instead of a demo: tables with column resizing, task lists,
link handling, input rules, and a toolbar API. Raw ProseMirror is the alternative and costs
roughly a thousand lines of extension wiring to arrive at the same place. Going back to
Tiptap for _this_ surface is not reopening 06 — 06 rejected it as the editor for markdown
text, which it stays rejected as.

**This adds dependencies and that needs your yes.** `@tiptap/core`, `@tiptap/react`,
`@tiptap/pm`, and the extensions for the nodes we support. CLAUDE.md says ask first, so
this is the ask, and it is the one decision in this plan that cannot be walked back
cheaply. Roughly 400 kB before tree-shaking, loaded only when document mode opens —
`loadMonaco()` already establishes the dynamic-import pattern.

**The schema is derived from `SCHEMA_SPEC`, not written a second time.** A Tiptap schema
built by walking `SCHEMA_SPEC.nodes` and `SCHEMA_SPEC.marks` keeps the promise the spec
makes — "adding a member is a shared-types change" — instead of adding a second list that
drifts. The mark ordering `serialize` relies on stays the spec's.

**Inline formatting lives in the file, as a closed HTML subset.** Font, colour, size and
alignment are the four things markdown has no syntax for, and they go into the note as
inline HTML — `<span style="color:#c0392b">` and `align="center"` on a block. Bold and
italic are not in this list: they are markdown already and stay `**` and `*`.

This is chosen over storing them anywhere else because it solves the two problems that
sink every alternative:

- **Anchoring is free.** The tag wraps the text, so there are no offsets to invalidate. An
  edit around a styled span — by the terminal, an agent, a merge — leaves it attached,
  because it is the same string.
- **There is nothing to pair.** No second file to lose to `mv`, and the note still renders
  in Obsidian and on GitHub, both of which honour this subset.

**`html: true` is not how we get there.** Both `parse` and `render` run with `html: false`
today, which escapes everything and is why reading mode needs no sanitizer. Turning it on
would admit arbitrary HTML from any file in the vault and buy a sanitization problem — and
a DOMPurify-shaped dependency — to solve it. Instead a narrow markdown-it inline rule
recognizes **only the shapes document mode emits**: a `<span>` whose `style` holds
allowlisted properties, and `align` on a paragraph or heading. Everything else stays
escaped exactly as it is now. The attack surface stays zero and the schema stays closed.

**The values are constrained, not free.** A colour picker over 16M values makes unreadable
diffs and notes that look wrong in someone else's theme. Document mode offers a fixed
palette drawn from the theme, about five font choices, and relative sizes (`0.875em`,
`1.25em`, `1.5em`) so text still answers to the reader's settings. Alignment is a block
attribute, not a mark — it belongs on the paragraph, never on a span.

Two additions to `SCHEMA_SPEC`, and they are the whole surface:

| Addition                                        | Kind      | In the file        |
| ----------------------------------------------- | --------- | ------------------ |
| `textStyle` — `color`, `fontFamily`, `fontSize` | mark      | `<span style="…">` |
| `align` on paragraph and heading attrs          | node attr | `align="center"`   |

Tiptap's `TextStyle` extension already models marks this way, so part A's mapping stays a
naming exercise rather than a translation.

**A sidecar file was considered and rejected.** The obvious alternative — `note.md` beside
a `note.json` holding the formatting — fails twice over in this app specifically. It has to
be kept paired through every rename, move and delete, and this vault is deliberately open
to terminals, agents and `git pull`, none of which know the twin exists; one `mv` in a
terminal orphans it silently. And pairing is the easy half: the metadata still has to point
_into_ the text by offset, so any edit made outside document mode leaves every anchor
stale. Inline HTML has neither problem because it is not a second thing. A sidecar stays the
right answer for anchored annotations — comments, suggestions, tracked changes — and those
are not in this plan.

**The control is a corner, not a band.** `doc/core.tsx` says it plainly:

> No header: the tab strip already says which document this is, and saying it twice cost a
> band of chrome across the top of every note.

That objection is to a band across every note, not to any affordance at all. The mode
control sits in the top-right of `.doc-body`, quiet until the pointer enters the document
or focus lands in it. In document mode the toolbar takes the top of the document surface —
which is a band, and is the one place a band is the point.

**The control also fixes source mode.** `EditMode` has had `'source'` since 06 and nothing
in the app can reach it: `apps/app/src/editor.tsx` only ever sets `'live'` and `'reading'`.
06 called for "a palette command cycles live↔source" and it was never built. The same
control offers all four, so this plan closes that hole rather than adding a fourth mode
beside a broken third.

**Mode is remembered per path for the session**, which 06 also asked for and did not get —
today a single `useState` means opening a second note inherits the first note's mode. A
`Map<path, Mode>` in the doc view. The `config.defaultMarkdownMode` half of 06's line stays
unbuilt; it is a settings feature, not this one.

## The ceiling

"Like Google Docs with all that functionality" has to meet the fact that the file is
markdown. What survives a save is what `SCHEMA_SPEC` can hold, now including the styling
subset above:

| Works                                    | Cannot exist in the file                      |
| ---------------------------------------- | --------------------------------------------- |
| headings 1–4, paragraphs                 | headings 5–6 — `headingLevels` is `[1,2,3,4]` |
| bold, italic, strike, inline code        | comments, suggestions, tracked changes        |
| font family, size and colour, from a set | arbitrary colours and fonts outside the set   |
| left / centre / right alignment          | columns, page breaks, page size               |
| links, wikilinks                         | footnotes, headers and footers                |
| bullet / ordered / task lists            | embedded drawings                             |
| blockquote, horizontal rule, code blocks | line spacing, indent stops, tab rulers        |
| tables, images, math                     | anything needing a second file to survive     |

The right-hand column is not a backlog — it is what markdown is not, and the toolbar must
not offer any of it. A control that silently drops its effect on save is worse than no
control. Where Google Docs and markdown genuinely disagree, the file wins.

Two specifics worth naming now:

- **Frontmatter** is `DocAttrs.frontmatter`, raw YAML kept verbatim and never reformatted.
  Document mode shows it as a locked block at the top — visible so it is not mysteriously
  missing, uneditable so it cannot be mangled. Editing it is what source mode is for.
- **Anything markdown-it parses that the spec lacks** already becomes a literal paragraph
  in `parse` (`literal()`). In a buffer that is invisible; in document mode it means an
  exotic construct arrives as plain text and saves back flattened. Part A pins down which
  constructs those are, and the toolbar never produces one.

## Parts

**A · The bridge** — `src/doc`, `src/types/doc.ts`, `src/markdown`,
`src/editor/document/schema.ts`. `SCHEMA_SPEC` gains the `textStyle` mark and the `align`
attr, with the matching types; a markdown-it inline rule parses the closed HTML subset and
`serialize` emits it back byte-identically; a Tiptap schema built from the spec; `DocNode ⇄
ProseMirror` both ways; the literal-paragraph audit. Pure functions, no React. This is the
part that can be wrong in ways the UI cannot show, so it lands first and alone.

Note this edits the shared type surface, which CLAUDE.md says to ask about first — the two
additions above are that ask, and they are the only ones.

**B · The surface** — `src/editor/document/`. The Tiptap editor, the toolbar, the locked
frontmatter block, the document typography (06's variable-width body, ~700px measure, mono
kept for code and math). Exports `DocumentEditor` through `src/editor/index.ts`.

**C · The switch** — `apps/app/src/editor.tsx`, `components/doc/core.tsx`. `Mode` gains
`'document'`; the corner control offers all four; per-path memory; ⌘E keeps toggling
reading. Entering document mode must not mark the document dirty — the test that proves
rule 1.

## What proves it

The correctness of this feature is one property: **a document that goes through the tree
and comes back unchanged is unchanged.** Everything else is styling.

That property used to be policed. `packages/markdown/src/convert/roundtrip.test.ts` was the
suite 06 described as existing "to police a risk that stops existing" — and it stopped
existing when `packages/` went away, along with the other seven. Since document mode makes
the codec load-bearing for the first time, the risk it policed comes back with it.

You deleted those tests on purpose, so this is a recommendation and not a step I would take
without you saying so: **one round-trip test over a handful of real notes** — parse →
serialize → compare — plus a `DocNode ⇄ ProseMirror` identity test in part A. Not the old
suite restored; two files, scoped to the seam this plan builds. Without them, a silent
serializer bug rewrites notes and the first sign is a git diff nobody asked for.

The styling subset raises the stakes on this rather than adding a separate concern. A
`<span style="…">` that parses to a mark and serializes back to a differently-spelled span
is a diff on every save of every styled note, and it is exactly the kind of bug that looks
fine on screen.

## Risks

**The first-edit rewrite is the one that will bite.** A note written by hand, opened in
document mode, lightly edited, saves as the codec's formatting throughout. Rule 2 makes it
honest but not painless. Mitigation is rule 1 — looking costs nothing — and the fact that
git is right there. Worth deciding: do we say so the first time, once, or let the diff
speak?

**Tiptap is a large surface to keep quiet.** Its defaults assume a web app, not this app's
typography. Part B takes only the extensions the spec needs, and styles them rather than
shipping Tiptap's stylesheet.

**Math and wikilinks are custom nodes** — no Tiptap extension knows about `[[target|alias]]`
or the `math` node. Both are node views written here, and both already have a rendering path
to copy from `src/editor/preview`.

**Source mode shows the tags.** A note styled heavily in document mode reads, in the other
three modes, as markdown with HTML in it — because that is now what it is. This is the
trade for formatting that survives a rename, a merge, and an agent rewriting the text
around it, and it is why the value set is small: a handful of spans in a note is a note,
and a span on every other word is a web page.

**Other tools render the subset unevenly.** Obsidian and GitHub honour `<span style>` and
`align`; a strict CommonMark renderer will show the tags. Keeping to the smallest subset
that does the job is what keeps that failure mild.

## Not in this plan

Collaborative editing in document mode (that is [07](07-p2p-collab.md)),
`config.defaultMarkdownMode`, comments or suggestions, and any viewer other than markdown.
