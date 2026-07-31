import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import type { Profile } from '@broodmother/shared'
import { cleanup, git, tempDir } from '../test'
import {
  ProjectError,
  findProject,
  forgetProject,
  listProjects,
  projectCheckouts,
  registerProject,
} from './projects'

afterAll(cleanup)

/** Whoever a repository broodmother makes commits as. */
const PROFILE: Profile = {
  name: 'tester',
  path: '/nowhere/tester.json',
  color: '#c084fc',
  gitAuthor: { name: 'Tester', email: 'tester@example.com' },
  sshKeyPath: null,
  claudeCfgDir: null,
  soul: null,
  github: null,
}

async function repo(name = 'api') {
  const dir = path.join(await tempDir(), name)
  await mkdir(dir, { recursive: true })
  await git(dir, 'init', '--initial-branch=main')
  await writeFile(path.join(dir, 'main.rs'), 'fn main() {}\n')
  await git(dir, 'add', '-A')
  await git(dir, 'commit', '-m', 'init')
  return dir
}

describe('registerProject', () => {
  it('links a folder that already exists and writes it into the vault', async () => {
    const vault = await tempDir()
    const dir = await repo()

    const linked = await registerProject(vault, { name: 'api', repo: dir })

    expect(linked).toEqual({ name: 'api', repo: dir, missing: false })
    expect(
      JSON.parse(await readFile(path.join(vault, '.projects', 'projects.json'), 'utf8')),
    ).toEqual({ api: dir })
  })

  /* Git is optional the same way it is for a vault: a folder of code is a place to work. */
  it('links a folder with no repository in it', async () => {
    const vault = await tempDir()
    const dir = await tempDir()
    await expect(
      registerProject(vault, { name: 'plain', repo: dir }),
    ).resolves.toMatchObject({ name: 'plain' })
  })

  /* Creating a project and linking one you have are the same gesture: what is missing is
     made, the way a vault's folder is, and what is there is left alone. */
  it('makes the folder when there is none, with the git it was asked for', async () => {
    const vault = await tempDir()
    const dir = path.join(await tempDir(), 'api')

    const made = await registerProject(
      vault,
      { name: 'api', repo: dir, git: 'local' },
      PROFILE,
    )

    expect(made).toEqual({ name: 'api', repo: dir, missing: false })
    expect((await stat(path.join(dir, '.git'))).isDirectory()).toBe(true)
    // A branch of a project is a worktree, and git makes none of a repository with no
    // commits — so the one it starts with is the point of it.
    const log = await git(dir, 'log', '--oneline')
    expect(log.stdout).toContain('create project api')
  })

  it('makes a plain folder when it was asked for no git', async () => {
    const vault = await tempDir()
    const dir = path.join(await tempDir(), 'plain')

    await registerProject(vault, { name: 'plain', repo: dir, git: 'none' }, PROFILE)

    expect((await stat(dir)).isDirectory()).toBe(true)
    await expect(stat(path.join(dir, '.git'))).rejects.toThrow()
  })

  /* Nothing is created for a caller with no profile to commit as. */
  it('refuses a folder that is not there when there is nobody to make it as', async () => {
    const vault = await tempDir()
    await expect(
      registerProject(vault, { name: 'api', repo: path.join(vault, 'nope') }),
    ).rejects.toThrow(ProjectError)
  })

  it('refuses a name already taken, and one that is not a plain name', async () => {
    const vault = await tempDir()
    const dir = await repo()
    await registerProject(vault, { name: 'api', repo: dir })

    await expect(registerProject(vault, { name: 'api', repo: dir })).rejects.toThrow(
      ProjectError,
    )
    await expect(
      registerProject(vault, { name: '../escape', repo: dir }),
    ).rejects.toThrow(ProjectError)
  })
})

describe('listProjects', () => {
  it('is empty in a vault that has linked none', async () => {
    expect(await listProjects(await tempDir())).toEqual([])
  })

  it('sorts by name and says which repositories have gone', async () => {
    const vault = await tempDir()
    await registerProject(vault, { name: 'web', repo: await repo('web') })
    await registerProject(vault, { name: 'api', repo: await repo('api') })
    await writeFile(
      path.join(vault, '.projects', 'projects.json'),
      JSON.stringify({ web: '/gone/web', api: await findRepo(vault, 'api') }),
    )

    const listed = await listProjects(vault)
    expect(listed.map((one) => one.name)).toEqual(['api', 'web'])
    expect(listed.map((one) => one.missing)).toEqual([false, true])
  })

  /* A register nobody can read is a vault with no projects, not a vault that will not open. */
  it('reads a malformed register as no projects at all', async () => {
    const vault = await tempDir()
    await mkdir(path.join(vault, '.projects'), { recursive: true })
    await writeFile(path.join(vault, '.projects', 'projects.json'), 'not json')
    expect(await listProjects(vault)).toEqual([])
  })
})

async function findRepo(vault: string, name: string): Promise<string> {
  const found = await findProject(vault, name)
  return found!.repo
}

describe('projectCheckouts', () => {
  it('makes the repository the primary and puts worktrees in the vault', () => {
    const checkouts = projectCheckouts('/home/handbook', {
      name: 'api',
      repo: '/dev/api',
      missing: false,
    })
    expect(checkouts).toEqual({
      primary: '/dev/api',
      worktrees: path.join('/home/handbook', '.projects', 'api'),
    })
  })
})

describe('forgetProject', () => {
  it('drops the link and the checkouts, and leaves the repository where it is', async () => {
    const vault = await tempDir()
    const dir = await repo()
    await registerProject(vault, { name: 'api', repo: dir })
    const worktrees = path.join(vault, '.projects', 'api')
    await mkdir(path.join(worktrees, 'fix-login'), { recursive: true })

    await forgetProject(vault, 'api')

    expect(await listProjects(vault)).toEqual([])
    await expect(stat(worktrees)).rejects.toThrow()
    expect(await stat(path.join(dir, 'main.rs'))).toBeTruthy()
  })

  it('refuses one it has never heard of', async () => {
    await expect(forgetProject(await tempDir(), 'nope')).rejects.toThrow(ProjectError)
  })
})
