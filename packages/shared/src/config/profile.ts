import type { GitAuthor } from './git'

export interface Profile {
  name: string // the profile's folder name
  path: string // the profile's file, `~/.broodmother/<name>/profile.json`
  color: string // the profile's colour, as #rrggbb
  gitAuthor: GitAuthor
  sshKeyPath: string | null // git SSH key in this profile's vaults, null reverts to default
  claudeCfgDir: string | null // `CLAUDE_CONFIG_DIR` for shells opened here, null reverts to default
  soul: string | null // markdown appended to the system prompt of claude shells opened here
  /** The GitHub login this profile is connected as. Never the token: that is the server's,
   *  and a secret that reaches the browser is a secret in a screenshot. */
  github: string | null
  /** The lair this profile points at — the URL alone, for the same reason as `github`:
   *  the key stays in the profile file and never reaches the browser. */
  lair: string | null
}

// The half a person edits. The GitHub connection and the lair are not in it — they are
// made and broken by their own routes, not by typing.
export type Identity = Omit<Profile, 'name' | 'path' | 'github' | 'lair'>
