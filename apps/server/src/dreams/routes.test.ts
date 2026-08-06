import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, expect, it } from 'vitest'
import { serializeDream } from '@/dream'
import type { ApiResponse, Dream } from '@/types'
import { startServer, type ServerHandle } from '../index'
import { createProfile } from '../profiles'
import { cleanup, fakeCrontab, tempDir, until } from '../test'

const running: ServerHandle[] = []
afterAll(async () => {
  for (const handle of running) await handle.close()
  await cleanup()
})

const quiet: Dream = {
  version: 1,
  nodes: [
    { id: 'go', kind: 'trigger.manual', name: 'When run', x: 0, y: 0 },
    { id: 'log', kind: 'agent.note', name: 'Log it', x: 200, y: 0, path: 'Ran.md' },
  ],
  edges: [{ from: 'go', to: 'log' }],
}

async function server() {
  const home = await tempDir()
  await createProfile(
    {
      name: 'tester',
      color: '#8fb8d8',
      gitAuthor: { name: 'Test', email: 'test@localhost' },
      sshKeyPath: null,
      claudeCfgDir: null,
      cursorCfgDir: null,
      soul: null,
    },
    home,
  )
  const vault = path.join(home, 'tester', 'handbook')
  const root = path.join(vault, 'local')
  await mkdir(root, { recursive: true })
  await writeFile(path.join(root, 'Nightly.dream'), serializeDream(quiet))
  const handle = await startServer({ root: vault, home, port: 0, cron: fakeCrontab() })
  running.push(handle)
  const call = async (method: string, url: string, body?: unknown) => {
    const response = await fetch(`${handle.url}${url}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: response.status, body: await response.json() }
  }
  return { call }
}

it('runs a dream over the wire and reports the run', async () => {
  const { call } = await server()
  const started = await call('POST', '/api/dream/run', {
    root: 'vault',
    path: 'Nightly.dream',
  })
  expect(started.status).toBe(200)
  const { run } = started.body as ApiResponse<'POST /api/dream/run'>
  expect(run.state).toBe('running')
  expect(run.steps.map((step) => step.node)).toEqual(['go', 'log'])

  await until(async () => {
    const asked = await call('GET', '/api/dream/runs?root=vault&path=Nightly.dream')
    const { runs } = asked.body as ApiResponse<'GET /api/dream/runs'>
    return runs[0]?.state === 'done'
  })
})

it('serves the page: the dreams found, and the runs they have had', async () => {
  const { call } = await server()
  const empty = await call('GET', '/api/dreams')
  expect(empty.status).toBe(200)
  const { dreams } = empty.body as ApiResponse<'GET /api/dreams'>
  expect(dreams).toEqual([
    {
      ref: { root: 'vault', path: 'Nightly.dream' },
      name: 'Nightly',
      triggers: [{ kind: 'trigger.manual', label: 'when run' }],
      lastRun: null,
    },
  ])

  await call('POST', '/api/dream/run', { root: 'vault', path: 'Nightly.dream' })
  await until(async () => {
    const asked = await call('GET', '/api/dream/log')
    const { runs } = asked.body as ApiResponse<'GET /api/dream/log'>
    return runs[0]?.state === 'done'
  })
  const after = await call('GET', '/api/dreams')
  const { dreams: ran } = after.body as ApiResponse<'GET /api/dreams'>
  expect(ran[0].lastRun?.state).toBe('done')
})

it('answers a dream that cannot run with a reason', async () => {
  const { call } = await server()
  const missing = await call('POST', '/api/dream/run', {
    root: 'vault',
    path: 'Nowhere.dream',
  })
  expect(missing.status).toBe(404)
})
