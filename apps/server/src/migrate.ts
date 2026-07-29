import { mkdir, readFile, readdir, rename, rm, rmdir, unlink } from 'node:fs/promises'
import path from 'node:path'
import type { BroodmotherConfig } from '@broodmother/shared'
import { PROFILES_DIR } from './profiles'

/**
 * The layout before a vault was the only unit: `~/.broodmother/<project>/<vault>`, where the
 * project folder held a `project.json` naming the profile its vaults committed as. Vaults
 * move up into the home and the profile each was working as follows it into the config, so a
 * machine that opened the old app opens the new one on the same vaults.
 *
 * Nothing is deleted but the `project.json` itself and the folder that held it, and the
 * folder only when it is empty — a project someone put loose files in keeps them, and keeps
 * the folder they are in.
 */
const SETTINGS_FILE = 'project.json'
const STAGING = '.migrating'

/** Move-out and move-in are separate passes because a project whose vault has the project's
 *  own name — the common case, one vault per project — needs its folder gone before the
 *  vault can take the name. Staging is inside the home, so every move stays on one device. */
export async function migrateProjects(
  home: string,
  config: BroodmotherConfig,
): Promise<{ config: BroodmotherConfig; moved: string[] }> {
  const projects = await listProjectFolders(home)
  if (projects.length === 0) return { config, moved: [] }

  const staging = path.join(home, STAGING)
  await rm(staging, { recursive: true, force: true })
  await mkdir(staging, { recursive: true })

  const taken = new Set(
    (await readdir(home, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => entry.name),
  )
  for (const project of projects) taken.delete(project.name)

  const staged: { name: string; from: string; profile: string | null }[] = []
  for (const project of projects) {
    const vaults = (await readdir(project.path, { withFileTypes: true })).filter(
      (entry) => entry.isDirectory() && !entry.name.startsWith('.'),
    )
    for (const vault of vaults) {
      const name = free(vault.name, project.name, taken)
      taken.add(name)
      const from = path.join(project.path, vault.name)
      await rename(from, path.join(staging, name))
      staged.push({ name, from, profile: project.profile })
    }
  }

  for (const project of projects) {
    await unlink(path.join(project.path, SETTINGS_FILE)).catch(() => {})
    // Fails, and is meant to, when the folder still holds something the user put there.
    await rmdir(project.path).catch(() => {})
  }

  const profiles = { ...config.profiles }
  const moved: string[] = []
  let vaultPath = config.vaultPath
  for (const entry of staged) {
    const target = path.join(home, entry.name)
    await rename(path.join(staging, entry.name), target)
    if (entry.profile) profiles[target] = entry.profile
    if (vaultPath === entry.from || vaultPath?.startsWith(entry.from + path.sep))
      vaultPath = target + vaultPath.slice(entry.from.length)
    moved.push(target)
  }
  await rmdir(staging).catch(() => {})

  return { config: { ...config, vaultPath, profiles }, moved }
}

/** The vault's own name, then the project's name in front of it, then a counter. */
function free(vault: string, project: string, taken: Set<string>): string {
  if (!taken.has(vault)) return vault
  const prefixed = `${project}-${vault}`
  if (!taken.has(prefixed)) return prefixed
  for (let n = 2; ; n++) if (!taken.has(`${prefixed}-${n}`)) return `${prefixed}-${n}`
}

interface ProjectFolder {
  name: string
  path: string
  profile: string | null
}

/** A folder in the home holding a `project.json` is old-layout and nothing else is: a plain
 *  folder is already a vault, and the profiles folder was never either. */
async function listProjectFolders(home: string): Promise<ProjectFolder[]> {
  const entries = await readdir(home, { withFileTypes: true }).catch(() => [])
  const found: ProjectFolder[] = []
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === PROFILES_DIR)
      continue
    const dir = path.join(home, entry.name)
    const raw = await readFile(path.join(dir, SETTINGS_FILE), 'utf8')
      .then(JSON.parse)
      .catch(() => null)
    if (!raw || typeof raw !== 'object') continue
    const profile = (raw as { profile?: unknown }).profile
    found.push({
      name: entry.name,
      path: dir,
      profile: typeof profile === 'string' && profile ? profile : null,
    })
  }
  return found
}
