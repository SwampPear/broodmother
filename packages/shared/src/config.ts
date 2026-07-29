export interface GitAuthor {
  name: string
  email: string
}

/**
 * Who you commit and show up as, and the credentials you do it with. A profile is a file in
 * `~/.broodmother/profiles/` — the file name is the profile's name — and it belongs to the
 * machine rather than to any one vault, so the same identity serves every vault that
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

export interface BroodmotherConfig {
  /** Absolute path to the vault working tree, or null when no vault is open yet. */
  vaultPath: string | null
  /**
   * Vault path to the name of the profile that vault commits as. It lives here rather than
   * in the vault because a vault is a git working tree: anything written inside one is
   * something the sync loop would offer to commit. A path with no entry is a vault nobody
   * has picked an identity for yet.
   */
  profiles: Record<string, string>
  /**
   * Vault path to the name of the checkout open in it. A vault holds worktrees — `local`
   * is the clone, the rest are branches of it — and which one you were last in is a fact
   * about this machine, so it lives here beside which vault you were last in.
   */
  worktrees: Record<string, string>
  remoteUrl: string | null
  branch: string
  syncEnabled: boolean
  /** Quiet period of no local edits before a sync runs. */
  syncIdleMs: number
}
