import * as decoding from 'lib0/decoding'
import * as encoding from 'lib0/encoding'
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness'
import {
  messageYjsSyncStep2,
  readSyncMessage,
  writeSyncStep1,
  writeSyncStep2,
  writeUpdate,
} from 'y-protocols/sync'
import * as Y from 'yjs'
import type { Cursor, SessionMode, SessionState } from '@/types'
import { peersFrom, type Presence } from './presence'
import type { Connect, Transport } from './transport'

/** Two kinds of message share the wire, so each frame says which it is. */
const SYNC = 0
const AWARENESS = 1

/** Long enough to collect a burst of typing, short enough that shutting the laptop mid
 *  sentence loses nothing worth naming. */
const FLUSH_MS = 500

/** The transaction origin everything arriving from the room is applied under, so that what
 *  came in is never sent back out as though it were typed here. */
const REMOTE = Symbol('room')

/** Each participant writes their own disk. Injected, so a session can be run with no
 *  filesystem anywhere near it. */
export interface SessionIo {
  write(text: string): Promise<void>
}

export interface SessionOptions {
  connect: Connect
  io: SessionIo
  identity: { name: string; color: string }
  /** The document as this peer holds it when the session opens — the open buffer, not a
   *  fresh read, because what is on screen is what this peer would be contributing. */
  initial: string
  flushMs?: number
}

export interface CollabSession {
  /** What the room holds, as the editor binds to it. */
  readonly text: Y.Text
  readonly awareness: Awareness
  state(): SessionState
  /**
   * Mode and membership, not keystrokes. The editor is bound to `text` and does not need to
   * be told about its own typing, and a listener woken on every character would be a React
   * render per keystroke.
   */
  subscribe(listen: (state: SessionState) => void): () => void
  setCursor(cursor: Cursor | null): void
  /** Divergence, answered: the room's version wins and mine is dropped. */
  takeRoom(): void
  /** Or mine does, and this peer leaves rather than merging two documents. */
  keepMine(): void
  close(): Promise<void>
}

/**
 * One document, shared. The first peer into a room seeds it from its file and every later
 * one adopts what is already there — getting that backwards duplicates or erases somebody's
 * work, which is why it is decided once, on arrival, from a count the relay hands over.
 *
 * A joiner whose file disagrees with what it adopted does not merge: two documents that were
 * edited apart, run through a CRDT, produce a third that nobody wrote. It says so instead and
 * lets a person choose.
 */
export function createSession({
  connect,
  io,
  identity,
  initial,
  flushMs = FLUSH_MS,
}: SessionOptions): CollabSession {
  const doc = new Y.Doc()
  const text = doc.getText('content')
  const awareness = new Awareness(doc)
  const presence: Presence = { ...identity, cursor: null }
  awareness.setLocalState(presence)

  const listeners = new Set<(state: SessionState) => void>()
  let mode: SessionMode = 'joining'
  /** The file this peer arrived holding, while it disagrees with the room. */
  let mine: string | null = null
  /** The file this peer left with, when it chose its own over the room's. */
  let kept: string | null = null
  /** The room has been met. Asked once: a peer coming back from a dropped connection
   *  already holds the document and must not seed it a second time. */
  let met = false
  let known = 0
  let flushTimer: ReturnType<typeof setTimeout> | null = null
  let closed = false
  let transport: Transport | null = null

  function state(): SessionState {
    return {
      mode,
      peers: peersFrom(awareness),
      text: kept ?? text.toString(),
      mine: mode === 'divergent' ? mine : null,
    }
  }

  function notify(): void {
    const now = state()
    for (const listen of listeners) listen(now)
  }

  /** Nowhere to send is not an error: a peer alone in a room, or one whose relay went away,
   *  goes on editing and holds the whole document either way. */
  function post(channel: number, write: (encoder: encoding.Encoder) => void): void {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, channel)
    write(encoder)
    transport?.send(encoding.toUint8Array(encoder))
  }

  /**
   * Both halves of the handshake at once. There is no server in the middle to send its own
   * step1 back, so a peer that only asked would receive the room's changes and never deliver
   * its own — which is exactly what a reconnecting peer has to do.
   */
  function sendSync(): void {
    post(SYNC, (encoder) => writeSyncStep1(encoder, doc))
    post(SYNC, (encoder) => writeSyncStep2(encoder, doc))
  }

  function sendPresence(): void {
    post(AWARENESS, (encoder) =>
      encoding.writeVarUint8Array(
        encoder,
        encodeAwarenessUpdate(awareness, [awareness.clientID]),
      ),
    )
  }

  function receive(data: Uint8Array): void {
    const decoder = decoding.createDecoder(data)
    const channel = decoding.readVarUint(decoder)
    if (channel === AWARENESS)
      return applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), REMOTE)
    if (channel !== SYNC) return

    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, SYNC)
    const kind = readSyncMessage(decoder, encoder, doc, REMOTE)
    // Anything past the channel byte is a reply the protocol wants sent.
    if (encoding.length(encoder) > 1) transport?.send(encoding.toUint8Array(encoder))
    if (kind === messageYjsSyncStep2) settle()
  }

  /** First into the room: what is on this peer's screen becomes the document. */
  function seed(): void {
    if (initial) text.insert(0, initial)
    mode = 'live'
    schedule()
  }

  /**
   * The room answered, and this peer now holds what it holds. Whether that is the same
   * document it arrived with is the only question left.
   */
  function settle(): void {
    if (mode !== 'joining') return
    const room = text.toString()
    // Nothing of your own to lose is not a conflict. Opening an empty note to receive a
    // document is the ordinary way to join one, and stopping to ask about it would be noise.
    if (!initial || initial === room) mode = 'live'
    else {
      mine = initial
      mode = 'divergent'
    }
    schedule()
    notify()
  }

  /** Only ever a document this peer has agreed to. Nothing is written while the answer to
   *  divergence is still somebody's to give. */
  function schedule(): void {
    if (flushTimer) clearTimeout(flushTimer)
    flushTimer = setTimeout(() => {
      flushTimer = null
      if (mode === 'live' || mode === 'solo') void io.write(text.toString())
    }, flushMs)
  }

  doc.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin !== REMOTE) post(SYNC, (encoder) => writeUpdate(encoder, update))
    schedule()
  })

  awareness.on(
    'update',
    (
      changed: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown,
    ) => {
      if (origin !== REMOTE)
        post(AWARENESS, (encoder) =>
          encoding.writeVarUint8Array(
            encoder,
            encodeAwarenessUpdate(awareness, [
              ...changed.added,
              ...changed.updated,
              ...changed.removed,
            ]),
          ),
        )
      // A caret moving is not news for anything watching the session; a peer arriving or
      // leaving is.
      if (changed.added.length || changed.removed.length) notify()
    },
  )

  // Last, so that everything a message can reach is already listening. A fake transport in a
  // test answers inside this call, and a real one answers a network later.
  transport = connect({
    frame: receive,
    peers: (count) => {
      const arrived = count > known
      known = count
      if (!met) {
        met = true
        if (count === 1) seed()
        else sendSync()
      }
      // Awareness has nothing to ask with: a peer already here would never hear about one
      // that has just arrived unless it says so again.
      if (arrived) sendPresence()
      notify()
    },
    live: (up) => {
      if (closed) return
      // Coming back, not arriving. The document is already held; what it needs is to trade
      // state vectors with whoever was in the room while it was away.
      if (up && met) sendSync()
      if (up && mode === 'solo' && kept === null) mode = 'live'
      // Losing the relay is not losing the document — every peer holds the whole of it, so
      // this drops to editing alone rather than to a read-only page.
      if (!up && (mode === 'live' || mode === 'joining')) mode = 'solo'
      notify()
    },
  })

  return {
    text,
    awareness,
    state,
    subscribe(listen) {
      listeners.add(listen)
      return () => listeners.delete(listen)
    },
    setCursor(cursor) {
      awareness.setLocalStateField('cursor', cursor)
    },
    takeRoom() {
      if (mode !== 'divergent') return
      mine = null
      mode = 'live'
      schedule()
      notify()
    },
    keepMine() {
      if (mode !== 'divergent' || mine === null) return
      kept = mine
      mine = null
      mode = 'solo'
      // The file on disk is already this text — it is the one that was read out of it — so
      // leaving writes nothing.
      transport.close()
      notify()
    },
    async close() {
      closed = true
      if (flushTimer) clearTimeout(flushTimer)
      flushTimer = null
      // Tell the room this peer is gone before the socket does, so nobody is left with a
      // cursor belonging to a window that closed.
      removeAwarenessStates(awareness, [awareness.clientID], 'local')
      transport.close()
      listeners.clear()
      const last = kept ?? text.toString()
      awareness.destroy()
      doc.destroy()
      if (mode === 'live' || mode === 'solo') await io.write(last)
    },
  }
}
