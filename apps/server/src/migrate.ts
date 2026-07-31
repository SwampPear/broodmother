import {
  cp,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import type { BroodmotherConfig } from '@broodmother/shared'
import type { LoadedConfig } from './config'
import { Git } from './git'
import { PROFILE_FILE, listProfiles } from './profiles'
import { PROJECTS_DIR, projectCheckouts } from './project'
import { PRIMARY, listVaults, vaultCheckouts } from './vault'

const STAGING = '.migrating'
const LEGACY_PROFILES = 'profiles'
const LEGACY_REGISTRY = 'projects.json'
/** The profile that takes in vaults from a home that never had one. */
const FALLBACK = 'default'

/**
 * The layout before the home was a shelf of profiles: profiles were files in `profiles/`,
 * vaults were folders beside it, and a project was a repository anywhere on the disk that a
 * registry in the vault pointed at.
 *
 * Everything moves rather than being copied — a git repository is portable, and moving a
 * whole directory keeps it one — and every checkout is repaired afterwards, because a
 * worktree remembers where its repository was in absolute paths. Nothing is deleted except
 * the registry the projects have replaced, and a home already in the new shape is left
 * exactly as it is.
 */
export async function migrate(
  home: string,
  loaded: LoadedConfig,
): Promise<{ config: BroodmotherConfig; moved: string[] }> {
  const staged = await stageVaults(home)
  await adoptProfiles(home)
  if (staged.length && !(await listProfiles(home)).length)
    await writeProfile(home, FALLBACK)

  const profiles = (await listProfiles(home)).map((profile) => profile.name)
  // A vault nobody bound goes to the first profile there is — one of them made it, and the
  // machine has forgotten which.
  const owner = (vault: string) =>
    pick(loaded.bindings[path.join(home, vault)], profiles) ?? profiles[0] ?? FALLBACK

  const moved: string[] = []
  const paths = new Map<string, string>()
  for (const name of staged) {
    const to = await land(path.join(home, STAGING, name), path.join(home, owner(name)))
    paths.set(path.join(home, name), to)
    moved.push(to)
  }
  await rm(path.join(home, STAGING), { recursive: true, force: true })

  for (const profile of profiles)
    for (const vault of await listVaults(path.join(home, profile))) {
      await liftCheckout(vault.path)
      await adoptProjects(vault.path)
      await repair(vaultCheckouts(vault.path))
    }
  await rmIfEmpty(path.join(home, PROJECTS_DIR))

  return { config: rewrite(loaded.config, paths, profiles), moved }
}

/** Every folder in the home that is not a profile is a vault from the old layout. Staged
 *  out of the way first, so a profile can take the name a vault had. */
async function stageVaults(home: string): Promise<string[]> {
  const entries = await readdir(home, { withFileTypes: true }).catch(() => [])
  const legacy: string[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue
    if (entry.name === LEGACY_PROFILES) continue
    if (await exists(path.join(home, entry.name, PROFILE_FILE))) continue
    legacy.push(entry.name)
  }
  if (!legacy.length) return []

  const staging = path.join(home, STAGING)
  await mkdir(staging, { recursive: true })
  for (const name of legacy) await rename(path.join(home, name), path.join(staging, name))
  return legacy
}

/** `profiles/ada.json` and the key beside it become the folder `ada/` holds. */
async function adoptProfiles(home: string): Promise<void> {
  const dir = path.join(home, LEGACY_PROFILES)
  const entries = await readdir(dir).catch(() => [])
  for (const entry of entries) {
    if (!entry.endsWith('.json') || entry.startsWith('.')) continue
    const name = entry.slice(0, -'.json'.length)
    const target = path.join(home, name)
    await mkdir(target, { recursive: true })
    await rename(path.join(dir, entry), path.join(target, PROFILE_FILE))
    for (const suffix of ['.key', '.key.pub'])
      await rename(
        path.join(dir, `${name}${suffix}`),
        path.join(target, `profile${suffix}`),
      ).catch(() => {})
    await repointKey(path.join(target, PROFILE_FILE), path.join(dir, `${name}.key`))
  }
  await rm(dir, { recursive: true }).catch(() => {})
}

/** The key moved with the profile, and the profile names it by absolute path. */
async function repointKey(file: string, was: string): Promise<void> {
  const raw = await readFile(file, 'utf8')
    .then(JSON.parse)
    .catch(() => null)
  if (!raw || typeof raw !== 'object' || raw.sshKeyPath !== was) return
  const next = { ...raw, sshKeyPath: file.replace(/\.json$/, '.key') }
  await writeFile(file, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
}

async function writeProfile(home: string, name: string): Promise<void> {
  await mkdir(path.join(home, name), { recursive: true })
  await writeFile(path.join(home, name, PROFILE_FILE), '{}\n', { mode: 0o600 })
}

/** The staged vault, into the profile that owns it. A name already taken there is only ever
 *  a migration that stopped halfway, and neither folder is worth losing to the other. */
async function land(from: string, profile: string): Promise<string> {
  await mkdir(profile, { recursive: true })
  const name = path.basename(from)
  let target = path.join(profile, name)
  for (let n = 2; await exists(target); n++) target = path.join(profile, `${name}-${n}`)
  await rename(from, target)
  return target
}

/**
 * The layout before a vault held checkouts: the vault folder was the checkout itself. It
 * becomes `local/`, so the branches added later are its peers rather than folders buried
 * inside it. A vault already holding one is left exactly as it is.
 */
async function liftCheckout(vault: string): Promise<void> {
  const local = path.join(vault, PRIMARY)
  if (await exists(local)) return
  const entries = await readdir(vault).catch(() => [])
  if (!entries.length) return

  // Staged inside the vault so every move stays on one device, then renamed into place.
  const staging = path.join(vault, STAGING)
  await rm(staging, { recursive: true, force: true })
  await mkdir(staging, { recursive: true })
  for (const entry of entries) {
    // The projects sit beside the checkouts rather than in one, which is what keeps the
    // sync loop from ever seeing them.
    if (entry === STAGING || entry === PROJECTS_DIR) continue
    await rename(path.join(vault, entry), path.join(staging, entry))
  }
  await rename(staging, local)
}

/** Every repository the registry pointed at, moved into the vault as the project's own
 *  `local`. A repository that is no longer there is an entry with nothing behind it. */
async function adoptProjects(vault: string): Promise<void> {
  const file = path.join(vault, PROJECTS_DIR, LEGACY_REGISTRY)
  const raw = await readFile(file, 'utf8')
    .then(JSON.parse)
    .catch(() => null)
  if (!raw || typeof raw !== 'object') return

  for (const [name, repo] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof repo !== 'string' || !repo) continue
    const checkouts = projectCheckouts(vault, name)
    if (repo === checkouts.primary || !(await exists(repo))) continue
    await mkdir(checkouts.worktrees, { recursive: true })
    await move(repo, checkouts.primary)
    await repair(checkouts)
  }
  await rm(file, { force: true })
}

/** A rename across devices is not a rename, and a repository on another volume is an
 *  ordinary place to have kept one. */
async function move(from: string, to: string): Promise<void> {
  try {
    await rename(from, to)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EXDEV') throw error
    await cp(from, to, {
      recursive: true,
      preserveTimestamps: true,
      verbatimSymlinks: true,
    })
    await rm(from, { recursive: true, force: true })
  }
}

/** A worktree records where its repository is, and its repository records where it is —
 *  both in absolute paths that the move just invalidated. */
async function repair(checkouts: { primary: string; worktrees: string }): Promise<void> {
  if (!(await exists(path.join(checkouts.primary, '.git')))) return
  const entries = await readdir(checkouts.worktrees, { withFileTypes: true }).catch(
    () => [],
  )
  const trees = entries
    .filter(
      (entry) =>
        entry.isDirectory() && entry.name !== PRIMARY && !entry.name.startsWith('.'),
    )
    .map((entry) => path.join(checkouts.worktrees, entry.name))
  await new Git(checkouts.primary).run(['worktree', 'repair', ...trees])
}

/** Everything this machine filed under a vault path, moved onto the path it now has. */
function rewrite(
  config: BroodmotherConfig,
  paths: Map<string, string>,
  profiles: string[],
): BroodmotherConfig {
  const at = (vault: string) => paths.get(vault) ?? vault
  const rekey = <T>(record: Record<string, T>): Record<string, T> =>
    Object.fromEntries(Object.entries(record).map(([key, value]) => [at(key), value]))

  const vaultPath = config.vaultPath ? at(config.vaultPath) : null
  return {
    ...config,
    vaultPath,
    profile:
      pick(vaultPath ? path.basename(path.dirname(vaultPath)) : null, profiles) ??
      config.profile ??
      profiles[0] ??
      null,
    git: rekey(config.git),
    checkouts: rekey(config.checkouts),
    project: rekey(config.project),
    projectBranch: Object.fromEntries(
      Object.entries(config.projectBranch).map(([key, value]) => {
        const cut = key.lastIndexOf('#')
        return cut < 0
          ? [key, value]
          : [`${at(key.slice(0, cut))}${key.slice(cut)}`, value]
      }),
    ),
  }
}

const pick = (name: string | null | undefined, names: string[]) =>
  name && names.includes(name) ? name : null

/** The home's old project folder, once every repository in it has been moved into a vault.
 *  Anything left is something broodmother did not put there. */
async function rmIfEmpty(dir: string): Promise<void> {
  const entries = await readdir(dir).catch(() => ['keep'])
  if (!entries.length) await rm(dir, { recursive: true, force: true })
}

const exists = (target: string) =>
  stat(target).then(
    () => true,
    () => false,
  )
