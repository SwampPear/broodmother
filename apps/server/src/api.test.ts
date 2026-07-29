import { mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import type { ApiResponse } from '@mother/shared'
import { WEB_ORIGINS } from './app'
import { bareRemote, cleanup, cloneOf, git, tempDir } from './fixtures'
import { HOST, type ServerHandle, startServer } from './index'

const running: ServerHandle[] = []
afterAll(async () => {
  await Promise.all(running.map((handle) => handle.close()))
  await cleanup()
})

async function server() {
  const root = await tempDir()
  await writeFile(path.join(root, 'index.md'), '# index\n\nsee [[Risks]]\n')
  await writeFile(path.join(root, 'Risks.md'), '# Risks\n')

  const handle = await startServer({ root, home: await tempDir(), port: 0 })
  running.push(handle)

  const call = async (method: string, url: string, body?: unknown) => {
    const response = await fetch(`${handle.url}${url}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: response.status, body: await response.json() }
  }
  return { root, handle, call }
}

describe('binding', () => {
  it('listens on loopback only', async () => {
    const { handle } = await server()
    expect(HOST).toBe('127.0.0.1')
    expect((await fetch(`${handle.url}/api/vault`)).status).toBe(200)

    const lan = Object.values(os.networkInterfaces())
      .flat()
      .find((iface) => iface && iface.family === 'IPv4' && !iface.internal)
    if (!lan) return
    await expect(
      fetch(`http://${lan.address}:${handle.port}/api/vault`, {
        signal: AbortSignal.timeout(2000),
      }),
    ).rejects.toThrow()
  })

  it('allows the web app origin through CORS', async () => {
    const { handle } = await server()
    const response = await fetch(`${handle.url}/api/vault`, {
      headers: { Origin: WEB_ORIGINS[0]! },
    })
    expect(response.headers.get('access-control-allow-origin')).toBe(WEB_ORIGINS[0])
  })
})

describe('vault routes', () => {
  it('GET /api/vault lists the tree', async () => {
    const { call } = await server()
    const { body } = await call('GET', '/api/vault')
    const entries = (body as ApiResponse<'GET /api/vault'>).entries
    expect(entries.map((e) => e.path).sort()).toEqual(['Risks.md', 'index.md'])
  })

  it('GET /api/doc reads a document and 404s on a missing one', async () => {
    const { call } = await server()
    expect(await call('GET', '/api/doc?path=Risks.md')).toEqual({
      status: 200,
      body: { markdown: '# Risks\n' },
    })
    expect((await call('GET', '/api/doc?path=nope.md')).status).toBe(404)
    expect((await call('GET', '/api/doc')).status).toBe(400)
  })

  it('PUT /api/doc writes a document', async () => {
    const { call } = await server()
    expect(
      await call('PUT', '/api/doc', { path: 'new/note.md', markdown: '# new' }),
    ).toEqual({
      status: 200,
      body: { ok: true },
    })
    expect((await call('GET', '/api/doc?path=new/note.md')).body).toEqual({
      markdown: '# new',
    })
    expect((await call('PUT', '/api/doc', { path: 'x.md' })).status).toBe(400)
  })

  it('POST /api/doc/move renames and rewrites links', async () => {
    const { call } = await server()
    expect(
      await call('POST', '/api/doc/move', {
        from: 'Risks.md',
        to: 'ECSEQ-1/Kill-Criteria.md',
      }),
    ).toEqual({
      status: 200,
      body: { to: 'ECSEQ-1/Kill-Criteria.md', linksRewritten: 1 },
    })
    expect((await call('GET', '/api/doc?path=index.md')).body).toEqual({
      markdown: '# index\n\nsee [[Kill-Criteria]]\n',
    })
    expect((await call('GET', '/api/doc?path=Risks.md')).status).toBe(404)
  })

  it('DELETE /api/doc removes a document', async () => {
    const { call } = await server()
    expect(await call('DELETE', '/api/doc?path=Risks.md')).toEqual({
      status: 200,
      body: { ok: true },
    })
    expect((await call('GET', '/api/doc?path=Risks.md')).status).toBe(404)
  })

  it('GET /api/links returns backlinks and outbound links', async () => {
    const { call } = await server()
    const { body } = await call('GET', '/api/links?path=Risks.md')
    expect(body).toEqual({
      backlinks: [{ from: 'index.md', to: 'Risks.md', context: 'see [[Risks]]' }],
      outbound: [],
    })
  })

  it.each([
    ['GET', '/api/doc?path=../escape.md'],
    ['GET', '/api/doc?path=/etc/passwd'],
    ['DELETE', '/api/doc?path=.git/config'],
  ])('rejects %s %s with an ApiError', async (method, url) => {
    const { call } = await server()
    const { status, body } = await call(method, url)
    expect(status).toBe(400)
    expect(body).toHaveProperty('error')
  })

  it('rejects a traversing write and does not touch the file outside', async () => {
    const { call } = await server()
    const outside = await tempDir()
    await writeFile(path.join(outside, 'secret.md'), 'secret')
    const { status } = await call('PUT', '/api/doc', {
      path: `../${path.basename(outside)}/secret.md`,
      markdown: 'owned',
    })
    expect(status).toBe(400)
  })
})

describe('config routes', () => {
  it('GET /api/config reports what it had to repair', async () => {
    const { call } = await server()
    const { body } = await call('GET', '/api/config')
    const response = body as ApiResponse<'GET /api/config'>
    expect(response.reset).toEqual([])
    expect(response.config.branch).toBe('main')
  })

  it('PUT /api/config saves and rejects an invalid config', async () => {
    const { call } = await server()
    const { config } = (await call('GET', '/api/config'))
      .body as ApiResponse<'GET /api/config'>

    const saved = await call('PUT', '/api/config', { ...config, displayName: 'Ada' })
    expect((saved.body as ApiResponse<'PUT /api/config'>).config.displayName).toBe('Ada')
    expect((await call('GET', '/api/config')).body).toMatchObject({
      config: { displayName: 'Ada' },
    })

    const bad = await call('PUT', '/api/config', {
      ...config,
      remoteUrl: 'https://token@github.com/x.git',
    })
    expect(bad.status).toBe(400)
  })

  it('PUT /api/config can point the server at another vault', async () => {
    const { call } = await server()
    const { config } = (await call('GET', '/api/config'))
      .body as ApiResponse<'GET /api/config'>
    const elsewhere = await tempDir()
    await writeFile(path.join(elsewhere, 'other.md'), 'other')

    await call('PUT', '/api/config', { ...config, vaultPath: elsewhere })
    const { entries } = (await call('GET', '/api/vault'))
      .body as ApiResponse<'GET /api/vault'>
    expect(entries.map((e) => e.path)).toEqual(['other.md'])
  })

  it('POST /api/config/test-remote reaches a real remote', async () => {
    const { call } = await server()
    const remote = await bareRemote()
    const clone = await cloneOf(remote)
    await writeFile(path.join(clone, 'a.md'), 'a')
    await git(clone, 'add', '-A')
    await git(clone, 'commit', '-m', 'init')
    await git(clone, 'push', 'origin', 'HEAD:main')

    expect(
      await call('POST', '/api/config/test-remote', {
        remoteUrl: remote,
        branch: 'main',
      }),
    ).toEqual({ status: 200, body: { ok: true, message: 'main found on remote' } })
    const missing = await call('POST', '/api/config/test-remote', {
      remoteUrl: path.join(remote, 'nope'),
      branch: 'main',
    })
    expect(missing.body).toMatchObject({ ok: false })
  })

  it('POST /api/config/test-relay connects to a relay', async () => {
    const { call, handle } = await server()
    expect(
      await call('POST', '/api/config/test-relay', {
        relayUrl: `ws://${HOST}:${handle.port}/ws`,
      }),
    ).toEqual({ status: 200, body: { ok: true, message: 'relay reachable' } })
    const bad = await call('POST', '/api/config/test-relay', {
      relayUrl: 'http://example.test',
    })
    expect(bad.body).toMatchObject({ ok: false })
  })
})

describe('sync routes', () => {
  it('GET /api/sync, POST /api/sync/now and POST /api/sync/clear-conflict', async () => {
    const { call } = await server()
    expect((await call('GET', '/api/sync')).body).toEqual({
      state: 'idle',
      lastSyncedAt: null,
      conflicted: [],
      message: null,
    })
    expect((await call('POST', '/api/sync/now')).body).toMatchObject({
      state: 'idle',
      message: 'no remote configured',
    })
    expect((await call('POST', '/api/sync/clear-conflict')).body).toMatchObject({
      state: 'idle',
    })
  })
})

describe('vaults', () => {
  it('lists the folders in the home and nothing else', async () => {
    const home = await tempDir()
    await mkdir(path.join(home, 'notes'))
    await writeFile(path.join(home, 'config.json'), '{}')
    const handle = await startServer({ root: await tempDir(), home, port: 0 })
    running.push(handle)

    const response = await fetch(`${handle.url}/api/vaults`)
    const body = (await response.json()) as ApiResponse<'GET /api/vaults'>
    expect(body.home).toBe(home)
    expect(body.vaults.map((vault) => vault.name)).toEqual(['notes'])
  })

  it('creates a vault against a real remote and opens it', async () => {
    const { call } = await server()
    const remote = await bareRemote()

    const created = await call('POST', '/api/vaults', {
      name: 'fresh',
      remoteUrl: remote,
      branch: 'main',
    })

    expect(created.status).toBe(200)
    const body = created.body as ApiResponse<'POST /api/vaults'>
    expect(body.vault.name).toBe('fresh')
    expect(body.config.vaultPath).toBe(body.vault.path)
    expect(body.config.remoteUrl).toBe(remote)
    expect(body.config.syncEnabled).toBe(true)
  })

  it('rejects an unreachable remote rather than creating an unlinked vault', async () => {
    const { call } = await server()

    const created = await call('POST', '/api/vaults', {
      name: 'broken',
      remoteUrl: path.join(os.tmpdir(), 'definitely-not-a-repo.git'),
      branch: 'main',
    })

    expect(created.status).toBe(400)
    const listed = await call('GET', '/api/vaults')
    const body = listed.body as ApiResponse<'GET /api/vaults'>
    expect(body.vaults.map((vault) => vault.name)).not.toContain('broken')
  })

  it('rejects a name that would escape the home', async () => {
    const { call } = await server()
    const remote = await bareRemote()

    const created = await call('POST', '/api/vaults', {
      name: '../escape',
      remoteUrl: remote,
      branch: 'main',
    })

    expect(created.status).toBe(400)
  })

  it('adopts the remote of the vault it opens', async () => {
    const { call } = await server()
    const remote = await bareRemote()
    const clone = await cloneOf(remote)

    const opened = await call('POST', '/api/vaults/open', { path: clone })

    expect(opened.status).toBe(200)
    const body = opened.body as ApiResponse<'POST /api/vaults/open'>
    expect(body.config.vaultPath).toBe(clone)
    expect(body.config.remoteUrl).toBe(remote)
  })
})

describe('no vault open', () => {
  it('answers 409 rather than pretending an empty vault exists', async () => {
    const handle = await startServer({ home: await tempDir(), port: 0 })
    running.push(handle)

    const response = await fetch(`${handle.url}/api/vault`)
    expect(response.status).toBe(409)
    expect(((await response.json()) as { error: string }).error).toMatch(/no vault/)
  })
})
