import { randomBytes } from 'node:crypto'
import type { WebSocket } from 'ws'
import type { RelayMessage } from '@broodmother/shared'

interface Room {
  token: string
  members: Set<WebSocket>
  /** Whether anyone has ever been in: an emptied room is forgotten, a freshly minted
   *  one is still waiting for its sharer. */
  opened: boolean
}

/**
 * Rooms as socket sets and nothing else: no document, no disk, no CRDT. Every frame a
 * member sends is repeated to the rest, and the one thing the lair adds is the answer
 * to a join — how many peers were already there, the fact seed-vs-adopt turns on.
 */
export class Rooms {
  private readonly rooms = new Map<string, Room>()

  mint(): { room: string; token: string } {
    const room = randomBytes(16).toString('base64url')
    const token = randomBytes(16).toString('base64url')
    this.rooms.set(room, { token, members: new Set(), opened: false })
    return { room, token }
  }

  get size(): number {
    return this.rooms.size
  }

  accept(socket: WebSocket, url: URL): void {
    const id = url.searchParams.get('room') ?? ''
    const token = url.searchParams.get('token') ?? ''
    const room = this.rooms.get(id)
    if (!room || room.token !== token) return socket.close()

    const joined: RelayMessage = { kind: 'joined', peers: room.members.size }
    socket.send(JSON.stringify(joined))
    room.members.add(socket)
    room.opened = true

    socket.on('message', (data, isBinary) => {
      if (isBinary) return socket.terminate()
      const text = String(data)
      if (!repeatable(text)) return
      for (const member of room.members) if (member !== socket) member.send(text)
    })
    socket.on('close', () => {
      room.members.delete(socket)
      if (room.opened && room.members.size === 0) this.rooms.delete(id)
    })
  }

  close(): void {
    for (const room of this.rooms.values())
      for (const member of room.members) member.close()
    this.rooms.clear()
  }
}

/** Only the two frame kinds peers exchange are worth repeating; anything else is noise
 *  or worse, and a pipe repeats nothing it was not built for. */
function repeatable(text: string): boolean {
  try {
    const parsed: unknown = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object') return false
    const kind = (parsed as { kind?: unknown }).kind
    return kind === 'doc' || kind === 'awareness'
  } catch {
    return false
  }
}
