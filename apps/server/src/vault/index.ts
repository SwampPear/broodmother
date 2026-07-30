export { Vault } from './core'
export { LinkIndex } from './links'
export {
  VaultError,
  createVault,
  deleteVault,
  findVault,
  listVaults,
  type NewVault,
} from './vaults'
export { VaultWatcher } from './watcher'
export {
  PRIMARY,
  WorktreeError,
  createWorktree,
  findWorktree,
  listWorktrees,
  removeWorktree,
  worktreePath,
  type NewWorktree,
} from './worktrees'
