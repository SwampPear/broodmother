import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import type { Branch } from '@/types'
import { Git } from '../git'
import { nameProblem } from '../fs'

export class BranchError extends Error {}

/**
 * Where a repository's checkouts are. A vault keeps its own beside the clone; a project's
 * repository is somewhere you chose, so the checkouts broodmother makes for it go into the
 * vault rather than into your folder. Everything below is the same work either way.
 */
export interface Checkouts {
  /** The repository itself. It cannot be removed, and it is never moved onto another
   *  branch — opening one makes a folder rather than checking out under your feet. */
  primary: string
  /** Where a branch with no folder gets one. */
  worktrees: string
}

/** `feat/sync` cannot be a folder beside `feat`, so the separators flatten instead. */
export const folderFor = (name: string) => name.replaceAll('/', '-')

/** Where a branch's checkout is, or would go. */
export const worktreePath = (checkouts: Checkouts, name: string) =>
  path.join(checkouts.worktrees, folderFor(name))

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

async function branchOf(target: string): Promise<string | null> {
  const result = await new Git(target).run(['rev-parse', '--abbrev-ref', 'HEAD'])
  if (result.exitCode !== 0) return null
  const branch = String(result.stdout).trim()
  return branch && branch !== 'HEAD' ? branch : null
}

interface Checkout {
  folder: string
  path: string
  branch: string | null
  primary: boolean
}

/**
 * The folders on disk. The primary is listed whether or not it is a checkout: a repository
 * that is only a folder of files still has the one place you work in. Everything in the
 * worktrees folder has to be a real checkout, because that is the only thing broodmother
 * puts there.
 */
async function listCheckouts(checkouts: Checkouts): Promise<Checkout[]> {
  const primary = checkouts.primary
  const found: Checkout[] = [
    {
      folder: path.basename(primary),
      path: primary,
      // Only asked of a real checkout: a plain folder inside somebody's git-backed home
      // would otherwise report that repository's branch as its own.
      branch: (await isCheckout(primary)) ? await branchOf(primary) : null,
      primary: true,
    },
  ]

  const entries = await readdir(checkouts.worktrees, { withFileTypes: true }).catch(
    () => [],
  )
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    const target = path.join(checkouts.worktrees, entry.name)
    // A vault's worktrees sit beside its clone, so the folder holding them holds the
    // primary too — and it has already been listed.
    if (target === primary) continue
    if (!(await isCheckout(target))) continue
    found.push({
      folder: entry.name,
      path: target,
      branch: await branchOf(target),
      primary: false,
    })
  }
  return found
}

/** The branch under a remote's display name: `origin/feat` is `feat`, brought here. */
const localOf = (name: string) => name.slice(name.indexOf('/') + 1)

/**
 * Every branch the repository knows: the local ones by name, and the remotes' wearing the
 * remote's name — `origin/feat` — so where a branch lives is legible in the list. A remote
 * branch whose name a local one already carries is subsumed by it: they are the one branch
 * they describe, and the local checkout is where that work goes on.
 */
async function knownBranches(
  primary: string,
): Promise<{ name: string; remote: boolean }[]> {
  const result = await new Git(primary).run([
    'for-each-ref',
    '--format=%(refname)',
    'refs/heads',
    'refs/remotes',
  ])
  if (result.exitCode !== 0) return []

  const locals = new Set<string>()
  const remotes = new Set<string>()
  for (const line of String(result.stdout).split('\n')) {
    const ref = line.trim()
    if (ref.startsWith('refs/heads/')) {
      locals.add(ref.slice('refs/heads/'.length))
      continue
    }
    if (!ref.startsWith('refs/remotes/')) continue
    // `refs/remotes/<remote>/<branch>`, kept whole: the remote's name is the telling half.
    const rest = ref.slice('refs/remotes/'.length)
    const cut = rest.indexOf('/')
    const name = cut === -1 ? '' : rest.slice(cut + 1)
    // `origin/HEAD` points at the default branch rather than being a branch of its own.
    if (name && name !== 'HEAD') remotes.add(rest)
  }
  return [
    ...[...locals].map((name) => ({ name, remote: false })),
    ...[...remotes]
      .filter((name) => !locals.has(localOf(name)))
      .map((name) => ({ name, remote: true })),
  ]
}

/**
 * Every branch, checked out or not. The ones with a folder report where it is; the rest
 * report where one would go, which is what opening them will make. The branch a checkout is
 * on comes from git rather than from the folder name, because a checkout can be moved onto
 * another branch from a terminal and the folder would not know.
 */
export async function listBranches(checkouts: Checkouts): Promise<Branch[]> {
  const found = new Map<string, Branch>()

  for (const { name, remote } of await knownBranches(checkouts.primary)) {
    found.set(name, {
      name,
      // Opening a remote branch makes the local one's checkout, so that is the folder
      // a remote entry points at — where it would go, not somewhere of its own.
      path: worktreePath(checkouts, remote ? localOf(name) : name),
      checkedOut: false,
      primary: false,
      ...(remote ? { remote } : {}),
    })
  }

  // Second, so a branch that has a folder overwrites the offer of one.
  for (const checkout of await listCheckouts(checkouts)) {
    // A checkout with no branch is a folder with no repository behind it: it is named for
    // itself, because there is no branch to name it after.
    const name = checkout.branch ?? checkout.folder
    found.set(name, {
      name,
      path: checkout.path,
      checkedOut: true,
      primary: checkout.primary,
    })
  }

  // The repository's own checkout first, the local branches by name, and the remotes'
  // after them: the one you always have should not move around in the list as others
  // come and go, and a branch you can only fetch reads below the ones already here.
  return [...found.values()].sort((a, b) => {
    if (a.primary !== b.primary) return a.primary ? -1 : 1
    if ((a.remote ?? false) !== (b.remote ?? false)) return a.remote ? 1 : -1
    return a.name.localeCompare(b.name)
  })
}

export async function findBranch(
  checkouts: Checkouts,
  name: string,
): Promise<Branch | null> {
  const branches = await listBranches(checkouts)
  return branches.find((one) => one.name === name) ?? null
}

function assertBranchName(checkouts: Checkouts, name: string): void {
  const problem = nameProblem(folderFor(name))
  if (problem) throw new BranchError(`branch name ${problem}`)
  if (worktreePath(checkouts, name) === checkouts.primary)
    throw new BranchError(`"${folderFor(name)}" is the repository's own checkout`)
}

/** Where the repository is, which is where every branch command has to run from. */
async function primaryOf(checkouts: Checkouts): Promise<string> {
  if (!(await isCheckout(checkouts.primary)))
    throw new BranchError(
      `${path.basename(checkouts.primary)} is not a checkout, so it has no branches`,
    )
  return checkouts.primary
}

/**
 * `git worktree add`. A worktree is a second working copy of one repository, so the branch
 * it gets is a branch of that repository and not a copy of it.
 */
async function add(
  checkouts: Checkouts,
  name: string,
  args: (target: string) => string[],
  sshKeyPath: string | null,
): Promise<Branch> {
  assertBranchName(checkouts, name)
  const primary = await primaryOf(checkouts)
  const target = worktreePath(checkouts, name)
  if (await isDir(target)) throw new BranchError(`"${folderFor(name)}" already exists`)
  await mkdir(checkouts.worktrees, { recursive: true })

  const result = await new Git(primary, sshKeyPath).run(args(target), 60_000)
  if (result.exitCode !== 0)
    throw new BranchError(
      String(result.stderr).trim().split('\n')[0] || 'git worktree add failed',
    )
  return { name, path: target, checkedOut: true, primary: false }
}

/**
 * Cut off the branch you are on, which is the work the new one continues. Without one —
 * a checkout sitting on no branch at all — it comes off the primary's HEAD instead.
 *
 * A branch is only a starting point here, so git is content for it to be checked out
 * somewhere else; that is only refused when two checkouts would sit on the same branch.
 */
export async function createBranch(
  checkouts: Checkouts,
  name: string,
  from: string | null = null,
  sshKeyPath: string | null = null,
): Promise<Branch> {
  if (await findBranch(checkouts, name)) throw new BranchError(`"${name}" already exists`)
  return add(
    checkouts,
    name,
    (target) => ['worktree', 'add', '-b', name, target, ...(from ? [from] : [])],
    sshKeyPath,
  )
}

/**
 * The branch you asked for, in a folder you can work in. One that already has a checkout is
 * simply handed back — opening is moving into it — and one that does not gets it made here,
 * which is what makes picking a branch off the remote the whole gesture rather than a setup
 * step before it.
 */
export async function openBranch(
  checkouts: Checkouts,
  name: string,
  sshKeyPath: string | null = null,
): Promise<Branch> {
  const found = await findBranch(checkouts, name)
  if (!found) throw new BranchError(`no branch named "${name}"`)
  if (found.checkedOut) return found

  // `origin/feat` opens as the local `feat`: picking a branch off the remote makes the
  // branch here, tracking it — git's own gesture — and the prefix has done its telling.
  const remote = found.remote ? name.slice(0, name.indexOf('/')) : 'origin'
  const local = found.remote ? localOf(name) : name
  const primary = await primaryOf(checkouts)
  // Only on the remote so far is the normal way to pick work up, so it is fetched before
  // git is asked to check it out. Already here, this changes nothing and costs a round trip.
  await new Git(primary, sshKeyPath).run(['fetch', remote, local], 30_000)
  return add(checkouts, local, (target) => ['worktree', 'add', target, local], sshKeyPath)
}

/**
 * The folder and git's record of it. The branch itself is untouched: it stays in the
 * repository and can be opened again. The primary is refused rather than removed — for a
 * vault it is the clone every other checkout points into, and for a project it is your
 * repository, which broodmother did not make and does not take away.
 */
export async function removeBranch(checkouts: Checkouts, name: string): Promise<void> {
  const found = await findBranch(checkouts, name)
  if (!found) throw new BranchError(`no branch named "${name}"`)
  if (found.primary) throw new BranchError(`"${name}" is the repository's own checkout`)
  if (!found.checkedOut) throw new BranchError(`"${name}" has no checkout to remove`)

  const result = await new Git(checkouts.primary).run(['worktree', 'remove', found.path])
  if (result.exitCode !== 0) {
    // Uncommitted work is the usual reason git refuses, and it is right to. The folder is
    // left where it is and the reason is passed on.
    throw new BranchError(
      String(result.stderr).trim().split('\n')[0] || 'git worktree remove failed',
    )
  }
  // git leaves the directory behind when it was already empty of tracked files.
  await rm(found.path, { recursive: true, force: true })
}
