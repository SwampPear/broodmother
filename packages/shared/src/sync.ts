import type { VaultPath } from './vault'

export type SyncState = 'idle' | 'syncing' | 'conflict' | 'error' | 'offline'

export interface SyncStatus {
  state: SyncState
  lastSyncedAt: number | null
  /** Non-empty only in `conflict`, which latches until explicitly cleared. */
  conflicted: VaultPath[]
  /** `offline` and `error` are distinct states; this says which failure it was. */
  message: string | null
}
