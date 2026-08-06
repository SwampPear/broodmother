'use client'

import type { DocRef, Peer, SessionMode } from '@/types'
import { liveOf, useSessionState, useShares } from './core'

const LABEL: Record<SessionMode, string> = {
  joining: 'joining…',
  live: 'shared',
  solo: 'not connected',
  divergent: 'needs an answer',
}

/**
 * Who else is in the document, in the status line beside sync. A dot each, in the colour of
 * the profile they are working as — the same colour their caret wears in the text, which is
 * what makes the line and the page say the same thing.
 */
export function CollabStatus({
  doc,
  onOpen,
}: {
  doc: DocRef | null
  onOpen: () => void
}) {
  // Subscribed to the whole set so that starting or ending a share reaches the line, and to
  // the one session so that somebody arriving does.
  useShares()
  const live = liveOf(doc)
  const state = useSessionState(live)
  if (!live || !state) return null
  return <Peers mode={state.mode} peers={state.peers} onOpen={onOpen} />
}

export function Peers({
  mode,
  peers,
  onOpen,
}: {
  mode: SessionMode
  peers: Peer[]
  onOpen: () => void
}) {
  return (
    <button type="button" className="session" onClick={onOpen} data-state={mode}>
      {peers.map((peer) => (
        <span
          key={peer.id}
          className="peer-dot"
          style={{ background: peer.color }}
          data-tip={peer.name}
          aria-hidden
        />
      ))}
      <span>
        {LABEL[mode]}
        {peers.length > 0 && ` · ${peers.map((peer) => peer.name).join(', ')}`}
      </span>
    </button>
  )
}
