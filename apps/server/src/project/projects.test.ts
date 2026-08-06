import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import type { Profile } from '@/types'
import { cleanup, git, tempDir } from '../test'
import {
  ProjectError,
  createProject,
  deleteProject,
  findProject,
  listProjects,
  projectCheckouts,
} from './projects'

afterAll(cleanup)

/** Whoever a repository broodmother makes commits as. */
const PROFILE: Profile = {
  name: 'tester',
  path: '/nowhere/tester/profile.json',
  color: '#c084fc',
  gitAuthor: { name: 'Tester', email: 'tester@example.com' },
  sshKeyPath: null,
  claudeCfgDir: null,
  cursorCfgDir: null,
  soul: null,
  github: null,
}

/** A repository to clone from, standing in for a remote. */
async function remote(name = 'api') {
  const dir = path.join(await tempDir(), name)
  await mkdir(dir, { recursive: true })
  await git(dir, 'init', '--initial-branch=main')
  await writeFile(path.join(dir, 'main.rs'), 'fn main() {}\n')
  await git(dir, 'add', '-A')
  await git(dir, 'commit', '-m', 'init')
  return dir
}

const local = (vault: string, name: string) =>
  path.join(vault, '.projects', name, 'local')

describe('createProject', () => {
  it('makes the repository inside the vault, with the git it was asked for', async () => {
    const vault = await tempDir()

    const made = await createProject(vault, { name: 'api', git: 'local' }, PROFILE)

    expect(made).toEqual({ name: 'api', repo: local(vault, 'api') })
    expect((await stat(path.join(made.repo, '.git'))).isDirectory()).toBe(true)
    // A branch of a project is a worktree, and git makes none of a repository with no
    // commits — so the one it starts with is the point of it.
    const log = await git(made.repo, 'log', '--oneline')
    expect(log.stdout).toContain('create project api')
  })

  it('clones a remote into the project', async () => {
    const vault = await tempDir()
    const source = await remote('origin')

    const made = await createProject(
      vault,
      { name: 'api', git: 'remote', remoteUrl: source, branch: 'main' },
      PROFILE,
    )

    expect(made.repo).toBe(local(vault, 'api'))
    expect((await stat(path.join(made.repo, '.git'))).isDirectory()).toBe(true)
    expect(await readFile(path.join(made.repo, 'main.rs'), 'utf8')).toBe('fn main() {}\n')
  })

  it('makes a plain folder when it was asked for no git', async () => {
    const vault = await tempDir()

    const made = await createProject(vault, { name: 'plain', git: 'none' }, PROFILE)

    expect((await stat(made.repo)).isDirectory()).toBe(true)
    await expect(stat(path.join(made.repo, '.git'))).rejects.toThrow()
  })

  it('refuses a name already taken, and one that is not a plain name', async () => {
    const vault = await tempDir()
    await createProject(vault, { name: 'api' }, PROFILE)

    await expect(createProject(vault, { name: 'api' }, PROFILE)).rejects.toThrow(
      ProjectError,
    )
    await expect(createProject(vault, { name: '../escape' }, PROFILE)).rejects.toThrow(
      ProjectError,
    )
  })
})

describe('listProjects', () => {
  it('is empty in a vault that has none', async () => {
    expect(await listProjects(await tempDir())).toEqual([])
  })

  it('sorts by name, and picks up a folder dropped in by hand', async () => {
    const vault = await tempDir()
    await createProject(vault, { name: 'web' }, PROFILE)
    await createProject(vault, { name: 'api' }, PROFILE)
    await mkdir(local(vault, 'dropped-in'), { recursive: true })

    expect((await listProjects(vault)).map((one) => one.name)).toEqual([
      'api',
      'dropped-in',
      'web',
    ])
    expect((await findProject(vault, 'api'))?.repo).toBe(local(vault, 'api'))
  })
})

describe('projectCheckouts', () => {
  it('is shaped like the vault holding it: `local`, and its branches beside it', () => {
    expect(projectCheckouts('/home/you/handbook', 'api')).toEqual({
      primary: path.join('/home/you/handbook', '.projects', 'api', 'local'),
      worktrees: path.join('/home/you/handbook', '.projects', 'api'),
    })
  })
})

describe('deleteProject', () => {
  it('takes the repository and every checkout of it', async () => {
    const vault = await tempDir()
    const made = await createProject(vault, { name: 'api', git: 'local' }, PROFILE)
    await mkdir(path.join(vault, '.projects', 'api', 'fix-login'), { recursive: true })

    await deleteProject(vault, 'api')

    expect(await listProjects(vault)).toEqual([])
    await expect(stat(made.repo)).rejects.toThrow()
    await expect(stat(path.join(vault, '.projects', 'api'))).rejects.toThrow()
  })

  it('refuses one it has never heard of', async () => {
    await expect(deleteProject(await tempDir(), 'nope')).rejects.toThrow(ProjectError)
  })
})
