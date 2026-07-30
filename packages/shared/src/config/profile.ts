import type { GitAuthor } from './git'

export interface Profile {
  name: string // the profile's file name
  path: string // the profile's file, in `~/.broodmother/profiles/`
  color: string // presence color
  gitAuthor: GitAuthor
  sshKeyPath: string | null // git SSH key in this profile's vaults, null reverts to default
  claudeCfgDir: string | null // `CLAUDE_CONFIG_DIR` for shells opened here, null reverts to default
}

export type Identity = Omit<Profile, 'name' | 'path'> // identity half of profile
