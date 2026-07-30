import type { VaultPath } from './vault'

/** `off` is a vault that does not sync — no repository, or sync turned off — and is a
 *  standing state rather than a failure. `idle` means syncing, and nothing to do right now. */
export type SyncState = 'off' | 'idle' | 'syncing' | 'conflict' | 'error' | 'offline'

export interface SyncStatus {
  state: SyncState
  lastSyncedAt: number | null
  /** Non-empty only in `conflict`, which latches until explicitly cleared. */
  conflicted: VaultPath[]
  /** `offline` and `error` are distinct states; this says which failure it was. */
  message: string | null
}
