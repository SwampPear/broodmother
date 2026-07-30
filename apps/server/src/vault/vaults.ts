import { mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { Profile, VaultSummary } from '@broodmother/shared'
import { Git, classifyRemoteError } from '../git/git'
import { PROFILES_DIR } from '../profiles'
import { nameProblem } from './paths'
import { PRIMARY, worktreePath } from './worktrees'

export class VaultError extends Error {}

/**
 * How much git a new vault gets. `none` is a folder of markdown and nothing else — no
 * repository, no history, no sync. `local` is a repository with no remote: history and
 * worktrees, kept on this machine. `remote` is one that syncs.
 */
export type VaultGit = 'none' | 'local' | 'remote'

export interface NewVault {
  name: string
  git: VaultGit
  /** Required for `remote`, ignored otherwise. */
  remoteUrl?: string | null
  /** The branch to clone or to start on. Ignored for `none`. */
  branch?: string | null
}

const DEFAULT_BRANCH = 'main'

const readme = (name: string, git: VaultGit) =>
  `# ${name}\n\nA broodmother vault. Markdown on disk${
    git === 'none' ? '' : ', git for history'
  }.\n`

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
 * A vault is a folder of checkouts and `local` is the one it starts with, so that is what
 * gets made — whether it is a clone, a fresh repository or a plain directory. Git is
 * optional: a vault with none is still a vault, and the only thing it lacks is history.
 *
 * A remote is proven reachable before anything is written, because a vault that was asked to
 * sync and cannot is worse than one that was never asked.
 */
export async function createVault(
  { name, git: kind, remoteUrl, branch }: NewVault,
  profile: Profile,
  home: string,
): Promise<VaultSummary> {
  assertVaultName(name)
  if (kind === 'remote' && !remoteUrl?.trim())
    throw new VaultError('a vault that syncs needs a remote')
  await mkdir(home, { recursive: true })

  const target = path.join(home, name)
  const taken = await readdir(home).then((names) => names.includes(name))
  if (taken) throw new VaultError(`a vault named "${name}" already exists`)

  const local = worktreePath(target, PRIMARY)
  const head = branch?.trim() || DEFAULT_BRANCH
  const created: VaultSummary = { name, path: target, profile: profile.name }

  if (kind === 'none') {
    await mkdir(local, { recursive: true })
    await writeFile(path.join(local, 'README.md'), readme(name, kind))
    return created
  }

  if (kind === 'remote') {
    const url = remoteUrl!.trim()
    const outer = new Git(home, profile.sshKeyPath)
    const probe = await outer.run(['ls-remote', '--heads', url, head], 15_000)
    if (probe.exitCode !== 0) {
      const message = `${probe.stdout}\n${probe.stderr}`
      throw new VaultError(
        `${classifyRemoteError(message)}: ${String(probe.stderr).trim() || 'remote unreachable'}`,
      )
    }

    if (String(probe.stdout).trim()) {
      // Cloned into the vault's `local`, so the checkouts added later are its peers.
      const clone = await outer.run([
        'clone',
        '--branch',
        head,
        url,
        path.join(name, PRIMARY),
      ])
      if (clone.exitCode !== 0) {
        await rm(target, { recursive: true, force: true })
        throw new VaultError(String(clone.stderr).trim() || 'git clone failed')
      }
      return created
    }
  }

  // Either a repository of its own, or a reachable remote whose branch has no commits yet —
  // both start here, and the second gets pushed by the first sync.
  await mkdir(local, { recursive: true })
  const git = new Git(local, profile.sshKeyPath)
  await git.run(['init', '-b', head])
  if (kind === 'remote') await git.run(['remote', 'add', 'origin', remoteUrl!.trim()])
  await writeFile(path.join(local, 'README.md'), readme(name, kind))
  await git.stageAll()
  const commit = await git.commit(`broodmother: create vault ${name}`, profile.gitAuthor)
  if (!commit.ok) throw new VaultError(commit.message)
  return created
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
