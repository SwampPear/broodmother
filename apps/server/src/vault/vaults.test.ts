import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import type { Profile } from '@broodmother/shared'
import { bareRemote, cleanup, git, tempDir } from '../test'
import { Git } from '../git'
import { VaultError, assertVaultName, createVault, listVaults } from './vaults'
import { PRIMARY } from './worktrees'

afterAll(cleanup)

const profile: Profile = {
  name: 'tester',
  path: '/nowhere/profiles/tester.json',
  color: '#8fb8d8',
  gitAuthor: { name: 'Test', email: 'test@localhost' },
  sshKeyPath: null,
  claudeCfgDir: null,
}

describe('listVaults', () => {
  it('picks up every plain directory dropped into the project', async () => {
    const home = await tempDir()
    await mkdir(path.join(home, 'notes'))
    await mkdir(path.join(home, 'handbook'))

    expect((await listVaults(home)).map((vault) => vault.name)).toEqual([
      'handbook',
      'notes',
    ])
  })

  it('ignores files and dotted directories, so project.json is not a vault', async () => {
    const home = await tempDir()
    await mkdir(path.join(home, '.trash'))
    await writeFile(path.join(home, 'project.json'), '{}')
    await mkdir(path.join(home, 'real'))

    expect((await listVaults(home)).map((vault) => vault.name)).toEqual(['real'])
  })

  it('creates the home rather than failing when it does not exist yet', async () => {
    const home = path.join(await tempDir(), 'nested', 'home')
    expect(await listVaults(home)).toEqual([])
  })
})

describe('assertVaultName', () => {
  it.each([
    ['..', 'traversal'],
    ['a/b', 'separator'],
    ['.hidden', 'dot'],
    ['', 'blank'],
    [' padded ', 'padded'],
  ])('rejects %s (%s)', (name) => {
    expect(() => assertVaultName(name)).toThrow(VaultError)
  })

  it('accepts an ordinary folder name', () => {
    expect(() => assertVaultName('handbook')).not.toThrow()
  })
})

describe('createVault', () => {
  /** Everything is made in the vault's own `local`, which is the checkout it starts with. */
  const localOf = (vault: { path: string }) => path.join(vault.path, PRIMARY)

  it('clones the remote into local/ when the branch already has commits', async () => {
    const home = await tempDir()
    const remote = await bareRemote()
    const seed = await tempDir()
    await git(seed, 'init', '--initial-branch=main')
    await writeFile(path.join(seed, 'Overview.md'), '# Overview\n')
    await git(seed, 'add', '-A')
    await git(seed, 'commit', '-m', 'seed')
    await git(seed, 'remote', 'add', 'origin', remote)
    await git(seed, 'push', 'origin', 'main')

    const vault = await createVault(
      { name: 'docs', git: 'remote', remoteUrl: remote, branch: 'main' },
      profile,
      home,
    )

    expect(vault).toEqual({
      name: 'docs',
      path: path.join(home, 'docs'),
      profile: profile.name,
    })
    expect(await readFile(path.join(localOf(vault), 'Overview.md'), 'utf8')).toBe(
      '# Overview\n',
    )
    expect(await new Git(localOf(vault)).remoteUrl()).toBe(remote)
    // The vault folder holds checkouts, so `local` is the only thing directly in it.
    expect(await readdir(vault.path)).toEqual([PRIMARY])
  })

  it('initialises against an empty remote and leaves a commit to push', async () => {
    const home = await tempDir()
    const remote = await bareRemote()

    const vault = await createVault(
      { name: 'fresh', git: 'remote', remoteUrl: remote, branch: 'main' },
      profile,
      home,
    )

    const repo = new Git(localOf(vault))
    expect(await repo.remoteUrl()).toBe(remote)
    expect(await repo.branch()).toBe('main')
    expect((await repo.status()).changed).toEqual([])
    const log = await git(localOf(vault), 'log', '--oneline')
    expect(log.stdout).toContain('broodmother: create vault fresh')
    expect(await readFile(path.join(localOf(vault), 'README.md'), 'utf8')).toContain(
      '# fresh',
    )
  })

  it('makes a repository with no remote when asked for one', async () => {
    const home = await tempDir()
    const vault = await createVault(
      { name: 'solo', git: 'local', branch: 'trunk' },
      profile,
      home,
    )

    const repo = new Git(localOf(vault))
    expect(await repo.isRepo()).toBe(true)
    expect(await repo.remoteUrl()).toBeNull()
    expect(await repo.branch()).toBe('trunk')
    expect((await git(localOf(vault), 'log', '--oneline')).stdout).toContain(
      'broodmother: create vault solo',
    )
  })

  it('makes a plain folder with no git at all', async () => {
    const home = await tempDir()
    const vault = await createVault({ name: 'plain', git: 'none' }, profile, home)

    expect(await new Git(localOf(vault)).isRepo()).toBe(false)
    expect(await readdir(localOf(vault))).toEqual(['README.md'])
    expect(await readFile(path.join(localOf(vault), 'README.md'), 'utf8')).not.toContain(
      'git',
    )
  })

  it('needs no remote to reach, so it cannot fail on one', async () => {
    const home = await tempDir()
    // The home is a real directory with nothing reachable anywhere near it.
    await expect(
      createVault({ name: 'offline', git: 'local' }, profile, home),
    ).resolves.toMatchObject({ name: 'offline' })
  })

  it('refuses a vault asked to sync with no remote to sync to', async () => {
    const home = await tempDir()
    await expect(
      createVault({ name: 'nowhere', git: 'remote', remoteUrl: '  ' }, profile, home),
    ).rejects.toThrow(VaultError)
    expect(await listVaults(home)).toEqual([])
  })

  it('refuses an unreachable remote instead of leaving an unlinked vault behind', async () => {
    const home = await tempDir()

    await expect(
      createVault(
        {
          name: 'broken',
          git: 'remote',
          remoteUrl: path.join(home, 'nope.git'),
          branch: 'main',
        },
        profile,
        home,
      ),
    ).rejects.toThrow(VaultError)

    expect(await listVaults(home)).toEqual([])
  })

  it('refuses a name that is already taken', async () => {
    const home = await tempDir()
    const remote = await bareRemote()
    await mkdir(path.join(home, 'taken'))

    await expect(
      createVault(
        { name: 'taken', git: 'remote', remoteUrl: remote, branch: 'main' },
        profile,
        home,
      ),
    ).rejects.toThrow(/already exists/)
  })
})
