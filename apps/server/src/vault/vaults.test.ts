import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import type { Profile } from '@mother/shared'
import { bareRemote, cleanup, git, tempDir } from '../test/fixtures'
import { Git } from '../git/git'
import { VaultError, assertVaultName, createVault, listVaults } from './vaults'

afterAll(cleanup)

const profile: Profile = {
  name: 'tester',
  path: '/nowhere/profiles/tester.json',
  presenceColor: '#8fb8d8',
  gitAuthor: { name: 'Test', email: 'test@localhost' },
  sshKeyPath: null,
  claudeConfigDir: null,
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
  it('clones the remote when the branch already has commits', async () => {
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
      { name: 'docs', remoteUrl: remote, branch: 'main' },
      profile,
      home,
    )

    expect(vault).toEqual({ name: 'docs', path: path.join(home, 'docs') })
    expect(await readFile(path.join(vault.path, 'Overview.md'), 'utf8')).toBe(
      '# Overview\n',
    )
    expect(await new Git(vault.path).remoteUrl()).toBe(remote)
  })

  it('initialises against an empty remote and leaves a commit to push', async () => {
    const home = await tempDir()
    const remote = await bareRemote()

    const vault = await createVault(
      { name: 'fresh', remoteUrl: remote, branch: 'main' },
      profile,
      home,
    )

    const repo = new Git(vault.path)
    expect(await repo.remoteUrl()).toBe(remote)
    expect((await repo.status()).changed).toEqual([])
    const log = await git(vault.path, 'log', '--oneline')
    expect(log.stdout).toContain('mother: create vault fresh')
    expect(await readFile(path.join(vault.path, 'README.md'), 'utf8')).toContain(
      '# fresh',
    )
  })

  it('refuses an unreachable remote instead of leaving an unlinked vault behind', async () => {
    const home = await tempDir()

    await expect(
      createVault(
        { name: 'broken', remoteUrl: path.join(home, 'nope.git'), branch: 'main' },
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
      createVault({ name: 'taken', remoteUrl: remote, branch: 'main' }, profile, home),
    ).rejects.toThrow(/already exists/)
  })
})
