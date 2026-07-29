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

export type VaultEvent =
  | { type: 'created'; path: VaultPath }
  | { type: 'changed'; path: VaultPath }
  | { type: 'removed'; path: VaultPath }
  | { type: 'moved'; from: VaultPath; to: VaultPath }
