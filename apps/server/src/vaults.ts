import { mkdir, readdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { GitAuthor, VaultSummary } from '@mother/shared'
import { Git, classifyRemoteError } from './git'

export class VaultError extends Error {}

export interface NewVault {
  name: string
  remoteUrl: string
  branch: string
}

export function vaultHome(): string {
  return process.env.MOTHER_HOME ?? path.join(os.homedir(), '.mother')
}

/** A vault is any plain directory in the home — drop one in and it is picked up. */
export async function listVaults(home = vaultHome()): Promise<VaultSummary[]> {
  await mkdir(home, { recursive: true })
  const entries = await readdir(home, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => ({ name: entry.name, path: path.join(home, entry.name) }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function assertVaultName(name: string): void {
  if (name !== name.trim() || name.length === 0)
    throw new VaultError('vault name must not be blank or padded with spaces')
  if (name.startsWith('.'))
    throw new VaultError('vault name must not start with a dot — it would be hidden')
  if (/[/\\]/.test(name) || name.includes('\0'))
    throw new VaultError('vault name must be a plain folder name, not a path')
}

/**
 * Git is the history and the backup, so a vault is never created unlinked: the remote is
 * proven reachable first, then either cloned or initialised to push into.
 */
export async function createVault(
  { name, remoteUrl, branch }: NewVault,
  author: GitAuthor,
  home = vaultHome(),
): Promise<VaultSummary> {
  assertVaultName(name)
  await mkdir(home, { recursive: true })

  const target = path.join(home, name)
  const taken = await readdir(home).then((names) => names.includes(name))
  if (taken) throw new VaultError(`a vault named "${name}" already exists`)

  const outer = new Git(home)
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
  const git = new Git(target)
  await git.run(['init', '-b', branch])
  await git.run(['remote', 'add', 'origin', remoteUrl])
  await writeFile(
    path.join(target, 'README.md'),
    `# ${name}\n\nA mother vault. Markdown on disk, git for history.\n`,
  )
  await git.stageAll()
  const commit = await git.commit(`mother: create vault ${name}`, author)
  if (!commit.ok) throw new VaultError(commit.message)
  return { name, path: target }
}
