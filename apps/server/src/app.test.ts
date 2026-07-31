import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execa } from 'execa'
import { afterAll, describe, expect, it } from 'vitest'
import { defaultGitSettings, type ApiResponse } from '@broodmother/shared'
import { WEB_ORIGINS } from './app'
import { defaultConfig } from './config'
import { createProfile } from './profiles'
import { bareRemote, cleanup, cloneOf, git, tempDir } from './test'
import { HOST, type ServerHandle, startServer } from './index'

const IDENTITY = {
  color: '#8fb8d8',
  gitAuthor: { name: 'Test', email: 'test@localhost' },
  sshKeyPath: null,
  claudeCfgDir: null,
  soul: null,
}

const running: ServerHandle[] = []
afterAll(async () => {
  await Promise.all(running.map((handle) => handle.close()))
  await cleanup()
})

async function server({ profile = 'tester' }: { profile?: string | null } = {}) {
  // A vault is a folder of checkouts, and documents live in one of them. `local` is the
  // one every vault has.
  const vault = await tempDir()
  const root = path.join(vault, 'local')
  await mkdir(root, { recursive: true })
  await writeFile(path.join(root, 'index.md'), '# index\n\nsee [[Risks]]\n')
  await writeFile(path.join(root, 'Risks.md'), '# Risks\n')

  const home = await tempDir()
  if (profile) {
    await createProfile({ name: profile, ...IDENTITY }, home)
    // The vault the server is pointed at commits as this profile. The binding goes in the
    // config because that is where a vault's profile lives.
    await writeFile(
      path.join(home, 'config.json'),
      JSON.stringify({ ...defaultConfig(vault), profiles: { [vault]: profile } }),
    )
  }

  const handle = await startServer({ root: vault, home, port: 0 })
  running.push(handle)

  const call = async (method: string, url: string, body?: unknown) => {
    const response = await fetch(`${handle.url}${url}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: response.status, body: await response.json() }
  }
  return { root, vault, home, handle, call }
}

/** A repository of your own, somewhere that is not the broodmother home. */
async function repoElsewhere(name: string) {
  const repo = path.join(await tempDir(), name)
  await mkdir(repo, { recursive: true })
  await git(repo, 'init', '--initial-branch=main')
  await writeFile(path.join(repo, 'main.rs'), 'fn main() {}\n')
  await writeFile(path.join(repo, 'README.md'), `# ${name}\n`)
  await git(repo, 'add', '-A')
  await git(repo, 'commit', '-m', 'init')
  return repo
}

describe('profiles', () => {
  /* Anyone who has ever committed has answered this already, and the answer is on disk. */
  it('offers what git on this machine says you are', async () => {
    const { call } = await server()
    const { body } = await call('GET', '/api/profiles')
    // The test git config sets both, which is what a machine that has committed looks like.
    expect(body.suggestedAuthor).toMatchObject({ name: expect.any(String) })
  })
})

describe('binding', () => {
  it('listens on loopback only', async () => {
    const { handle } = await server()
    expect(HOST).toBe('127.0.0.1')
    expect((await fetch(`${handle.url}/api/tree`)).status).toBe(200)

    const lan = Object.values(os.networkInterfaces())
      .flat()
      .find((iface) => iface && iface.family === 'IPv4' && !iface.internal)
    if (!lan) return
    await expect(
      fetch(`http://${lan.address}:${handle.port}/api/tree`, {
        signal: AbortSignal.timeout(2000),
      }),
    ).rejects.toThrow()
  })

  it('allows the web app origin through CORS', async () => {
    const { handle } = await server()
    const response = await fetch(`${handle.url}/api/tree`, {
      headers: { Origin: WEB_ORIGINS[0]! },
    })
    expect(response.headers.get('access-control-allow-origin')).toBe(WEB_ORIGINS[0])
  })
})

describe('document routes', () => {
  it('GET /api/tree lists the vault, and no projects until one is linked', async () => {
    const { call } = await server()
    const { body } = await call('GET', '/api/tree')
    const tree = body as ApiResponse<'GET /api/tree'>
    expect(tree.vault.map((e) => e.path).sort()).toEqual(['Risks.md', 'index.md'])
    expect(tree.projects).toEqual([])
  })

  it('GET /api/doc reads a document and 404s on a missing one', async () => {
    const { call } = await server()
    expect(await call('GET', '/api/doc?root=vault&path=Risks.md')).toEqual({
      status: 200,
      body: { markdown: '# Risks\n' },
    })
    expect((await call('GET', '/api/doc?root=vault&path=nope.md')).status).toBe(404)
    expect((await call('GET', '/api/doc?root=vault')).status).toBe(400)
    // A path with no tree named is half an address, and is refused as one.
    expect((await call('GET', '/api/doc?path=Risks.md')).status).toBe(400)
  })

  it('PUT /api/doc writes a document', async () => {
    const { call } = await server()
    expect(
      await call('PUT', '/api/doc', {
        root: 'vault',
        path: 'new/note.md',
        markdown: '# new',
      }),
    ).toEqual({ status: 200, body: { ok: true } })
    expect((await call('GET', '/api/doc?root=vault&path=new/note.md')).body).toEqual({
      markdown: '# new',
    })
    expect((await call('PUT', '/api/doc', { root: 'vault', path: 'x.md' })).status).toBe(
      400,
    )
  })

  it('POST /api/doc/move renames and rewrites links', async () => {
    const { call } = await server()
    expect(
      await call('POST', '/api/doc/move', {
        root: 'vault',
        from: 'Risks.md',
        to: 'Handbook/Checklist.md',
      }),
    ).toEqual({
      status: 200,
      body: { to: 'Handbook/Checklist.md', linksRewritten: 1 },
    })
    expect((await call('GET', '/api/doc?root=vault&path=index.md')).body).toEqual({
      markdown: '# index\n\nsee [[Checklist]]\n',
    })
    expect((await call('GET', '/api/doc?root=vault&path=Risks.md')).status).toBe(404)
  })

  it('DELETE /api/doc removes a document', async () => {
    const { call } = await server()
    expect(await call('DELETE', '/api/doc?root=vault&path=Risks.md')).toEqual({
      status: 200,
      body: { ok: true },
    })
    expect((await call('GET', '/api/doc?root=vault&path=Risks.md')).status).toBe(404)
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
    ['GET', '/api/doc?root=vault&path=../escape.md'],
    ['GET', '/api/doc?root=vault&path=/etc/passwd'],
    ['DELETE', '/api/doc?root=vault&path=.git/config'],
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
      root: 'vault',
      path: `../${path.basename(outside)}/secret.md`,
      markdown: 'owned',
    })
    expect(status).toBe(400)
  })

  /* Asking about a tree that is not open is a mistake worth naming, not an empty answer. */
  it('answers 409 for a project the vault does not link', async () => {
    const { call } = await server()
    expect((await call('GET', '/api/doc?root=project:api&path=README.md')).status).toBe(
      409,
    )
  })
})

/* A tree holds more than markdown, and a PNG read as UTF-8 is a PNG destroyed. */
describe('file routes', () => {
  /** The smallest real PNG: an 8-bit greyscale pixel. */
  const PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGP4DwABAQEAGF7VqQAAAABJRU5ErkJggg==',
    'base64',
  )

  it('serves the bytes as they are on disk, with the type', async () => {
    const { call, root, handle } = await server()
    await writeFile(path.join(root, 'shot.png'), PNG)

    const response = await fetch(`${handle.url}/api/file?root=vault&path=shot.png`)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('image/png')
    expect(Buffer.from(await response.arrayBuffer()).equals(PNG)).toBe(true)

    // The same file through the document route is the corruption this route exists to
    // avoid: what comes back cannot be written to disk again as the file that was read.
    const asText = await call('GET', '/api/doc?root=vault&path=shot.png')
    const roundTripped = Buffer.from(
      (asText.body as { markdown: string }).markdown,
      'utf8',
    )
    expect(roundTripped.equals(PNG)).toBe(false)
  })

  it('refuses a file it has no business serving', async () => {
    const { call } = await server()
    expect((await call('GET', '/api/file?root=vault&path=index.md')).status).toBe(400)
  })

  it('refuses a path that would escape the tree', async () => {
    const { call } = await server()
    expect((await call('GET', '/api/file?root=vault&path=../escape.png')).status).toBe(
      400,
    )
  })

  it('404s on an image that is not there', async () => {
    const { call } = await server()
    expect((await call('GET', '/api/file?root=vault&path=missing.png')).status).toBe(404)
  })
})

describe('config routes', () => {
  it('GET /api/config reports what it had to repair', async () => {
    const { call } = await server()
    const { body } = await call('GET', '/api/config')
    const response = body as ApiResponse<'GET /api/config'>
    expect(response.reset).toEqual([])
    expect(response.config.git).toEqual({})
  })

  it('PUT /api/config saves and rejects an invalid config', async () => {
    const { call, vault } = await server()
    const { config } = (await call('GET', '/api/config'))
      .body as ApiResponse<'GET /api/config'>

    const git = { [vault]: { ...defaultGitSettings(), enabled: true } }
    const saved = await call('PUT', '/api/config', { ...config, git })
    expect((saved.body as ApiResponse<'PUT /api/config'>).config.git).toEqual(git)
    expect((await call('GET', '/api/config')).body).toMatchObject({ config: { git } })

    const bad = await call('PUT', '/api/config', { ...config, checkouts: 7 })
    expect(bad.status).toBe(400)
  })

  it('PUT /api/config can point the server at another vault', async () => {
    const { call } = await server()
    const { config } = (await call('GET', '/api/config'))
      .body as ApiResponse<'GET /api/config'>
    // Another vault is another folder of checkouts, so the document goes in its `local`.
    const elsewhere = await tempDir()
    await mkdir(path.join(elsewhere, 'local'), { recursive: true })
    await writeFile(path.join(elsewhere, 'local', 'other.md'), 'other')

    await call('PUT', '/api/config', { ...config, vaultPath: elsewhere })
    const { vault } = (await call('GET', '/api/tree'))
      .body as ApiResponse<'GET /api/tree'>
    expect(vault.map((e) => e.path)).toEqual(['other.md'])
  })

  it('POST /api/git/check reaches a real remote, and says so of the vault', async () => {
    const { call, root } = await server()
    const remote = await bareRemote()
    await git(root, 'init', '--initial-branch=main')
    await git(root, 'remote', 'add', 'origin', remote)
    await git(root, 'add', '-A')
    await git(root, 'commit', '-m', 'init')

    const check = await call('POST', '/api/git/check', { root: 'vault' })
    expect(check.status).toBe(200)
    expect(check.body).toMatchObject({ state: 'ok', remoteUrl: remote })
  })

  /* The fixture vault is a plain folder, which is the first of the four answers. */
  it('POST /api/git/check names a folder with no repository as one', async () => {
    const { call } = await server()
    const check = await call('POST', '/api/git/check', { root: 'vault' })
    expect(check.body).toMatchObject({ state: 'no-repo' })
  })

  it('POST /api/git/check answers 409 for a project the vault does not link', async () => {
    const { call } = await server()
    expect((await call('POST', '/api/git/check', { root: 'project:api' })).status).toBe(
      409,
    )
  })
})

describe('sync routes', () => {
  it('GET /api/sync, POST /api/sync/now and POST /api/sync/clear-conflict', async () => {
    // The fixture vault is a plain folder, which is a vault that does not sync — reported
    // as `off`, and for the reason that matters, rather than as an idle one that never gets
    // round to it.
    const { call } = await server()
    expect((await call('GET', '/api/sync')).body).toEqual({
      state: 'off',
      lastSyncedAt: undefined,
      conflicted: [],
      message: 'this vault has no git repo',
    })
    expect((await call('POST', '/api/sync/now')).body).toMatchObject({
      state: 'off',
      message: 'this vault has no git repo',
    })
    expect((await call('POST', '/api/sync/clear-conflict')).body).toMatchObject({
      state: 'off',
    })
  })
})

describe('git routes', () => {
  it('GET /api/git reports a vault with no repository as one', async () => {
    const { call } = await server()
    const { body } = await call('GET', '/api/git')
    const response = body as ApiResponse<'GET /api/git'>
    expect(response.state).toEqual({ repo: false, remoteUrl: null, branch: null })
    expect(response.settings).toEqual(defaultGitSettings())
  })

  it('GET /api/git reads the remote and branch off the checkout', async () => {
    const { call, root } = await server()
    const remote = await bareRemote()
    await git(root, 'init', '--initial-branch=main')
    await git(root, 'remote', 'add', 'origin', remote)
    await git(root, 'add', '-A')
    await git(root, 'commit', '-m', 'init')

    const { body } = await call('GET', '/api/git')
    expect((body as ApiResponse<'GET /api/git'>).state).toEqual({
      repo: true,
      remoteUrl: remote,
      branch: 'main',
    })
  })

  it('PUT /api/git saves the open vault settings, rejecting a bad one', async () => {
    const { call, vault } = await server()
    const settings = { ...defaultGitSettings(), enabled: true, push: false }

    const saved = await call('PUT', '/api/git', settings)
    expect(saved.body).toEqual({ settings })
    expect((await call('GET', '/api/git')).body).toMatchObject({ settings })
    // Filed under the vault, not loose on the machine.
    expect((await call('GET', '/api/config')).body).toMatchObject({
      config: { git: { [vault]: settings } },
    })

    const bad = await call('PUT', '/api/git', { ...settings, idleMs: 5 })
    expect(bad.status).toBe(400)
  })
})

describe('vaults', () => {
  it('lists the folders in the home, and never the profiles among them', async () => {
    const home = await tempDir()
    await createProfile({ name: 'tester', ...IDENTITY }, home)
    await mkdir(path.join(home, 'notes'))
    const handle = await startServer({ root: await tempDir(), home, port: 0 })
    running.push(handle)

    const response = await fetch(`${handle.url}/api/vaults`)
    const body = (await response.json()) as ApiResponse<'GET /api/vaults'>
    expect(body.home).toBe(home)
    expect(body.vaults.map((vault) => vault.name)).toEqual(['notes'])
  })

  it('creates a vault against a real remote, opens it and turns sync on', async () => {
    const { call } = await server()
    const remote = await bareRemote()

    const created = await call('POST', '/api/vaults', {
      name: 'fresh',
      git: 'remote',
      remoteUrl: remote,
      branch: 'main',
    })

    expect(created.status).toBe(200)
    const body = created.body as ApiResponse<'POST /api/vaults'>
    expect(body.vault.name).toBe('fresh')
    expect(body.config.vaultPath).toBe(body.vault.path)
    expect(body.config.git[body.vault.path]).toEqual({
      ...defaultGitSettings(),
      enabled: true,
    })

    const state = (await call('GET', '/api/git')).body as ApiResponse<'GET /api/git'>
    expect(state.state).toMatchObject({ repo: true, remoteUrl: remote, branch: 'main' })
  })

  it('creates a vault with no git at all, and leaves sync off', async () => {
    const { call } = await server()

    const created = await call('POST', '/api/vaults', { name: 'plain', git: 'none' })
    expect(created.status).toBe(200)
    const body = created.body as ApiResponse<'POST /api/vaults'>
    expect(body.config.git[body.vault.path]).toEqual(defaultGitSettings())

    const state = (await call('GET', '/api/git')).body as ApiResponse<'GET /api/git'>
    expect(state.state).toEqual({ repo: false, remoteUrl: null, branch: null })
    // Its `local` is still the folder you work in, so the tree and the branch list work.
    expect((await call('GET', '/api/tree')).status).toBe(200)
    const listed = (await call('GET', '/api/branches?root=vault'))
      .body as ApiResponse<'GET /api/branches'>
    // No repository, so no branches: the one folder is named for itself.
    expect(listed.branches).toEqual([
      {
        name: 'local',
        path: path.join(body.vault.path, 'local'),
        checkedOut: true,
        primary: true,
      },
    ])
  })

  it('creates a repository with no remote when asked for one', async () => {
    const { call } = await server()

    const created = await call('POST', '/api/vaults', {
      name: 'solo',
      git: 'local',
      branch: 'main',
    })
    expect(created.status).toBe(200)

    const state = (await call('GET', '/api/git')).body as ApiResponse<'GET /api/git'>
    expect(state.state).toEqual({ repo: true, remoteUrl: null, branch: 'main' })
  })

  it('rejects a vault asked to sync with no remote to sync to', async () => {
    const { call } = await server()
    expect(
      (await call('POST', '/api/vaults', { name: 'nowhere', git: 'remote' })).status,
    ).toBe(400)
  })

  it('rejects a remote with credentials baked into the URL', async () => {
    const { call } = await server()
    const created = await call('POST', '/api/vaults', {
      name: 'leaky',
      git: 'remote',
      remoteUrl: 'https://token@github.com/x/y.git',
      branch: 'main',
    })
    expect(created.status).toBe(400)
  })

  it('rejects an unreachable remote over creating an unlinked vault', async () => {
    const { call } = await server()

    const created = await call('POST', '/api/vaults', {
      name: 'broken',
      git: 'remote',
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
      git: 'remote',
      remoteUrl: remote,
      branch: 'main',
    })

    expect(created.status).toBe(400)
  })

  it('opens a vault without copying anything about git out of it', async () => {
    const { call } = await server()
    const remote = await bareRemote()
    const vault = await tempDir()
    await execa('git', ['clone', remote, path.join(vault, 'local')])

    const opened = await call('POST', '/api/vaults/open', { path: vault })

    expect(opened.status).toBe(200)
    const body = opened.body as ApiResponse<'POST /api/vaults/open'>
    expect(body.config.vaultPath).toBe(vault)
    // The remote is not in the config; it is read back off the checkout every time.
    const state = (await call('GET', '/api/git')).body as ApiResponse<'GET /api/git'>
    expect(state.state.remoteUrl).toBe(remote)
    // And opening it did not sign it up for syncing.
    expect(state.settings.enabled).toBe(false)
  })
})

describe('vault selection', () => {
  it('has none on a fresh machine, and says so rather than inventing one', async () => {
    const home = await tempDir()
    const handle = await startServer({ home, port: 0 })
    running.push(handle)

    const body = (await (
      await fetch(`${handle.url}/api/vaults`)
    ).json()) as ApiResponse<'GET /api/vaults'>
    expect(body.vaults).toEqual([])
    expect(body.active).toBeNull()
  })

  it('picks up a folder dropped into the home by hand, working as nobody yet', async () => {
    const home = await tempDir()
    await mkdir(path.join(home, 'dropped-in'))
    const handle = await startServer({ home, port: 0 })
    running.push(handle)

    const body = (await (
      await fetch(`${handle.url}/api/vaults`)
    ).json()) as ApiResponse<'GET /api/vaults'>
    expect(body.vaults.map((vault) => vault.name)).toEqual(['dropped-in'])
    expect(body.active?.profile).toBeNull()
  })

  it('points the open vault at another profile, in the config and not in the vault', async () => {
    const { call, home, vault } = await server()
    await createProfile(
      { name: 'work', ...IDENTITY, gitAuthor: { name: 'Work', email: 'work@localhost' } },
      home,
    )

    const picked = await call('PUT', '/api/vaults', { profile: 'work' })
    expect((picked.body as ApiResponse<'PUT /api/vaults'>).vault?.profile).toBe('work')

    const written = JSON.parse(await readFile(path.join(home, 'config.json'), 'utf8'))
    // Keyed by the vault, which is the folder of checkouts rather than one of them.
    expect(written.profiles[vault]).toBe('work')

    expect((await call('PUT', '/api/vaults', { profile: 'nobody' })).status).toBe(400)
  })

  it('deletes the folder it stands for, and forgets which profile it was', async () => {
    const { call, home } = await server()
    const other = path.join(home, 'work')
    await mkdir(other)
    await call('POST', '/api/vaults/open', { path: other })
    await call('PUT', '/api/vaults', { profile: 'tester' })

    const deleted = await call('DELETE', '/api/vaults?name=work')

    expect(deleted.status).toBe(200)
    await expect(stat(other)).rejects.toThrow()
    const written = JSON.parse(await readFile(path.join(home, 'config.json'), 'utf8'))
    expect(written.profiles[other]).toBeUndefined()
    expect((await call('DELETE', '/api/vaults?name=work')).status).toBe(400)
  })

  /* Deleting the one you are in is the first-run state again, not a broken app. */
  it('falls back when the vault deleted is the open one', async () => {
    const { call, home } = await server()
    await mkdir(path.join(home, 'work'))
    await mkdir(path.join(home, 'notes'))
    await call('POST', '/api/vaults/open', { path: path.join(home, 'work') })

    const first = await call('DELETE', '/api/vaults?name=work')
    const body = first.body as ApiResponse<'DELETE /api/vaults'>
    expect(body.active?.name).toBe('notes')
    expect(body.config.vaultPath).toBe(path.join(home, 'notes'))

    const last = await call('DELETE', '/api/vaults?name=notes')
    const empty = last.body as ApiResponse<'DELETE /api/vaults'>
    expect(empty.active).toBeNull()
    expect(empty.config.vaultPath).toBeNull()
    expect((await call('GET', '/api/tree')).status).toBe(409)
  })
})

describe('projects', () => {
  it('links a repository you already have, opens it, and shows its files', async () => {
    const { call, vault } = await server()
    const repo = await repoElsewhere('api')

    const linked = await call('POST', '/api/projects', { name: 'api', repo })

    expect(linked.status).toBe(200)
    const body = linked.body as ApiResponse<'POST /api/projects'>
    expect(body.project).toEqual({ name: 'api', repo, missing: false })
    // Linking is opening: registering a repository you will not work in helps nobody.
    expect(body.config.project[vault]).toBe('api')

    const tree = (await call('GET', '/api/tree')).body as ApiResponse<'GET /api/tree'>
    expect(tree.projects.map((one) => one.name)).toEqual(['api'])
    expect(tree.projects[0]!.entries.map((entry) => entry.path).sort()).toEqual([
      'README.md',
      'main.rs',
    ])
    // The vault's own documents are untouched beside them.
    expect(tree.vault.map((e) => e.path).sort()).toEqual(['Risks.md', 'index.md'])
  })

  it('keeps the register in the vault, not in the machine config', async () => {
    const { call, vault } = await server()
    const repo = await repoElsewhere('api')
    await call('POST', '/api/projects', { name: 'api', repo })

    const written = JSON.parse(
      await readFile(path.join(vault, '.projects', 'projects.json'), 'utf8'),
    )
    expect(written).toEqual({ api: repo })
  })

  it('reads and writes a project file like any other document', async () => {
    const { call } = await server()
    const repo = await repoElsewhere('api')
    await call('POST', '/api/projects', { name: 'api', repo })

    expect((await call('GET', '/api/doc?root=project:api&path=main.rs')).body).toEqual({
      markdown: 'fn main() {}\n',
    })
    await call('PUT', '/api/doc', {
      root: 'project:api',
      path: 'main.rs',
      markdown: 'fn main() { todo!() }\n',
    })
    expect(await readFile(path.join(repo, 'main.rs'), 'utf8')).toBe(
      'fn main() { todo!() }\n',
    )
  })

  it('holds every project open at once and scopes to the one asked for', async () => {
    const { call, vault } = await server()
    await call('POST', '/api/projects', { name: 'api', repo: await repoElsewhere('api') })
    await call('POST', '/api/projects', { name: 'web', repo: await repoElsewhere('web') })

    const listed = (await call('GET', '/api/projects'))
      .body as ApiResponse<'GET /api/projects'>
    expect(listed.projects.map((one) => one.name)).toEqual(['api', 'web'])

    // Both are in the sidebar whichever one you are standing in — that is how you switch.
    const tree = (await call('GET', '/api/tree')).body as ApiResponse<'GET /api/tree'>
    expect(tree.projects.map((one) => one.name).sort()).toEqual(['api', 'web'])

    const scoped = await call('POST', '/api/scope', { root: 'project:api' })
    expect((scoped.body as ApiResponse<'POST /api/scope'>).config.project[vault]).toBe(
      'api',
    )

    const back = await call('POST', '/api/scope', { root: 'vault' })
    expect((back.body as ApiResponse<'POST /api/scope'>).config.project[vault]).toBeNull()
    // Standing in the vault does not close anything: the projects are still there to go to.
    const after = (await call('GET', '/api/tree')).body as ApiResponse<'GET /api/tree'>
    expect(after.projects.map((one) => one.name).sort()).toEqual(['api', 'web'])
  })

  it('opens a project branch into the vault and leaves the repository alone', async () => {
    const { call, vault } = await server()
    const repo = await repoElsewhere('api')
    await git(repo, 'branch', 'fix-login')
    await call('POST', '/api/projects', { name: 'api', repo })

    const opened = await call('POST', '/api/branches/open', {
      root: 'project:api',
      name: 'fix-login',
    })

    expect(opened.status).toBe(200)
    const made = (opened.body as ApiResponse<'POST /api/branches/open'>).branch
    expect(made.path).toBe(path.join(vault, '.projects', 'api', 'fix-login'))
    expect(await stat(path.join(made.path, 'main.rs'))).toBeTruthy()
    // The repository is still on the branch it was on.
    expect((await git(repo, 'rev-parse', '--abbrev-ref', 'HEAD')).stdout.trim()).toBe(
      'main',
    )

    const listed = (await call('GET', '/api/branches?root=project:api'))
      .body as ApiResponse<'GET /api/branches'>
    expect(listed.active).toBe('fix-login')
  })

  /* The vault's branches and the project's are two lists, and switching one is not the
     other. */
  it('keeps the two branch lists apart', async () => {
    const { call, root } = await server()
    await git(root, 'init', '--initial-branch=trunk')
    await git(root, 'add', '-A')
    await git(root, 'commit', '-m', 'init')
    await call('POST', '/api/projects', { name: 'api', repo: await repoElsewhere('api') })

    const ofVault = (await call('GET', '/api/branches?root=vault'))
      .body as ApiResponse<'GET /api/branches'>
    const ofProject = (await call('GET', '/api/branches?root=project:api'))
      .body as ApiResponse<'GET /api/branches'>

    expect(ofVault.active).toBe('trunk')
    expect(ofProject.active).toBe('main')
  })

  it('unlinks a project and leaves the repository on disk', async () => {
    const { call, vault } = await server()
    const repo = await repoElsewhere('api')
    await git(repo, 'branch', 'fix-login')
    await call('POST', '/api/projects', { name: 'api', repo })
    await call('POST', '/api/branches/open', { root: 'project:api', name: 'fix-login' })

    const gone = await call('DELETE', '/api/projects?name=api')

    expect(gone.status).toBe(200)
    expect(
      (gone.body as ApiResponse<'DELETE /api/projects'>).config.project[vault],
    ).toBeNull()
    // The repository, and the branch inside it, are exactly as they were.
    expect(await stat(path.join(repo, 'main.rs'))).toBeTruthy()
    expect((await git(repo, 'branch', '--list', 'fix-login')).stdout).toContain(
      'fix-login',
    )
    // The checkouts broodmother made for it are the only thing that went.
    await expect(stat(path.join(vault, '.projects', 'api'))).rejects.toThrow()
  })

  it('makes the folder when there is none, and refuses a name already taken', async () => {
    const { call } = await server()
    const repo = await repoElsewhere('api')
    const made = path.join(await tempDir(), 'fresh')

    expect(
      (await call('POST', '/api/projects', { name: 'fresh', repo: made, git: 'local' }))
        .status,
    ).toBe(200)
    expect((await stat(made)).isDirectory()).toBe(true)

    await call('POST', '/api/projects', { name: 'api', repo })
    expect((await call('POST', '/api/projects', { name: 'api', repo })).status).toBe(400)
  })

  /* A project whose folder you moved is worth saying so about, not quietly dropping. */
  it('lists a project whose repository has gone as missing', async () => {
    const { call, vault } = await server()
    await call('POST', '/api/projects', { name: 'api', repo: await repoElsewhere('api') })
    await writeFile(
      path.join(vault, '.projects', 'projects.json'),
      JSON.stringify({ api: '/gone/api' }),
    )

    const listed = (await call('GET', '/api/projects'))
      .body as ApiResponse<'GET /api/projects'>
    expect(listed.projects).toEqual([{ name: 'api', repo: '/gone/api', missing: true }])
  })
})

describe('deleting everything', () => {
  /* The vaults and the profiles go together: half a home is a state nobody asked for. */
  it('empties the home and answers with the config a first run starts from', async () => {
    const { call, home } = await server()
    await mkdir(path.join(home, 'work'))
    await call('POST', '/api/vaults/open', { path: path.join(home, 'work') })

    const wiped = await call('DELETE', '/api/data')
    const body = wiped.body as ApiResponse<'DELETE /api/data'>

    expect(wiped.status).toBe(200)
    expect(body.config).toEqual(defaultConfig(null))
    // Only what the config itself just wrote back is left standing.
    expect((await readdir(home)).sort()).toEqual(['.gitignore', 'config.json'])

    const vaults = (await call('GET', '/api/vaults'))
      .body as ApiResponse<'GET /api/vaults'>
    expect(vaults.vaults).toEqual([])
    expect(vaults.active).toBeNull()

    const profiles = (await call('GET', '/api/profiles'))
      .body as ApiResponse<'GET /api/profiles'>
    expect(profiles.profiles).toEqual([])
    expect(profiles.active).toBeNull()

    expect((await call('GET', '/api/tree')).status).toBe(409)
  })
})

describe('profiles', () => {
  it('is a file beside the vaults, and never a vault itself', async () => {
    const { call, home } = await server()

    const listed = (await call('GET', '/api/profiles'))
      .body as ApiResponse<'GET /api/profiles'>
    expect(listed.profiles.map((profile) => profile.path)).toEqual([
      path.join(home, 'profiles', 'tester.json'),
    ])
    expect(listed.active?.name).toBe('tester')

    const vaults = (await call('GET', '/api/vaults'))
      .body as ApiResponse<'GET /api/vaults'>
    expect(vaults.vaults.map((vault) => vault.name)).toEqual([])
  })

  it('is created for the vault you are in, and picked up by it', async () => {
    const { call, home } = await server()

    const created = await call('POST', '/api/profiles', { name: 'work', ...IDENTITY })
    expect(created.status).toBe(200)
    const body = created.body as ApiResponse<'POST /api/profiles'>
    expect(body.profile.path).toBe(path.join(home, 'profiles', 'work.json'))
    expect(body.vault?.profile).toBe('work')

    expect(
      (await call('POST', '/api/profiles', { name: 'work', ...IDENTITY })).status,
    ).toBe(400)
  })

  /* A key, made here rather than in a terminal — which is the only step of setting one up
     that the app can take off you. */
  it('generates a key, points the profile at it, and shows only the public half', async () => {
    const { call, home } = await server()

    expect((await call('GET', '/api/profiles/key')).body).toEqual({ publicKey: null })

    const made = await call('POST', '/api/profiles/key')
    expect(made.status).toBe(200)
    const body = made.body as ApiResponse<'POST /api/profiles/key'>
    expect(body.publicKey).toMatch(/^ssh-ed25519 /)
    expect(body.profile.sshKeyPath).toBe(path.join(home, 'profiles', 'tester.key'))

    // The private half is on disk and stays there; only the public one was answered with.
    expect(await stat(path.join(home, 'profiles', 'tester.key'))).toBeTruthy()
    expect(body.publicKey).not.toContain('PRIVATE KEY')
    expect((await call('GET', '/api/profiles/key')).body).toEqual({
      publicKey: body.publicKey,
    })
  })

  /* Replacing a key silently takes away access to everything the old one opened. */
  it('refuses to make a second key over the first', async () => {
    const { call } = await server()
    await call('POST', '/api/profiles/key')
    expect((await call('POST', '/api/profiles/key')).status).toBe(400)
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
      color: '#c084fc',
      gitAuthor: { name: 'Ada', email: 'ada@example.com' },
      sshKeyPath: '~/.ssh/id_ed25519',
      claudeCfgDir: '~/.claude',
      soul: '# Ada\n\nTerse, and never cheerful about it.',
    }

    const saved = await call('PUT', '/api/profiles', identity)
    expect((saved.body as ApiResponse<'PUT /api/profiles'>).profile).toMatchObject(
      identity,
    )
    expect(
      JSON.parse(await readFile(path.join(home, 'profiles', 'tester.json'), 'utf8')),
    ).toEqual(identity)

    expect(
      (await call('PUT', '/api/profiles', { ...identity, color: 'red' })).status,
    ).toBe(400)
  })
})

describe('no vault open', () => {
  it('answers 409 rather than pretending an empty vault exists', async () => {
    const handle = await startServer({ home: await tempDir(), port: 0 })
    running.push(handle)

    const response = await fetch(`${handle.url}/api/tree`)
    expect(response.status).toBe(409)
    expect(((await response.json()) as { error: string }).error).toMatch(/no vault/)
  })
})

describe('branch routes', () => {
  /** The fixture vault with a repository in its `local`, which is what has branches. */
  async function repo() {
    const made = await server()
    const remote = await bareRemote()
    await git(made.root, 'init', '--initial-branch=main')
    await git(made.root, 'remote', 'add', 'origin', remote)
    await git(made.root, 'add', '-A')
    await git(made.root, 'commit', '-m', 'init')
    return made
  }

  it('GET /api/branches names the open checkout by its branch', async () => {
    const { call } = await repo()
    const { body } = await call('GET', '/api/branches?root=vault')
    const listed = body as ApiResponse<'GET /api/branches'>
    expect(listed.active).toBe('main')
    expect(listed.branches).toEqual([
      { name: 'main', path: expect.any(String), checkedOut: true, primary: true },
    ])
  })

  /* The whole gesture: a branch with no folder gets one on the way in. */
  it('POST /api/branches/open checks a branch out and moves into it', async () => {
    const { call, root, vault, home } = await repo()
    await git(root, 'branch', 'feat/sync')

    const opened = await call('POST', '/api/branches/open', {
      root: 'vault',
      name: 'feat/sync',
    })
    expect(opened.status).toBe(200)
    const made = (opened.body as ApiResponse<'POST /api/branches/open'>).branch
    expect(made.checkedOut).toBe(true)
    // The slash cannot be a folder, so it flattened.
    expect(made.path).toBe(path.join(vault, 'feat-sync'))
    expect(await stat(made.path)).toBeTruthy()

    // The move is recorded as the folder, which is what the terminals and git open on.
    const written = JSON.parse(await readFile(path.join(home, 'config.json'), 'utf8'))
    expect(written.checkouts[vault]).toBe('feat-sync')

    // Asking again is moving back into the one that is already there.
    const again = await call('POST', '/api/branches/open', {
      root: 'vault',
      name: 'feat/sync',
    })
    expect((again.body as ApiResponse<'POST /api/branches/open'>).branch.path).toBe(
      made.path,
    )
  })

  it('POST /api/branches cuts a new one, and DELETE takes only its checkout', async () => {
    const { call, vault } = await repo()

    const created = await call('POST', '/api/branches', {
      root: 'vault',
      name: 'fix-login',
    })
    expect(created.status).toBe(200)
    expect((created.body as ApiResponse<'POST /api/branches'>).branch.path).toBe(
      path.join(vault, 'fix-login'),
    )

    const dropped = await call('DELETE', '/api/branches?root=vault&name=fix-login')
    const left = (dropped.body as ApiResponse<'DELETE /api/branches'>).branches
    // The branch outlives its folder: still offered, no longer checked out.
    expect(left.find((one) => one.name === 'fix-login')).toMatchObject({
      checkedOut: false,
    })
    // Removing the one you were in falls back to the vault's own checkout.
    expect(left.find((one) => one.primary)?.name).toBe('main')
  })

  it('refuses a branch nobody has', async () => {
    const { call } = await repo()
    const missing = await call('POST', '/api/branches/open', {
      root: 'vault',
      name: 'nope',
    })
    expect(missing.status).toBe(400)
    expect(missing.body).toHaveProperty('error')
  })
})
