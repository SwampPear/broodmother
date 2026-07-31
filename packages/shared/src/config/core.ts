import type { GitSettings } from './git'

export interface BroodmotherConfig {
  vaultPath: string | null // absolute path to the open vault, null on first run
  profile: string | null // the profile you are working as, whose folder holds the vaults
  checkouts: Record<string, string> // vault path -> folder of the checkout open in it
  git: Record<string, GitSettings> // vault path -> how it syncs; no entry means the defaults
  project: Record<string, string | null> // vault path -> the project it is scoped to, null for the vault itself
  projectBranch: Record<string, string> // `<vault>#<project>` -> folder of its open checkout
}
