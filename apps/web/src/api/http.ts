import type {
  ApiError,
  ApiRequest,
  ApiResponse,
  ApiRoute,
  ServerMessage,
  TerminalClientMessage,
  TerminalServerMessage,
  WsRoute,
} from '@mother/shared'
import type { ApiClient, Connection } from './client'

const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001'

/** Sends made before the socket opens are held, not dropped — the first is a resize. */
function open<Send, Receive>(
  route: WsRoute,
  onMessage: (message: Receive) => void,
  onClose?: () => void,
): Connection<Send> {
  const socket = new WebSocket(new URL(route, base.replace(/^http/, 'ws')))
  socket.addEventListener('message', (event) => onMessage(JSON.parse(String(event.data))))
  // A backend that is down closes rather than answering; without this the panel just sits
  // there swallowing keystrokes, which reads as "the terminal is broken".
  socket.addEventListener('close', () => onClose?.())
  socket.addEventListener('error', () => onClose?.())
  const queue: string[] = []
  socket.addEventListener('open', () => {
    for (const message of queue.splice(0)) socket.send(message)
  })
  return {
    send(message) {
      const encoded = JSON.stringify(message)
      if (socket.readyState === WebSocket.OPEN) socket.send(encoded)
      else queue.push(encoded)
    },
    close: () => socket.close(),
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

    connect: (onMessage) => open<never, ServerMessage>('/ws', onMessage),

    terminal: (onMessage, onClose) =>
      open<TerminalClientMessage, TerminalServerMessage>('/terminal', onMessage, onClose),
  }
}
