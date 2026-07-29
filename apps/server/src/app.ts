import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Context } from 'hono'
import { z } from 'zod'
import type { MotherConfig } from '@mother/shared'
import { configSchema } from './config'
import { NoProfileError, NoProjectError, NoVaultError, type AppContext } from './context'
import { ProfileError, identitySchema } from './profiles'
import { ProjectError } from './projects'
import { PathError, normalize } from './vault/paths'
import { VaultError, createVault, listVaults } from './vault/vaults'

export const WEB_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']

const docBody = z.object({ path: z.string(), markdown: z.string() })
const moveBody = z.object({ from: z.string(), to: z.string() })
const remoteBody = z.object({ remoteUrl: z.string(), branch: z.string() })
const newVaultBody = z.object({
  name: z.string().min(1),
  remoteUrl: z.string().min(1),
  branch: z.string().min(1),
})
const openVaultBody = z.object({ path: z.string().min(1) })
const newProfileBody = identitySchema.extend({ name: z.string().min(1) })
const newProjectBody = z.object({
  name: z.string().min(1),
  profile: z.string().min(1),
})
const nameBody = z.object({ name: z.string().min(1) })
const pickProfileBody = z.object({ profile: z.string().min(1) })

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

  app.get('/api/projects', async (c) =>
    c.json({
      home: ctx.home,
      projects: await ctx.listProjects(),
      active: ctx.project,
    }),
  )

  app.post('/api/projects', async (c) => {
    const { name, profile } = await parse(c, newProjectBody)
    const project = await ctx.addProject(name, profile)
    return c.json({ project, config: ctx.config })
  })

  app.post('/api/projects/open', async (c) => {
    const { name } = await parse(c, nameBody)
    const project = await ctx.openProject(name)
    return c.json({ project, config: ctx.config })
  })

  app.put('/api/projects', async (c) => {
    const { profile } = await parse(c, pickProfileBody)
    return c.json({ project: await ctx.selectProfile(profile) })
  })

  app.delete('/api/projects', async (c) => {
    const active = await ctx.removeProject(query(c, 'name'))
    return c.json({ active, config: ctx.config })
  })

  app.get('/api/profiles', async (c) =>
    c.json({ profiles: await ctx.listProfiles(), active: ctx.profile }),
  )

  app.post('/api/profiles', async (c) => {
    const profile = await ctx.addProfile(await parse(c, newProfileBody))
    return c.json({ profile, project: ctx.project })
  })

  app.put('/api/profiles', async (c) =>
    c.json({ profile: await ctx.setIdentity(await parse(c, identitySchema)) }),
  )

  app.get('/api/vaults', async (c) => {
    const home = ctx.requireProject.path
    return c.json({ home, vaults: await listVaults(home) })
  })

  app.post('/api/vaults', async (c) => {
    const body = await parse(c, newVaultBody)
    const vault = await createVault(body, ctx.requireProfile, ctx.requireProject.path)
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

  app.get('/api/sync', (c) => c.json(ctx.sync.state))
  app.post('/api/sync/now', async (c) => c.json(await ctx.sync.syncNow()))
  app.post('/api/sync/clear-conflict', (c) => c.json(ctx.sync.clearConflict()))

  app.onError((error, c) => {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return c.json({ error: error.message }, 404)
    if (
      error instanceof NoVaultError ||
      error instanceof NoProjectError ||
      error instanceof NoProfileError
    )
      return c.json({ error: error.message }, 409)
    if (
      error instanceof BadRequest ||
      error instanceof PathError ||
      error instanceof ProfileError ||
      error instanceof ProjectError ||
      error instanceof VaultError
    )
      return c.json({ error: error.message }, 400)
    return c.json({ error: error.message }, 500)
  })

  return app
}
