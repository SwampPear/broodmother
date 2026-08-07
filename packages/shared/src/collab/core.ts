/** A room on the lair: sixteen random bytes, base64url. It names nothing — not a path,
 *  not a vault — so holding it teaches the lair nothing about what is being edited. */
export type RoomId = string

/** Everything a joiner needs, in one pasteable line. The whole payload rides the URL
 *  fragment, which a browser never sends — so a pasted-into-the-wrong-bar invite still
 *  hands the lair nothing. */
export interface Invite {
  url: string // the lair, scheme and host
  room: RoomId
  token: string // admission, checked by the lair
  key: string // encryption, never seen by the lair
}

export function formatInvite(invite: Invite): string {
  return `${invite.url}#${invite.room}.${invite.token}.${invite.key}`
}

export function parseInvite(text: string): Invite | null {
  const hash = text.trim().indexOf('#')
  if (hash < 0) return null
  const url = text.trim().slice(0, hash)
  const parts = text
    .trim()
    .slice(hash + 1)
    .split('.')
  if (parts.length !== 3 || parts.some((part) => part === '') || !isLairUrl(url))
    return null
  const [room, token, key] = parts
  return { url, room, token, key }
}

export function isLairUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * What crosses a room. The lair repeats `doc` and `awareness` frames to everyone else in
 * the room and answers a join with how many peers were already there — the one fact
 * seed-vs-adopt turns on. Payloads are base64, opaque to the lair by design.
 */
export type RelayMessage =
  | { kind: 'joined'; peers: number }
  | { kind: 'doc'; payload: string }
  | { kind: 'awareness'; payload: string }

/** A cursor as Yjs relative positions, JSON-encoded — opaque here because shared has no
 *  CRDT dependency; `packages/collab` translates them against the live text. */
export interface PeerCursor {
  anchor: unknown
  head: unknown
}

/** A collaborator as the presence layer shows them: awareness client id, and the name
 *  and color their profile already carries. */
export interface Peer {
  id: number
  name: string
  color: string
  cursor: PeerCursor | null
}
