import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Context } from 'hono'
import { WebSocket } from 'ws'
import { z } from 'zod'
import type { MotherConfig } from '@mother/shared'
import { configSchema } from './config'
import { NoVaultError, type AppContext } from './context'
import { PathError, normalize } from './paths'
import { VaultError, createVault, listVaults } from './vaults'

export const WEB_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']

const docBody = z.object({ path: z.string(), markdown: z.string() })
const moveBody = z.object({ from: z.string(), to: z.string() })
const remoteBody = z.object({ remoteUrl: z.string(), branch: z.string() })
const relayBody = z.object({ relayUrl: z.string() })
const newVaultBody = z.object({
  name: z.string().min(1),
  remoteUrl: z.string().min(1),
  branch: z.string().min(1),
})
const openVaultBody = z.object({ path: z.string().min(1) })

class BadRequest extends Error {}

async function parse<T>(c: Context, schema: z.ZodType<T>): Promise<T> {
  const raw = await c.req.json().catch(() => {
    throw new BadRequest('body must be JSON')
  })
  const result = schema.safeParse(raw)
  if (!result.success)
    throw new BadRequest(result.error.issues.map((i) => i.message).join('; '))
  return result.data
}

function query(c: Context, name: string): string {
  const value = c.req.query(name)
  if (!value) throw new BadRequest(`missing ${name}`)
  return value
}

export function createApp(ctx: AppContext): Hono {
  const app = new Hono()
  app.use('/api/*', cors({ origin: WEB_ORIGINS }))

  app.get('/api/vaults', async (c) =>
    c.json({ home: ctx.home, vaults: await listVaults(ctx.home) }),
  )

  app.post('/api/vaults', async (c) => {
    const body = await parse(c, newVaultBody)
    const vault = await createVault(body, ctx.config.gitAuthor, ctx.home)
    const config = await ctx.setConfig({
      ...ctx.config,
      vaultPath: vault.path,
      remoteUrl: body.remoteUrl,
      branch: body.branch,
      syncEnabled: true,
    })
    return c.json({ vault, config })
  })

  app.post('/api/vaults/open', async (c) => {
    const { path } = await parse(c, openVaultBody)
    return c.json({ config: await ctx.openVault(path) })
  })

  app.get('/api/vault', async (c) => c.json({ entries: await ctx.open.vault.list() }))

  app.get('/api/doc', async (c) =>
    c.json({ markdown: await ctx.open.vault.read(query(c, 'path')) }),
  )

  app.put('/api/doc', async (c) => {
    const { path, markdown } = await parse(c, docBody)
    const vaultPath = normalize(path)
    const existed = await ctx.open.vault.exists(vaultPath)
    ctx.open.watcher.suppress(vaultPath)
    await ctx.open.vault.write(vaultPath, markdown)
    await ctx.open.links.update(vaultPath)
    ctx.sync.noteEdit()
    ctx.broadcast({
      type: 'vault',
      event: { type: existed ? 'changed' : 'created', path: vaultPath },
    })
    return c.json({ ok: true } as const)
  })

  app.post('/api/doc/move', async (c) => {
    const body = await parse(c, moveBody)
    ctx.open.watcher.suppress(normalize(body.from), normalize(body.to))
    const { from, to } = await ctx.open.vault.move(body.from, body.to)
    const linksRewritten = await ctx.open.links.rewriteForMove(from, to)
    ctx.sync.noteEdit()
    ctx.broadcast({ type: 'vault', event: { type: 'moved', from, to } })
    return c.json({ to, linksRewritten })
  })

  app.delete('/api/doc', async (c) => {
    const path = query(c, 'path')
    ctx.open.watcher.suppress(normalize(path))
    const removed = await ctx.open.vault.remove(path)
    ctx.open.links.forget(removed)
    ctx.sync.noteEdit()
    ctx.broadcast({ type: 'vault', event: { type: 'removed', path: removed } })
    return c.json({ ok: true } as const)
  })

  app.get('/api/links', async (c) => {
    const path = normalize(query(c, 'path'))
    return c.json({
      backlinks: ctx.open.links.backlinks(path),
      outbound: ctx.open.links.outbound(path),
    })
  })

  app.get('/api/config', (c) => c.json({ config: ctx.config, reset: ctx.store.reset }))

  app.put('/api/config', async (c) => {
    const config = (await parse(c, configSchema)) as MotherConfig
    return c.json({ config: await ctx.setConfig(config) })
  })

  app.post('/api/config/test-remote', async (c) => {
    const { remoteUrl, branch } = await parse(c, remoteBody)
    return c.json(await ctx.open.git.testRemote(remoteUrl, branch))
  })

  app.post('/api/config/test-relay', async (c) => {
    const { relayUrl } = await parse(c, relayBody)
    return c.json(await testRelay(relayUrl))
  })

  app.get('/api/sync', (c) => c.json(ctx.sync.state))
  app.post('/api/sync/now', async (c) => c.json(await ctx.sync.syncNow()))
  app.post('/api/sync/clear-conflict', (c) => c.json(ctx.sync.clearConflict()))

  app.onError((error, c) => {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return c.json({ error: error.message }, 404)
    if (error instanceof NoVaultError) return c.json({ error: error.message }, 409)
    if (
      error instanceof BadRequest ||
      error instanceof PathError ||
      error instanceof VaultError
    )
      return c.json({ error: error.message }, 400)
    return c.json({ error: error.message }, 500)
  })

  return app
}

async function testRelay(relayUrl: string): Promise<{ ok: boolean; message: string }> {
  if (!/^wss?:\/\//.test(relayUrl))
    return { ok: false, message: 'relay URL must be ws:// or wss://' }
  return new Promise((resolve) => {
    const socket = new WebSocket(relayUrl)
    const finish = (ok: boolean, message: string) => {
      clearTimeout(timer)
      socket.close()
      resolve({ ok, message })
    }
    const timer = setTimeout(() => finish(false, 'timed out after 5s'), 5000)
    socket.on('open', () => finish(true, 'relay reachable'))
    socket.on('error', (error) => finish(false, error.message))
  })
}
