'use client'

import type { Peer, SessionState, SyncStatus } from '@docs/shared'

function syncLabel(sync: SyncStatus): string {
  switch (sync.state) {
    case 'idle':
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

function sessionLabel(state: SessionState, peers: Peer[]): string {
  switch (state) {
    case 'solo':
      return 'solo'
    case 'connecting':
      return 'connecting…'
    case 'live':
      return `live · ${peers.length} here`
    case 'divergent':
      return 'divergent · your file differs from the room'
  }
}

export function StatusLine({
  sync,
  session,
  peers,
  notice,
  onClearConflict,
  onDismissNotice,
}: {
  sync: SyncStatus
  session: SessionState
  peers: Peer[]
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
        <span className="session" data-state={session}>
          {sessionLabel(session, peers)}
        </span>
        {peers.map((peer) => (
          <span key={peer.id} className="peer" style={{ color: peer.color }}>
            ● {peer.displayName}
          </span>
        ))}
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
