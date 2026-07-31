import { mkdir, readdir, rename, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import type { BroodmotherConfig } from '@broodmother/shared'
import { PROFILES_DIR } from './profiles'
import { PRIMARY } from './vault'

const STAGING = '.migrating'

/**
 * The layout before a vault held checkouts: the vault folder was the checkout itself. It
 * becomes `local/`, the checkout every vault starts with, so the branches you add later are
 * its peers rather than folders buried inside it. Everything moves, `.git` included — a git
 * repository is portable, and moving the whole directory keeps it one. Nothing is deleted
 * and nothing is rewritten; a vault that is not a checkout, or one already holding
 * `local/`, is left exactly as it is.
 */
export async function migrateCheckouts(
  home: string,
  config: BroodmotherConfig,
): Promise<{ config: BroodmotherConfig; moved: string[] }> {
  const moved: string[] = []

  for (const vault of await readdir(home, { withFileTypes: true }).catch(() => [])) {
    if (!vault.isDirectory() || vault.name.startsWith('.') || vault.name === PROFILES_DIR)
      continue
    const dir = path.join(home, vault.name)
    const local = path.join(dir, PRIMARY)

    // Already done, or never a checkout to begin with — a folder someone dropped in by hand
    // is a vault, and it becomes `local/` the same way.
    if (await exists(local)) continue
    const entries = await readdir(dir).catch(() => [])
    if (!entries.length) continue

    // Staged inside the vault so every move stays on one device, then renamed into
    // place.
    const staging = path.join(dir, STAGING)
    await rm(staging, { recursive: true, force: true })
    await mkdir(staging, { recursive: true })
    for (const entry of entries) {
      if (entry === STAGING) continue
      await rename(path.join(dir, entry), path.join(staging, entry))
    }
    await rename(staging, local)

    moved.push(local)
  }

  // `vaultPath` still names the vault, which is the folder that now holds the checkouts.
  // Which one is open is a separate fact, and every vault opens on `local` until it is not.
  return { config, moved }
}

const exists = (target: string) =>
  stat(target).then(
    () => true,
    () => false,
  )
