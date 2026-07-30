export interface VaultSummary {
  name: string
  path: string
  profile?: string
}

export interface Worktree {
  name: string
  path: string
  branch?: string
  primary: boolean
}
