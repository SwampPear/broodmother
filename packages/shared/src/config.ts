export interface GitAuthor {
  name: string
  email: string
}

/**
 * Who you commit and show up as, and the credentials you do it with. A profile is a file in
 * `~/.mother/profiles/` — the file name is the profile's name — and it belongs to the
 * machine rather than to any one project, so the same identity serves every project that
 * selects it.
 */
export interface Profile {
  name: string
  path: string
  presenceColor: string
  gitAuthor: GitAuthor
  /** SSH key git uses in this profile's vaults. Null leaves ssh to its own defaults. */
  sshKeyPath: string | null
  /** `CLAUDE_CONFIG_DIR` for shells opened here. Null leaves Claude to its own default. */
  claudeConfigDir: string | null
}

/** The identity half of a profile: everything the profile file holds. */
export type Identity = Omit<Profile, 'name' | 'path'>

/**
 * Where you work. A project is a folder in `~/.mother/` — the folder name is the project's
 * name, `project.json` inside it names the profile it works as, and its vaults are the
 * folders beside that file. Renaming a project is renaming the folder.
 */
export interface Project {
  name: string
  path: string
  /** Name of the profile this project works as, or null until one is picked. */
  profile: string | null
}

export interface MotherConfig {
  /** Name of the active project folder, or null until the first one is set up. */
  project: string | null
  /** Absolute path to the vault working tree, or null when no vault is open yet. */
  vaultPath: string | null
  remoteUrl: string | null
  branch: string
  syncEnabled: boolean
  /** Quiet period of no local edits before a sync runs. */
  syncIdleMs: number
}
