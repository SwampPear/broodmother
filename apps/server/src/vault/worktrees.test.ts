import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { bareRemote, cleanup, git, tempDir } from '../test'
import {
  PRIMARY,
  createWorktree,
  listWorktrees,
  removeWorktree,
  WorktreeError,
} from './worktrees'

afterAll(cleanup)

/** A vault the way one exists on disk: a folder holding `local`, which is the clone. */
async function vault() {
  const dir = await tempDir()
  const local = path.join(dir, PRIMARY)
  const remote = await bareRemote()
  await mkdir(local)
  await git(local, 'init', '--initial-branch=main')
  await git(local, 'remote', 'add', 'origin', remote)
  await writeFile(path.join(local, 'README.md'), '# vault\n')
  await git(local, 'add', '.')
  await git(local, 'commit', '-m', 'first')
  return { dir, local }
}

const names = async (dir: string) =>
  (await listWorktrees(dir)).map((one) => one.name).sort()

describe('listWorktrees', () => {
  it('finds the vault’s own checkout and calls it primary', async () => {
    const { dir } = await vault()
    const [only] = await listWorktrees(dir)
    expect(only!.name).toBe(PRIMARY)
    expect(only!.primary).toBe(true)
    expect(only!.branch).toBe('main')
  })

  /* A folder in a vault that is not a checkout is not a worktree — it is a folder. */
  it('ignores a plain directory beside the checkouts', async () => {
    const { dir } = await vault()
    await mkdir(path.join(dir, 'notes'))
    expect(await names(dir)).toEqual([PRIMARY])
  })

  it('puts the primary first, whatever the others are called', async () => {
    const { dir } = await vault()
    await createWorktree(dir, { name: 'aaa', branch: 'aaa', create: true })
    const listed = await listWorktrees(dir)
    expect(listed[0]!.name).toBe(PRIMARY)
  })
})

describe('createWorktree', () => {
  it('adds a checkout on a fresh branch, with its own files', async () => {
    const { dir } = await vault()

    const made = await createWorktree(dir, {
      name: 'fix-login',
      branch: 'fix-login',
      create: true,
    })

    expect(made.branch).toBe('fix-login')
    expect(made.primary).toBe(false)
    // It is a real checkout: the commit that is on main is on disk here too.
    expect(await stat(path.join(made.path, 'README.md'))).toBeTruthy()
    expect(await names(dir)).toEqual(['fix-login', PRIMARY])
  })

  it('checks out a branch that already exists rather than making it again', async () => {
    const { dir, local } = await vault()
    await git(local, 'branch', 'existing')

    const made = await createWorktree(dir, {
      name: 'picked-up',
      branch: 'existing',
      create: false,
    })

    expect(made.branch).toBe('existing')
  })

  it('refuses a name that is already there', async () => {
    const { dir } = await vault()
    await createWorktree(dir, { name: 'taken', branch: 'taken', create: true })
    await expect(
      createWorktree(dir, { name: 'taken', branch: 'other', create: true }),
    ).rejects.toThrow(WorktreeError)
  })

  it('refuses to be called local, which is the clone', async () => {
    const { dir } = await vault()
    await expect(
      createWorktree(dir, { name: PRIMARY, branch: 'x', create: true }),
    ).rejects.toThrow(WorktreeError)
  })

  it('refuses a name that would escape the vault', async () => {
    const { dir } = await vault()
    await expect(
      createWorktree(dir, { name: '../escape', branch: 'x', create: true }),
    ).rejects.toThrow(WorktreeError)
  })

  it('reports git’s reason when the branch is already checked out', async () => {
    const { dir } = await vault()
    await expect(
      createWorktree(dir, { name: 'second-main', branch: 'main', create: false }),
    ).rejects.toThrow(WorktreeError)
  })
})

describe('removeWorktree', () => {
  it('takes the checkout off disk and out of git', async () => {
    const { dir } = await vault()
    const made = await createWorktree(dir, { name: 'gone', branch: 'gone', create: true })

    await removeWorktree(dir, 'gone')

    await expect(stat(made.path)).rejects.toThrow()
    expect(await names(dir)).toEqual([PRIMARY])
  })

  /* The primary is the repository; every other worktree is a pointer into it. */
  it('refuses to remove the vault’s own checkout', async () => {
    const { dir } = await vault()
    await expect(removeWorktree(dir, PRIMARY)).rejects.toThrow(WorktreeError)
    expect(await readdir(dir)).toContain(PRIMARY)
  })

  it('refuses one that is not there', async () => {
    const { dir } = await vault()
    await expect(removeWorktree(dir, 'nope')).rejects.toThrow(WorktreeError)
  })

  /* Uncommitted work is git's reason to refuse, and it is the right one. */
  it('leaves a worktree holding unsaved work where it is', async () => {
    const { dir } = await vault()
    const made = await createWorktree(dir, { name: 'busy', branch: 'busy', create: true })
    await writeFile(path.join(made.path, 'draft.md'), 'not committed')

    await expect(removeWorktree(dir, 'busy')).rejects.toThrow(WorktreeError)
    expect(await stat(path.join(made.path, 'draft.md'))).toBeTruthy()
  })
})
