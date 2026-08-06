import type { DiffChange, DiffFile, DocPath } from '@/types'
import type { Git } from '../git'

/**
 * The ref a branch name stands for, spelled in full so nothing else can answer to it — a
 * file called `main` beside a branch called `main` is a question git would otherwise have
 * to guess at. A branch nobody has checked out yet is only on the remote, and that is the
 * ordinary way to meet one here, so it is looked for there too — under its bare name, or
 * already wearing the remote's, which is how the branch list offers one.
 */
export async function resolveRef(git: Git, name: string): Promise<string | null> {
  for (const ref of [
    `refs/heads/${name}`,
    `refs/remotes/origin/${name}`,
    `refs/remotes/${name}`,
  ]) {
    const result = await git.run(['rev-parse', '--verify', '--quiet', ref])
    if (result.exitCode === 0 && String(result.stdout).trim()) return ref
  }
  return null
}

/**
 * Where two branches parted: the last commit they have in common. Held against the branch
 * you are on it gives the difference a pull request shows — what this branch did, with the
 * other branch's own work since the split left out of it.
 *
 * Null when they have no commit in common at all, which is two histories that were never
 * one. There is no split to compare from, so the caller falls back to the branch itself.
 */
export async function mergeBase(
  git: Git,
  against: string,
  current: string,
): Promise<string | null> {
  const result = await git.run(['merge-base', against, current])
  const sha = String(result.stdout).trim()
  return result.exitCode === 0 && sha ? sha : null
}

const CHANGE: Record<string, DiffChange> = { A: 'added', D: 'removed' }

/**
 * `--name-status -z`: every field is NUL-terminated, the status is a field of its own, and
 * a rename is three fields rather than two — the old name, then the new one.
 */
export function parseNameStatus(stdout: string): DiffFile[] {
  const fields = stdout.split('\0').filter((one) => one.length > 0)
  const files: DiffFile[] = []

  for (let i = 0; i < fields.length; i++) {
    const letter = fields[i]![0]!
    if (letter === 'R') {
      const from = fields[++i]
      const path = fields[++i]
      if (from === undefined || path === undefined) break
      files.push({ path, change: 'renamed', from })
      continue
    }
    const path = fields[++i]
    if (path === undefined) break
    files.push({ path, change: CHANGE[letter] ?? 'modified', from: null })
  }
  return files
}

/**
 * Every path the two branches disagree about. Two dots rather than three: this is the
 * difference between the branches as they stand, not what one of them has done since they
 * parted — nothing here is about commits.
 */
export async function diffFiles(
  git: Git,
  against: string,
  current: string,
): Promise<DiffFile[]> {
  const result = await git.run([
    'diff',
    '--name-status',
    '--find-renames',
    '-z',
    against,
    current,
  ])
  if (result.exitCode !== 0) return []
  return parseNameStatus(String(result.stdout))
}

/** A file as one branch has it, or null when that branch does not have it — which is what
 *  an added file is on one side and a removed one is on the other. */
export async function readBlob(
  git: Git,
  ref: string,
  path: DocPath,
): Promise<string | null> {
  const result = await git.run(['show', `${ref}:${path}`])
  return result.exitCode === 0 ? String(result.stdout) : null
}
