import { createHash, randomUUID } from 'node:crypto'
import * as Y from 'yjs'
import type { WebSocket } from 'ws'
import type {
  ClientMessage,
  MotherConfig,
  Peer,
  Profile,
  RoomId,
  ServerMessage,
} from '@mother/shared'
import { DEFAULT_COLOR } from '../profiles'

interface Connection {
  id: string
  socket: WebSocket
  rooms: Set<RoomId>
}

interface Room {
  doc: Y.Doc
  clients: Set<Connection>
}

const encode = (update: Uint8Array) => Buffer.from(update).toString('base64')
const decode = (update: string) => new Uint8Array(Buffer.from(update, 'base64'))

/** Yjs rooms in memory: no persistence, no snapshots — durability is git's job. */
export class Relay {
  private readonly connections = new Set<Connection>()
  private readonly rooms = new Map<RoomId, Room>()

  constructor(
    private readonly config: () => MotherConfig,
    private readonly profile: () => Profile | null,
  ) {}

  get roomCount(): number {
    return this.rooms.size
  }

  hasLiveSession(): boolean {
    return this.rooms.size > 0
  }

  broadcast(message: ServerMessage): void {
    for (const connection of this.connections) send(connection, message)
  }

  accept(socket: WebSocket): void {
    const connection: Connection = { id: randomUUID(), socket, rooms: new Set() }
    this.connections.add(connection)

    socket.on('message', (data) => {
      let message: ClientMessage
      try {
        message = JSON.parse(String(data)) as ClientMessage
      } catch {
        send(connection, { type: 'error', message: 'malformed message' })
        return
      }
      this.handle(connection, message)
    })
    socket.on('close', () => {
      for (const room of [...connection.rooms]) this.leave(connection, room)
      this.connections.delete(connection)
    })
  }

  /** Clients send a bare vault path; the repo half of the room id is ours to add. */
  private canonical(room: string): RoomId {
    if (this.rooms.has(room)) return room
    const config = this.config()
    const repoId = createHash('sha1')
      .update(config.remoteUrl ?? config.vaultPath ?? 'no-vault')
      .digest('hex')
      .slice(0, 12)
    return room.startsWith(`${repoId}/`) ? room : `${repoId}/${room}`
  }

  private handle(connection: Connection, message: ClientMessage): void {
    const id = this.canonical(message.room)
    switch (message.type) {
      case 'join':
        return this.join(connection, id)
      case 'leave':
        return this.leave(connection, id)
      case 'resolveDivergence':
        // Adopting room state is entirely client-side; keeping the local file is a leave.
        if (message.choice === 'keepLocal') this.leave(connection, id)
        return
      case 'update': {
        const room = this.rooms.get(id)
        if (!room?.clients.has(connection)) return
        Y.applyUpdate(room.doc, decode(message.update))
        return this.relay(room, connection, {
          type: 'update',
          room: id,
          update: message.update,
        })
      }
      case 'awareness': {
        const room = this.rooms.get(id)
        if (!room?.clients.has(connection)) return
        return this.relay(room, connection, {
          type: 'awareness',
          room: id,
          awareness: message.awareness,
        })
      }
      default:
        send(connection, { type: 'error', message: 'unknown message' })
    }
  }

  /**
   * The joiner is included in the peer list it receives, and every member is told on both
   * join and leave: the client reads that list to decide whether it seeds the room from
   * its file or adopts room state, and a wrong list erases documents.
   */
  private join(connection: Connection, id: RoomId): void {
    const room = this.rooms.get(id) ?? {
      doc: new Y.Doc(),
      clients: new Set<Connection>(),
    }
    this.rooms.set(id, room)
    room.clients.add(connection)
    connection.rooms.add(id)
    this.announce(id, room)

    const state = Y.encodeStateAsUpdate(room.doc)
    if (state.length > 2)
      send(connection, { type: 'update', room: id, update: encode(state) })
  }

  private leave(connection: Connection, id: RoomId): void {
    const room = this.rooms.get(id)
    connection.rooms.delete(id)
    if (!room?.clients.delete(connection)) return

    if (room.clients.size === 0) {
      room.doc.destroy()
      this.rooms.delete(id)
    } else {
      this.announce(id, room)
    }
    send(connection, { type: 'session', room: id, state: 'solo', peers: [] })
  }

  private announce(id: RoomId, room: Room): void {
    const profile = this.profile()
    const peers: Peer[] = [...room.clients].map((client) => ({
      id: client.id,
      displayName: profile?.name ?? 'someone',
      color: profile?.presenceColor ?? DEFAULT_COLOR,
      selection: null,
    }))
    for (const client of room.clients)
      send(client, { type: 'session', room: id, state: 'live', peers })
  }

  private relay(room: Room, from: Connection, message: ServerMessage): void {
    for (const client of room.clients) if (client !== from) send(client, message)
  }

  close(): void {
    for (const room of this.rooms.values()) room.doc.destroy()
    this.rooms.clear()
    for (const connection of this.connections) connection.socket.close()
    this.connections.clear()
  }
}

function send(connection: Connection, message: ServerMessage): void {
  if (connection.socket.readyState === 1) connection.socket.send(JSON.stringify(message))
}
