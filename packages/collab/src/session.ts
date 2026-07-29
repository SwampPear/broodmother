import * as Y from 'yjs'
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from 'y-protocols/awareness'
import type {
  DivergenceChoice,
  DivergenceReport,
  Peer,
  ServerMessage,
  SessionState,
} from '@mother/shared'
import type { Session, SessionOptions, SessionRole, TransportEvent } from './types'
import { FRAGMENT, clearDoc, readDoc, writeDoc } from './ydoc'

const REMOTE = 'remote'

const toBase64 = (bytes: Uint8Array): string => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

const fromBase64 = (value: string): Uint8Array =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0))

export const createSession = async (options: SessionOptions): Promise<Session> => {
  const { roomId, path, identity, transport, codec, io } = options
  const flushDelay = options.flushDelay ?? 500

  const doc = new Y.Doc()
  const awareness = new Awareness(doc)
  const listeners = new Set<() => void>()

  let state: SessionState = 'solo'
  let role: SessionRole | null = null
  let divergence: DivergenceReport | null = null
  let wanted = false
  let everJoined = false
  let sharing = false
  /** Our own markdown, held while we wait for the room's — the divergence comparison. */
  let adopting: string | null = null
  /** Room updates that arrive before the handshake settles. Applying one early would
   * merge the room into our file, which is the outcome seed-vs-adopt exists to prevent. */
  let queued: Uint8Array[] | null = null
  let others = new Set<string>()
  let unsubscribe: (() => void) | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let writes = Promise.resolve()

  const initial = await io.read(path)
  let lastWritten = initial
  writeDoc(doc, codec.parse(initial))
  awareness.setLocalState({ peer: { ...identity, selection: null } })

  const notify = () => listeners.forEach((listener) => listener())
  const markdown = () => codec.serialize(readDoc(doc))

  const setState = (next: SessionState) => {
    if (state === next) return
    state = next
    notify()
  }

  const flush = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    // Never write while the two versions are unreconciled: either one would erase the other.
    if (state === 'divergent' || adopting !== null) return writes
    const content = markdown()
    if (content === lastWritten) return writes
    lastWritten = content
    writes = writes.then(() => io.write(path, content))
    return writes
  }

  const scheduleFlush = () => {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(flush, flushDelay)
  }

  const broadcastState = () =>
    transport.send({
      type: 'update',
      room: roomId,
      update: toBase64(Y.encodeStateAsUpdate(doc)),
    })

  const broadcastAwareness = (clients: number[]) =>
    transport.send({
      type: 'awareness',
      room: roomId,
      awareness: toBase64(encodeAwarenessUpdate(awareness, clients)),
    })

  const publish = () => {
    broadcastState()
    broadcastAwareness([awareness.clientID])
  }

  const share = () => {
    sharing = true
    publish()
    setState('live')
  }

  const adopt = () => {
    role = 'adopt'
    adopting = markdown()
    clearDoc(doc)
    setState('connecting')
  }

  const finishAdopting = () => {
    if (adopting === null || doc.getXmlFragment(FRAGMENT).length === 0) return
    const local = adopting
    const remote = markdown()
    adopting = null
    if (local === remote) {
      share()
      return
    }
    divergence = { room: roomId, path, local, remote }
    setState('divergent')
  }

  /** Membership is the relay's to know; a peer that left keeps a ghost cursor otherwise. */
  const forgetAbsent = (present: Set<string>) => {
    const gone = [...awareness.getStates()]
      .filter(([client, value]) => {
        const peer = (value as { peer?: Peer }).peer
        return (
          client !== awareness.clientID && (peer === undefined || !present.has(peer.id))
        )
      })
      .map(([client]) => client)
    if (gone.length) removeAwarenessStates(awareness, gone, REMOTE)
  }

  const onSession = (peers: Peer[]) => {
    const present = peers.filter((peer) => peer.id !== identity.id).map((peer) => peer.id)
    if (!everJoined) {
      everJoined = true
      if (present.length === 0) {
        role = 'seed'
        share()
      } else {
        adopt()
      }
    } else if (!sharing && adopting === null) {
      // Reconnecting into a room we already hold the history of — merging is safe here.
      share()
    } else if (sharing && present.some((id) => !others.has(id))) {
      publish()
    }
    others = new Set(present)
    forgetAbsent(others)
    const drained = queued ?? []
    queued = null
    for (const update of drained) Y.applyUpdate(doc, update, REMOTE)
    finishAdopting()
    notify()
  }

  const onMessage = (message: ServerMessage) => {
    switch (message.type) {
      case 'session':
        if (message.room === roomId) onSession(message.peers)
        return
      case 'update': {
        if (message.room !== roomId) return
        const update = fromBase64(message.update)
        if (queued !== null) {
          queued.push(update)
          return
        }
        Y.applyUpdate(doc, update, REMOTE)
        finishAdopting()
        return
      }
      case 'awareness':
        if (message.room !== roomId) return
        applyAwarenessUpdate(awareness, fromBase64(message.awareness), REMOTE)
        return
      default:
        return
    }
  }

  const drop = () => {
    queued = null
    if (adopting !== null) {
      writeDoc(doc, codec.parse(adopting))
      adopting = null
    }
    others = new Set()
    forgetAbsent(others)
    sharing = false
    setState('solo')
  }

  const join = () => {
    queued = []
    setState('connecting')
    transport.send({ type: 'join', room: roomId, path })
  }

  const onEvent = (event: TransportEvent) => {
    if (event.type === 'message') return onMessage(event.message)
    if (event.type === 'close') return drop()
    if (wanted) join()
  }

  doc.on('update', (update: Uint8Array, origin: unknown) => {
    if (sharing && origin !== REMOTE) {
      transport.send({ type: 'update', room: roomId, update: toBase64(update) })
    }
    scheduleFlush()
    notify()
  })

  awareness.on(
    'update',
    (
      changed: { added: number[]; updated: number[]; removed: number[] },
      origin: unknown,
    ) => {
      if (sharing && origin !== REMOTE) {
        broadcastAwareness([...changed.added, ...changed.updated, ...changed.removed])
      }
      notify()
    },
  )

  const connect = () => {
    wanted = true
    unsubscribe ??= transport.subscribe(onEvent)
    if (transport.connected) join()
    else setState('connecting')
  }

  const disconnect = () => {
    if (wanted && transport.connected) transport.send({ type: 'leave', room: roomId })
    wanted = false
    everJoined = false
    unsubscribe?.()
    unsubscribe = null
    drop()
  }

  return {
    doc,
    get fragment() {
      return doc.getXmlFragment(FRAGMENT)
    },
    awareness,
    get state() {
      return state
    },
    get role() {
      return role
    },
    get peers() {
      return [...awareness.getStates()]
        .filter(([client]) => client !== awareness.clientID)
        .map(([, value]) => (value as { peer?: Peer }).peer)
        .filter((peer): peer is Peer => peer !== undefined)
    },
    get divergence() {
      return divergence
    },
    connect,
    disconnect,
    resolveDivergence(choice: DivergenceChoice) {
      const report = divergence
      if (report === null) return
      divergence = null
      transport.send({ type: 'resolveDivergence', room: roomId, choice })
      if (choice === 'adoptRoom') {
        share()
        scheduleFlush()
        return
      }
      disconnect()
      writeDoc(doc, codec.parse(report.local))
    },
    setSelection(selection: Peer['selection']) {
      awareness.setLocalState({ peer: { ...identity, selection } })
    },
    markdown,
    flush,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    async destroy() {
      await flush()
      disconnect()
      listeners.clear()
      awareness.destroy()
      doc.destroy()
    },
  }
}
