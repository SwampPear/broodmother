import type { Awareness } from 'y-protocols/awareness'
import type { Peer, PeerCursor } from '@broodmother/shared'

export interface PresenceIdentity {
  name: string
  color: string
}

/** What this client tells the room about itself. The `user` field is the convention the
 *  editor binding reads for cursor labels; `selection` lands beside it from the binding
 *  itself, which is how cursor positions travel without a message of their own. */
export function announce(awareness: Awareness, identity: PresenceIdentity): void {
  awareness.setLocalStateField('user', {
    name: identity.name,
    color: identity.color,
  })
}

/** Everyone else's states, read back as peers in a stable order. */
export function peersOf(awareness: Awareness): Peer[] {
  const peers: Peer[] = []
  for (const [id, state] of awareness.getStates()) {
    if (id === awareness.clientID) continue
    const user = (state as { user?: { name?: unknown; color?: unknown } }).user
    peers.push({
      id,
      name: typeof user?.name === 'string' ? user.name : 'someone',
      color: typeof user?.color === 'string' ? user.color : '#8fb8d8',
      cursor: cursorOf(state),
    })
  }
  return peers.sort((a, b) => a.id - b.id)
}

function cursorOf(state: Record<string, unknown>): PeerCursor | null {
  const selection = state.selection
  if (!selection || typeof selection !== 'object') return null
  const { anchor, head } = selection as { anchor?: unknown; head?: unknown }
  return anchor !== undefined && head !== undefined ? { anchor, head } : null
}
