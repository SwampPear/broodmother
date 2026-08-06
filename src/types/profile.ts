import type { GitAuthor } from './git'

export interface Profile {
  name: string // the profile's folder name
  path: string // the profile's file, `~/.broodmother/<name>/profile.json`
  color: string // the profile's color, as #rrggbb
  gitAuthor: GitAuthor
  sshKeyPath: string | null // git SSH key in this profile's vaults, null default
  claudeCfgDir: string | null // `CLAUDE_CONFIG_DIR` for shells opened here, null default
  cursorCfgDir: string | null // `CURSOR_CONFIG_DIR` the same ways
  soul: string | null // global system prompt for agents, null default
  github: string | null
}

// The editable part of a profile.
export type Identity = Omit<Profile, 'name' | 'path' | 'github'>
