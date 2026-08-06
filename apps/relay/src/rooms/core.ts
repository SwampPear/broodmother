import type { WebSocket } from 'ws'
import type { RelayClientMessage, RelayServerMessage, RoomId } from '@/types'

/**
 * What a frame may be. A markdown document's whole state is tens of kilobytes and an
 * ordinary update is a few hundred bytes, so this is far above anything a session produces
 * and far below anything worth holding in memory for a stranger.
 */
const MAX_FRAME = 256 * 1024

/** How long a socket may sit there having said nothing. A client says hello the moment it
 *  opens; anything that does not is a port scanner or a mistake. */
const HELLO_MS = 10 * 1000

/** Both are 32 bytes as base64url. Checked before use so that a room id is never a string
 *  of somebody's choosing that happens to be megabytes long. */
const ROOM = /^[A-Za-z0-9_-]{22}$/
const TOKEN = /^[A-Za-z0-9_-]{43}$/

interface Room {
  /** The token the first socket in showed. Every later one has to match it. */
  token: string
  sockets: Set<WebSocket>
}

/**
 * Every live room, as sets of sockets. There is no document here and there is no disk: a
 * frame arrives sealed, is sent to everyone else in the room, and is forgotten. Late joiners
 * are answered by the peers who are already there rather than by anything held here, which
 * is what lets this process know nothing about what it carries.
 *
 * An empty room is deleted. Nothing survives a restart, because nothing was ever only here.
 */
export class Rooms {
  private readonly rooms = new Map<RoomId, Room>()

  get count(): number {
    return this.rooms.size
  }

  get sockets(): number {
    let total = 0
    for (const room of this.rooms.values()) total += room.sockets.size
    return total
  }

  /** How many are in a room, for whoever can prove they were told about it. Null for a room
   *  that is not here and for a token that is not its own — the same answer to both, so that
   *  asking cannot be used to learn which rooms exist. */
  peers(room: RoomId, token: string): number | null {
    const found = this.rooms.get(room)
    return found && found.token === token ? found.sockets.size : null
  }

  /**
   * A socket, until it says which room it is for. Everything is refused by hanging up rather
   * than by an error message: a relay that told you the difference between a room that is not
   * here and a token that is wrong would be a way to enumerate rooms.
   */
  accept(socket: WebSocket): void {
    let joined: { id: RoomId; room: Room } | null = null
    const deadline = setTimeout(() => joined ?? socket.close(), HELLO_MS)
    if (typeof deadline.unref === 'function') deadline.unref()

    socket.on('message', (data: Buffer | ArrayBuffer | Buffer[]) => {
      const raw = String(data)
      if (raw.length > MAX_FRAME) return socket.close()

      let message: RelayClientMessage
      try {
        message = JSON.parse(raw) as RelayClientMessage
      } catch {
        return socket.close()
      }

      if (message.type === 'hello') {
        if (joined) return socket.close()
        joined = this.join(message.room, message.token, socket)
        return joined ? clearTimeout(deadline) : socket.close()
      }

      if (message.type !== 'frame' || !joined) return socket.close()
      // The one thing this process does. It has not looked inside and it could not.
      for (const other of joined.room.sockets)
        if (other !== socket) send(other, { type: 'frame', data: message.data })
    })

    socket.on('close', () => {
      clearTimeout(deadline)
      if (!joined) return
      const { id, room } = joined
      room.sockets.delete(socket)
      if (room.sockets.size === 0) return void this.rooms.delete(id)
      for (const other of room.sockets)
        send(other, { type: 'peers', peers: room.sockets.size })
    })
  }

  /** For a server on its way down. */
  close(): void {
    for (const room of this.rooms.values())
      for (const socket of room.sockets) socket.close()
    this.rooms.clear()
  }

  /**
   * Trust on first use: whoever opens a room sets its token, and everyone after has to show
   * the same one. There is nowhere to register a room in advance — nothing here is persisted
   * — and a random 16 bytes is not a name anyone arrives at by guessing.
   */
  private join(
    id: RoomId,
    token: string,
    socket: WebSocket,
  ): { id: RoomId; room: Room } | null {
    if (typeof id !== 'string' || !ROOM.test(id)) return null
    if (typeof token !== 'string' || !TOKEN.test(token)) return null

    const found = this.rooms.get(id)
    if (found && found.token !== token) return null
    const room = found ?? { token, sockets: new Set<WebSocket>() }
    if (!found) this.rooms.set(id, room)

    room.sockets.add(socket)
    // The count as it stands for this socket, said to this socket, before anything else can
    // change it. It is what decides whether this peer seeds the document or adopts it, and
    // deciding that from a number gathered later is how two peers both adopt an empty room.
    send(socket, { type: 'joined', peers: room.sockets.size })
    for (const other of room.sockets)
      if (other !== socket) send(other, { type: 'peers', peers: room.sockets.size })
    return { id, room }
  }
}

function send(socket: WebSocket, message: RelayServerMessage): void {
  if (socket.readyState === 1) socket.send(JSON.stringify(message))
}
