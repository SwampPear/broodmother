# 02 — Editor

**Parallel.** Owns `packages/editor/**`. Reads `packages/shared/src/doc.ts`, `collab.ts`.

## Goal

The Notion-style block editor: a Tiptap instance constrained to exactly `SCHEMA_SPEC`, with
a `/` menu, drag handles, and a keyboard map.

## Deliverables

1. **Schema** — individual Tiptap extensions matching `SCHEMA_SPEC` exactly. Not
   `StarterKit`; it pulls in nodes outside the spec, and a node the editor can hold but
   markdown can't express is precisely the bug this project can't afford.
2. **`<Editor>`** — a controlled React component: `value: DocNode`, `onChange(DocNode)`. It
   speaks trees, never markdown strings.
3. **Slash menu** — `/` on an empty block opens a filtered block-type list. Arrows, enter,
   escape. No mouse needed.
4. **Drag handles** — hover-revealed per block, drag to reorder.
5. **Input rules** — `#`, `-`, `>`, ```` ``` ````, `- [ ]`, plus bold/italic/code
   shortcuts and list indent/outdent.
6. **Collab slot** — accept an optional Yjs fragment and awareness object and wire
   `y-prosemirror` when present. Define and honor the props; don't create sessions, that's
   plan 03. With nothing passed, it's a normal local editor.
7. **Remote cursors** — render peer carets and selections from awareness, colored by the
   peer color passed in.

## Done when

- Every node and mark in `SCHEMA_SPEC` is reachable by keyboard alone.
- Nothing outside `SCHEMA_SPEC` can be created by any input, paste included — rich HTML
  paste degrades to spec nodes.
- It works fully with no Yjs fragment supplied.
- Tests drive ProseMirror state headlessly, no browser.

## Not this plan

Markdown conversion, file I/O, session management, app chrome.
