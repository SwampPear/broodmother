/**
 * A room on a relay: 16 random bytes, base64url. It names a live session and nothing else —
 * not a vault, not a path, not a person — so the relay learns nothing by holding it.
 */
export type RoomId = string

/** What a share hands over. `key` rides the invite's fragment and is never sent to the
 *  relay; `relay` is the http origin the socket is derived from. */
export interface Invite {
  relay: string
  room: RoomId
  key: string
}

/** Where somebody else's caret is in the shared text, as offsets into it. */
export interface Cursor {
  anchor: number
  head: number
}

export interface Peer {
  /** The Yjs client id, which is the only name a peer has that is certainly its own. */
  id: number
  name: string
  color: string
  cursor: Cursor | null
}

/**
 * Joining is a peer that has not yet been told what the room holds — it shows its own file
 * and writes nothing, because binding an editor to a document still on its way is a flash of
 * an empty note. Solo is editing alone, before a session or after the relay went away.
 * Divergent is a joiner whose file disagreed with the room, which is answered rather than
 * merged.
 */
export type SessionMode = 'joining' | 'solo' | 'live' | 'divergent'

export interface SessionState {
  mode: SessionMode
  peers: Peer[]
  /** The room's text as it currently stands. */
  text: string
  /** While divergent, the file this peer arrived holding. Null otherwise. */
  mine: string | null
}

/**
 * Client → relay. `hello` first and once; everything after it is a sealed frame the relay
 * moves without reading. `data` is base64 of `iv || ciphertext`.
 */
export type RelayClientMessage =
  { type: 'hello'; room: RoomId; token: string } | { type: 'frame'; data: string }

/** Relay → client. `peers` counts everyone in the room including the recipient, which is
 *  what a client needs to know whether it is the one that seeds. */
export type RelayServerMessage =
  | { type: 'joined'; peers: number }
  | { type: 'peers'; peers: number }
  | { type: 'frame'; data: string }
