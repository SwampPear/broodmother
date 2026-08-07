import { fromBase64, toBase64 } from 'lib0/buffer'
import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness'
import {
  messageYjsSyncStep1,
  messageYjsSyncStep2,
  readSyncMessage,
  writeSyncStep1,
  writeUpdate,
} from 'y-protocols/sync'
import * as Y from 'yjs'
import type { Peer, RelayMessage } from '@broodmother/shared'
import { announce, peersOf, type PresenceIdentity } from '../presence'
import type { Transport } from '../transport'

export type SessionMode = 'joining' | 'live' | 'solo' | 'divergent'

export interface SessionState {
  mode: SessionMode
  peers: Peer[]
  text: string
}

/** The session's whole reach into the world: the document's file, read at the join and
 *  written by the flush. Injected, so no test here touches a filesystem. */
export interface SessionIo {
  read(): Promise<string>
  write(text: string): Promise<void>
}

export interface CreateSession {
  transport: Transport
  io: SessionIo
  identity: PresenceIdentity
  flushMs?: number
}

export interface CollabSession {
  readonly doc: Y.Doc
  readonly text: Y.Text
  readonly awareness: Awareness
  state(): SessionState
  onState(handler: (state: SessionState) => void): () => void
  /** The two ways out of divergence: take the room's version onto disk, or keep yours
   *  and leave the session. */
  resolve(choice: 'room' | 'leave'): Promise<void>
  close(): Promise<void>
}

const FLUSH_MS = 500

/** Everything a collaborator needs, everything injected. The rules it holds to:
 *  first into the room seeds it from its file, later joiners adopt room state, a joiner
 *  whose file disagrees goes divergent rather than merged, and losing the relay drops to
 *  solo editing with the flush still running — nothing is ever only in flight. */
export function createSession(options: CreateSession): CollabSession {
  const { transport, io } = options
  const doc = new Y.Doc()
  const text = doc.getText('content')
  const awareness = new Awareness(doc)
  announce(awareness, options.identity)

  let mode: SessionMode = 'joining'
  let adopting = false
  /** Whether the doc has ever held the document — the fact that separates a first join
   *  from a reconnect, where seeding again would duplicate and adopting might erase. */
  let carried = false
  let closed = false
  let pending: ReturnType<typeof setTimeout> | null = null
  const handlers = new Set<(state: SessionState) => void>()

  function state(): SessionState {
    return { mode, peers: peersOf(awareness), text: text.toString() }
  }

  function emit(): void {
    const now = state()
    for (const handler of handlers) handler(now)
  }

  function become(next: SessionMode): void {
    if (mode === next || closed) return
    mode = next
    emit()
  }

  function broadcast(work: (encoder: encoding.Encoder) => void): void {
    const encoder = encoding.createEncoder()
    work(encoder)
    transport.send({ kind: 'doc', payload: toBase64(encoding.toUint8Array(encoder)) })
  }

  function scheduleFlush(): void {
    if (pending) clearTimeout(pending)
    pending = setTimeout(() => {
      pending = null
      void flush()
    }, options.flushMs ?? FLUSH_MS)
  }

  async function flush(): Promise<void> {
    if (mode === 'live' || mode === 'solo') await io.write(text.toString())
  }

  /** The lair holds no awareness, so nobody learns who is here except from the peers
   *  themselves: said on every join, and said again when a step1 announces a newcomer. */
  function shareSelf(): void {
    transport.send({
      kind: 'awareness',
      payload: toBase64(encodeAwarenessUpdate(awareness, [doc.clientID])),
    })
  }

  async function joined(peers: number): Promise<void> {
    // Divergence outlives the connection that found it: only a resolution ends it.
    if (closed || mode === 'divergent') return
    shareSelf()
    if (carried) {
      // A reconnect: the whole document is already here. Ask the room what it has, and
      // hand it everything of ours in one update — resync, never re-seed.
      if (peers > 0) {
        broadcast((encoder) => writeSyncStep1(encoder, doc))
        broadcast((encoder) => writeUpdate(encoder, Y.encodeStateAsUpdate(doc)))
      }
      become('live')
      return
    }
    if (peers === 0) {
      const file = await io.read()
      if (closed) return
      doc.transact(() => text.insert(0, file), 'seed')
      carried = true
      become('live')
      return
    }
    adopting = true
    broadcast((encoder) => writeSyncStep1(encoder, doc))
  }

  async function adopted(): Promise<void> {
    adopting = false
    carried = true
    const file = await io.read()
    if (closed) return
    // A file that already says something else is two documents, and merging two
    // documents produces one nobody wrote. An empty file has nothing to lose and adopts
    // silently — that is what joining a shared document you never had looks like.
    if (file !== '' && file !== text.toString()) {
      become('divergent')
      return
    }
    become('live')
    scheduleFlush()
  }

  function receive(message: RelayMessage): void {
    if (message.kind === 'joined') {
      void joined(message.peers)
      return
    }
    if (message.kind === 'awareness') {
      applyAwarenessUpdate(awareness, fromBase64(message.payload), 'remote')
      return
    }
    const decoder = decoding.createDecoder(fromBase64(message.payload))
    const encoder = encoding.createEncoder()
    const type = readSyncMessage(decoder, encoder, doc, 'remote')
    if (encoding.length(encoder) > 0)
      transport.send({ kind: 'doc', payload: toBase64(encoding.toUint8Array(encoder)) })
    if (type === messageYjsSyncStep1) shareSelf()
    if (adopting && type === messageYjsSyncStep2) void adopted()
  }

  const offMessage = transport.onMessage(receive)
  const offLive = transport.onLive((live) => {
    if (live) return
    if (mode === 'live') become('solo')
  })

  doc.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin !== 'remote') broadcast((encoder) => writeUpdate(encoder, update))
    if (mode !== 'joining') scheduleFlush()
  })

  awareness.on(
    'update',
    (
      changed: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown,
    ) => {
      if (origin === 'remote') return
      const clients = [...changed.added, ...changed.updated, ...changed.removed]
      transport.send({
        kind: 'awareness',
        payload: toBase64(encodeAwarenessUpdate(awareness, clients)),
      })
    },
  )

  awareness.on('change', () => emit())

  return {
    doc,
    text,
    awareness,
    state,
    onState(handler) {
      handlers.add(handler)
      return () => handlers.delete(handler)
    },
    async resolve(choice) {
      if (mode !== 'divergent') return
      if (choice === 'room') {
        become('live')
        await flush()
        return
      }
      await this.close()
    },
    async close() {
      if (closed) return
      if (pending) clearTimeout(pending)
      pending = null
      await flush()
      closed = true
      removeAwarenessStates(awareness, [doc.clientID], 'close')
      offMessage()
      offLive()
      transport.close()
      doc.destroy()
    },
  }
}
