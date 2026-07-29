# 06 — Editors & viewers

**Wave 2.** The first wave built one editor wired straight into one view. This wave makes
the view a dispatcher over pluggable viewers, and replaces the markdown one with an
Obsidian-grade editor.

## Goal

1. `DocView` stops knowing what markdown is. A **registry** maps a vault path to a viewer;
   adding a file type is one file plus one array entry.
2. The markdown viewer behaves **like Obsidian**: Live Preview, Source, and Reading modes
   over a single text buffer, syntax hidden until the cursor reaches it.
3. Math is edited **like Notion**: rendered inline by default, click to open a popover with
   a LaTeX field and a live preview.

## Decisions taken

**The markdown editor moves from Tiptap to CodeMirror 6.** Obsidian's Live Preview is not
WYSIWYG — the document _is_ the markdown text, and decorations hide syntax the cursor
isn't touching. That is not something a ProseMirror tree can imitate: Source mode would
need a second editor, and every save would re-serialize the file, normalizing spacing and
syntax the author chose. On a buffer, Source mode is the same buffer with decorations off,
and a save is byte-identical to what was typed. `packages/markdown`'s round-trip suite
exists to police a risk that stops existing.

**The markdown surface gets Obsidian typography** — variable-width body, real heading
scale, ~700px measure — with JetBrains Mono retained for code, math, frontmatter, and
paths. DESIGN.md already puts Inter on prose and mono on code, so this is that rule applied
to the document surface rather than a departure from it. What does need writing back into
DESIGN.md: the editor engine, and the non-goal "WYSIWYG for LaTeX beyond rendering it",
which part C deliberately reverses.

**Viewers shipped: markdown, image, PDF**, plus an unsupported-file card (needed the moment
the tree can open a `.zip`). No code/CSV editor in this wave.

## Shared types are unfrozen, once, here

Rule 2 of [README](README.md) freezes `packages/shared`. This wave needs four additions,
listed here so they land in one commit before parts A–C start:

```ts
// packages/shared/src/viewer.ts
export type ViewerId = 'markdown' | 'image' | 'pdf' | 'unsupported'
export type MarkdownMode = 'live' | 'source' | 'reading'

// packages/shared/src/config.ts — added to DocsConfig
defaultMarkdownMode: MarkdownMode
readableLineLength: boolean

// packages/shared/src/api.ts — a binary route, outside the JSON ApiRoutes map
export const FILE_ROUTE = '/api/file'
```

`SCHEMA_SPEC`, `DocNode`, and every node/mark attrs interface in `doc.ts` are **deleted** —
nothing constructs a document tree after this wave. See "What gets deleted".

## Partition

Three parts, parallel after the shared-types commit. Part B publishes its extension-slot
contract first (one file, ~15 lines) so C can build against it.

| Part                         | Owns                                                                                             | Depends on             |
| ---------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------- |
| A — Registry & file viewers  | `apps/web/src/viewers/**`, `apps/web/src/components/doc-view.tsx`, `apps/server/src/files.ts`    | shared types           |
| B — Obsidian markdown editor | `packages/editor/**` except `src/math/**`, `packages/markdown/**`, `packages/collab/src/ydoc.ts` | shared types           |
| C — Notion math              | `packages/editor/src/math/**`, `packages/markdown/src/math.ts`                                   | B's extension contract |

---

## Part A — Viewer registry & file viewers

### Deliverables

1. **Registry.** `apps/web/src/viewers/registry.ts`:

   ```ts
   export interface ViewerProps {
     path: VaultPath
   }
   export interface Viewer {
     id: ViewerId
     match: (path: VaultPath) => boolean
     component: ComponentType<ViewerProps>
   }
   export const viewerFor = (path: VaultPath): Viewer
   ```

   An ordered array, first match wins, `unsupported` last and matching everything. No
   registration function, no plugin loader — a viewer is an array entry.

2. **`DocView` becomes a dispatcher.** It resolves the viewer and renders it. Fetching,
   saving, and debouncing move _into_ the markdown viewer, which is the only viewer that
   writes. The image and PDF viewers are read-only and fetch nothing through the JSON API.

3. **`GET /api/file`** on the backend — raw bytes for the viewers that need a URL rather
   than a string. Reuses `paths.ts` for the traversal guard. Content type from a small
   extension allowlist (`png jpg jpeg gif webp svg avif pdf`); anything else is
   `application/octet-stream` with `Content-Disposition: attachment`. Every response gets
   `Content-Security-Policy: default-src 'none'; sandbox` — an SVG in the vault is
   same-origin script otherwise, and the vault is unauthenticated.

4. **Image viewer** — the image centered on the vault background, natural size capped to
   the pane, click to toggle 1:1. Dimensions and file size in the status line.

5. **PDF viewer** — `<iframe src={fileUrl(path)}>`, the browser's own plugin. No pdf.js.

6. **Unsupported card** — name, size, mtime, and a copy-path action.

7. **`fileUrl(path)`** exported from `apps/web/src/api/index.ts`, built on the same `base`
   as `httpClient`.

### Done when

- Opening `.md`, `.png`, `.pdf`, and `.zip` from the tree each render the right surface with
  no branching in `DocView` beyond `viewerFor`.
- `GET /api/file?path=../../etc/passwd` is rejected by the same guard the JSON routes use,
  proven by a test alongside `apps/server/src/paths.test.ts`.
- Registry resolution is unit-tested against a table of paths; viewers are not rendered in
  that test.

---

## Part B — The Obsidian markdown editor

`packages/editor` keeps its name and its public shape; everything inside is replaced.

```ts
export interface MarkdownEditorProps {
  value: string
  onChange: (markdown: string) => void
  mode: MarkdownMode
  collab?: { text: Y.Text; awareness: Awareness }
  onOpenLink: (target: string) => void
  completions: () => VaultPath[] // for [[ ]] autocomplete
}
```

Strings in, strings out. The seam in `apps/web/src/editor.tsx` — parse on the way in,
serialize on the way out — is deleted, not moved.

### Dependencies

Add `@codemirror/state@^6.7`, `@codemirror/view@^6.43`, `@codemirror/language@^6.12`,
`@codemirror/commands@^6.10`, `@codemirror/search@^6.7`, `@codemirror/lang-markdown@^6.5`,
`@codemirror/language-data@^6.5` (lazy grammars for fenced code), `@lezer/markdown@^1.7`,
`@lezer/highlight@^1.2`, `y-codemirror.next@^0.3`. Remove every `@tiptap/*`,
`prosemirror-*`, and `@tiptap/suggestion`.

### Deliverables

1. **Extension contract** (publish first, part C builds on it):

   ```ts
   // packages/editor/src/extension.ts
   export interface MarkdownFeature {
     /** Lezer inline/block parsers merged into the markdown grammar. */
     parser?: MarkdownExtension[]
     /** Decorations for one syntax node; null means "not mine". */
     decorate?: (ctx: DecorateCtx) => DecorationSpec | null
     /** Plain CodeMirror extensions: keymaps, fields, theme fragments. */
     cm?: Extension[]
     /** markdown-it plugin + renderer rules, for Reading mode. */
     render?: (md: MarkdownIt) => void
   }
   ```

   `DecorateCtx` carries the syntax node, the buffer, and `revealed: boolean` — the
   cursor-proximity answer, computed once centrally so every feature reveals identically.

2. **Live Preview.** A `ViewPlugin` walking `syntaxTree(state)` over the visible ranges and
   building a `RangeSet`:
   - `Decoration.replace({})` over syntax markers (`##`, `**`, `_`, `` ` ``, `~~`, `==`,
     `[[`/`]]`, `[`/`](url)`) when not revealed.
   - `Decoration.mark()` over content for styling; `Decoration.line()` for blockquote,
     list, and code-block backgrounds.
   - `Decoration.replace({ widget })` for atoms: images, math, `---`, task checkboxes,
     tables. Registered in `atomicRanges` so arrows step over them.
   - **Reveal rule:** block markers reveal when the cursor is on that line; inline markers
     reveal when any selection range overlaps the token's full extent. One predicate, all
     features, multi-cursor aware. This is the single most Obsidian-or-not detail in the
     wave — it gets its own test file.

3. **Modes.** `live` (default) · `source`, the same buffer with the decoration plugin
   dropped · `reading`, no editor at all, `render(markdown)` from `@docs/markdown` into
   sanitized HTML. `Cmd+E` toggles editing↔reading; a palette command cycles live↔source.
   Per-path mode is remembered in memory for the session, seeded from
   `config.defaultMarkdownMode`.

4. **Core parity.** These are what "like Obsidian" means and none are optional:
   - headings H1–H6, bold, italic, strike, highlight (`==`), inline code
   - lists — bullet, ordered, task; checkboxes clickable in place; Enter continues,
     Tab/Shift-Tab indent, Enter on an empty item outdents
   - blockquotes and **callouts** (`> [!note] Title`) rendered in live preview and reading
   - fenced code with real language highlighting inside the buffer, fences left visible
   - tables — widget-rendered when the cursor is outside, raw source when it's inside
   - wikilinks `[[Target|alias]]`: brackets hidden, click navigates, `[[` opens a fuzzy
     path completion popup (`fuzzysort` is already a dependency)
   - image embeds `![[file.png]]` and `![](file.png)` rendered inline via `fileUrl`
   - frontmatter as a dimmed mono block, edited as text, never reformatted
   - tags, footnotes, external links, `---`, `%%comments%%`
   - `Cmd+B/I/K`, bracket auto-pairing, wrap-selection on `*`/`_`/`` ` ``, `Cmd+F` search
     panel, always-on line wrapping
   - backlinks footer from the existing `GET /api/links`

5. **Collab on `Y.Text`.** `packages/collab/src/ydoc.ts` collapses from a tree encoder to
   `doc.getText('markdown')`; `SessionOptions.codec` disappears because the CRDT payload is
   already the file. Divergence comparison becomes a string compare it was already doing.
   `y-codemirror.next` supplies sync, undo, and remote cursors — `packages/editor/src/collab.ts`
   is a handful of lines.

6. **Typography.** `.docs-markdown` scope in `globals.css`: Inter body at a real heading
   scale, `--measure: 700px` gated on `config.readableLineLength`, Funnel Display on
   headings per the brand, JetBrains Mono inside code, math, and frontmatter.

### Done when

- Every item in "core parity" is demonstrated by a test driving `EditorState` headlessly —
  no browser, matching plan 02's bar.
- Reveal behavior is tested at token boundaries: cursor before, at the first character,
  inside, at the last character, after.
- **A corpus test over `packages/markdown/fixtures/**` asserts that loading a file into the
  editor and saving it without edits returns the bytes unchanged.** This replaces the
  round-trip suite and is a stronger claim than it made.
- Live collaboration between two tabs still works end to end.

### Not this part

Note transclusion (`![[Note]]`), hover previews, graph view, canvas, Obsidian's properties
UI, in-table WYSIWYG editing, plugins. All named as gaps below.

---

## Part C — Notion-style math

### Deliverables

1. **Rendering.** KaTeX `^0.18`, `throwOnError: false`, `output: 'htmlAndMathml'`. Fonts
   are copied into `apps/web/public/fonts/katex/` — the app self-hosts everything and there
   is no CDN.

2. **Inline math** `$…$` — a KaTeX widget when the cursor is elsewhere. Click, or
   `Cmd+Shift+E`, opens a **popover anchored to the widget**: a mono LaTeX input, a live
   preview above it, KaTeX's error text inline when the expression is invalid. Every
   keystroke writes through to the buffer, so undo, save, and collab need to know nothing
   about the popover. `Esc` or click-away closes; `Enter` closes and puts the cursor after
   the equation.

3. **Block math** `$$…$$` — centered rendered block, same popover but wide and below.
   Typing `$$` then Enter on an empty line creates the block and opens the editor.

4. **The `$` heuristic is shared, not duplicated.** `packages/markdown/src/math.ts` already
   refuses `$289k–$1.25M` because the vault is full of prices. Export that predicate and
   have the Lezer inline parser call the same function. Two implementations of this rule
   will drift, and the failure is silent.

5. **Reading mode** renders through the existing markdown-it `math_inline`/`math_block`
   tokens with KaTeX renderer rules — the one piece of `packages/markdown` this wave grows
   rather than shrinks.

### Done when

- `$…$`, `$$…$$`, invalid LaTeX, and `$1.25M` each have a test at the parser level.
- The popover's edits appear in `onChange` output; closing it leaves the buffer exactly as
  the input showed it.
- KaTeX renders offline with no network request.

---

## What gets deleted

Naming it so it happens on purpose:

- `packages/editor/src/{schema,slash-menu,task-item,wiki-link,editor,collab,math}.ts` and
  its `__tests__/` — the Tiptap editor.
- `packages/markdown/src/{parse,serialize}.ts` and `roundtrip.test.ts` — the tree codec.
  `packages/markdown` keeps its configured markdown-it, the math and wikilink plugins, the
  fixtures, and gains `render(markdown): string`.
- `packages/shared/src/doc.ts` in full — `SCHEMA_SPEC` and every attrs interface.
- `packages/collab/src/ydoc.ts`'s tree encoding, and `SessionOptions.codec`.
- The Tiptap and ProseMirror dependency block, ~20 packages.

The drag-handle block reordering goes with it. Obsidian has no drag handles; this is the
cost of the decision above, and it should be a conscious loss rather than a surprise.

## Known gaps vs. Obsidian after this wave

Note transclusion · hover link previews · graph and local graph · canvas · properties
editor for frontmatter · in-table WYSIWYG editing · outline pane · search across the vault
(deferred in DESIGN.md already) · plugins and themes.

## Risks

- **Live Preview is the whole job.** The decoration plugin is where the difficulty lives,
  and "pretty much exactly like Obsidian" is judged on the reveal rule feeling right, not
  on the feature checklist. Build the reveal predicate and headings first, look at it, then
  continue.
- **Deleting the codec is irreversible in practice.** It is ~450 tested lines. It is also
  the only thing that can silently rewrite a user's file, which is why it goes.
- **Table widgets and Lezer's table parsing** are the fiddliest part of part B. If it slips,
  ship tables as styled source in live preview and rendered in reading mode — a real
  degradation, and one to state rather than quietly accept.

## Build order

1. Shared-types commit — `viewer.ts`, config fields, `FILE_ROUTE`, `doc.ts` deleted.
2. Part B's `extension.ts` contract.
3. A, B, C in parallel.
4. Wire-up: `DocView` → registry → markdown viewer → `<MarkdownEditor>`, mode commands in
   the palette, DESIGN.md updated for the engine and typography decisions.
