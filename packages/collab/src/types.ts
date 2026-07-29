import type {
  ClientMessage,
  DivergenceChoice,
  DivergenceReport,
  DocNode,
  Peer,
  RoomId,
  ServerMessage,
  SessionState,
  VaultPath,
} from '@mother/shared'
import type * as Y from 'yjs'
import type { Awareness } from 'y-protocols/awareness'

export type TransportEvent =
  { type: 'open' } | { type: 'close' } | { type: 'message'; message: ServerMessage }

/** Owned by the caller: the session never opens or closes the socket, it only speaks. */
export interface Transport {
  readonly connected: boolean
  send(message: ClientMessage): void
  subscribe(handler: (event: TransportEvent) => void): () => void
}

/** Plan 01's markdown codec, narrowed to what a session needs. */
export interface MarkdownCodec {
  parse(markdown: string): DocNode
  serialize(doc: DocNode): string
}

/** Plan 04's `GET`/`PUT /api/doc`, narrowed to what a session needs. */
export interface DocIo {
  read(path: VaultPath): Promise<string>
  write(path: VaultPath, markdown: string): Promise<void>
}

export type Identity = Omit<Peer, 'selection'>

export interface SessionOptions {
  roomId: RoomId
  path: VaultPath
  identity: Identity
  transport: Transport
  codec: MarkdownCodec
  io: DocIo
  flushDelay?: number
}

/** `seed` populated the room from its own file; `adopt` took the room's. */
export type SessionRole = 'seed' | 'adopt'

export interface Session {
  readonly doc: Y.Doc
  readonly fragment: Y.XmlFragment
  readonly awareness: Awareness
  readonly state: SessionState
  readonly role: SessionRole | null
  readonly peers: Peer[]
  readonly divergence: DivergenceReport | null
  connect(): void
  disconnect(): void
  resolveDivergence(choice: DivergenceChoice): void
  setSelection(selection: Peer['selection']): void
  markdown(): string
  flush(): Promise<void>
  subscribe(listener: () => void): () => void
  destroy(): Promise<void>
}
