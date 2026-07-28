import { serve, type ServerType } from '@hono/node-server'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { WebSocketServer } from 'ws'
import { createApp } from './app'
import { AppContext, type ContextOptions } from './context'

/** Loopback only: there is no auth and full read/write access to the vault. */
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

  const sockets = new WebSocketServer({ server, path: '/ws' })
  sockets.on('connection', (socket) => context.relay.accept(socket))
  context.start()

  const { port } = server.address() as AddressInfo
  return {
    context,
    port,
    url: `http://${HOST}:${port}`,
    close: async () => {
      await context.close()
      sockets.close()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    },
  }
}

export { createApp } from './app'
export { AppContext } from './context'
