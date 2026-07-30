import type { VaultPath } from '../vault'

// off is a vault that does not sync
type SyncState = 'off' | 'idle' | 'syncing' | 'conflict' | 'error' | 'offline'

export interface SyncStatus {
  state: SyncState
  lastSyncedAt?: number
  conflicted: VaultPath[] // non-empty only in `conflict`, which latches until explicitly cleared
  message?: string
}
