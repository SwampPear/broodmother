import { mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Profile, VaultSummary } from '@broodmother/shared'
import { Git, classifyRemoteError } from '../git/git'
import { nameProblem } from './paths'

export class VaultError extends Error {}

export interface NewVault {
  name: string
  remoteUrl: string
  branch: string
}

/** A vault is any plain directory in a project — drop one in and it is picked up. */
export async function listVaults(home: string): Promise<VaultSummary[]> {
  await mkdir(home, { recursive: true })
  const entries = await readdir(home, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => ({ name: entry.name, path: path.join(home, entry.name) }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function assertVaultName(name: string): void {
  const problem = nameProblem(name)
  if (problem) throw new VaultError(`vault name ${problem}`)
}

/**
 * Git is the history and the backup, so a vault is never created unlinked: the remote is
 * proven reachable first, then either cloned or initialised to push into.
 */
export async function createVault(
  { name, remoteUrl, branch }: NewVault,
  profile: Profile,
  home: string,
): Promise<VaultSummary> {
  assertVaultName(name)
  await mkdir(home, { recursive: true })

  const target = path.join(home, name)
  const taken = await readdir(home).then((names) => names.includes(name))
  if (taken) throw new VaultError(`a vault named "${name}" already exists`)

  const outer = new Git(home, profile.sshKeyPath)
  const probe = await outer.run(['ls-remote', '--heads', remoteUrl, branch], 15_000)
  if (probe.exitCode !== 0) {
    const message = `${probe.stdout}\n${probe.stderr}`
    throw new VaultError(
      `${classifyRemoteError(message)}: ${String(probe.stderr).trim() || 'remote unreachable'}`,
    )
  }

  if (String(probe.stdout).trim()) {
    const clone = await outer.run(['clone', '--branch', branch, remoteUrl, name])
    if (clone.exitCode !== 0)
      throw new VaultError(String(clone.stderr).trim() || 'git clone failed')
    return { name, path: target }
  }

  // Remote is reachable but the branch has no commits yet — start it here and let the
  // first sync push it.
  await mkdir(target)
  const git = new Git(target, profile.sshKeyPath)
  await git.run(['init', '-b', branch])
  await git.run(['remote', 'add', 'origin', remoteUrl])
  await writeFile(
    path.join(target, 'README.md'),
    `# ${name}\n\nA broodmother vault. Markdown on disk, git for history.\n`,
  )
  await git.stageAll()
  const commit = await git.commit(`broodmother: create vault ${name}`, profile.gitAuthor)
  if (!commit.ok) throw new VaultError(commit.message)
  return { name, path: target }
}
