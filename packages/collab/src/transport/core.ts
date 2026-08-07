import { LAIR_ROOM_ROUTE, type Invite, type RelayMessage } from '@broodmother/shared'

/** The pipe a session talks through. Injected everywhere so the whole package tests with
 *  no socket: the real one dials the lair, the fakes live beside the tests. */
export interface Transport {
  /** Sends are best-effort: a message while the pipe is down is dropped, because the
   *  resync on reconnect carries everything a lost frame would have. */
  send(message: RelayMessage): void
  onMessage(handler: (message: RelayMessage) => void): () => void
  onLive(handler: (live: boolean) => void): () => void
  close(): void
}

const RETRY_MS = [200, 500, 1000, 2000, 5000]

export interface RelayTransportOptions {
  invite: Invite
  /** The socket constructor, injectable for tests; the browser's by default. */
  sockets?: (url: string) => WebSocket
}

export function roomUrl(invite: Invite): string {
  const url = new URL(invite.url)
  url.protocol = url.protocol === 'http:' ? 'ws:' : 'wss:'
  url.pathname = LAIR_ROOM_ROUTE
  url.searchParams.set('room', invite.room)
  url.searchParams.set('token', invite.token)
  return url.toString()
}

/** Dials the lair's room and keeps dialing: the relay being down degrades the session to
 *  solo, and coming back is a resync, not a loss. */
export function relayTransport(options: RelayTransportOptions): Transport {
  const dial = options.sockets ?? ((url: string) => new WebSocket(url))
  const messageHandlers = new Set<(message: RelayMessage) => void>()
  const liveHandlers = new Set<(live: boolean) => void>()
  let socket: WebSocket | null = null
  let closed = false
  let attempt = 0
  let timer: ReturnType<typeof setTimeout> | null = null

  function open(): void {
    if (closed) return
    const dialed = dial(roomUrl(options.invite))
    socket = dialed
    dialed.onopen = () => {
      attempt = 0
      for (const handler of liveHandlers) handler(true)
    }
    dialed.onmessage = (event) => {
      let message: RelayMessage
      try {
        message = JSON.parse(String(event.data)) as RelayMessage
      } catch {
        return
      }
      for (const handler of messageHandlers) handler(message)
    }
    dialed.onclose = () => {
      if (socket !== dialed) return
      socket = null
      for (const handler of liveHandlers) handler(false)
      if (closed) return
      timer = setTimeout(open, RETRY_MS[Math.min(attempt++, RETRY_MS.length - 1)])
    }
    dialed.onerror = () => dialed.close()
  }

  open()

  return {
    send(message) {
      if (socket?.readyState === 1) socket.send(JSON.stringify(message))
    },
    onMessage(handler) {
      messageHandlers.add(handler)
      return () => messageHandlers.delete(handler)
    },
    onLive(handler) {
      liveHandlers.add(handler)
      return () => liveHandlers.delete(handler)
    },
    close() {
      closed = true
      if (timer) clearTimeout(timer)
      socket?.close()
      socket = null
    },
  }
}
