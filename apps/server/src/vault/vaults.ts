import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Profile, VaultSummary } from '@broodmother/shared'
import { Git, classifyRemoteError } from '../git/git'
import { PROFILES_DIR } from '../profiles'
import { nameProblem } from './paths'

export class VaultError extends Error {}

export interface NewVault {
  name: string
  remoteUrl: string
  branch: string
}

/** Which profile a vault commits as, keyed by the vault's absolute path. */
export type ProfileBindings = Record<string, string>

/**
 * A vault is any plain directory in the broodmother home — drop one in and it is picked up.
 * The profiles folder is the one exception: it holds files, not vaults.
 */
export async function listVaults(
  home: string,
  profiles: ProfileBindings = {},
): Promise<VaultSummary[]> {
  await mkdir(home, { recursive: true })
  const entries = await readdir(home, { withFileTypes: true })
  return entries
    .filter(
      (entry) =>
        entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== PROFILES_DIR,
    )
    .map((entry) => {
      const target = path.join(home, entry.name)
      return { name: entry.name, path: target, profile: profiles[target] ?? null }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function findVault(
  name: string,
  home: string,
  profiles: ProfileBindings = {},
): Promise<VaultSummary | null> {
  const vaults = await listVaults(home, profiles)
  return vaults.find((vault) => vault.name === name) ?? null
}

export function assertVaultName(name: string): void {
  const problem = nameProblem(name)
  if (problem) throw new VaultError(`vault name ${problem}`)
  if (name === PROFILES_DIR)
    throw new VaultError(`"${PROFILES_DIR}" holds the profiles, so it cannot be a vault`)
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
    return { name, path: target, profile: profile.name }
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
  return { name, path: target, profile: profile.name }
}

/**
 * The folder and everything in it. The path comes from the listing rather than from the
 * name, so what is removed is always a folder in the home and never whatever a `../` in the
 * name would have reached.
 */
export async function deleteVault(name: string, home: string): Promise<void> {
  const vault = await findVault(name, home)
  if (!vault) throw new VaultError(`no vault named "${name}"`)
  await rm(vault.path, { recursive: true, force: true })
}
