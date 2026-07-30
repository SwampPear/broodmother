import type { GitSettings } from './git'

export interface BroodmotherConfig {
  vaultPath: string | null          // absolute path to the open vault, null on first run
  profiles: Record<string, string>  // vault path -> profile it commits as
  worktrees: Record<string, string> // vault path -> checkout open in it
  git: Record<string, GitSettings>  // vault path -> how it syncs; no entry means the defaults
}
