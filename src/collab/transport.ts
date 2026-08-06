import type { Invite, RelayClientMessage, RelayServerMessage } from '@/types'
import { admissionToken, importKey, seal, unseal } from './crypto'
import { socketUrl } from './invite'

/** What the session hears from whatever is carrying its bytes. Three things, because three
 *  is what seed-versus-adopt and degradation need between them. */
export interface TransportEvents {
  frame(data: Uint8Array): void
  /** Everyone in the room, this peer included. One is being alone. */
  peers(count: number): void
  live(live: boolean): void
}

export interface Transport {
  send(data: Uint8Array): void
  close(): void
}

/** Injected, so the session can be run with no relay and no socket anywhere near it. */
export type Connect = (events: TransportEvents) => Transport

/** Same shape as the API client's, and for the same reason: the ordinary failure is a
 *  machine that just woke, and the other one is a relay that is not there. */
const BACKOFF_MS = [200, 500, 1000, 2000, 5000]

/**
 * The relay, over a websocket, with everything sealed. The key never leaves this file's
 * closure and never reaches the socket — what goes out is a room id, a derived token, and
 * frames the relay moves without being able to read.
 *
 * Sealing is asynchronous, so sends are chained rather than fired: the hello has to be the
 * first thing on the wire, and a frame that overtook it would be dropped by a relay that had
 * not yet been told which room it belongs to.
 */
export function relayTransport(invite: Invite): Connect {
  return (events) => {
    const opened = Promise.all([importKey(invite.key), admissionToken(invite.key)])
    let socket: WebSocket | null = null
    let attempts = 0
    let done = false
    let timer: ReturnType<typeof setTimeout> | null = null
    let chain: Promise<unknown> = Promise.resolve()

    function post(live: WebSocket, message: RelayClientMessage): void {
      if (live.readyState === 1) live.send(JSON.stringify(message))
    }

    function connect(): void {
      timer = null
      const live = new WebSocket(socketUrl(invite.relay))
      socket = live

      live.addEventListener('open', () => {
        chain = chain.then(async () => {
          const [, token] = await opened
          post(live, { type: 'hello', room: invite.room, token })
        })
      })

      live.addEventListener('message', (event) => {
        let message: RelayServerMessage
        try {
          message = JSON.parse(String(event.data)) as RelayServerMessage
        } catch {
          return
        }
        if (message.type === 'frame') {
          chain = chain.then(async () => {
            const [key] = await opened
            const data = await unseal(key, message.data)
            // A frame that does not open was not meant for this peer — or is a relay
            // operator's idea of a joke. Either way the session goes on without it.
            if (data) events.frame(data)
          })
          return
        }
        attempts = 0
        if (message.type === 'joined') events.live(true)
        events.peers(message.peers)
      })

      const gone = () => {
        if (done || socket !== live) return
        socket = null
        events.live(false)
        timer ??= setTimeout(connect, BACKOFF_MS[Math.min(attempts++, 4)])
      }
      live.addEventListener('close', gone)
      live.addEventListener('error', gone)
    }
    connect()

    return {
      send(data) {
        chain = chain.then(async () => {
          const live = socket
          if (!live) return
          const [key] = await opened
          post(live, { type: 'frame', data: await seal(key, data) })
        })
      },
      close() {
        done = true
        if (timer) clearTimeout(timer)
        socket?.close()
        socket = null
      },
    }
  }
}
