import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { bareRemote, cleanup, git, tempDir } from '../test'
import {
  BranchError,
  createBranch,
  listBranches,
  openBranch,
  removeBranch,
  type Checkouts,
} from './core'

afterAll(cleanup)

const PRIMARY = 'local'

async function repoAt(local: string, name: string) {
  const remote = await bareRemote()
  await mkdir(local, { recursive: true })
  await git(local, 'init', '--initial-branch=main')
  await git(local, 'remote', 'add', 'origin', remote)
  await writeFile(path.join(local, 'README.md'), `# ${name}\n`)
  await git(local, 'add', '.')
  await git(local, 'commit', '-m', 'first')
  return remote
}

/** A vault the way one exists on disk: a folder holding `local`, which is the clone, and
 *  whose branches get folders beside it. */
async function vault() {
  const dir = await tempDir()
  const local = path.join(dir, PRIMARY)
  const remote = await repoAt(local, 'vault')
  return { dir, local, remote, checkouts: { primary: local, worktrees: dir } }
}

/** A project: a repository of yours, wherever it happens to be, whose extra checkouts the
 *  vault holds rather than your folder. */
async function project() {
  const repo = path.join(await tempDir(), 'api')
  const remote = await repoAt(repo, 'api')
  const worktrees = path.join(await tempDir(), '.projects', 'api')
  return { repo, remote, worktrees, checkouts: { primary: repo, worktrees } }
}

const names = async (checkouts: Checkouts) =>
  (await listBranches(checkouts)).map((one) => one.name)

describe('listBranches', () => {
  it('finds the repository’s own checkout and calls it primary', async () => {
    const { checkouts } = await vault()
    const [only] = await listBranches(checkouts)
    expect(only!.name).toBe('main')
    expect(only!.primary).toBe(true)
    expect(only!.checkedOut).toBe(true)
  })

  /* A folder beside the checkouts that is not a checkout is not a branch — it is a folder. */
  it('ignores a plain directory beside the checkouts', async () => {
    const { dir, checkouts } = await vault()
    await mkdir(path.join(dir, 'notes'))
    expect(await names(checkouts)).toEqual(['main'])
  })

  it('puts the primary first, whatever the others are called', async () => {
    const { local, checkouts } = await vault()
    await git(local, 'branch', 'aaa')
    const listed = await listBranches(checkouts)
    expect(listed[0]!.name).toBe('main')
  })

  /* The point of the list: work started elsewhere shows up without being checked out —
     wearing the remote's name, so where it lives is legible beside the local rows. */
  it('offers a branch that exists only on the remote, as origin/<name>', async () => {
    const { dir, local, checkouts } = await vault()
    await git(local, 'push', 'origin', 'main')
    await git(local, 'branch', 'from-elsewhere')
    await git(local, 'push', 'origin', 'from-elsewhere')
    await git(local, 'branch', '-D', 'from-elsewhere')

    const found = (await listBranches(checkouts)).find(
      (one) => one.name === 'origin/from-elsewhere',
    )
    expect(found).toBeTruthy()
    expect(found!.checkedOut).toBe(false)
    expect(found!.remote).toBe(true)
    // Where it would go, which is what opening it will make: the local branch's folder.
    expect(found!.path).toBe(path.join(dir, 'from-elsewhere'))
  })

  /* `origin/feat` and a local `feat` are the one branch they describe, and the local
     checkout is where that work goes on — so the pair is one row, not two. */
  it('folds a remote branch into the local one that carries its name', async () => {
    const { local, checkouts } = await vault()
    await git(local, 'branch', 'shared')
    await git(local, 'push', 'origin', 'shared')

    const listed = await names(checkouts)
    expect(listed).toContain('shared')
    expect(listed).not.toContain('origin/shared')
  })

  it('lists local branches before the remotes’ own', async () => {
    const { local, checkouts } = await vault()
    await git(local, 'branch', 'zzz')
    await git(local, 'branch', 'aaa-remote-only')
    await git(local, 'push', 'origin', 'aaa-remote-only')
    await git(local, 'branch', '-D', 'aaa-remote-only')

    expect(await names(checkouts)).toEqual(['main', 'zzz', 'origin/aaa-remote-only'])
  })

  it('names a checkout with no repository after its folder', async () => {
    const dir = await tempDir()
    const local = path.join(dir, PRIMARY)
    await mkdir(local)
    const [only] = await listBranches({ primary: local, worktrees: dir })
    expect(only!.name).toBe(PRIMARY)
    expect(only!.primary).toBe(true)
  })

  /* A project's repository is the primary wherever it sits, and its worktrees are somewhere
     else entirely — which is the whole difference between the two roots. */
  it('reads a project’s repository as the primary and offers worktrees elsewhere', async () => {
    const { repo, worktrees, checkouts } = await project()
    await git(repo, 'branch', 'fix-login')

    const listed = await listBranches(checkouts)

    expect(listed[0]!.path).toBe(repo)
    expect(listed[0]!.primary).toBe(true)
    const offered = listed.find((one) => one.name === 'fix-login')
    expect(offered!.path).toBe(path.join(worktrees, 'fix-login'))
  })
})

describe('openBranch', () => {
  it('checks a branch out the first time and hands back the same one after', async () => {
    const { dir, local, checkouts } = await vault()
    await git(local, 'branch', 'existing')

    const made = await openBranch(checkouts, 'existing')
    expect(made.checkedOut).toBe(true)
    expect(made.path).toBe(path.join(dir, 'existing'))
    // It is a real checkout: the commit that is on main is on disk here too.
    expect(await stat(path.join(made.path, 'README.md'))).toBeTruthy()

    const again = await openBranch(checkouts, 'existing')
    expect(again.path).toBe(made.path)
  })

  /* Opened by the name the list offered it under, and what opening makes is the local
     branch: the prefix has done its telling, and the work continues here as `theirs`. */
  it('picks up a branch that is only on the remote', async () => {
    const { dir, local, checkouts } = await vault()
    await git(local, 'push', 'origin', 'main')
    await git(local, 'branch', 'theirs')
    await git(local, 'push', 'origin', 'theirs')
    await git(local, 'branch', '-D', 'theirs')

    const made = await openBranch(checkouts, 'origin/theirs')

    expect(made.name).toBe('theirs')
    expect(made.checkedOut).toBe(true)
    expect(made.path).toBe(path.join(dir, 'theirs'))
    expect(await stat(path.join(made.path, 'README.md'))).toBeTruthy()
    // The list now carries it as the local branch it has become.
    expect(await names(checkouts)).toContain('theirs')
  })

  /* A branch name is a path and a folder name is not, so the separators flatten. */
  it('flattens a slashed name into one folder', async () => {
    const { dir, local, checkouts } = await vault()
    await git(local, 'branch', 'feat/sync')

    const made = await openBranch(checkouts, 'feat/sync')

    expect(made.name).toBe('feat/sync')
    expect(made.path).toBe(path.join(dir, 'feat-sync'))
  })

  it('moves into the primary rather than making a second one', async () => {
    const { dir, checkouts } = await vault()
    const made = await openBranch(checkouts, 'main')
    expect(made.path).toBe(path.join(dir, PRIMARY))
    expect(await readdir(dir)).toEqual([PRIMARY])
  })

  /* The repository is yours: opening a branch of it makes a folder in the vault rather than
     moving the files under your feet. */
  it('leaves a project’s repository alone and puts the worktree in the vault', async () => {
    const { repo, worktrees, checkouts } = await project()
    await git(repo, 'branch', 'fix-login')

    const made = await openBranch(checkouts, 'fix-login')

    expect(made.path).toBe(path.join(worktrees, 'fix-login'))
    expect(await stat(path.join(made.path, 'README.md'))).toBeTruthy()
    // The repository never left the branch it was on.
    const listed = await listBranches(checkouts)
    expect(listed.find((one) => one.primary)!.name).toBe('main')
  })

  it('refuses a branch nobody has', async () => {
    const { checkouts } = await vault()
    await expect(openBranch(checkouts, 'nope')).rejects.toThrow(BranchError)
  })
})

describe('createBranch', () => {
  it('cuts a fresh branch and gives it a checkout', async () => {
    const { checkouts } = await vault()

    const made = await createBranch(checkouts, 'fix-login')

    expect(made.name).toBe('fix-login')
    expect(made.primary).toBe(false)
    expect(await stat(path.join(made.path, 'README.md'))).toBeTruthy()
    expect(await names(checkouts)).toEqual(['main', 'fix-login'])
  })

  /* A branch continues the work you are in, so it starts where that work is — not at
     whatever the repository's own checkout happens to be sitting on. */
  it('cuts off the branch it is given rather than off the primary', async () => {
    const { checkouts } = await vault()
    const first = await createBranch(checkouts, 'fix-login')
    await writeFile(path.join(first.path, 'note.md'), '# note\n')
    await git(first.path, 'add', '-A')
    await git(first.path, 'commit', '-m', 'work')

    const second = await createBranch(checkouts, 'fix-login-2', 'fix-login')

    expect(await stat(path.join(second.path, 'note.md'))).toBeTruthy()
    // The primary is where it was; nothing was checked out under anybody.
    await expect(stat(path.join(checkouts.primary, 'note.md'))).rejects.toThrow()
  })

  it('refuses a name that is already a branch', async () => {
    const { checkouts } = await vault()
    await createBranch(checkouts, 'taken')
    await expect(createBranch(checkouts, 'taken')).rejects.toThrow(BranchError)
  })

  it('refuses to be called local, which is the vault’s own clone', async () => {
    const { checkouts } = await vault()
    await expect(createBranch(checkouts, PRIMARY)).rejects.toThrow(BranchError)
  })

  it('refuses a name that would escape the worktrees folder', async () => {
    const { checkouts } = await vault()
    await expect(createBranch(checkouts, '../escape')).rejects.toThrow(BranchError)
  })
})

describe('removeBranch', () => {
  it('takes the checkout off disk and out of git, leaving the branch', async () => {
    const { local, checkouts } = await vault()
    const made = await createBranch(checkouts, 'gone')

    await removeBranch(checkouts, 'gone')

    await expect(stat(made.path)).rejects.toThrow()
    // The branch survives the checkout: it is still there to open again.
    const found = (await listBranches(checkouts)).find((one) => one.name === 'gone')
    expect(found!.checkedOut).toBe(false)
    expect(await readdir(local)).toContain('README.md')
  })

  /* The primary is the repository; every other checkout is a pointer into it. */
  it('refuses to remove the repository’s own checkout', async () => {
    const { dir, checkouts } = await vault()
    await expect(removeBranch(checkouts, 'main')).rejects.toThrow(BranchError)
    expect(await readdir(dir)).toContain(PRIMARY)
  })

  /* For a project that refusal is about your folder, not about a clone. */
  it('refuses to remove a project’s repository', async () => {
    const { repo, checkouts } = await project()
    await expect(removeBranch(checkouts, 'main')).rejects.toThrow(BranchError)
    expect(await stat(path.join(repo, 'README.md'))).toBeTruthy()
  })

  it('refuses one that is not there', async () => {
    const { checkouts } = await vault()
    await expect(removeBranch(checkouts, 'nope')).rejects.toThrow(BranchError)
  })

  it('refuses a branch that has no checkout to remove', async () => {
    const { local, checkouts } = await vault()
    await git(local, 'branch', 'untouched')
    await expect(removeBranch(checkouts, 'untouched')).rejects.toThrow(BranchError)
  })

  /* Uncommitted work is git's reason to refuse, and it is the right one. */
  it('leaves a checkout holding unsaved work where it is', async () => {
    const { checkouts } = await vault()
    const made = await createBranch(checkouts, 'busy')
    await writeFile(path.join(made.path, 'draft.md'), 'not committed')

    await expect(removeBranch(checkouts, 'busy')).rejects.toThrow(BranchError)
    expect(await stat(path.join(made.path, 'draft.md'))).toBeTruthy()
  })
})
