import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import type { ApiResponse } from '@mother/shared'
import { WEB_ORIGINS } from './app'
import { createProfile } from './profiles'
import { createProject } from './projects'
import { bareRemote, cleanup, cloneOf, git, tempDir } from './test/fixtures'
import { HOST, type ServerHandle, startServer } from './index'

const IDENTITY = {
  presenceColor: '#8fb8d8',
  gitAuthor: { name: 'Test', email: 'test@localhost' },
  sshKeyPath: null,
  claudeConfigDir: null,
}

const running: ServerHandle[] = []
afterAll(async () => {
  await Promise.all(running.map((handle) => handle.close()))
  await cleanup()
})

async function server({
  profile = 'tester',
  project = 'tester',
}: { profile?: string | null; project?: string | null } = {}) {
  const root = await tempDir()
  await writeFile(path.join(root, 'index.md'), '# index\n\nsee [[Risks]]\n')
  await writeFile(path.join(root, 'Risks.md'), '# Risks\n')

  const home = await tempDir()
  if (profile) await createProfile({ name: profile, ...IDENTITY }, home)
  if (project) await createProject(project, profile, home)

  const handle = await startServer({ root, home, port: 0 })
  running.push(handle)

  const call = async (method: string, url: string, body?: unknown) => {
    const response = await fetch(`${handle.url}${url}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: response.status, body: await response.json() }
  }
  return { root, home, handle, call }
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

    const saved = await call('PUT', '/api/config', { ...config, syncIdleMs: 30_000 })
    expect((saved.body as ApiResponse<'PUT /api/config'>).config.syncIdleMs).toBe(30_000)
    expect((await call('GET', '/api/config')).body).toMatchObject({
      config: { syncIdleMs: 30_000 },
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
  it('lists the folders in the active project and nothing else', async () => {
    const home = await tempDir()
    await createProfile({ name: 'tester', ...IDENTITY }, home)
    const project = await createProject('tester', 'tester', home)
    await mkdir(path.join(project.path, 'notes'))
    const handle = await startServer({ root: await tempDir(), home, port: 0 })
    running.push(handle)

    const response = await fetch(`${handle.url}/api/vaults`)
    const body = (await response.json()) as ApiResponse<'GET /api/vaults'>
    expect(body.home).toBe(project.path)
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

describe('projects', () => {
  it('has none on a fresh machine and refuses vault work until one exists', async () => {
    const { call } = await server({ profile: null, project: null })

    const listed = (await call('GET', '/api/projects'))
      .body as ApiResponse<'GET /api/projects'>
    expect(listed.projects).toEqual([])
    expect(listed.active).toBeNull()

    const vaults = await call('GET', '/api/vaults')
    expect(vaults.status).toBe(409)
    expect((vaults.body as { error: string }).error).toMatch(/no project/)
  })

  it('creates one on disk, working as the profile it was handed', async () => {
    const { call, home } = await server({ project: null })

    const created = await call('POST', '/api/projects', {
      name: 'proprium',
      profile: 'tester',
    })
    expect(created.status).toBe(200)
    const body = created.body as ApiResponse<'POST /api/projects'>
    expect(body.project).toEqual({
      name: 'proprium',
      path: path.join(home, 'proprium'),
      profile: 'tester',
    })
    expect(body.config.project).toBe('proprium')

    const written = JSON.parse(
      await readFile(path.join(home, 'proprium', 'project.json'), 'utf8'),
    )
    expect(written).toEqual({ profile: 'tester' })
  })

  it('picks up a folder dropped into the home by hand, working as nobody yet', async () => {
    const home = await tempDir()
    await mkdir(path.join(home, 'dropped-in'))
    const handle = await startServer({ home, port: 0 })
    running.push(handle)

    const body = (await (
      await fetch(`${handle.url}/api/projects`)
    ).json()) as ApiResponse<'GET /api/projects'>
    expect(body.projects.map((project) => project.name)).toEqual(['dropped-in'])
    expect(body.active?.profile).toBeNull()
  })

  it('switching project switches to a vault inside it', async () => {
    const { call, home } = await server()
    const other = await createProject('work', 'tester', home)
    await mkdir(path.join(other.path, 'handbook'))

    const opened = await call('POST', '/api/projects/open', { name: 'work' })
    const body = opened.body as ApiResponse<'POST /api/projects/open'>
    expect(body.config.project).toBe('work')
    expect(body.config.vaultPath).toBe(path.join(other.path, 'handbook'))

    expect((await call('POST', '/api/projects/open', { name: 'nowhere' })).status).toBe(
      400,
    )
  })

  it('points at another profile without moving anything', async () => {
    const { call, home } = await server()
    await createProfile(
      { name: 'work', ...IDENTITY, gitAuthor: { name: 'Work', email: 'work@localhost' } },
      home,
    )

    const picked = await call('PUT', '/api/projects', { profile: 'work' })
    expect((picked.body as ApiResponse<'PUT /api/projects'>).project.profile).toBe('work')
    expect(
      JSON.parse(await readFile(path.join(home, 'tester', 'project.json'), 'utf8')),
    ).toEqual({ profile: 'work' })

    expect((await call('PUT', '/api/projects', { profile: 'nobody' })).status).toBe(400)
  })

  it('deletes the folder it stands for, vaults and all', async () => {
    const { call, home } = await server()
    const other = await createProject('work', 'tester', home)
    await mkdir(path.join(other.path, 'handbook'))

    const deleted = await call('DELETE', '/api/projects?name=work')

    expect(deleted.status).toBe(200)
    expect((deleted.body as ApiResponse<'DELETE /api/projects'>).active?.name).toBe(
      'tester',
    )
    await expect(stat(other.path)).rejects.toThrow()
    expect((await call('DELETE', '/api/projects?name=work')).status).toBe(400)
  })

  /* Deleting the one you are in is the first-run state again, not a broken app. */
  it('falls back when the project deleted is the active one', async () => {
    const { call, home } = await server()
    await createProject('work', 'tester', home)

    const first = await call('DELETE', '/api/projects?name=tester')
    const body = first.body as ApiResponse<'DELETE /api/projects'>
    expect(body.active?.name).toBe('work')
    expect(body.config.project).toBe('work')

    const last = await call('DELETE', '/api/projects?name=work')
    const empty = last.body as ApiResponse<'DELETE /api/projects'>
    expect(empty.active).toBeNull()
    expect(empty.config.vaultPath).toBeNull()
    expect((await call('GET', '/api/vaults')).status).toBe(409)
  })
})

describe('profiles', () => {
  it('is a file beside the projects, and never a project itself', async () => {
    const { call, home } = await server()

    const listed = (await call('GET', '/api/profiles'))
      .body as ApiResponse<'GET /api/profiles'>
    expect(listed.profiles.map((profile) => profile.path)).toEqual([
      path.join(home, 'profiles', 'tester.json'),
    ])
    expect(listed.active?.name).toBe('tester')

    const projects = (await call('GET', '/api/projects'))
      .body as ApiResponse<'GET /api/projects'>
    expect(projects.projects.map((project) => project.name)).toEqual(['tester'])
  })

  it('is created for the project you are in, and picked up by it', async () => {
    const { call, home } = await server()

    const created = await call('POST', '/api/profiles', { name: 'work', ...IDENTITY })
    expect(created.status).toBe(200)
    const body = created.body as ApiResponse<'POST /api/profiles'>
    expect(body.profile.path).toBe(path.join(home, 'profiles', 'work.json'))
    expect(body.project?.profile).toBe('work')

    expect(
      (await call('POST', '/api/profiles', { name: 'work', ...IDENTITY })).status,
    ).toBe(400)
  })

  it('picks up a file dropped into the profiles folder by hand', async () => {
    const home = await tempDir()
    await mkdir(path.join(home, 'profiles'), { recursive: true })
    await writeFile(path.join(home, 'profiles', 'dropped-in.json'), '{}')
    const handle = await startServer({ home, port: 0 })
    running.push(handle)

    const body = (await (
      await fetch(`${handle.url}/api/profiles`)
    ).json()) as ApiResponse<'GET /api/profiles'>
    expect(body.profiles.map((profile) => profile.name)).toEqual(['dropped-in'])
    expect(body.profiles[0]?.gitAuthor).toEqual({
      name: 'dropped-in',
      email: 'dropped-in@localhost',
    })
  })

  it('PUT /api/profiles writes the identity and its credentials through to disk', async () => {
    const { call, home } = await server()
    const identity = {
      presenceColor: '#c084fc',
      gitAuthor: { name: 'Michael', email: 'michael@proprium.bio' },
      sshKeyPath: '~/.ssh/id_ed25519',
      claudeConfigDir: '~/.claude',
    }

    const saved = await call('PUT', '/api/profiles', identity)
    expect((saved.body as ApiResponse<'PUT /api/profiles'>).profile).toMatchObject(
      identity,
    )
    expect(
      JSON.parse(await readFile(path.join(home, 'profiles', 'tester.json'), 'utf8')),
    ).toEqual(identity)

    expect(
      (await call('PUT', '/api/profiles', { ...identity, presenceColor: 'red' })).status,
    ).toBe(400)
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
