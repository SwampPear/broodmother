import { Hono } from 'hono'
import type { Context } from 'hono'
import { z } from 'zod'
import { PathError, normalize, remoteUrlSchema } from '@broodmother/server'
import { DreamError, parseDream } from '@broodmother/shared'
import { AuthError, sameSecret } from './auth'
import type { LairContext } from './context'
import { SiteError } from './sites'

/** No key, or the wrong one — the 401 the app's check reads as `refused`. */
class Refused extends Error {}

class BadRequest extends Error {}

const keyBody = z.object({ name: z.string().min(1) })
const siteBody = z.object({ name: z.string().min(1), remote: remoteUrlSchema })
const dreamBody = z.object({
  site: z.string().min(1),
  path: z.string().min(1),
  dream: z.unknown(),
})
const runBody = z.object({ site: z.string().min(1), path: z.string().min(1) })

async function parse<T>(c: Context, schema: z.ZodType<T>): Promise<T> {
  const raw: unknown = await c.req.json().catch(() => {
    throw new BadRequest('body must be JSON')
  })
  const result = schema.safeParse(raw)
  if (!result.success)
    throw new BadRequest(result.error.issues.map((issue) => issue.message).join('; '))
  return result.data
}

function query(c: Context, name: string): string {
  const value = c.req.query(name)
  if (!value) throw new BadRequest(`missing ${name}`)
  return value
}

function bearer(c: Context): string {
  return (
    c.req
      .header('authorization')
      ?.replace(/^bearer\s+/i, '')
      .trim() ?? ''
  )
}

export function createLairApp(ctx: LairContext): Hono {
  const app = new Hono()

  function admin(c: Context): void {
    if (!sameSecret(bearer(c), ctx.home.adminToken))
      throw new Refused('the admin token is required here')
  }

  /** The admin token opens everything a key does: minting yourself a key to use your
   *  own lair would be a step with nothing on the other side of it. */
  async function keyed(c: Context): Promise<void> {
    const token = bearer(c)
    if (sameSecret(token, ctx.home.adminToken)) return
    if (await ctx.keys.holds(token)) return
    throw new Refused('a key is required — mint one with `lair keys mint <name>`')
  }

  app.get('/status', async (c) => {
    await keyed(c)
    return c.json(await ctx.status())
  })

  app.get('/keys', async (c) => {
    admin(c)
    return c.json({ keys: await ctx.keys.list() })
  })

  app.post('/keys', async (c) => {
    admin(c)
    const { name } = await parse(c, keyBody)
    return c.json({ grant: await ctx.keys.mint(name) })
  })

  app.delete('/keys', async (c) => {
    admin(c)
    return c.json({ keys: await ctx.keys.revoke(query(c, 'id')) })
  })

  app.get('/key', async (c) => {
    await keyed(c)
    return c.json({ publicKey: ctx.home.publicKey ?? '' })
  })

  app.get('/sites', async (c) => {
    await keyed(c)
    return c.json({ sites: await ctx.sites.list() })
  })

  app.put('/sites', async (c) => {
    admin(c)
    const { name, remote } = await parse(c, siteBody)
    return c.json({ site: await ctx.sites.add(name, remote) })
  })

  app.get('/dreams', async (c) => {
    await keyed(c)
    return c.json({ dreams: await ctx.hostedDreams() })
  })

  app.put('/dreams', async (c) => {
    await keyed(c)
    const { site, path, dream } = await parse(c, dreamBody)
    return c.json({
      dream: await ctx.putDream(site, normalize(path), parseDream(JSON.stringify(dream))),
    })
  })

  app.delete('/dreams', async (c) => {
    await keyed(c)
    return c.json({
      dreams: await ctx.removeDream(query(c, 'site'), normalize(query(c, 'path'))),
    })
  })

  app.post('/dream/run', async (c) => {
    await keyed(c)
    const { site, path } = await parse(c, runBody)
    return c.json({ run: await ctx.runDream(site, path) })
  })

  app.post('/dream/stop', async (c) => {
    await keyed(c)
    const { site, path } = await parse(c, runBody)
    return c.json({ run: await ctx.stopDream(site, path) })
  })

  app.get('/dream/runs', async (c) => {
    await keyed(c)
    return c.json({ runs: ctx.runsFor(query(c, 'site'), query(c, 'path')) })
  })

  app.post('/rooms', async (c) => {
    await keyed(c)
    return c.json(ctx.rooms.mint())
  })

  app.onError((error, c) => {
    if (error instanceof Refused) return c.json({ error: error.message }, 401)
    if (
      error instanceof BadRequest ||
      error instanceof AuthError ||
      error instanceof SiteError ||
      error instanceof DreamError ||
      error instanceof PathError
    )
      return c.json({ error: error.message }, 400)
    if ((error as NodeJS.ErrnoException).code === 'ENOENT')
      return c.json({ error: error.message }, 404)
    return c.json({ error: error.message }, 500)
  })

  return app
}
