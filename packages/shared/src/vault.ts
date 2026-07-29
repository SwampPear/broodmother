/** POSIX separators, relative to the vault root, no leading `./` or `/`. */
export type VaultPath = string

export interface VaultFile {
  kind: 'file'
  path: VaultPath
  name: string
  size: number
  modifiedAt: number
}

export interface VaultDir {
  kind: 'dir'
  path: VaultPath
  name: string
  children: VaultEntry[]
}

export type VaultEntry = VaultFile | VaultDir

/** A directory in the broodmother home. The name is the folder name; the path is absolute. */
export interface VaultSummary {
  name: string
  path: string
  /** Name of the profile this vault commits as, or null until one is picked. */
  profile: string | null
}

export type VaultEvent =
  | { type: 'created'; path: VaultPath }
  | { type: 'changed'; path: VaultPath }
  | { type: 'removed'; path: VaultPath }
  | { type: 'moved'; from: VaultPath; to: VaultPath }

/**
 * A checkout inside a vault. `local` is the clone itself, on the default branch; the rest
 * are git worktrees of it, each on its own branch, each with its own files on disk.
 */
export interface Worktree {
  name: string
  path: string
  /** The branch this checkout is on, or null if git could not say. */
  branch: string | null
  /** The vault's own clone, which cannot be removed. */
  primary: boolean
}
