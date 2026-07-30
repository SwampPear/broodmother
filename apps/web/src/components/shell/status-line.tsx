'use client'

import type { SyncStatus } from '@broodmother/shared'

function syncLabel(sync: SyncStatus): string {
  switch (sync.state) {
    // A vault with no repository, or with sync turned off. Saying "idle" here would claim a
    // backup that is not happening.
    case 'off':
      return `not syncing · ${sync.message ?? 'sync is off for this vault'}`
    // A pass can succeed and still have done less than the whole round — auto-commit off,
    // no remote to push to — and that is what the message says.
    case 'idle':
      if (sync.message) return `idle · ${sync.message}`
      return sync.lastSyncedAt
        ? `idle · synced ${new Date(sync.lastSyncedAt).toLocaleTimeString()}`
        : 'idle · never synced'
    case 'syncing':
      return 'syncing…'
    case 'conflict':
      return `conflict · ${sync.conflicted.length} file${sync.conflicted.length === 1 ? '' : 's'}`
    case 'error':
      return `error · ${sync.message ?? 'sync failed'}`
    case 'offline':
      return `offline · ${sync.message ?? 'no connection to the remote'}`
  }
}

export function StatusLine({
  sync,
  notice,
  onClearConflict,
  onDismissNotice,
}: {
  sync: SyncStatus
  notice: string | null
  onClearConflict: () => void
  onDismissNotice: () => void
}) {
  return (
    <footer className="status">
      {sync.state === 'conflict' && (
        <div className="banner" role="alert">
          <span>
            Sync stopped. {sync.conflicted.join(', ')}{' '}
            {sync.conflicted.length === 1 ? 'is' : 'are'} in conflict — settle{' '}
            {sync.conflicted.length === 1 ? 'it' : 'them'} in the app or the terminal,
            then clear.
          </span>
          <button type="button" onClick={onClearConflict}>
            clear conflict
          </button>
        </div>
      )}
      <div className="line" role="status">
        <span className="sync" data-state={sync.state}>
          {syncLabel(sync)}
        </span>
        {notice && (
          <button type="button" className="notice" onClick={onDismissNotice}>
            {notice} ✕
          </button>
        )}
        <span className="spacer" />
        <span className="hint">⌘K</span>
      </div>
    </footer>
  )
}
