import type { Awareness } from 'y-protocols/awareness'
import type { Cursor, Peer } from '@/types'

/** What a peer publishes about itself. Name and colour come from the profile it is working
 *  as; the cursor is the editor's, and is null before it has one. */
export interface Presence {
  name: string
  color: string
  cursor: Cursor | null
}

function cursorOf(value: unknown): Cursor | null {
  if (!value || typeof value !== 'object') return null
  const { anchor, head } = value as Record<string, unknown>
  if (typeof anchor !== 'number' || typeof head !== 'number') return null
  return { anchor, head }
}

/** Awareness carries whatever anyone puts in it, including nothing and including rubbish —
 *  it is the one part of a session that arrives unvalidated from another machine. */
export function presenceOf(value: unknown): Presence | null {
  if (!value || typeof value !== 'object') return null
  const { name, color, cursor } = value as Record<string, unknown>
  if (typeof name !== 'string' || typeof color !== 'string') return null
  return { name, color, cursor: cursorOf(cursor) }
}

/** Everyone but you. The count the status line shows adds you back. */
export function peersFrom(awareness: Awareness): Peer[] {
  const peers: Peer[] = []
  for (const [id, state] of awareness.getStates()) {
    if (id === awareness.clientID) continue
    const presence = presenceOf(state)
    if (presence) peers.push({ id, ...presence })
  }
  return peers.sort((a, b) => a.id - b.id)
}
