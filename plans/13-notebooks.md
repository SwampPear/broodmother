# Notebooks

A Jupyter notebook editor in the style of VS Code's: cells in a scrolling list, Monaco in
every code cell, markdown cells rendered until you click into them, outputs under the cell
that produced them, execution on a real Jupyter kernel. Broodmother's own: the cell UI,
the `.ipynb` codec, the kernel proxy. Borrowed: the kernel itself — a `jupyter server`
subprocess speaking the standard protocol, present only when the machine has Jupyter
installed.

## Goal

1. A `.ipynb` opens as cells, not raw JSON: markdown rendered, code highlighted as the
   notebook's language, saved outputs shown.
2. Cells can be edited, added, deleted, moved and type-switched; the file saves through
   the existing doc path and an untouched file round-trips byte-identically, so git diffs
   show only what changed.
3. Shift-Enter runs a cell; streams, results, errors and images arrive live; interrupt and
   restart work; closing the tab doesn't kill the kernel, quitting the app does.
4. Without `jupyter` on PATH everything above except running still works, and the toolbar
   says why running is unavailable.

## Decisions

**Execution rides a `jupyter server` subprocess, not ZeroMQ.** VS Code speaks the kernel
wire protocol over ZMQ, which means a native module and the packaging ritual `build.mjs`
already performs once for `node-pty`. `jupyter server` exposes the same kernels over REST
plus one WebSocket of JSON envelopes — no native deps. Cost: the user needs `jupyter`
installed; acceptable because anyone running notebooks has it, and phase 1 needs nothing.

**The Jupyter client is hand-rolled, not `@jupyterlab/services`.** The surface we use is
three REST calls and one WS channel — a few hundred lines against `fetch` and `ws`, both
already here. `@jupyterlab/services` drags in Lumino and half of JupyterLab.

**The cell UI is ours, on the Monaco already shipped.** The same call VS Code made.
Embedding JupyterLab or `@datalayer/jupyter-react` brings a second widget and theming
system; nteract is unmaintained. One auto-height Monaco per code cell is fine at ordinary
notebook sizes; virtualize later if a real notebook ever proves it necessary.

**`.ipynb` stays a text document.** It is UTF-8 JSON, so `GetDoc`/`PutDoc`, the watcher,
sync, git and tabs all work unchanged. The dispatch is the `DreamView` seam: one predicate
in `DocView`, one component taking `{ markdown, onChange }`.

**The codec keeps what it doesn't understand.** Parse lifts cells into a typed model;
serialize merges edits back into the original JSON, matching cells by id and carrying
notebook metadata, cell metadata and unrecognized keys verbatim. Sources and stream text
serialize as line arrays the way Jupyter writes them, so diffs stay minimal. A file the
user didn't touch serializes byte-identically — the same bar `convert/roundtrip.test.ts`
sets for markdown.

**Outputs render from a MIME allowlist; HTML goes in a sandboxed iframe.** `image/*` as
data URIs, streams / `text/plain` / tracebacks through a small hand-rolled SGR→span
parser, `application/json` pretty-printed, `text/markdown` through `render()`. `text/html`
and `image/svg+xml` can carry script, and `packages/markdown` deliberately has no
sanitizer — so they render in `<iframe sandbox="allow-scripts" srcdoc>`: plotly and
friends run, but same-origin is denied, so nothing reaches the app or the loopback API.

**The browser never talks to Jupyter; the server proxies.** A `/kernel` WS route bridges
to the subprocess. The auth token stays server-side, the origin story is unchanged, and
the web app reuses its reconnecting socket client. Kernel sessions are keyed, detachable
and reaped exactly like `Terminals`.

**Two phases, and phase 1 ships alone.** Phase 1 is the codec and the cell editor —
sections 1–3, 6 without the kernel parts, 7. Phase 2 is execution — sections 4, 5, and
the run wiring in 6. No kernel code lands until phase 1 is done.

**No new npm dependency in either phase.** The codec is JSON, the client is fetch + ws,
ANSI is ~80 hand-rolled lines, images are data URIs, math in markdown cells is the KaTeX
already present.

## Owns

```
packages/notebook/**
apps/server/src/kernels/**
apps/web/src/components/notebook/**
```

plus seams: `packages/shared` (one unfreeze commit, section 1), `packages/editor`'s
public surface (section 3), `apps/server/src/{context.ts,index.ts}`,
`apps/web/src/components/doc/core.tsx`, `apps/web/src/components/ui/seti.ts`,
`apps/web/app/globals.css`.

## 1 · packages/shared — one unfreeze commit

`shared/src/notebook/core.ts`:

```ts
export const NOTEBOOK_EXTENSION = '.ipynb'
export function isNotebookPath(path: string): boolean

export type CellOutput =
  | { kind: 'stream'; name: 'stdout' | 'stderr'; text: string }
  | { kind: 'error'; ename: string; evalue: string; traceback: string[] }
  | { kind: 'display'; data: Record<string, unknown>; executionCount: number | null }
```

`shared/src/api/kernel.ts`, mirroring `api/terminal.ts`:

```ts
export type KernelClientMessage =
  | { type: 'start'; id: string; ref: DocRef }
  | { type: 'execute'; id: string; cellId: string; code: string }
  | { type: 'interrupt'; id: string }
  | { type: 'restart'; id: string }
  | { type: 'shutdown'; id: string }

export type KernelState = 'starting' | 'idle' | 'busy' | 'dead'

export type KernelServerMessage =
  | { type: 'status'; id: string; state: KernelState; detail?: string }
  | { type: 'output'; id: string; cellId: string; output: CellOutput }
  | { type: 'result'; id: string; cellId: string; executionCount: number | null }
```

`WsRoute` in `api/ws.ts` gains `'/kernel'`.

## 2 · packages/notebook — the codec

Shaped like `packages/markdown`: `src/index.ts` barrel over `src/codec/core.ts`.

```ts
export interface NotebookCell {
  id: string
  type: 'code' | 'markdown' | 'raw'
  source: string
  outputs: CellOutput[]
  executionCount: number | null
}

export interface Notebook {
  cells: NotebookCell[]
  language: string
}

export function parseNotebook(json: string): Notebook
export function serializeNotebook(notebook: Notebook, originalJson: string): string
```

`parseNotebook` accepts nbformat 4 only and throws `NotebookParseError` otherwise — the
caller falls back to the plain Monaco JSON view. `language` comes from
`metadata.kernelspec.language ?? 'python'`. `serializeNotebook` reparses `originalJson`,
matches cells by id, mints `crypto.randomUUID()` ids for new cells, and writes outputs
back in nbformat shape (`stream` / `error` / `execute_result` / `display_data`).

## 3 · packages/editor — CellEditor

The public surface gains one export (ask-first item, flagged here):

```ts
export { CellEditor } from './cell'
```

`src/cell/core.tsx` is a thin sibling of `Editor`: same `loadMonaco` and Shiki path, the
`CODE` option set plus `scrollBeyondLastLine: false` and no overview ruler, auto-height
from `onDidContentSizeChange`, no live preview, no lists, no slash commands. Props:
`{ value, language, onChange, onShiftEnter, autoFocus }`. It reuses `useLanguage`, so the
python grammar loads once and every cell shares it.

## 4 · apps/server/src/kernels

`kernels/jupyter.ts` — the subprocess and thin REST/WS client:

```ts
export interface JupyterHandle {
  baseUrl: string
  token: string
  kill(): void
}

export async function startJupyter(cwd: string): Promise<JupyterHandle>
```

Picks a free loopback port, spawns `jupyter server --no-browser` with that port and a
`crypto.randomUUID()` token via execa (long-running, `env: ambient()`), polls
`GET /api/status` for readiness, and rejects with the lookup error when `jupyter` isn't on
PATH.

`kernels/core.ts` — `Kernels`, in the `Terminals` mold:

```ts
export class Kernels {
  constructor(jupyter: () => Promise<JupyterHandle>)
  attach(socket: WebSocket): void
  close(): void
}
```

Sessions are keyed by the client-chosen id (the notebook's `DocRef` path); socket detach
is not kernel death; an idle TTL and reaper mirror the terminal ones. Each session holds
one execution queue and a msg_id → cellId map so iopub traffic routes to the right cell.
It translates `stream`, `display_data`, `execute_result`, `error` and `status` messages
into `KernelServerMessage` and nothing else crosses the proxy.

## 5 · apps/server — wiring

`context.ts`: `AppContext` gains `kernels: Kernels`, constructed with a lazy
`startJupyter` so nothing spawns until the first `start` message; `close()` kills the
subprocess. `index.ts`: one entry in the WS route record —
`'/kernel': (socket) => ctx.kernels.attach(socket)`. No new HTTP routes; a missing
`jupyter` surfaces to the client as `{ type: 'status', state: 'dead', detail }`.

## 6 · apps/web — components/notebook

- `notebook/core.tsx` — `NotebookView { root, path, markdown, onChange }`, the DreamView
  contract: parse on mount and on external change, hold the `Notebook` in state,
  serialize into `onChange` on edit (DocView's existing 500 ms debounce is untouched).
- `notebook/code-cell.tsx` — `CellEditor`, an `In [n]` gutter, a run button, outputs
  below.
- `notebook/markdown-cell.tsx` — `render()` output; double-click to edit in a markdown
  `CellEditor`; blur or ⌘Enter to render again.
- `notebook/outputs.tsx` — the MIME dispatch from Decisions, with `ansi.ts` beside it.
- `notebook/toolbar.tsx` — add cell, run all, interrupt, restart, kernel status chip.
- Command/edit modes as in VS Code: ↑/↓ select, Enter edits, Esc leaves, A/B insert,
  DD deletes, M/Y switch type, Shift-Enter runs and advances.
- `notebook/kernel.ts` — the client over `open('/kernel')`; phase 1 stubs it as
  permanently `dead` with a "Jupyter not connected" detail.

## 7 · DocView dispatch and chrome

`components/doc/core.tsx` gains an `isNotebookPath(path)` branch above the editor
fallback; a `NotebookParseError` falls through to the raw Monaco view with a notice.
`ui/seti.ts` gains an `ipynb` glyph. `globals.css` gains a `.notebook-*` block beside the
existing Monaco rules.

## 8 · Tests

- `packages/notebook/src/codec/core.test.ts` — round-trip byte-identity on a real fixture
  notebook (streams, an error, a png, an html output); editing one cell leaves every
  other byte alone; unknown metadata survives; new cells get ids; nbformat 3 throws.
- `apps/server/src/kernels/core.test.ts` — against a fake Jupyter WS, no real install:
  protocol translation, iopub routed by msg_id, queued executions run in order, detach
  does not kill, the reaper does, missing binary becomes a `dead` status.
- `apps/web` — `NotebookView` renders cells from a fixture; markdown cell toggles
  edit/rendered; keyboard insert/delete/move; outputs dispatch (ANSI spans, img data URI,
  iframe for html with `sandbox` set).

Manual: `npm run check`, then `npm run localhost` with a throwaway `BROODMOTHER_HOME`.
Drop a real notebook into the vault: open, edit, save, and read the `git diff` — it names
only the edited cell. In an env with `pip install jupyter`: run a print, a plot and a
raising cell; interrupt a `time.sleep(60)`; restart and see counts reset; quit the app and
confirm no orphaned `jupyter` process.
