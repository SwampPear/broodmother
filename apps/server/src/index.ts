import { serve, type ServerType } from '@hono/node-server'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { WebSocketServer, type WebSocket } from 'ws'
import type { DocRoot, WsRoute } from '@broodmother/shared'
import { createApp } from './app'
import { AppContext, type ContextOptions } from './context'

/** Loopback only: there is no auth and full read/write access to the project. */
export const HOST = '127.0.0.1'
export const PORT = 3001

export interface ServerHandle {
  context: AppContext
  port: number
  url: string
  close: () => Promise<void>
}

export async function startServer(
  options: ContextOptions & { port?: number } = {},
): Promise<ServerHandle> {
  const context = await AppContext.create(options)
  const app = createApp(context)

  const server = (await new Promise<ServerType>((resolve) => {
    const created = serve(
      { fetch: app.fetch, hostname: HOST, port: options.port ?? PORT },
      () => resolve(created),
    )
  })) as Server

  // One socket server, dispatched by path: `path` on two of them 400s the other's route.
  const sockets = new WebSocketServer({ noServer: true })
  const routes: Record<WsRoute, (socket: WebSocket, url: URL) => void> = {
    '/ws': (socket) => context.relay.accept(socket),
    // A shell opens in the root it was asked for, so a terminal started in one project does
    // not follow the scope somewhere else between the click and the spawn.
    '/terminal': (socket, url) =>
      context.terminals.accept(socket, url.searchParams.get('root') as DocRoot | null),
  }
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url ?? '/', 'http://localhost')
    const route = routes[url.pathname as WsRoute] as
      ((socket: WebSocket, url: URL) => void) | undefined
    if (!route) return socket.destroy()
    sockets.handleUpgrade(request, socket, head, (ws) => route(ws, url))
  })
  const { port } = server.address() as AddressInfo
  const url = `http://${HOST}:${port}`
  context.start(url)

  return {
    context,
    port,
    url,
    close: async () => {
      await context.close()
      sockets.close()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    },
  }
}

export { createApp } from './app'
export { AppContext } from './context'
