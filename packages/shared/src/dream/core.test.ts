import { expect, it } from 'vitest'
import {
  emptyDream,
  isDreamPath,
  parseDream,
  runOrder,
  serializeDream,
  type Dream,
} from './core'

const dream: Dream = {
  version: 1,
  nodes: [
    { id: 'a', kind: 'trigger.interval', name: 'Every hour', x: 0, y: 0, minutes: 60 },
    { id: 'b', kind: 'agent.claude', name: 'Summarize', x: 200, y: 0, prompt: 'sum up' },
    { id: 'c', kind: 'agent.note', name: 'Log it', x: 400, y: 0, path: 'Log.md' },
  ],
  edges: [
    { from: 'a', to: 'b' },
    { from: 'b', to: 'c' },
  ],
}

it('knows its own files', () => {
  expect(isDreamPath('Nightly.dream')).toBe(true)
  expect(isDreamPath('Nightly.md')).toBe(false)
})

it('round-trips byte for byte', () => {
  const text = serializeDream(dream)
  expect(serializeDream(parseDream(text))).toBe(text)
})

it('carries a persona only when the node wears one', () => {
  const bare = serializeDream(dream)
  expect(bare).not.toContain('persona')
  const worn: Dream = {
    ...dream,
    nodes: dream.nodes.map((node) =>
      node.kind === 'agent.claude' ? { ...node, persona: 'lens' } : node,
    ),
  }
  const text = serializeDream(worn)
  expect(text).toContain('"persona": "lens"')
  expect(serializeDream(parseDream(text))).toBe(text)
})

it('refuses a persona that is not a string', () => {
  const bad = JSON.parse(serializeDream(dream))
  bad.nodes[1].persona = 7
  expect(() => parseDream(JSON.stringify(bad))).toThrow('persona is not a string')
})

it('round-trips the event triggers and refuses ones missing their source', () => {
  const eventful: Dream = {
    ...dream,
    nodes: [
      { id: 'f', kind: 'trigger.file', name: 'On change', x: 0, y: 0, path: 'in.md' },
      { id: 'h', kind: 'trigger.http', name: 'On news', x: 0, y: 80, url: 'https://x' },
      ...dream.nodes,
    ],
  }
  const text = serializeDream(eventful)
  expect(serializeDream(parseDream(text))).toBe(text)
  const bad = JSON.parse(text)
  delete bad.nodes[0].path
  expect(() => parseDream(JSON.stringify(bad))).toThrow('path is not a string')
  bad.nodes[0].path = 'in.md'
  delete bad.nodes[1].url
  expect(() => parseDream(JSON.stringify(bad))).toThrow('url is not a string')
})

it('round-trips the workflow nodes and their optional settings', () => {
  const workflow: Dream = {
    ...dream,
    nodes: [
      ...dream.nodes,
      {
        id: 's',
        kind: 'agent.shell',
        name: 'Fetch',
        x: 0,
        y: 160,
        command: 'git log --oneline -5',
        minutes: 10,
      },
      {
        id: 'g',
        kind: 'agent.gate',
        name: 'Only alerts',
        x: 0,
        y: 240,
        pattern: 'ALERT',
      },
      {
        id: 'n',
        kind: 'agent.note',
        name: 'Keep',
        x: 0,
        y: 320,
        path: 'Log.md',
        append: true,
      },
    ],
  }
  const text = serializeDream(workflow)
  expect(serializeDream(parseDream(text))).toBe(text)
  // Unset options stay unwritten, so plain dreams look the way they always did.
  expect(serializeDream(dream)).not.toContain('append')

  const bad = JSON.parse(text)
  bad.nodes[3].minutes = 0
  expect(() => parseDream(JSON.stringify(bad))).toThrow('at least 1')
  bad.nodes[3].minutes = 10
  bad.nodes[4].pattern = '('
  expect(() => parseDream(JSON.stringify(bad))).toThrow('not a regular expression')
  bad.nodes[4].pattern = 'ALERT'
  bad.nodes[5].append = 'yes'
  expect(() => parseDream(JSON.stringify(bad))).toThrow('append is not a boolean')
})

it('parses what the editor writes, starting from empty', () => {
  const parsed = parseDream(serializeDream(emptyDream()))
  expect(parsed.nodes[0].kind).toBe('trigger.manual')
})

it('refuses what a dream cannot be', () => {
  expect(() => parseDream('nope')).toThrow('not JSON')
  expect(() => parseDream('{"version":2,"nodes":[],"edges":[]}')).toThrow('version')
  const missing = { ...dream, edges: [{ from: 'a', to: 'ghost' }] }
  expect(() => parseDream(JSON.stringify(missing))).toThrow('missing node')
  const bad = JSON.parse(serializeDream(dream))
  bad.nodes[0].minutes = 0
  expect(() => parseDream(JSON.stringify(bad))).toThrow('at least 1')
  bad.nodes[0].minutes = 60
  bad.nodes.push({ ...bad.nodes[1], kind: 'agent.mystery' })
  expect(() => parseDream(JSON.stringify(bad))).toThrow('unknown kind')
})

it('orders a run triggers-first, layer by layer', () => {
  const wide: Dream = {
    ...dream,
    nodes: [
      ...dream.nodes,
      { id: 'd', kind: 'agent.claude', name: 'Review', x: 200, y: 100, prompt: 'check' },
    ],
    edges: [
      { from: 'a', to: 'b' },
      { from: 'a', to: 'd' },
      { from: 'b', to: 'c' },
      { from: 'd', to: 'c' },
    ],
  }
  expect(runOrder(wide)).toEqual([['a'], ['b', 'd'], ['c']])
})

it('answers a cycle with null', () => {
  const loop: Dream = {
    ...dream,
    edges: [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
      { from: 'c', to: 'b' },
    ],
  }
  expect(runOrder(loop)).toBeNull()
})
