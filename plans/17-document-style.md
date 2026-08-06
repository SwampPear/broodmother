# Document style, out of the prose

> **Not in the tree.** This was built and then removed along with document mode — we are
> going with plain markdown for now. Kept for the reasoning, not as a description of the code.

[16](16-document-mode.md) put font, colour, size and alignment into the note as inline HTML,
and reasoned it out at length: the tag wraps the text, so anchoring is free and there is no
second file to lose. That reasoning still holds. It was still the wrong call, and this is
what it looks like:

```markdown
# <span style="color:#b7950b">Documentation Setup</span>
```

The heading stopped being a heading. 16 named this cost — "source mode shows the tags" — and
predicted it would be mild because the value set is small. It is not mild. One coloured
heading is enough to make the file read as markup rather than as a note, and the whole
premise of this app is a folder of markdown somebody else can read.

So the styling comes out of the prose. The body goes back to `# Documentation Setup`.

## Where it goes instead, and the honest version of "not in the file"

**Frontmatter, under one namespaced key.** It cannot be nowhere: presentation that survives
a reopen has to be written down. The choice is which part of the file holds it.

Frontmatter is the only store that travels. It _is_ the file, so a rename, a move, a copy, a
`git mv`, a branch merge and an agent rewriting the note all carry it without the app being
involved. A sidecar needs pairing this vault cannot guarantee — terminals, agents and merges
all move notes without knowing a twin exists. A database in `~/.broodmother` does not travel
at all: clone the vault on another machine and every note is unstyled.

Worth being straight about: **frontmatter is still the file.** "Not in the markdown source"
is not achievable — markdown has no invisible channel. What is achievable, and what the
complaint is actually about, is that the _prose_ stays clean. A block of metadata at the top
that every reader already skips is a different thing from punctuation in the middle of a
sentence.

```markdown
---
title: Documentation Setup
broodmother:
  style:
    - block: 0
      from: 0
      to: 19
      text: Documentation Setup
      color: '#b7950b'
    - block: 4
      align: center
---

# Documentation Setup
```

## Anchors

The problem this design has to solve is the one a sidecar has too: a record outside the text
must point back into it, and the text moves.

**Anchors are block-scoped, never document-scoped.** `block` is the index of a top-level
node; `from`/`to` are offsets _within that block's text_. Editing paragraph nine cannot shift
an anchor in paragraph two, which is what makes whole-document offsets rot on the first
keystroke. Alignment needs no range at all — it is the whole block.

**Records carry a fingerprint and are best-effort.** `text` is what the range said when it
was written. On load:

1. If `blockText.slice(from, to) === text`, apply it.
2. Otherwise look for `text` elsewhere in the block and apply it there.
3. Otherwise drop the record.

Style degrades to unstyled. It never lands on the wrong words, and it never touches content.
That is the right failure: a note edited in Obsidian, or by an agent, comes back plain rather
than wrong, and restyling is a click.

## What changes

**The body serializer stops emitting style.** `DocNode` keeps its `textStyle` mark and
`align` attr — the tree is still where the editor works — but `serialize` ignores them, and a
separate pass extracts them into frontmatter records. The in-memory truth is unchanged; only
the file changes.

**The parser keeps reading inline spans.** 16's `style` markdown-it plugin stays, minus its
writer. Notes already written with `<span style="…">` — there is at least one — still open
styled, and the next save moves that styling up into frontmatter. Nobody has to go and clean
up a file by hand.

**Reading mode applies the records too**, which is the "only apparent in the docs viewer"
half of the ask. Live and source modes show clean markdown, because now there is clean
markdown to show.

## The risk worth stating before starting

**Writing frontmatter breaks a promise.** `DocAttrs.frontmatter` is "raw YAML including its
`---` fences, verbatim. Never reformatted", and the codec has kept that promise absolutely.
Writing a key into it means touching YAML the user wrote, and there is no YAML library in
this workspace to do it losslessly — `zod` is not one, and adding one is a dependency ask.

The way through is a targeted text rewrite: find the `broodmother:` block, replace exactly
those lines, leave every other byte alone. Appending it when absent, removing it when the
last style goes, and not tripping over a user's own `broodmother:` key are the fiddly parts.
This is the main implementation risk and the first thing to write a check for — a note whose
frontmatter comes back with the user's own keys reordered or requoted is a worse bug than the
one this plan is fixing.

**Style is lost when a note is restructured elsewhere.** Blocks inserted above shift every
index below them; the fingerprint search recovers a moved range inside its block, not a block
that moved. Accepted, and it is why the failure has to be "unstyled", not "styled wrong".

## Not in this plan

Comments and anchored annotations, which need the same machinery and more of it; a
`config.defaultMarkdownMode`; and any attempt to preserve style across a rewrite that changes
the block structure.
