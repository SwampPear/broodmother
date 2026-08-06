import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, expect, it } from 'vitest'
import { serializeDream } from '@/dream'
import type { Dream, DreamNode } from '@/types'
import { cleanup, tempDir, until } from '../test'
import { Tree } from '../tree'
import type { StepCtx, StepResult } from './blocks'
import { Dreams } from './core'
import { Crontab, type CrontabIO } from './crontab'
import { RunStore } from './db'
import { TriggerStore } from './state'

afterAll(cleanup)

function graph(nodes: DreamNode[], edges: [string, string][]): Dream {
  return { version: 1, nodes, edges: edges.map(([from, to]) => ({ from, to })) }
}

function at(kind: DreamNode['kind'], id: string, config: object = {}): DreamNode {
  return { id, kind, name: id, x: 0, y: 0, ...config } as DreamNode
}

async function harness(
  dream: Dream,
  path_ = 'Nightly.dream',
  personas: Record<string, string> = {},
) {
  const dir = await tempDir()
  const tree = new Tree(dir)
  await tree.write(path_, serializeDream(dream))
  let crontab = ''
  const io: CrontabIO = {
    read: async () => crontab,
    write: async (next) => {
      crontab = next
    },
  }
  const keep = await tempDir()
  const stateFile = path.join(keep, 'triggers.json')
  const dbFile = path.join(keep, 'dreams.db')
  const asked: { prompt: string; input: string; cwd: string; persona: string | null }[] =
    []
  let answer: (prompt: string) => Promise<string | StepResult> = async (prompt) =>
    `answered ${prompt}`
  const deps = {
    sites: () => [{ root: 'vault' as const, tree, path: dir }],
    vault: () => tree,
    url: () => 'http://127.0.0.1:0',
    cron: new Crontab(io),
    store: new TriggerStore(stateFile),
    runs: new RunStore(dbFile),
    scratch: () => path.join(keep, 'runs'),
    persona: async (name: string) => personas[name] ?? null,
    agent: async (node: { prompt: string }, ctx: StepCtx) => {
      asked.push({
        prompt: node.prompt,
        input: ctx.input,
        cwd: ctx.cwd,
        persona: ctx.persona,
      })
      return answer(node.prompt)
    },
  }
  const dreams = new Dreams(deps)
  return {
    dir,
    tree,
    dreams,
    asked,
    stateFile,
    ref: { root: 'vault' as const, path: path_ },
    crontab: () => crontab,
    reborn: () =>
      new Dreams({
        ...deps,
        store: new TriggerStore(stateFile),
        runs: new RunStore(dbFile),
      }),
    answer: (text: string) => {
      answer = async () => text
    },
    decide: (result: StepResult) => {
      answer = async () => result
    },
    fail: (reason: string) => {
      answer = async (prompt) => {
        throw new Error(`${reason}: ${prompt}`)
      }
    },
    slow: () => {
      let release = () => {}
      let stalled = false
      answer = (prompt) => {
        if (stalled) return Promise.resolve(`answered ${prompt}`)
        stalled = true
        return new Promise((resolve) => (release = () => resolve('eventually')))
      }
      return () => release()
    },
    settled: async () => {
      const run = () => dreams.runsFor({ root: 'vault', path: path_ })[0]
      await until(() => run() !== undefined && run().state !== 'running')
      return run()
    },
  }
}

const chain = graph(
  [
    at('trigger.manual', 'go'),
    at('agent.claude', 'first', { prompt: 'sum up' }),
    at('agent.claude', 'second', { prompt: 'check it' }),
    at('agent.note', 'log', { path: 'Log.md' }),
  ],
  [
    ['go', 'first'],
    ['first', 'second'],
    ['second', 'log'],
  ],
)

it('walks a run in order, feeding each step what fed it', async () => {
  const h = await harness(chain)
  await h.dreams.run(h.ref)
  const run = await h.settled()
  expect(run.state).toBe('done')
  expect(run.steps.map((step) => step.state)).toEqual(['done', 'done', 'done', 'done'])
  expect(h.asked).toEqual([
    { prompt: 'sum up', input: '', cwd: h.dir, persona: null },
    { prompt: 'check it', input: 'answered sum up', cwd: h.dir, persona: null },
  ])
  expect(await h.tree.read('Log.md')).toBe('answered check it\n')
})

it('fails the run at the failing step and skips what was downstream', async () => {
  const h = await harness(chain)
  h.fail('no thoughts')
  await h.dreams.run(h.ref)
  const run = await h.settled()
  expect(run.state).toBe('error')
  expect(run.error).toContain('no thoughts')
  expect(run.steps.map((step) => step.state)).toEqual([
    'done',
    'error',
    'skipped',
    'skipped',
  ])
  expect(await h.tree.exists('Log.md')).toBe(false)
})

it('hands the agent the body of the persona the node wears', async () => {
  const worn = graph(
    [
      at('trigger.manual', 'go'),
      at('agent.claude', 'first', { prompt: 'sum up', persona: 'lens' }),
    ],
    [['go', 'first']],
  )
  const h = await harness(worn, 'Nightly.dream', { lens: 'You are Lens.' })
  await h.dreams.run(h.ref)
  const run = await h.settled()
  expect(run.state).toBe('done')
  expect(h.asked).toEqual([
    { prompt: 'sum up', input: '', cwd: h.dir, persona: 'You are Lens.' },
  ])
})

it('fails the step whose persona the vault does not have', async () => {
  const worn = graph(
    [
      at('trigger.manual', 'go'),
      at('agent.claude', 'first', { prompt: 'sum up', persona: 'ghost' }),
    ],
    [['go', 'first']],
  )
  const h = await harness(worn)
  await h.dreams.run(h.ref)
  const run = await h.settled()
  expect(run.state).toBe('error')
  expect(run.error).toContain('no persona named "ghost"')
  expect(h.asked).toEqual([])
})

it('refuses to run a cycle', async () => {
  const loop = graph(
    [
      at('trigger.manual', 'go'),
      at('agent.claude', 'first', { prompt: 'a' }),
      at('agent.claude', 'second', { prompt: 'b' }),
    ],
    [
      ['go', 'first'],
      ['first', 'second'],
      ['second', 'first'],
    ],
  )
  const h = await harness(loop)
  await expect(h.dreams.run(h.ref)).rejects.toThrow('cycle')
})

it('joins the live run instead of stacking a second', async () => {
  const h = await harness(chain)
  const release = h.slow()
  const first = await h.dreams.run(h.ref)
  const second = await h.dreams.run(h.ref)
  expect(second).toBe(first)
  // The walk reaches its first agent a few file writes in; release once it is held.
  await until(() => h.asked.length > 0)
  release()
  await h.settled()
  expect(h.dreams.runsFor(h.ref)).toHaveLength(1)
})

it('mirrors wired schedule triggers into the crontab, and clears them when they go', async () => {
  const every = graph(
    [
      at('trigger.interval', 'pulse', { minutes: 5 }),
      at('trigger.interval', 'unwired', { minutes: 9 }),
      at('agent.note', 'log', { path: 'Log.md' }),
    ],
    [['pulse', 'log']],
  )
  const h = await harness(every)
  await h.dreams.tick()
  expect(h.crontab()).toContain('*/5 * * * *')
  expect(h.crontab()).not.toContain('*/9')
  expect(h.crontab()).toContain('Nightly.dream')
  // Cron does the waking now — a beat of the watcher starts nothing itself.
  expect(h.dreams.runsFor(h.ref)).toHaveLength(0)

  await h.tree.write(h.ref.path, serializeDream(chain))
  await h.dreams.tick()
  expect(h.crontab()).toBe('')
})

it('fires an event trigger when its source moves, feeding the run what it saw', async () => {
  const watching = graph(
    [
      at('trigger.file', 'watch', { path: 'in.md' }),
      at('agent.note', 'log', { path: 'Log.md' }),
    ],
    [['watch', 'log']],
  )
  const h = await harness(watching)
  await h.dreams.tick()
  expect(h.dreams.runsFor(h.ref)).toHaveLength(0)

  await h.tree.write('in.md', 'news')
  await h.dreams.tick()
  const run = await h.settled()
  expect(run.state).toBe('done')
  // The opening context names the file that moved and carries what it now says.
  expect(await h.tree.read('Log.md')).toBe(`${path.join(h.dir, 'in.md')}\n\nnews\n`)

  // The cursor was saved, so a quiet source stays quiet — even for a restarted server.
  await h.dreams.tick()
  expect(h.dreams.runsFor(h.ref)).toHaveLength(1)
  const reborn = h.reborn()
  await reborn.tick()
  expect(reborn.runsFor(h.ref)).toHaveLength(1)
})

it('runs a shell step in the checkout, input in, output onward', async () => {
  const piped = graph(
    [
      at('trigger.manual', 'go'),
      at('agent.shell', 'fetch', { command: 'printf hello' }),
      at('agent.shell', 'shout', { command: 'tr a-z A-Z' }),
      at('agent.note', 'log', { path: 'Log.md' }),
    ],
    [
      ['go', 'fetch'],
      ['fetch', 'shout'],
      ['shout', 'log'],
    ],
  )
  const h = await harness(piped)
  await h.dreams.run(h.ref)
  const run = await h.settled()
  expect(run.state).toBe('done')
  expect(await h.tree.read('Log.md')).toBe('HELLO\n')
})

it('fails the run when a shell step fails, with what it said', async () => {
  const broken = graph(
    [
      at('trigger.manual', 'go'),
      at('agent.shell', 'boom', { command: 'echo no >&2; exit 3' }),
    ],
    [['go', 'boom']],
  )
  const h = await harness(broken)
  await h.dreams.run(h.ref)
  const run = await h.settled()
  expect(run.state).toBe('error')
  expect(run.error).toContain('no')
})

it('lets a held gate end its branch quietly while the rest of the run goes on', async () => {
  const judged = graph(
    [
      at('trigger.manual', 'go'),
      at('agent.claude', 'judge', { prompt: 'all well?' }),
      at('agent.gate', 'alerts', { pattern: 'ALERT' }),
      at('agent.note', 'alarm', { path: 'Alarm.md' }),
      at('agent.note', 'log', { path: 'Log.md' }),
    ],
    [
      ['go', 'judge'],
      ['judge', 'alerts'],
      ['alerts', 'alarm'],
      ['judge', 'log'],
    ],
  )
  const h = await harness(judged)
  await h.dreams.run(h.ref)
  let run = await h.settled()
  expect(run.state).toBe('done')
  expect(run.steps.map((step) => step.state)).toEqual([
    'done',
    'done',
    'done',
    'done',
    'skipped',
  ])
  expect(await h.tree.exists('Alarm.md')).toBe(false)
  expect(await h.tree.read('Log.md')).toBe('answered all well?\n')

  // The judge cries ALERT; the gate opens and the alarm branch runs with its words.
  h.answer('ALERT: answered')
  await h.dreams.run(h.ref)
  await until(() => h.dreams.runsFor(h.ref).length === 2)
  run = await h.settled()
  expect(run.steps.map((step) => step.state)).toEqual([
    'done',
    'done',
    'done',
    'done',
    'done',
  ])
  expect(await h.tree.read('Alarm.md')).toBe('ALERT: answered\n')
})

it('appends to a note asked to keep a log, and rewrites one that is not', async () => {
  const kept = graph(
    [
      at('trigger.manual', 'go'),
      at('agent.claude', 'first', { prompt: 'sum up' }),
      at('agent.note', 'log', { path: 'Log.md', append: true }),
    ],
    [
      ['go', 'first'],
      ['first', 'log'],
    ],
  )
  const h = await harness(kept)
  await h.dreams.run(h.ref)
  await h.settled()
  await h.dreams.run(h.ref)
  await until(() => h.dreams.runsFor(h.ref).length === 2)
  await h.settled()
  expect(await h.tree.read('Log.md')).toBe('answered sum up\nanswered sum up\n')
})

it('keeps run history on disk, where a restarted server still has it', async () => {
  const h = await harness(chain)
  await h.dreams.run(h.ref)
  await h.settled()
  const [run] = h.reborn().runsFor(h.ref)
  expect(run.state).toBe('done')
  expect(run.steps.map((step) => step.state)).toEqual(['done', 'done', 'done', 'done'])
  expect(run.steps[2].output).toBe('answered check it')
})

it('sums the page up: each dream, its wired triggers, its last run', async () => {
  const every = graph(
    [
      at('trigger.interval', 'pulse', { minutes: 5 }),
      at('trigger.time', 'dawn', { at: '09:00' }),
      at('trigger.file', 'watch', { path: 'in.md' }),
      at('agent.note', 'log', { path: 'Log.md' }),
    ],
    [
      ['pulse', 'log'],
      ['watch', 'log'],
    ],
  )
  const h = await harness(every, 'Sub/Pulse.dream')
  const before = await h.dreams.summaries()
  expect(before).toEqual([
    {
      ref: h.ref,
      name: 'Pulse',
      triggers: [
        { kind: 'trigger.interval', label: 'every 5 minutes' },
        { kind: 'trigger.file', label: 'when in.md changes' },
      ],
      lastRun: null,
    },
  ])
  await h.dreams.run(h.ref)
  await h.settled()
  const after = await h.dreams.summaries()
  expect(after[0].lastRun?.state).toBe('done')
})

it('lets a wired-to-nothing event trigger rest', async () => {
  const idle = graph(
    [
      at('trigger.file', 'watch', { path: 'in.md' }),
      at('agent.note', 'log', { path: 'Log.md' }),
    ],
    [],
  )
  const h = await harness(idle)
  await h.dreams.tick()
  await h.tree.write('in.md', 'news')
  await h.dreams.tick()
  expect(h.dreams.runsFor(h.ref)).toHaveLength(0)
})

/* The scratchpad is the wire: every step reads one file and leaves one behind, and the
   folder outlives the run as its record. */
it('pipes each step through files in the run scratchpad', async () => {
  const h = await harness(chain)
  await h.dreams.run(h.ref)
  const run = await h.settled()
  const read = (name: string) => readFile(path.join(run.scratch!, name), 'utf8')
  expect(await read('go.md')).toBe('')
  expect(await read('first.in.md')).toBe('')
  expect(await read('first.out.md')).toBe('answered sum up')
  expect(await read('second.in.md')).toBe('answered sum up')
  expect(await read('second.out.md')).toBe('answered check it')
})

/* One file in, whatever fed it: a join names each part after the node that said it. */
it('joins a fan-in under headings', async () => {
  const fan = graph(
    [
      at('trigger.manual', 'go'),
      at('agent.shell', 'left', { command: 'printf one' }),
      at('agent.shell', 'right', { command: 'printf two' }),
      at('agent.note', 'log', { path: 'Log.md' }),
    ],
    [
      ['go', 'left'],
      ['go', 'right'],
      ['left', 'log'],
      ['right', 'log'],
    ],
  )
  const h = await harness(fan)
  await h.dreams.run(h.ref)
  const run = await h.settled()
  expect(run.state).toBe('done')
  expect(await h.tree.read('Log.md')).toBe(
    '## from left\n\none\n\n## from right\n\ntwo\n',
  )
})

/* The verdict picks the road: the paths not chosen go quiet the way a held gate's do. */
it('follows only the paths the agent chose', async () => {
  const forked = graph(
    [
      at('trigger.manual', 'go'),
      at('agent.claude', 'decide', { prompt: 'which way' }),
      at('agent.note', 'ship', { path: 'Ship.md' }),
      at('agent.note', 'fix', { path: 'Fix.md' }),
    ],
    [
      ['go', 'decide'],
      ['decide', 'ship'],
      ['decide', 'fix'],
    ],
  )
  const h = await harness(forked)
  h.decide({ output: 'broken build', next: ['fix'] })
  await h.dreams.run(h.ref)
  const run = await h.settled()
  expect(run.state).toBe('done')
  expect(run.steps.map((step) => [step.node, step.state])).toEqual([
    ['go', 'done'],
    ['decide', 'done'],
    ['ship', 'skipped'],
    ['fix', 'done'],
  ])
  expect(await h.tree.read('Fix.md')).toBe('broken build\n')
  await expect(h.tree.read('Ship.md')).rejects.toThrow()
})

/* An agent that decides it must stop is an outcome, not a failure. */
it('lets an agent stop the flow deliberately, and says why', async () => {
  const h = await harness(chain)
  h.decide({ output: 'nothing new today', stop: 'nothing worth doing' })
  await h.dreams.run(h.ref)
  const run = await h.settled()
  expect(run.state).toBe('done')
  expect(run.steps.map((step) => step.state)).toEqual([
    'done',
    'stopped',
    'skipped',
    'skipped',
  ])
  expect(run.steps[1].halted).toBe('nothing worth doing')
})

/* A decision that silently went nowhere would read as one that was obeyed. */
it('fails the step whose verdict names a path that is not there', async () => {
  const h = await harness(chain)
  h.decide({ output: 'x', next: ['nowhere'] })
  await h.dreams.run(h.ref)
  const run = await h.settled()
  expect(run.state).toBe('error')
  expect(run.error).toContain('no path onward named "nowhere"')
  expect(run.steps.map((step) => step.state)).toEqual([
    'done',
    'error',
    'skipped',
    'skipped',
  ])
})

/* A process owns its own hand-off: what it writes to $DREAM_OUTPUT beats what it printed,
   and its verdict is read from $DREAM_VERDICT — a shell script routes like an agent. */
it('reads a process step back from the files it was told to write', async () => {
  const scripted = graph(
    [
      at('trigger.manual', 'go'),
      at('agent.shell', 'work', {
        command:
          'printf context > "$DREAM_OUTPUT";' +
          ' printf \'{"stop": "enough"}\' > "$DREAM_VERDICT"; echo ignored',
      }),
      at('agent.note', 'log', { path: 'Log.md' }),
    ],
    [
      ['go', 'work'],
      ['work', 'log'],
    ],
  )
  const h = await harness(scripted)
  await h.dreams.run(h.ref)
  const run = await h.settled()
  expect(run.state).toBe('done')
  expect(run.steps[1].state).toBe('stopped')
  expect(run.steps[1].output).toBe('context')
  expect(run.steps[1].halted).toBe('enough')
})

it('fails the step whose verdict is not JSON', async () => {
  const scripted = graph(
    [
      at('trigger.manual', 'go'),
      at('agent.shell', 'work', { command: 'printf notjson > "$DREAM_VERDICT"' }),
    ],
    [['go', 'work']],
  )
  const h = await harness(scripted)
  await h.dreams.run(h.ref)
  const run = await h.settled()
  expect(run.state).toBe('error')
  expect(run.error).toContain('not JSON')
})
