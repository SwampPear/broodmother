import type {
  ApiError,
  ApiRequest,
  ApiResponse,
  ApiRoute,
  ServerMessage,
} from '@docs/shared'
import type { ApiClient, Connection } from './client'

const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001'

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

    connect(onMessage: (message: ServerMessage) => void): Connection {
      const socket = new WebSocket(new URL('/ws', base.replace(/^http/, 'ws')))
      socket.addEventListener('message', (event) =>
        onMessage(JSON.parse(String(event.data))),
      )
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
    },
  }
}
