'use client'

import type { Peer, SyncStatus } from '@broodmother/shared'
import type { SessionMode } from '@broodmother/collab'
import { Button } from '../ui'

function syncLabel(sync: SyncStatus): string {
  switch (sync.state) {
    // A project with no repository, or with sync turned off. Saying "idle" here would claim a
    // backup that is not happening.
    case 'off':
      return `not syncing · ${sync.message ?? 'sync is off for this project'}`
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

/** The session's state as one short word, shown only while there is a session. */
function liveLabel(mode: SessionMode, peers: number): string {
  if (mode === 'solo') return 'live · relay lost, editing alone'
  if (mode === 'divergent') return 'live · versions differ'
  if (mode === 'joining') return 'live · joining…'
  return peers === 0 ? 'live · nobody else yet' : `live · ${peers + 1} editing`
}

export function StatusLine({
  sync,
  notice,
  live = null,
  peers = [],
  onClearConflict,
  onDismissNotice,
  onLeaveLive,
}: {
  sync: SyncStatus
  notice: string | null
  live?: SessionMode | null
  peers?: Peer[]
  onClearConflict: () => void
  onDismissNotice: () => void
  onLeaveLive?: () => void
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
          <Button onClick={onClearConflict}>clear conflict</Button>
        </div>
      )}
      <div className="line" role="status">
        <span className="sync" data-state={sync.state}>
          {syncLabel(sync)}
        </span>
        {live && (
          <span className="session" data-state={live}>
            {peers.map((peer) => (
              <span
                key={peer.id}
                className="peer-dot"
                style={{ background: peer.color }}
                title={peer.name}
                aria-label={peer.name}
              />
            ))}
            <span>{liveLabel(live, peers.length)}</span>
            {onLeaveLive && (
              <button
                type="button"
                className="notice"
                onClick={onLeaveLive}
                aria-label="leave the live session"
              >
                leave
              </button>
            )}
          </span>
        )}
        {notice && (
          <button type="button" className="notice" onClick={onDismissNotice}>
            {notice} ✕
          </button>
        )}
      </div>
    </footer>
  )
}
