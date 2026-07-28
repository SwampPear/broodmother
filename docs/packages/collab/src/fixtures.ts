import type { ClientMessage, DocNode, Peer, RoomId, VaultPath } from '@docs/shared'
import type { DocIo, Identity, MarkdownCodec, Transport, TransportEvent } from './types'

/** One paragraph per line — enough to round-trip losslessly, which is all a session needs. */
export const codec: MarkdownCodec = {
  parse: (markdown) => ({
    type: 'doc',
    content: markdown.split('\n').map((line) => ({
      type: 'paragraph',
      ...(line ? { content: [{ type: 'text', text: line }] } : {}),
    })),
  }),
  serialize: (doc: DocNode) =>
    (doc.content ?? [])
      .map((block) => (block.content ?? []).map((child) => child.text ?? '').join(''))
      .join('\n'),
}

export const memoryIo = (
  files: Record<VaultPath, string>,
): DocIo & { files: typeof files } => ({
  files,
  read: async (path) => files[path] ?? '',
  write: async (path, markdown) => {
    files[path] = markdown
  },
})

interface Client {
  identity: Identity
  rooms: Set<RoomId>
  handlers: Set<(event: TransportEvent) => void>
  connected: boolean
}

export interface FakeTransport extends Transport {
  kill(): void
  revive(): void
}

/** Plan 04's relay, in memory: rooms of members, forwarding, and nothing else. */
export class FakeRelay {
  readonly resolutions: ClientMessage[] = []
  private clients = new Set<Client>()
  private held: (() => void)[] | null = null

  transport(identity: Identity): FakeTransport {
    const client: Client = {
      identity,
      rooms: new Set(),
      handlers: new Set(),
      connected: true,
    }
    this.clients.add(client)
    return {
      get connected() {
        return client.connected
      },
      send: (message) => this.receive(client, message),
      subscribe: (handler) => {
        client.handlers.add(handler)
        return () => client.handlers.delete(handler)
      },
      kill: () => {
        const rooms = [...client.rooms]
        client.connected = false
        client.rooms.clear()
        this.emit(client, { type: 'close' })
        rooms.forEach((room) => this.announce(room))
      },
      revive: () => {
        client.connected = true
        this.emit(client, { type: 'open' })
      },
    }
  }

  /** Queue delivery so two clients can edit without seeing each other first. */
  hold(): void {
    this.held = []
  }

  release(): void {
    const queue = this.held ?? []
    this.held = null
    queue.forEach((deliver) => deliver())
  }

  peers(room: RoomId): Peer[] {
    return [...this.clients]
      .filter((client) => client.rooms.has(room))
      .map((client) => ({ ...client.identity, selection: null }))
  }

  private receive(client: Client, message: ClientMessage): void {
    if (!client.connected) return
    switch (message.type) {
      case 'join':
        client.rooms.add(message.room)
        return this.announce(message.room)
      case 'leave':
        client.rooms.delete(message.room)
        return this.announce(message.room)
      case 'resolveDivergence':
        this.resolutions.push(message)
        return
      default:
        this.forEach(message.room, (peer) => {
          if (peer !== client) this.emit(peer, { type: 'message', message })
        })
    }
  }

  private announce(room: RoomId): void {
    const peers = this.peers(room)
    this.forEach(room, (client) =>
      this.emit(client, {
        type: 'message',
        message: { type: 'session', room, state: 'live', peers },
      }),
    )
  }

  private forEach(room: RoomId, visit: (client: Client) => void): void {
    this.clients.forEach((client) => {
      if (client.rooms.has(room)) visit(client)
    })
  }

  private emit(client: Client, event: TransportEvent): void {
    const deliver = () => client.handlers.forEach((handler) => handler(event))
    if (this.held) this.held.push(deliver)
    else deliver()
  }
}
