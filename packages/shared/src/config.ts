export interface GitAuthor {
  name: string
  email: string
}

export interface MotherConfig {
  /** Absolute path to the vault working tree. */
  vaultPath: string
  remoteUrl: string | null
  branch: string
  syncEnabled: boolean
  /** Quiet period of no local edits and no live session before a sync runs. */
  syncIdleMs: number
  relayUrl: string | null
  displayName: string
  presenceColor: string
  gitAuthor: GitAuthor
}
