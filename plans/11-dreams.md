# 11 — Dreams

Workflows that run while you aren't looking. A `.dream` file is JSON on disk — a graph of
triggers and agent blocks — and everything else here is a view of that file or a runner
for it. The schema is the feature; the editor and the orchestrator are two readers of the
same contract.

## Goal

1. `.dream` files live in the sidebar like any other file: created from the same menus,
   renamed in place, moved, deleted, synced. They wear a little dreaming icon.
2. Opening one shows an n8n-style node editor in the document pane: pan, zoom, drag,
   connect. The editor is an abstraction over the file — every gesture becomes JSON, and
   the JSON is the whole truth of how the dream runs.
3. The server orchestrates: it watches for dreams, fires their triggers (manual, every N
   minutes, at a time of day), walks the graph, and runs each agent block — a Claude Code
   prompt in the root's checkout, or a block that writes the run's output into a note.
   This orchestration layer is local today and is the seed of the collaboration layer.
4. The hot geometry of the canvas — edge curves, hit-testing — runs in a small WebAssembly
   kernel, so dragging stays smooth however big the dream gets.

## Owns

```
packages/shared/src/dream/**       the schema: types, parse, serialize, run order
packages/shared/src/api/dreams.ts  the run contract
apps/web/wasm/**                   AssemblyScript kernel source
apps/web/public/dream-kernel.wasm  the committed artifact
apps/web/src/components/dream/**   the editor
apps/server/src/dreams/**          scanner, scheduler, executor, run store
plus seams: doc/core.tsx, tree menus, icons, palette, state.tsx, app.ts, context.ts
```

## The schema (`packages/shared/src/dream/`)

One `core.ts`, exported through the barrel. `interface Dream { version: 1; nodes; edges }`.
Nodes are a discriminated union on `kind`:

| kind               | config                | meaning                                         |
| ------------------ | --------------------- | ----------------------------------------------- |
| `trigger.manual`   | —                     | the Run button                                  |
| `trigger.interval` | `minutes`             | fire every N minutes                            |
| `trigger.time`     | `at: "HH:MM"`         | fire once a day at that time                    |
| `trigger.file`     | `path`                | fire when a watched file changes                |
| `trigger.http`     | `url`                 | fire when a polled URL's answer changes         |
| `agent.claude`     | `prompt`, `minutes?`  | `claude -p` in the root's checkout              |
| `agent.shell`      | `command`, `minutes?` | `sh -c` in the checkout, stdin in, stdout on    |
| `agent.gate`       | `pattern`             | continue the branch only when the input matches |
| `agent.note`       | `path`, `append?`     | write — or add — the input into a vault note    |

Every node also carries `id`, `name`, `x`, `y` — position is part of the file because the
editor is the file. Edges are `{ from, to }` by node id.

- `parseDream(text)` — zod, throws with a reason the editor can show.
- `serializeDream(dream)` — canonical field order, two-space JSON, so git diffs stay small
  and a load–save round trip is byte-identical.
- `runOrder(dream)` — topological layers starting from the triggers; `null` on a cycle.
  The editor uses it to refuse an edge that would bite its own tail; the server uses it to
  execute. One function, two readers, no drift.
- `emptyDream()` — one manual trigger, so a new dream starts runnable rather than blank.
- `DREAM_EXTENSION`, `isDreamPath(path)`.

## The kernel (`apps/web/wasm/`)

AssemblyScript (`assemblyscript` devDependency — the one new dependency, npm-only, no
native toolchain), compiled by `npm run wasm -w @broodmother/web` to
`public/dream-kernel.wasm`, which is committed so nothing needs building to run the app.
Raw `f64` loads and stores on exported memory, no GC, `--runtime stub`:

- `edgeControls(count)` — `[x1,y1,x2,y2]` per edge in, n8n-style horizontal bezier control
  points out, one call per frame for every edge at once.
- `hit(x, y, count)` — topmost node under a point, for the canvas's own hit-testing.
- `marquee(x, y, w, h, count)` — which nodes a drag-select touches, flags written back.

`src/components/dream/kernel.ts` wraps the module in a typed interface; the browser
fetches the artifact, tests hand it bytes from disk. No JS fallback — the artifact ships
with the repo, and a second implementation would just be somewhere for the two to
disagree.

## The editor (`apps/web/src/components/dream/`)

`DocView` grows its second kind at the existing seam (`doc/core.tsx`): `isDreamPath` →
`<DreamView value onChange />`, the same load, autosave and external-write machinery notes
already use — the dream editor is handed text and hands back text.

- A pannable, zoomable canvas: dot grid, wheel-zoom toward the cursor, drag-to-pan on
  empty space. One transform on the world, so a gesture is one style change however many
  nodes ride it, and the kernel prices every edge in a single call per frame.
- Nodes as cards: header with kind icon and name, output port on the right, input port on
  the left. Dragging snaps to the grid; dropping commits `x, y` into the dream.
- Drag from a port to draw an edge (kernel curve under the pointer), drop on a node to
  connect. Self-edges, duplicates and cycles are refused at the gesture.
- Click selects; Backspace deletes a node (and its edges) or an edge. Selected node opens
  the inspector: name, and the config its kind owns — prompt textarea, note path, minutes,
  time.
- A toolbar to add nodes (one entry per kind) and a Run button. Runs are polled while one
  is live; each node wears its step state — running, done, failed — and the inspector
  shows the step's output.
- Styles in `globals.css` under a `dreams` section, on the app's existing palette.

## The sidebar

- `New dream` beside `New note` in the pane menu, `New dream here` on folder rows, a
  palette command, and `TreeCommand` grows `create-dream`. All of it lands in the same
  `newNote` flow generalized over extension and seed content — `Untitled.dream`, renamed
  in place, seeded with `emptyDream()`.
- The dreaming icon: a moon-and-star glyph in the Lucide set (`icons.tsx`), tinted
  indigo. `fileTag` already pills unknown extensions, so rows and tabs say `dream` for
  free.

## The orchestrator (`apps/server/src/dreams/`)

A `Dreams` class in the `SyncLoop` mold: deps-getters constructor, injectable clock and
agent runner, `start()`/`stop()` owned by `AppContext`, timer `unref`'d.

- Every tick (30s) it lists `*.dream` across the open vault and projects, parses, and
  does two jobs. Schedules go to the machine: a managed `# BROODMOTHER` block in the
  system crontab holds one line per wired interval or time trigger, and cron fires the
  run back in through `POST /api/dream/run` with curl (`crontab.ts`). Events stay with
  the watcher: each wired event trigger is checked against a small saved cursor — an
  mtime, an etag — and a source that moved fires the dream with what it saw as the
  trigger's output. Cursors live in `~/.broodmother/triggers.json` (`state.ts`), so a
  restarted server picks up where it stood. A new kind of trigger is one function in
  `triggers.ts`: read the source, compare with the state, answer firings and the state
  to save.
- A run walks `runOrder`. Each node's input is the joined output of its upstream nodes.
  `agent.claude` runs `claude -p <prompt>` via execa in the root's checkout, upstream
  input on stdin, session env scrubbed the way terminals already scrub it, five-minute
  timeout. `agent.note` writes its input into a vault note through the same `Tree.write`
  the doc routes use. A step that fails fails the run; later steps are skipped.
- Runs are kept in memory, a short ring per file. Two routes join the contract:
  `POST /api/dream/run` starts one, `GET /api/dream/runs` reports them — typed in
  `packages/shared/src/api/dreams.ts`, mirrored in the web mock.

## Tests

Schema round-trip and cycle refusal in shared; kernel arithmetic against the real wasm in
vitest; executor order, input joining and failure-skip with a fake runner; scheduler
firing with a fake clock; the run routes against the real server with an agent-free dream;
editor rendering, node add, inspector edit and autosave serialization against the mock
client; the tree's new menu entries.

## What's cut, and named

- Push updates for run state (the relay is there; polling is enough until collaboration).
- Branch-compare for dreams — they diff as text, which is exactly what the canonical
  serialization is for.
- Parallel step execution, retries, per-node models, non-agent blocks, webhook triggers.
- Any editing of dream JSON through Monaco — the canvas is the editor; the file is there
  for git and agents.
