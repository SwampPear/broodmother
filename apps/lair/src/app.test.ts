import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execa } from 'execa'
import { WebSocket } from 'ws'
import { afterAll, expect, it } from 'vitest'
import {
  LAIR_ROOM_ROUTE,
  serializeDream,
  type Dream,
  type DreamRun,
  type RelayMessage,
} from '@broodmother/shared'
import { startLair, type LairHandle } from './index'

const made: string[] = []
const open: LairHandle[] = []

afterAll(async () => {
  for (const handle of open) await handle.close()
  for (const dir of made) await rm(dir, { recursive: true, force: true })
})

async function tempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'lair-'))
  made.push(dir)
  return dir
}

async function lair(): Promise<LairHandle> {
  const handle = await startLair({ home: await tempDir(), port: 0, bind: '127.0.0.1' })
  open.push(handle)
  return handle
}

async function ask(
  handle: LairHandle,
  token: string,
  method: string,
  route: string,
  body?: unknown,
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const url = new URL(route, handle.url)
  const query = method === 'GET' || method === 'DELETE'
  if (query && body)
    for (const [key, value] of Object.entries(body as Record<string, string>))
      url.searchParams.set(key, value)
  const response = await fetch(url, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(query ? {} : { 'content-type': 'application/json' }),
    },
    body: query || body === undefined ? undefined : JSON.stringify(body),
  })
  return {
    status: response.status,
    payload: (await response.json().catch(() => ({}))) as Record<string, unknown>,
  }
}

/** A remote and a seeded clone beside it, so the lair's clone has a branch to pull. */
async function bareRemote(): Promise<string> {
  const dir = await tempDir()
  const remote = path.join(dir, 'remote.git')
  const seed = path.join(dir, 'seed')
  await execa('git', ['init', '--bare', '-b', 'main', remote])
  await execa('git', ['init', '-b', 'main', seed])
  await writeFile(path.join(seed, 'README.md'), '# site\n')
  const env = {
    GIT_AUTHOR_NAME: 'seed',
    GIT_AUTHOR_EMAIL: 'seed@test',
    GIT_COMMITTER_NAME: 'seed',
    GIT_COMMITTER_EMAIL: 'seed@test',
  }
  await execa('git', ['add', '-A'], { cwd: seed })
  await execa('git', ['commit', '-m', 'seed'], { cwd: seed, env })
  await execa('git', ['remote', 'add', 'origin', remote], { cwd: seed })
  await execa('git', ['push', 'origin', 'main'], { cwd: seed })
  return remote
}

const noteDream: Dream = {
  version: 1,
  nodes: [
    { id: 'go', kind: 'trigger.manual', name: 'Run', x: 0, y: 0 },
    {
      id: 'say',
      kind: 'agent.shell',
      name: 'Say',
      x: 200,
      y: 0,
      command: 'printf hello',
    },
    { id: 'log', kind: 'agent.note', name: 'Log', x: 400, y: 0, path: 'Log.md' },
  ],
  edges: [
    { from: 'go', to: 'say' },
    { from: 'say', to: 'log' },
  ],
}

const until = async (check: () => Promise<boolean>, ms = 15_000): Promise<void> => {
  const gaveUp = Date.now() + ms
  while (Date.now() < gaveUp) {
    if (await check()) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('never settled')
}

it('refuses the doorless: no key, a wrong key, a revoked key', async () => {
  const handle = await lair()
  const admin = handle.context.home.adminToken

  expect((await ask(handle, '', 'GET', '/status')).status).toBe(401)
  expect((await ask(handle, 'lk_wrong', 'GET', '/status')).status).toBe(401)
  expect((await ask(handle, admin, 'GET', '/status')).status).toBe(200)

  const minted = await ask(handle, admin, 'POST', '/keys', { name: 'ada' })
  const grant = minted.payload.grant as { id: string; key: string }
  expect((await ask(handle, grant.key, 'GET', '/status')).status).toBe(200)
  // Keys are the admin's to mint; a key cannot beget keys.
  expect((await ask(handle, grant.key, 'GET', '/keys')).status).toBe(401)

  await ask(handle, admin, 'DELETE', '/keys', { id: grant.id })
  expect((await ask(handle, grant.key, 'GET', '/status')).status).toBe(401)
})

it('keeps only hashes at rest, and answers the key exactly once', async () => {
  const handle = await lair()
  const admin = handle.context.home.adminToken
  const minted = await ask(handle, admin, 'POST', '/keys', { name: 'ada' })
  const grant = minted.payload.grant as { key: string }

  const stored = await readFile(path.join(handle.context.home.root, 'keys.json'), 'utf8')
  expect(stored).not.toContain(grant.key)
  expect(stored).toContain('sha256')

  const listed = await ask(handle, admin, 'GET', '/keys')
  expect(JSON.stringify(listed.payload)).not.toContain(grant.key)
})

it('relays a room between two sockets and refuses a wrong token', async () => {
  const handle = await lair()
  const admin = handle.context.home.adminToken
  const { payload } = await ask(handle, admin, 'POST', '/rooms')
  const { room, token } = payload as { room: string; token: string }

  const wsUrl = (t: string) =>
    `${handle.url.replace('http', 'ws')}${LAIR_ROOM_ROUTE}?room=${room}&token=${t}`

  const dial = (t: string) =>
    new Promise<{ socket: WebSocket; heard: RelayMessage[] }>((resolve, reject) => {
      const socket = new WebSocket(wsUrl(t))
      const heard: RelayMessage[] = []
      socket.on('message', (data) => heard.push(JSON.parse(String(data))))
      socket.on('open', () => resolve({ socket, heard }))
      socket.on('error', reject)
    })

  const first = await dial(token)
  const second = await dial(token)
  await until(async () => first.heard.length > 0 && second.heard.length > 0)
  expect(first.heard[0]).toEqual({ kind: 'joined', peers: 0 })
  expect(second.heard[0]).toEqual({ kind: 'joined', peers: 1 })

  first.socket.send(JSON.stringify({ kind: 'doc', payload: 'aGk=' }))
  first.socket.send('not even json')
  await until(async () => second.heard.length > 1)
  expect(second.heard[1]).toEqual({ kind: 'doc', payload: 'aGk=' })
  // The sender hears nothing back, and the junk went nowhere.
  expect(first.heard).toHaveLength(1)

  const rejected = new WebSocket(wsUrl('wrong'))
  await new Promise<void>((resolve) => rejected.on('close', () => resolve()))

  first.socket.close()
  second.socket.close()
})

it(
  'hosts a dream: push it, run it, and the output commits back to the remote',
  { timeout: 30_000 },
  async () => {
    const handle = await lair()
    const admin = handle.context.home.adminToken
    const remote = await bareRemote()

    const added = await ask(handle, admin, 'PUT', '/sites', { name: 'docs', remote })
    expect(added.status).toBe(200)
    expect((added.payload.site as { pull: string }).pull).toBe('ok')

    const put = await ask(handle, admin, 'PUT', '/dreams', {
      site: 'docs',
      path: 'Nightly.dream',
      dream: noteDream,
    })
    expect(put.status).toBe(200)
    expect(put.payload.dream).toMatchObject({ site: 'docs', name: 'Nightly' })

    const ran = await ask(handle, admin, 'POST', '/dream/run', {
      site: 'docs',
      path: 'Nightly.dream',
    })
    expect(ran.status).toBe(200)

    await until(async () => {
      const { payload } = await ask(handle, admin, 'GET', '/dream/runs', {
        site: 'docs',
        path: 'Nightly.dream',
      })
      const runs = payload.runs as DreamRun[]
      return runs[0]?.state === 'done'
    })

    // The note the dream wrote came home through git, not through any route.
    await until(async () => {
      const subject = await execa('git', [
        '--git-dir',
        remote,
        'log',
        '-1',
        '--format=%s',
      ])
      return subject.stdout.trim() === 'dream: Nightly'
    })
    const tree = await execa('git', [
      '--git-dir',
      remote,
      'ls-tree',
      '--name-only',
      'HEAD',
    ])
    expect(tree.stdout).toContain('Log.md')

    const listed = await ask(handle, admin, 'GET', '/dreams')
    const dreams = listed.payload.dreams as { path: string; lastRun: DreamRun | null }[]
    expect(dreams[0]?.lastRun?.state).toBe('done')
  },
)

/* Routing holds hosted too: a gate that stays quiet skips its branch, the run still
   finishes, and a walk that wrote nothing pushes nothing home. */
it(
  'routes a hosted dream through its gate, and a quiet run commits nothing',
  { timeout: 30_000 },
  async () => {
    const handle = await lair()
    const admin = handle.context.home.adminToken
    const remote = await bareRemote()
    await ask(handle, admin, 'PUT', '/sites', { name: 'docs', remote })

    const gated: Dream = {
      version: 1,
      nodes: [
        { id: 'go', kind: 'trigger.manual', name: 'Run', x: 0, y: 0 },
        {
          id: 'say',
          kind: 'agent.shell',
          name: 'Say',
          x: 200,
          y: 0,
          command: 'printf calm',
        },
        {
          id: 'alerts',
          kind: 'agent.gate',
          name: 'Only alerts',
          x: 400,
          y: 0,
          pattern: 'ALERT',
        },
        {
          id: 'alarm',
          kind: 'agent.note',
          name: 'Alarm',
          x: 600,
          y: 0,
          path: 'Alarm.md',
        },
      ],
      edges: [
        { from: 'go', to: 'say' },
        { from: 'say', to: 'alerts' },
        { from: 'alerts', to: 'alarm' },
      ],
    }
    await ask(handle, admin, 'PUT', '/dreams', {
      site: 'docs',
      path: 'Watch.dream',
      dream: gated,
    })
    await ask(handle, admin, 'POST', '/dream/run', { site: 'docs', path: 'Watch.dream' })

    let runs: DreamRun[] = []
    await until(async () => {
      const { payload } = await ask(handle, admin, 'GET', '/dream/runs', {
        site: 'docs',
        path: 'Watch.dream',
      })
      runs = payload.runs as DreamRun[]
      return runs[0]?.state === 'done'
    })
    expect(runs[0].steps.map((step) => [step.node, step.state])).toEqual([
      ['go', 'done'],
      ['say', 'done'],
      ['alerts', 'done'],
      ['alarm', 'skipped'],
    ])

    // Nothing was written, so nothing came home: the remote still ends at the seed.
    const subject = await execa('git', ['--git-dir', remote, 'log', '-1', '--format=%s'])
    expect(subject.stdout.trim()).toBe('seed')
  },
)

it('refuses a dream for a site it does not have, and a cycle outright', async () => {
  const handle = await lair()
  const admin = handle.context.home.adminToken
  const missing = await ask(handle, admin, 'PUT', '/dreams', {
    site: 'nowhere',
    path: 'A.dream',
    dream: noteDream,
  })
  expect(missing.status).toBe(400)
  expect(String(missing.payload.error)).toContain('nowhere')
})

it('speaks through the CLI: status, keys, and the deploy key', async () => {
  const handle = await lair()
  const bin = path.join(import.meta.dirname, '..', 'bin', 'lair.mjs')
  const env = { LAIR_URL: handle.url, LAIR_ADMIN_TOKEN: handle.context.home.adminToken }
  const run = (...args: string[]) => execa('node', [bin, ...args], { env, reject: false })

  const status = await run('status')
  expect(status.exitCode).toBe(0)
  expect(status.stdout).toContain('version')

  const minted = await run('keys', 'mint', 'ada')
  expect(minted.stdout).toContain('lk_')
  const listed = await run('keys', 'ls')
  expect(listed.stdout).toContain('ada')
  expect(listed.stdout).not.toContain('lk_')

  const bare = await run()
  expect(bare.stdout).toContain('usage')

  const unreachable = await execa('node', [bin, 'status'], {
    env: { LAIR_URL: 'http://127.0.0.1:9', LAIR_ADMIN_TOKEN: 'x' },
    reject: false,
  })
  expect(unreachable.exitCode).toBe(1)
  expect(unreachable.stderr).toContain('could not reach')
})

it('serializes what it stores, so a pushed dream reads back canonical', async () => {
  const handle = await lair()
  const admin = handle.context.home.adminToken
  const remote = await bareRemote()
  await ask(handle, admin, 'PUT', '/sites', { name: 'docs', remote })
  await ask(handle, admin, 'PUT', '/dreams', {
    site: 'docs',
    path: 'Nightly.dream',
    dream: noteDream,
  })
  const stored = await readFile(
    path.join(handle.context.home.dreams, 'docs', 'Nightly.dream'),
    'utf8',
  )
  expect(stored).toBe(serializeDream(noteDream))
})
