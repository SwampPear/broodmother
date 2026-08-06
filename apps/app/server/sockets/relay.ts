import type { WebSocket } from 'ws'
import type { ServerMessage } from '@/types'

interface Connection {
  /** The vault the window on the other end is standing in, or null for a window from
   *  before windows could say — which follows whatever vault is the current default. */
  vault: string | null
  socket: WebSocket
}

/** Every open `/ws` client, and one way to reach the ones a vault's events are about: the
 *  project and the sync loop report, and nothing is sent the other way. */
export class Relay {
  private readonly connections = new Set<Connection>()

  constructor(private readonly current: () => string | null = () => null) {}

  get connectionCount(): number {
    return this.connections.size
  }

  /** To the windows standing in the vault the message is about, and no further: what one
   *  window's vault does is not news in another's. */
  broadcast(vault: string | null, message: ServerMessage): void {
    const from = vault ?? this.current()
    for (const connection of this.connections)
      if ((connection.vault ?? this.current()) === from) send(connection, message)
  }

  accept(socket: WebSocket, vault: string | null = null): void {
    const connection: Connection = { vault, socket }
    this.connections.add(connection)
    socket.on('close', () => this.connections.delete(connection))
  }

  close(): void {
    for (const connection of this.connections) connection.socket.close()
    this.connections.clear()
  }
}

function send(connection: Connection, message: ServerMessage): void {
  if (connection.socket.readyState === 1) connection.socket.send(JSON.stringify(message))
}
