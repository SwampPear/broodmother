import { expect, it } from 'vitest'
import type { Dream, DreamNode } from '@/types'
import { Crontab, scheduleLines, type CrontabIO } from './crontab'

function graph(nodes: DreamNode[], edges: [string, string][]): Dream {
  return { version: 1, nodes, edges: edges.map(([from, to]) => ({ from, to })) }
}

function at(kind: DreamNode['kind'], id: string, config: object = {}): DreamNode {
  return { id, kind, name: id, x: 0, y: 0, ...config } as DreamNode
}

const note = at('agent.note', 'log', { path: 'Log.md' })
const url = 'http://127.0.0.1:3001'

function fake(initial = '') {
  let text = initial
  let writes = 0
  const io: CrontabIO = {
    read: async () => text,
    write: async (next) => {
      text = next
      writes++
    },
  }
  return { io, text: () => text, writes: () => writes }
}

it('turns wired schedule triggers into cron lines that call the server', () => {
  const dream = graph(
    [
      at('trigger.interval', 'pulse', { minutes: 5 }),
      at('trigger.time', 'dawn', { at: '09:30' }),
      note,
    ],
    [
      ['pulse', 'log'],
      ['dawn', 'log'],
    ],
  )
  const lines = scheduleLines(
    [{ ref: { root: 'vault', path: 'Nightly.dream' }, dream }],
    url,
  )
  expect(lines).toHaveLength(2)
  expect(lines[0]).toContain('*/5 * * * * /usr/bin/curl')
  expect(lines[0]).toContain(`'{"root":"vault","path":"Nightly.dream"}'`)
  expect(lines[0]).toContain(`'${url}/api/dream/run'`)
  expect(lines[1].startsWith('30 9 * * * ')).toBe(true)
})

/* A cron line fires long after the window that scheduled it is gone, so the vault the
   dream lives in has to ride the line itself — `{root, path}` alone would land on
   whichever vault happened to be opened last. */
it('names the dream’s vault on the line it fires', () => {
  const dream = graph(
    [at('trigger.interval', 'pulse', { minutes: 5 }), note],
    [['pulse', 'log']],
  )
  const [line] = scheduleLines(
    [
      {
        vault: '/Users/you/.broodmother/you/handbook',
        ref: { root: 'vault', path: 'A.dream' },
        dream,
      },
    ],
    url,
  )
  // The escaping is cron's: a bare % is a newline to it, so the quoting backslashes each.
  const encoded = encodeURIComponent('/Users/you/.broodmother/you/handbook').replaceAll(
    '%',
    '\\%',
  )
  expect(line).toContain(`'${url}/api/dream/run?vault=${encoded}'`)
})

it('rounds an interval cron cannot say to hours, and leaves the rest alone', () => {
  const dream = graph(
    [
      at('trigger.interval', 'wide', { minutes: 90 }),
      at('trigger.interval', 'unwired', { minutes: 5 }),
      at('trigger.manual', 'go'),
      at('trigger.file', 'watch', { path: 'in.md' }),
      note,
    ],
    [
      ['wide', 'log'],
      ['go', 'log'],
      ['watch', 'log'],
    ],
  )
  const lines = scheduleLines([{ ref: { root: 'vault', path: 'A.dream' }, dream }], url)
  expect(lines).toHaveLength(1)
  expect(lines[0].startsWith('0 */2 * * * ')).toBe(true)
})

it('escapes what cron and the shell would eat', () => {
  const dream = graph(
    [at('trigger.interval', 'pulse', { minutes: 1 }), note],
    [['pulse', 'log']],
  )
  const ref = { root: 'vault' as const, path: `it's 100%.dream` }
  const [line] = scheduleLines([{ ref, dream }], url)
  expect(line).toContain(`it'\\''s 100\\%.dream`)
})

it('installs its block beside what the user already had', async () => {
  const theirs = '0 12 * * * say lunch'
  const { io, text } = fake(`${theirs}\n`)
  await new Crontab(io).sync(['*/5 * * * * beat'])
  expect(text()).toBe(
    `${theirs}\n\n# BROODMOTHER BEGIN — schedules managed by broodmother, edits here are overwritten\n*/5 * * * * beat\n# BROODMOTHER END\n`,
  )
})

it('rewrites only its own block, and removes it when nothing is scheduled', async () => {
  const { io, text } = fake()
  const crontab = new Crontab(io)
  await crontab.sync(['*/5 * * * * beat'])
  const stale = `0 12 * * * say lunch\n${text()}`
  const again = fake(stale)
  const fresh = new Crontab(again.io)
  await fresh.sync(['0 9 * * * other'])
  expect(again.text()).toContain('say lunch')
  expect(again.text()).toContain('0 9 * * * other')
  expect(again.text()).not.toContain('beat')
  await fresh.sync([])
  expect(again.text()).toBe('0 12 * * * say lunch\n')
})

it('does not touch the crontab when the schedule has not changed', async () => {
  const { io, writes } = fake()
  const crontab = new Crontab(io)
  await crontab.sync(['*/5 * * * * beat'])
  await crontab.sync(['*/5 * * * * beat'])
  expect(writes()).toBe(1)
  await crontab.sync([])
  expect(writes()).toBe(2)
})
