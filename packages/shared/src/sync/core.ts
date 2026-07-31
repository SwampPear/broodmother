import type { DocPath } from '../tree'

// off is a vault that does not sync
type SyncState = 'off' | 'idle' | 'syncing' | 'conflict' | 'error' | 'offline'

export interface SyncStatus {
  state: SyncState
  lastSyncedAt?: number
  conflicted: DocPath[] // non-empty only in `conflict`, which latches until explicitly cleared
  message?: string
}
