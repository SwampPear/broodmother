import { extensionOf } from '@/core'
import type { ClaudeNode, Dream, DreamNode, NoteNode, ShellNode } from '@/types'

export const DREAM_EXTENSION = '.dream'

export function isDreamPath(path: string): boolean {
  return extensionOf(path) === 'dream'
}

export function isTrigger(node: DreamNode): boolean {
  return node.kind.startsWith('trigger.')
}

// How a trigger reads in a sentence — the dreams page's word for it. Null for agents.
export function triggerLabel(node: DreamNode): string | null {
  switch (node.kind) {
    case 'trigger.manual':
      return 'when run'
    case 'trigger.interval':
      return `every ${node.minutes} minute${node.minutes === 1 ? '' : 's'}`
    case 'trigger.time':
      return `at ${node.at}`
    case 'trigger.file':
      return `when ${node.path} changes`
    case 'trigger.http':
      return `when ${node.url} changes`
    default:
      return null
  }
}

export class DreamError extends Error {}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

function fail(reason: string): never {
  throw new DreamError(reason)
}

function record(value: unknown, what: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    fail(`${what} is not an object`)
  return value as Record<string, unknown>
}

function text(value: unknown, what: string): string {
  if (typeof value !== 'string') fail(`${what} is not a string`)
  return value
}

function finite(value: unknown, what: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    fail(`${what} is not a number`)
  return value
}

function span(value: unknown, id: string): number {
  const minutes = finite(value, `${id} minutes`)
  if (minutes < 1) fail(`${id} minutes must be at least 1`)
  return minutes
}

function node(value: unknown, index: number): DreamNode {
  const raw = record(value, `node ${index}`)
  const id = text(raw.id, `node ${index} id`)
  const base = {
    id,
    name: text(raw.name, `${id} name`),
    x: finite(raw.x, `${id} x`),
    y: finite(raw.y, `${id} y`),
  }
  switch (raw.kind) {
    case 'trigger.manual':
      return { kind: raw.kind, ...base }
    case 'trigger.interval':
      return { kind: raw.kind, ...base, minutes: span(raw.minutes, id) }
    case 'trigger.time': {
      const at = text(raw.at, `${id} at`)
      if (!TIME.test(at)) fail(`${id} at must be HH:MM`)
      return { kind: raw.kind, ...base, at }
    }
    case 'trigger.file':
      return { kind: raw.kind, ...base, path: text(raw.path, `${id} path`) }
    case 'trigger.http':
      return { kind: raw.kind, ...base, url: text(raw.url, `${id} url`) }
    case 'agent.claude': {
      const claude: ClaudeNode = {
        kind: raw.kind,
        ...base,
        prompt: text(raw.prompt, `${id} prompt`),
      }
      if (raw.persona !== undefined) claude.persona = text(raw.persona, `${id} persona`)
      if (raw.minutes !== undefined) claude.minutes = span(raw.minutes, id)
      return claude
    }
    case 'agent.shell': {
      const shell: ShellNode = {
        kind: raw.kind,
        ...base,
        command: text(raw.command, `${id} command`),
      }
      if (raw.minutes !== undefined) shell.minutes = span(raw.minutes, id)
      return shell
    }
    case 'agent.gate': {
      const pattern = text(raw.pattern, `${id} pattern`)
      try {
        new RegExp(pattern)
      } catch {
        fail(`${id} pattern is not a regular expression`)
      }
      return { kind: raw.kind, ...base, pattern }
    }
    case 'agent.note': {
      const note: NoteNode = {
        kind: raw.kind,
        ...base,
        path: text(raw.path, `${id} path`),
      }
      if (raw.append !== undefined) {
        if (typeof raw.append !== 'boolean') fail(`${id} append is not a boolean`)
        note.append = raw.append
      }
      return note
    }
    default:
      fail(`${id} has unknown kind ${JSON.stringify(raw.kind)}`)
  }
}

export function parseDream(source: string): Dream {
  let raw: unknown
  try {
    raw = JSON.parse(source)
  } catch {
    fail('not JSON')
  }
  const dream = record(raw, 'dream')
  if (dream.version !== 1) fail('version must be 1')
  if (!Array.isArray(dream.nodes)) fail('nodes is not a list')
  if (!Array.isArray(dream.edges)) fail('edges is not a list')
  const nodes = dream.nodes.map(node)
  const ids = new Set(nodes.map((one) => one.id))
  if (ids.size !== nodes.length) fail('node ids repeat')
  const edges = dream.edges.map((value, index) => {
    const raw = record(value, `edge ${index}`)
    const edge = {
      from: text(raw.from, `edge ${index} from`),
      to: text(raw.to, `edge ${index} to`),
    }
    if (!ids.has(edge.from) || !ids.has(edge.to))
      fail(`edge ${index} points at a missing node`)
    if (edge.from === edge.to) fail(`edge ${index} points at itself`)
    return edge
  })
  return { version: 1, nodes, edges }
}

// Canonical two-space JSON in schema field order, so a load–save round trip is
// byte-identical and dreams diff cleanly in git.
export function serializeDream(dream: Dream): string {
  const canonical = {
    version: dream.version,
    nodes: dream.nodes.map((one) => {
      const head = { id: one.id, kind: one.kind, name: one.name, x: one.x, y: one.y }
      switch (one.kind) {
        case 'trigger.manual':
          return head
        case 'trigger.interval':
          return { ...head, minutes: one.minutes }
        case 'trigger.time':
          return { ...head, at: one.at }
        case 'trigger.file':
          return { ...head, path: one.path }
        case 'trigger.http':
          return { ...head, url: one.url }
        case 'agent.claude':
          return {
            ...head,
            prompt: one.prompt,
            ...(one.persona === undefined ? {} : { persona: one.persona }),
            ...(one.minutes === undefined ? {} : { minutes: one.minutes }),
          }
        case 'agent.shell':
          return {
            ...head,
            command: one.command,
            ...(one.minutes === undefined ? {} : { minutes: one.minutes }),
          }
        case 'agent.gate':
          return { ...head, pattern: one.pattern }
        case 'agent.note':
          return {
            ...head,
            path: one.path,
            ...(one.append === undefined ? {} : { append: one.append }),
          }
      }
    }),
    edges: dream.edges.map((one) => ({ from: one.from, to: one.to })),
  }
  return `${JSON.stringify(canonical, null, 2)}\n`
}

// The order a run walks the graph: layers of node ids, triggers first, every node after
// everything that feeds it. Null when the graph has a cycle — the editor refuses the edge
// and the server refuses the run with the same answer.
export function runOrder(dream: Dream): string[][] | null {
  const waiting = new Map(dream.nodes.map((one) => [one.id, 0]))
  for (const edge of dream.edges) waiting.set(edge.to, (waiting.get(edge.to) ?? 0) + 1)
  const layers: string[][] = []
  let ready = dream.nodes.filter((one) => waiting.get(one.id) === 0).map((one) => one.id)
  let placed = 0
  while (ready.length > 0) {
    layers.push(ready)
    placed += ready.length
    const next: string[] = []
    for (const edge of dream.edges) {
      if (!ready.includes(edge.from)) continue
      const left = (waiting.get(edge.to) ?? 0) - 1
      waiting.set(edge.to, left)
      if (left === 0) next.push(edge.to)
    }
    ready = next
  }
  return placed === dream.nodes.length ? layers : null
}

export function emptyDream(): Dream {
  return {
    version: 1,
    nodes: [{ id: 'trigger', kind: 'trigger.manual', name: 'When run', x: 80, y: 120 }],
    edges: [],
  }
}
