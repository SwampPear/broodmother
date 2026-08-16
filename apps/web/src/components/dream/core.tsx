'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import {
  parseDream,
  runOrder,
  serializeDream,
  type ClaudeNode,
  type DocRef,
  type Dream,
  type DreamKind,
  type DreamNode,
  type DreamRun,
  type LairSite,
  type MuseNode,
  type Persona,
} from '@broodmother/shared'
import {
  ContextMenu,
  Icon,
  Menu,
  TimeField,
  type IconName,
  type MenuSection,
} from '../ui'
import { InlineEditor } from '../../editor'
import { useApp } from '../../state'
import { loadKernel, type Kernel } from './kernel'
import { PersonaPicker } from './persona'

const NODE_W = 200
const NODE_H = 64
const GRID = 16
const POLL_MS = 1000

interface KindSpec {
  label: string
  icon: IconName
  seed(): Partial<DreamNode>
}

/** Every kind of node a dream can hold, in the order the add menu offers them. */
const KINDS: Record<DreamKind, KindSpec> = {
  'trigger.manual': { label: 'When run', icon: 'play', seed: () => ({}) },
  'trigger.interval': {
    label: 'Every N minutes',
    icon: 'timer',
    seed: () => ({ minutes: 30 }),
  },
  'trigger.time': {
    label: 'At a time',
    icon: 'alarm-clock',
    seed: () => ({ at: '09:00' }),
  },
  'trigger.file': {
    label: 'When a file changes',
    icon: 'file',
    seed: () => ({ path: '' }),
  },
  'trigger.http': {
    label: 'When a URL changes',
    icon: 'globe',
    seed: () => ({ url: '' }),
  },
  'agent.claude': {
    label: 'Claude prompt',
    icon: 'claude',
    seed: () => ({ prompt: '' }),
  },
  'agent.muse': {
    label: 'Muse prompt',
    icon: 'muse',
    seed: () => ({ prompt: '' }),
  },
  'agent.shell': {
    label: 'Run a command',
    icon: 'terminal',
    seed: () => ({ command: '' }),
  },
  'agent.gate': {
    label: 'Only if',
    icon: 'compare',
    seed: () => ({ pattern: '' }),
  },
  'agent.note': { label: 'Write a note', icon: 'file-text', seed: () => ({ path: '' }) },
}

const snap = (value: number) => Math.round(value / GRID) * GRID

/** The prompt nodes: the ones whose work is words, and whose home is a dialog of their
 *  own rather than a row in the corner card. */
function isAgent(node: DreamNode): node is ClaudeNode | MuseNode {
  return node.kind === 'agent.claude' || node.kind === 'agent.muse'
}

function freshId(dream: Dream, kind: DreamKind): string {
  const stem = kind.split('.')[1]
  const taken = new Set(dream.nodes.map((node) => node.id))
  for (let n = 1; ; n++) if (!taken.has(`${stem}-${n}`)) return `${stem}-${n}`
}

function makeNode(dream: Dream, kind: DreamKind, x: number, y: number): DreamNode {
  return {
    id: freshId(dream, kind),
    kind,
    name: KINDS[kind].label,
    x: snap(x),
    y: snap(y),
    ...KINDS[kind].seed(),
  } as DreamNode
}

interface View {
  x: number
  y: number
  zoom: number
}

type Picked = { kind: 'node'; id: string } | { kind: 'edge'; index: number }

function pathOf(controls: Float64Array, i: number, ends: Float64Array): string {
  const [x1, y1, x2, y2] = [
    ends[i * 4],
    ends[i * 4 + 1],
    ends[i * 4 + 2],
    ends[i * 4 + 3],
  ]
  const [c1x, c1y, c2x, c2y] = [
    controls[i * 4],
    controls[i * 4 + 1],
    controls[i * 4 + 2],
    controls[i * 4 + 3],
  ]
  return `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`
}

/** Port anchors: out of a node's right edge, into the next one's left. */
function edgeEnds(dream: Dream): Float64Array {
  const spot = new Map(dream.nodes.map((node) => [node.id, node]))
  const ends = new Float64Array(dream.edges.length * 4)
  dream.edges.forEach((edge, i) => {
    const from = spot.get(edge.from)
    const to = spot.get(edge.to)
    if (!from || !to) return
    ends.set([from.x + NODE_W, from.y + NODE_H / 2, to.x, to.y + NODE_H / 2], i * 4)
  })
  return ends
}

function nodeRects(dream: Dream): Float64Array {
  const rects = new Float64Array(dream.nodes.length * 4)
  dream.nodes.forEach((node, i) => rects.set([node.x, node.y, NODE_W, NODE_H], i * 4))
  return rects
}

/**
 * The n8n-style canvas over a `.dream` file. The file is the truth: every gesture becomes
 * a new graph, the graph becomes canonical JSON, and the JSON rides the same autosave a
 * note does. The geometry — edge curves, hit-testing — comes from the wasm kernel.
 */
export function DreamView({
  root,
  path,
  value,
  onChange,
  kernel: given,
}: DocRef & {
  value: string
  onChange: (next: string) => void
  /** Tests hand the kernel in; the app fetches the artifact. */
  kernel?: Kernel
}) {
  const app = useApp()
  const [kernel, setKernel] = useState<Kernel | null>(given ?? null)
  const [broken, setBroken] = useState<string | null>(null)
  const [dream, setDream] = useState<Dream | null>(null)
  const [picked, setPicked] = useState<Picked | null>(null)
  const [run, setRun] = useState<DreamRun | null>(null)
  const [placing, setPlacing] = useState(false)
  const [lairSites, setLairSites] = useState<LairSite[]>([])
  const [hostedAt, setHostedAt] = useState<string[]>([])
  const [personas, setPersonas] = useState<Persona[]>([])
  const [view, setView] = useState<View>({ x: 40, y: 40, zoom: 1 })
  const [options, setOptions] = useState(false)
  /** The agent node whose dialog is up, by id — a click opens it, a drag never does. */
  const [agentOpen, setAgentOpen] = useState<string | null>(null)
  const [liveId, setLiveId] = useState<string | null>(null)

  const written = useRef<string | null>(null)
  const canvas = useRef<HTMLDivElement>(null)
  // Where the right button last landed, in world coordinates: the context menu's add
  // puts the node there rather than at the centre the toolbar's uses.
  const spot = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (given) return
    let alive = true
    loadKernel()
      .then((loaded) => alive && setKernel(loaded))
      // Without the kernel there are no edges to draw, but the nodes still stand.
      .catch(() => null)
    return () => {
      alive = false
    }
  }, [given])

  // The text is the document; the graph on screen follows it. A save this editor just
  // made comes back as the same text and is not news.
  useEffect(() => {
    if (value === written.current) return
    try {
      setDream(parseDream(value))
      setBroken(null)
    } catch (cause) {
      setBroken(cause instanceof Error ? cause.message : String(cause))
    }
  }, [value])

  const commit = useCallback(
    (next: Dream) => {
      setDream(next)
      const text = serializeDream(next)
      written.current = text
      onChange(text)
    },
    [onChange],
  )

  // The key the terminal answers everywhere else: here the bottom panel is the dream's
  // options, and the shell stands aside for this page.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) return
      if (event.key !== 'j') return
      event.preventDefault()
      setOptions((open) => !open)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const clipboard = useRef<DreamNode[] | null>(null)

  useEffect(() => {
    const isTypingTarget = (el: Element | null) =>
      el instanceof HTMLElement &&
      (el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.isContentEditable ||
        el.closest('[contenteditable="true"]') !== null)

    const onKeyDown = async (event: KeyboardEvent) => {
      if (isTypingTarget(document.activeElement)) return
      const mod = event.metaKey || event.ctrlKey
      if (!mod || !dream) return
      const key = event.key.toLowerCase()

      if (key === 'c' && picked?.kind === 'node') {
        const node = dream.nodes.find((n) => n.id === picked.id)
        if (!node) return
        event.preventDefault()
        clipboard.current = [structuredClone(node)]
        try {
          await navigator.clipboard?.writeText(JSON.stringify([node]))
        } catch {}
      }

      if (key === 'v') {
        let toPaste: DreamNode[] | null = clipboard.current
        if (!toPaste) {
          try {
            const text = await navigator.clipboard?.readText()
            if (text) {
              const parsed = JSON.parse(text) as unknown
              if (
                Array.isArray(parsed) &&
                parsed.every(
                  (x) =>
                    typeof x === 'object' &&
                    x !== null &&
                    'kind' in x &&
                    'x' in x &&
                    'y' in x,
                )
              ) {
                toPaste = parsed as DreamNode[]
              }
            }
          } catch {}
        }
        if (!toPaste || toPaste.length === 0) return
        event.preventDefault()
        const taken = new Set(dream.nodes.map((n) => n.id))
        const fresh = (kind: DreamKind): string => {
          const stem = kind.split('.')[1]
          for (let n = 1; ; n++)
            if (!taken.has(`${stem}-${n}`)) {
              taken.add(`${stem}-${n}`)
              return `${stem}-${n}`
            }
        }
        const idMap = new Map<string, string>()
        const clones: DreamNode[] = toPaste.map((n) => {
          const nid = fresh(n.kind)
          idMap.set(n.id, nid)
          return {
            ...structuredClone(n),
            id: nid,
            x: snap(n.x + 40),
            y: snap(n.y + 40),
          } as DreamNode
        })
        const clonedEdges = dream.edges
          .filter((e) => idMap.has(e.from) && idMap.has(e.to))
          .map((e) => ({ from: idMap.get(e.from)!, to: idMap.get(e.to)! }))
        // also copy single-node edges are none, but keep for multi-copy
        const next: Dream = {
          ...dream,
          nodes: [...dream.nodes, ...clones],
          edges: [...dream.edges, ...clonedEdges],
        }
        if (runOrder(next)) {
          commit(next)
          if (clones[0]) setPicked({ kind: 'node', id: clones[0].id })
          clipboard.current = clones.map((c) => structuredClone(c))
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dream, picked, commit])

  // The voices the vault carries, for the inspector's picker to offer.
  useEffect(() => {
    let alive = true
    app.client
      .request('GET /api/personas', null)
      .then((result) => alive && setPersonas(result.personas))
      .catch(() => null)
    return () => {
      alive = false
    }
  }, [app.client])

  // What is on screen while a run is live, polled rather than pushed: a run is short and
  // the canvas is open, so asking once a second is simpler than a socket has to be.
  useEffect(() => {
    let alive = true
    const ask = () =>
      app.client
        .request('GET /api/dream/runs', { root, path })
        .then((result) => alive && setRun(result.runs[0] ?? null))
        .catch(() => null)
    void ask()
    const timer = setInterval(() => {
      void ask()
    }, POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [app.client, root, path])

  const steps = useMemo(
    () => new Map((run?.steps ?? []).map((step) => [step.node, step])),
    [run],
  )

  // --- gestures ------------------------------------------------------------------

  /** Screen point → world point, through the current pan and zoom. */
  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const box = canvas.current?.getBoundingClientRect()
      return {
        x: (clientX - (box?.left ?? 0) - view.x) / view.zoom,
        y: (clientY - (box?.top ?? 0) - view.y) / view.zoom,
      }
    },
    [view],
  )

  function pan(event: ReactPointerEvent) {
    if (event.button !== 0 || event.target !== canvas.current) return
    setPicked(null)
    setAgentOpen(null)
    const at = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y }
    track(event, (going) =>
      setView({
        x: at.viewX + going.clientX - at.x,
        y: at.viewY + going.clientY - at.y,
        zoom: view.zoom,
      }),
    )
  }

  function wheel(event: ReactWheelEvent) {
    if (event.ctrlKey || event.metaKey) {
      const box = canvas.current?.getBoundingClientRect()
      const atX = event.clientX - (box?.left ?? 0)
      const atY = event.clientY - (box?.top ?? 0)
      const zoom = Math.min(2.5, Math.max(0.2, view.zoom * Math.exp(-event.deltaY / 400)))
      const scale = zoom / view.zoom
      setView({
        x: atX - (atX - view.x) * scale,
        y: atY - (atY - view.y) * scale,
        zoom,
      })
    } else {
      setView({ x: view.x - event.deltaX, y: view.y - event.deltaY, zoom: view.zoom })
    }
  }

  function drag(event: ReactPointerEvent, node: DreamNode) {
    if (event.button !== 0 || !dream) return
    event.stopPropagation()
    setPicked({ kind: 'node', id: node.id })
    if (run?.state === 'running') setLiveId(node.id)
    if (!isAgent(node)) {
      setOptions(true)
      setAgentOpen(null)
    }
    const from = { x: event.clientX, y: event.clientY }
    let last = { x: node.x, y: node.y }
    track(
      event,
      (going) => {
        last = {
          x: node.x + (going.clientX - from.x) / view.zoom,
          y: node.y + (going.clientY - from.y) / view.zoom,
        }
        setDream((current) =>
          current
            ? {
                ...current,
                nodes: current.nodes.map((one) =>
                  one.id === node.id ? { ...one, ...last } : one,
                ),
              }
            : current,
        )
      },
      () => {
        if (!dream) return
        // The pointer never moved: a click, not a drag — compared unsnapped, because
        // snapping an off-grid node would read its click as a move.
        if (last.x === node.x && last.y === node.y) {
          if (run?.state === 'running') setLiveId(node.id)
          else if (isAgent(node)) setAgentOpen(node.id)
          return
        }
        const settled = { x: snap(last.x), y: snap(last.y) }
        if (settled.x === node.x && settled.y === node.y) return
        commit({
          ...dream,
          nodes: dream.nodes.map((one) =>
            one.id === node.id ? { ...one, ...settled } : one,
          ),
        })
      },
    )
  }

  const [ghost, setGhost] = useState<string | null>(null)

  function connect(event: ReactPointerEvent, from: DreamNode) {
    if (event.button !== 0 || !dream || !kernel) return
    event.stopPropagation()
    const start = { x: from.x + NODE_W, y: from.y + NODE_H / 2 }
    track(
      event,
      (going) => {
        const at = toWorld(going.clientX, going.clientY)
        const controls = kernel.edgeControls(
          new Float64Array([start.x, start.y, at.x, at.y]),
        )
        setGhost(pathOf(controls, 0, new Float64Array([start.x, start.y, at.x, at.y])))
      },
      (done) => {
        setGhost(null)
        const at = toWorld(done.clientX, done.clientY)
        const found = kernel.hit(at.x, at.y, nodeRects(dream))
        if (found < 0) return
        const to = dream.nodes[found]
        if (to.id === from.id) return
        if (dream.edges.some((edge) => edge.from === from.id && edge.to === to.id)) return
        const next = { ...dream, edges: [...dream.edges, { from: from.id, to: to.id }] }
        // An edge that would make the graph chase its own tail never lands.
        if (runOrder(next)) commit(next)
      },
    )
  }

  function erase() {
    if (!dream || !picked) return
    setPicked(null)
    if (picked.kind === 'edge')
      return commit({
        ...dream,
        edges: dream.edges.filter((_, index) => index !== picked.index),
      })
    commit({
      ...dream,
      nodes: dream.nodes.filter((one) => one.id !== picked.id),
      edges: dream.edges.filter(
        (edge) => edge.from !== picked.id && edge.to !== picked.id,
      ),
    })
  }

  function add(kind: DreamKind, at?: { x: number; y: number }) {
    if (!dream) return
    const box = canvas.current?.getBoundingClientRect()
    const centre =
      at ??
      toWorld(
        (box?.left ?? 0) + (box?.width ?? 600) / 2,
        (box?.top ?? 0) + (box?.height ?? 400) / 2,
      )
    const node = makeNode(dream, kind, centre.x - NODE_W / 2, centre.y - NODE_H / 2)
    commit({ ...dream, nodes: [...dream.nodes, node] })
    setPicked({ kind: 'node', id: node.id })
    if (isAgent(node)) setAgentOpen(node.id)
    else setOptions(true)
  }

  function rework(id: string, change: Partial<DreamNode>) {
    if (!dream) return
    commit({
      ...dream,
      nodes: dream.nodes.map((one) =>
        one.id === id ? ({ ...one, ...change } as DreamNode) : one,
      ),
    })
  }

  async function runNow() {
    try {
      const started = await app.client.request('POST /api/dream/run', { root, path })
      setRun(started.run)
    } catch (cause) {
      setBroken(cause instanceof Error ? cause.message : String(cause))
    }
  }

  /** The sites are asked for when the menu opens, so the list is the lair's answer now
   *  rather than a copy from whenever the dream was. */
  function openPlacing(open: boolean) {
    setPlacing(open)
    if (!open) return
    void app.lairDreams().then((answer) => {
      if (typeof answer === 'string') return
      setLairSites(answer.sites)
      setHostedAt(answer.dreams.filter((one) => one.path === path).map((one) => one.site))
    })
  }

  function placements(): MenuSection[] {
    const push: MenuSection = {
      heading: 'run on the lair, under…',
      actions: lairSites.length
        ? lairSites.map((site) => ({
            id: site.name,
            label: site.name,
            onSelect: () => void app.pushDream({ root, path, site: site.name }),
          }))
        : [
            {
              id: 'no-sites',
              label: 'no sites yet — register one in Settings → Server',
              disabled: true,
              onSelect: () => {},
            },
          ],
    }
    if (!hostedAt.length) return [push]
    return [
      push,
      {
        actions: hostedAt.map((site) => ({
          id: `off-${site}`,
          label: `remove from ${site}`,
          danger: true,
          onSelect: () => {
            setHostedAt((held) => held.filter((one) => one !== site))
            void app.dropDream({ site, path })
          },
        })),
      },
    ]
  }

  // --- paint ---------------------------------------------------------------------

  if (broken) return <div className="empty">{broken}</div>
  if (!dream) return <div className="empty" />

  const ends = edgeEnds(dream)
  const controls = kernel ? kernel.edgeControls(ends) : null
  const pickedNode =
    picked?.kind === 'node'
      ? (dream.nodes.find((one) => one.id === picked.id) ?? null)
      : null
  const agentNode = dream.nodes.filter(isAgent).find((one) => one.id === agentOpen)

  return (
    <div className="dream-page">
      <ContextMenu
        label="add node"
        sections={addSections((kind) => add(kind, spot.current ?? undefined))}
      >
        <div
          className="dream"
          ref={canvas}
          role="application"
          aria-label={`dream ${path}`}
          tabIndex={0}
          onPointerDown={pan}
          onWheel={wheel}
          onContextMenu={(event) => {
            spot.current = toWorld(event.clientX, event.clientY)
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Backspace' && event.key !== 'Delete') return
            if (event.target !== event.currentTarget) return
            event.preventDefault()
            erase()
          }}
          style={{ backgroundPosition: `${view.x}px ${view.y}px` }}
        >
          <div
            className="dream-world"
            style={{
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
            }}
          >
            <svg className="dream-edges" aria-hidden>
              {controls &&
                dream.edges.map((edge, i) => (
                  <g key={`${edge.from}>${edge.to}`}>
                    <path
                      className="dream-edge-hit"
                      d={pathOf(controls, i, ends)}
                      onPointerDown={(event) => {
                        event.stopPropagation()
                        setPicked({ kind: 'edge', index: i })
                        canvas.current?.focus()
                      }}
                    />
                    <path
                      className="dream-edge"
                      data-picked={
                        (picked?.kind === 'edge' && picked.index === i) || undefined
                      }
                      d={pathOf(controls, i, ends)}
                    />
                  </g>
                ))}
              {ghost && <path className="dream-edge dream-ghost" d={ghost} />}
            </svg>
            {dream.nodes.map((node) => (
              <NodeCard
                key={node.id}
                node={node}
                picked={picked?.kind === 'node' && picked.id === node.id}
                state={steps.get(node.id)?.state ?? null}
                onGrab={(event) => {
                  drag(event, node)
                  canvas.current?.focus()
                }}
                onConnect={(event) => connect(event, node)}
              />
            ))}
          </div>
          <div className="dream-bar">
            <Menu
              label="Add node"
              sections={addSections(add)}
              anchorClass="dream-button"
              anchorLabel="add node"
            >
              <Icon name="plus" />
            </Menu>
            <button
              type="button"
              className="dream-button dream-run"
              data-tip="run dream"
              aria-label="run dream"
              onClick={() => void runNow()}
            >
              <Icon name="play" />
            </button>
            {app.lair.keyed && (
              <Menu
                label="Run on the lair"
                sections={placements()}
                anchorClass="dream-button"
                anchorLabel="run on the lair"
                open={placing}
                onOpenChange={openPlacing}
              >
                <Icon name="antenna" />
              </Menu>
            )}
          </div>
        </div>
      </ContextMenu>
      {/* Figma's inspector rather than the terminal's slot: a compact card floating over
          the canvas's right edge, holding the picked node's options — same key, ⌘J. */}
      <section className="dream-options" aria-label="dream options" hidden={!options}>
        <header className="dream-options-head">
          {pickedNode ? pickedNode.name : 'options'}
          <span className="spacer" />
          <button
            type="button"
            className="terminal-hide"
            aria-label="hide options"
            data-tip="hide options (⌘J)"
            onClick={() => setOptions(false)}
          >
            ✕
          </button>
        </header>
        <div className="dream-options-body">
          {pickedNode ? (
            <Inspector
              node={pickedNode}
              step={steps.get(pickedNode.id) ?? null}
              onChange={(change) => rework(pickedNode.id, change)}
            />
          ) : (
            <p className="hint">Pick a node on the canvas to set its options.</p>
          )}
        </div>
      </section>
      {agentNode && (
        <AgentPopup
          node={agentNode}
          step={steps.get(agentNode.id) ?? null}
          personas={personas}
          onChange={(change) => rework(agentNode.id, change)}
          onClose={() => setAgentOpen(null)}
        />
      )}
      {liveId && (
        <section className="dream-live" aria-label="live logs">
          <header className="terminal-head">
            <span>{dream.nodes.find((n) => n.id === liveId)?.name ?? liveId}</span>
            <span className="dreams-dim"> — live</span>
            <span className="spacer" />
            <button
              type="button"
              className="terminal-hide"
              aria-label="close live logs"
              onClick={() => setLiveId(null)}
            >
              ✕
            </button>
          </header>
          <div className="dream-live-body">
            {(() => {
              const s = steps.get(liveId)
              if (!s) return <span className="dreams-dim">waiting…</span>
              return (
                <div className="dream-step" data-state={s.state}>
                  <span>
                    {s.name} — {s.state}
                  </span>
                  {(s.error ?? s.output ?? s.halted) && (
                    <pre>{s.error ?? s.halted ?? s.output}</pre>
                  )}
                </div>
              )
            })()}
          </div>
        </section>
      )}
    </div>
  )
}

/** An agent node's own surface: the prompt is the work, so a click on the node opens a
 *  dialog of its own over the canvas rather than a row in the corner card. */
function AgentPopup({
  node,
  step,
  personas,
  onChange,
  onClose,
}: {
  node: ClaudeNode | MuseNode
  step: { state: string; output?: string; error?: string; halted?: string } | null
  personas: Persona[]
  onChange: (change: Partial<DreamNode>) => void
  onClose: () => void
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <section className="dream-agent" role="dialog" aria-label={`${node.name} agent`}>
      <header className="dream-options-head">
        <Icon name={KINDS[node.kind].icon} />
        {node.name}
        <span className="spacer" />
        <button
          type="button"
          className="terminal-hide"
          aria-label="close agent"
          data-tip="close (esc)"
          onClick={onClose}
        >
          ✕
        </button>
      </header>
      <div className="dream-agent-body">
        <Field label="name">
          <input
            value={node.name}
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </Field>
        {/* A div where every other field is a label: an editor is not a control a label
            can point at, the same reason settings write their Soul field this way. */}
        <div className="dream-field">
          <span>prompt</span>
          <InlineEditor
            label="prompt"
            markdown={node.prompt}
            onChange={(prompt) => onChange({ prompt })}
          />
        </div>
        {/* A div rather than a Field: a label wrapping the picker would send every click
            inside the dropdown back to its button. */}
        {/* Muse has no personas — that field is Claude's alone. */}
        {node.kind === 'agent.claude' && (
          <div className="dream-field">
            <span>persona</span>
            <PersonaPicker
              value={node.persona}
              personas={personas}
              onChange={(persona) => onChange({ persona })}
            />
          </div>
        )}
        <Field label="time limit (minutes)">
          <input
            type="number"
            min={1}
            placeholder="5"
            value={node.minutes ?? ''}
            onChange={(event) => {
              const minutes = Number(event.target.value)
              onChange({ minutes: minutes >= 1 ? minutes : undefined })
            }}
          />
        </Field>
        {step && (step.output || step.error || step.halted) && (
          <div className="dream-step" data-state={step.state}>
            <span>{step.state}</span>
            <pre>{step.error ?? step.halted ?? step.output}</pre>
          </div>
        )}
      </div>
    </section>
  )
}

/** The add menu, in the same surface every other menu in the app opens: one popout per
 *  family, the kinds partitioned by their namespace so a new one files itself. */
function addSections(add: (kind: DreamKind) => void): MenuSection[] {
  const family = (stem: string) => ({
    actions: (Object.keys(KINDS) as DreamKind[])
      .filter((kind) => kind.startsWith(`${stem}.`))
      .map((kind) => ({
        id: kind,
        label: KINDS[kind].label,
        icon: KINDS[kind].icon,
        onSelect: () => add(kind),
      })),
  })
  return [
    {
      actions: [
        {
          id: 'triggers',
          label: 'Triggers',
          icon: 'zap',
          sub: [family('trigger')],
        },
        { id: 'steps', label: 'Steps', icon: 'terminal', sub: [family('agent')] },
      ],
    },
  ]
}

/** Follows a pointer gesture to its end: capture, move, and one call on the way out. */
function track(
  event: ReactPointerEvent,
  move: (going: PointerEvent) => void,
  done?: (last: PointerEvent) => void,
) {
  const onMove = (going: PointerEvent) => move(going)
  const onUp = (last: PointerEvent) => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    done?.(last)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  event.preventDefault()
}

function NodeCard({
  node,
  picked,
  state,
  onGrab,
  onConnect,
}: {
  node: DreamNode
  picked: boolean
  state: string | null
  onGrab: (event: ReactPointerEvent) => void
  onConnect: (event: ReactPointerEvent) => void
}) {
  return (
    <div
      className="dream-node"
      role="group"
      aria-label={node.name}
      data-node={node.id}
      data-picked={picked || undefined}
      data-state={state ?? undefined}
      style={{ left: node.x, top: node.y, width: NODE_W, height: NODE_H }}
      onPointerDown={onGrab}
    >
      <Icon name={KINDS[node.kind].icon} />
      <div className="dream-node-words">
        <span className="dream-node-name">{node.name}</span>
        <span className="dream-node-kind">{KINDS[node.kind].label}</span>
      </div>
      {!node.kind.startsWith('trigger.') && <span className="dream-port dream-in" />}
      <span
        className="dream-port dream-out"
        onPointerDown={(event) => {
          event.stopPropagation()
          onConnect(event)
        }}
      />
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="dream-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function Inspector({
  node,
  step,
  onChange,
}: {
  node: DreamNode
  step: { state: string; output?: string; error?: string; halted?: string } | null
  onChange: (change: Partial<DreamNode>) => void
}) {
  return (
    <aside className="dream-inspector" aria-label={`configure ${node.name}`}>
      <Field label="name">
        <input
          value={node.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </Field>
      {node.kind === 'trigger.interval' && (
        <Field label="every (minutes)">
          <input
            type="number"
            min={1}
            value={node.minutes}
            onChange={(event) =>
              onChange({ minutes: Math.max(1, Number(event.target.value) || 1) })
            }
          />
        </Field>
      )}
      {node.kind === 'trigger.time' && (
        <Field label="at">
          <TimeField value={node.at} label="at" onChange={(at) => onChange({ at })} />
        </Field>
      )}
      {node.kind === 'trigger.file' && (
        <Field label="file path">
          <input
            value={node.path}
            placeholder="in.md or /somewhere/else"
            onChange={(event) => onChange({ path: event.target.value })}
          />
        </Field>
      )}
      {node.kind === 'trigger.http' && (
        <Field label="url">
          <input
            value={node.url}
            placeholder="https://example.com/feed"
            onChange={(event) => onChange({ url: event.target.value })}
          />
        </Field>
      )}
      {/* The prompt nodes live in their own dialog — a click on the node opens it — so
          the card holds only the name and, below, what the last run said. */}
      {node.kind === 'agent.shell' && (
        <Field label="command">
          <textarea
            rows={3}
            value={node.command}
            placeholder="git status --short"
            onChange={(event) => onChange({ command: event.target.value })}
          />
        </Field>
      )}
      {node.kind === 'agent.gate' && (
        <Field label="continue when the input matches">
          <input
            value={node.pattern}
            placeholder="^ALERT"
            onChange={(event) => onChange({ pattern: event.target.value })}
          />
        </Field>
      )}
      {node.kind === 'agent.shell' && (
        <Field label="time limit (minutes)">
          <input
            type="number"
            min={1}
            placeholder="5"
            value={node.minutes ?? ''}
            onChange={(event) => {
              const minutes = Number(event.target.value)
              onChange({ minutes: minutes >= 1 ? minutes : undefined })
            }}
          />
        </Field>
      )}
      {node.kind === 'agent.note' && (
        <>
          <Field label="note path">
            <input
              value={node.path}
              placeholder="Dreams/Log.md"
              onChange={(event) => onChange({ path: event.target.value })}
            />
          </Field>
          <Field label="keep a log (append)">
            <input
              type="checkbox"
              checked={node.append ?? false}
              onChange={(event) =>
                onChange({ append: event.target.checked || undefined })
              }
            />
          </Field>
        </>
      )}
      {step && (step.output || step.error || step.halted) && (
        <div className="dream-step" data-state={step.state}>
          <span>{step.state}</span>
          <pre>{step.error ?? step.halted ?? step.output}</pre>
        </div>
      )}
    </aside>
  )
}
