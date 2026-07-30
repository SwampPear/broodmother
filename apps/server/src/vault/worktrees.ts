import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import type { Worktree } from '@broodmother/shared'
import { Git } from '../git/git'
import { nameProblem } from './paths'

export class WorktreeError extends Error {}

/**
 * The checkout a vault starts with. It is the clone itself — the one that owns `.git` and
 * sits on the default branch — and it is the only one that cannot be removed, because
 * removing it is removing the repository.
 */
export const PRIMARY = 'local'

export const worktreePath = (vault: string, name: string) => path.join(vault, name)

const isDir = (target: string) =>
  stat(target).then(
    (info) => info.isDirectory(),
    () => false,
  )

/** A checkout has a `.git`: a directory in the clone, a file in every worktree beside it. */
async function isCheckout(target: string): Promise<boolean> {
  return stat(path.join(target, '.git')).then(
    () => true,
    () => false,
  )
}

export function assertWorktreeName(name: string): void {
  const problem = nameProblem(name)
  if (problem) throw new WorktreeError(`worktree name ${problem}`)
  if (name === PRIMARY)
    throw new WorktreeError(`"${PRIMARY}" is the vault's own checkout`)
}

/**
 * Every checkout in the vault folder. The branch comes from the checkout rather than from
 * the name, because a worktree can be moved onto another branch from a terminal and the
 * folder name would not know.
 *
 * `local` is listed whether or not it is a checkout: a vault with no repository still has
 * the one folder you work in, and it is the same folder either way. Everything beside it has
 * to be a real checkout, because that is the only thing a second folder here can be.
 */
export async function listWorktrees(vault: string): Promise<Worktree[]> {
  await mkdir(vault, { recursive: true })
  const entries = await readdir(vault, { withFileTypes: true })
  const found: Worktree[] = []

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const target = path.join(vault, entry.name)
    const primary = entry.name === PRIMARY
    const checkout = await isCheckout(target)
    if (!checkout && !primary) continue
    found.push({
      name: entry.name,
      path: target,
      // Only asked of a real checkout: a plain folder inside somebody's git-backed home
      // would otherwise report that repository's branch as its own.
      branch: checkout ? await branchOf(target) : null,
      primary,
    })
  }

  // The vault's own checkout first, then the rest by name: the one you always have should
  // not move around in the list as others come and go.
  return found.sort((a, b) =>
    a.primary === b.primary ? a.name.localeCompare(b.name) : a.primary ? -1 : 1,
  )
}

export async function branchOf(target: string): Promise<string | null> {
  const result = await new Git(target).run(['rev-parse', '--abbrev-ref', 'HEAD'])
  if (result.exitCode !== 0) return null
  const branch = String(result.stdout).trim()
  return branch && branch !== 'HEAD' ? branch : null
}

export async function findWorktree(
  vault: string,
  name: string,
): Promise<Worktree | null> {
  const worktrees = await listWorktrees(vault)
  return worktrees.find((one) => one.name === name) ?? null
}

export interface NewWorktree {
  name: string
  branch: string
  /** True to cut the branch fresh off the primary's HEAD, false to check out one that is. */
  create: boolean
}

/**
 * `git worktree add`, run from the vault's own checkout because that is where the
 * repository is. A worktree is a second working copy of one repository, so the branch it
 * gets is a branch of that repository and not a copy of it.
 */
export async function createWorktree(
  vault: string,
  { name, branch, create }: NewWorktree,
  sshKeyPath: string | null = null,
): Promise<Worktree> {
  assertWorktreeName(name)
  const primary = worktreePath(vault, PRIMARY)
  if (!(await isCheckout(primary)))
    throw new WorktreeError(`${PRIMARY} is not a checkout, so it has no worktrees to add`)

  const target = worktreePath(vault, name)
  if (await isDir(target)) throw new WorktreeError(`"${name}" already exists`)

  const git = new Git(primary, sshKeyPath)
  // A branch that exists on the remote but not here is the normal way to pick work up, so
  // the remote is consulted before the branch is called missing.
  if (!create) await git.run(['fetch', 'origin', branch], 30_000)

  const args = create
    ? ['worktree', 'add', '-b', branch, target]
    : ['worktree', 'add', target, branch]
  const result = await git.run(args, 60_000)
  if (result.exitCode !== 0)
    throw new WorktreeError(
      String(result.stderr).trim().split('\n')[0] || 'git worktree add failed',
    )

  return { name, path: target, branch, primary: false }
}

/**
 * The folder and git's record of it. The primary is refused rather than removed: it is the
 * clone, and every other worktree is a pointer into it.
 */
export async function removeWorktree(vault: string, name: string): Promise<void> {
  const worktree = await findWorktree(vault, name)
  if (!worktree) throw new WorktreeError(`no worktree named "${name}"`)
  if (worktree.primary)
    throw new WorktreeError(`"${PRIMARY}" is the vault's own checkout`)

  const git = new Git(worktreePath(vault, PRIMARY))
  const result = await git.run(['worktree', 'remove', worktree.path])
  if (result.exitCode !== 0) {
    // Uncommitted work is the usual reason git refuses, and it is right to. The folder is
    // left where it is and the reason is passed on.
    throw new WorktreeError(
      String(result.stderr).trim().split('\n')[0] || 'git worktree remove failed',
    )
  }
  // git leaves the directory behind when it was already empty of tracked files.
  await rm(worktree.path, { recursive: true, force: true })
}
