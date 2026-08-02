import type {
  ApiError,
  ApiRequest,
  ApiResponse,
  ApiRoute,
  ServerMessage,
  TerminalClientMessage,
  TerminalServerMessage,
  WsRoute,
} from '@broodmother/shared'
import type { ApiClient, Connection } from './client'

/** Where the backend is. Exported because bytes are fetched by the browser directly —
 *  an `<img src>` is a request this client does not make. */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001'
const base = API_BASE

/**
 * How long to wait before trying again, by how many tries have failed. It starts inside a
 * frame or two because the ordinary case is a machine that has just woken and a backend that
 * was there the whole time, and it settles at five seconds because the other case is a
 * backend that is not running and there is nothing to be gained by asking quickly.
 */
const BACKOFF_MS = [200, 500, 1000, 2000, 5000]

/**
 * A socket that comes back. The connection outlives any one of them: sleep, a tab the
 * browser froze and a backend restarting all close the socket underneath, and none of those
 * is the app saying it was finished.
 *
 * `query` is asked for again on each attempt rather than held, because what to reconnect as
 * can depend on what the last connection learned — a terminal comes back asking for the
 * shell it was given.
 */
function open<Send, Receive>(
  route: WsRoute,
  query: () => string,
  onMessage: (message: Receive) => void,
  onLive?: (live: boolean) => void,
): Connection<Send> {
  let socket: WebSocket | null = null
  let attempts = 0
  let done = false
  /** Whether a socket has ever opened, which is what the holding below is waiting for. */
  let opened = false
  let timer: ReturnType<typeof setTimeout> | null = null
  // Sends made before the socket first opens are held, not dropped — the first is a resize.
  // Nothing is held across a reconnect: a line typed at a terminal that was not listening
  // should not run when it comes back, minutes later, in whatever is on screen by then.
  const queue: string[] = []

  const connect = () => {
    timer = null
    const live = new WebSocket(new URL(`${route}${query()}`, base.replace(/^http/, 'ws')))
    socket = live
    live.addEventListener('message', (event) => onMessage(JSON.parse(String(event.data))))
    live.addEventListener('open', () => {
      attempts = 0
      opened = true
      for (const message of queue.splice(0)) live.send(message)
      onLive?.(true)
    })
    // Close and error both land here; a socket that failed to open only ever fires error.
    const gone = () => {
      if (done || socket !== live) return
      socket = null
      onLive?.(false)
      timer ??= setTimeout(
        connect,
        BACKOFF_MS[Math.min(attempts++, BACKOFF_MS.length - 1)],
      )
    }
    live.addEventListener('close', gone)
    live.addEventListener('error', gone)
  }
  connect()

  return {
    send(message) {
      const encoded = JSON.stringify(message)
      if (socket?.readyState === WebSocket.OPEN) socket.send(encoded)
      else if (!opened) queue.push(encoded)
    },
    close() {
      done = true
      if (timer) clearTimeout(timer)
      socket?.close()
      socket = null
    },
  }
}

export function httpClient(): ApiClient {
  return {
    async request<R extends ApiRoute>(route: R, body: ApiRequest<R>) {
      const [method, path] = route.split(' ')
      const url = new URL(path, base)
      const inQuery = method === 'GET' || method === 'DELETE'
      if (inQuery && body) {
        for (const [key, value] of Object.entries(body))
          url.searchParams.set(key, String(value))
      }
      const response = await fetch(url, {
        method,
        headers: inQuery ? undefined : { 'content-type': 'application/json' },
        body: inQuery || !body ? undefined : JSON.stringify(body),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error((payload as ApiError).error)
      return payload as ApiResponse<R>
    },

    connect: (onMessage, onLive) =>
      open<never, ServerMessage>('/ws', () => '', onMessage, onLive),

    terminal({ root, session }, onMessage, onLive) {
      // Both, every time. The name is what reaches the shell that is already running; the
      // root is where one opens when that name has none — a session reaped, exited while
      // nobody was watching, or asked for after the backend was restarted underneath it.
      const query = `?root=${encodeURIComponent(root)}&session=${encodeURIComponent(session)}`
      // `close` lets go of the socket and nothing else. The shell goes on running, and is
      // ended by `DELETE /api/terminal` — said by whoever is finished with it, which is not
      // the same as whoever stopped watching.
      return open<TerminalClientMessage, TerminalServerMessage>(
        '/terminal',
        () => query,
        onMessage,
        onLive,
      )
    },
  }
}
