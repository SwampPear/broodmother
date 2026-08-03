import { readFile } from 'node:fs/promises'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Context } from 'hono'
import { z } from 'zod'
import {
  DreamError,
  imageTypeOf,
  type BroodmotherConfig,
  type DiffBasis,
  type DocRoot,
} from '@broodmother/shared'
import { BranchError } from './branches'
import { configSchema, gitSettingsSchema, remoteUrlSchema } from './config'
import { NoProfileError, NoProjectError, NoVaultError, type AppContext } from './context'
import { GithubError, configured as githubConfigured } from './github'
import { ProfileError, identitySchema, machineAuthor } from './profiles'
import { PathError, normalize } from './fs'
import { ProjectError } from './project'
import { VaultError } from './vault'

export const WEB_ORIGINS = ['http://localhost:6767', 'http://127.0.0.1:6767']

/** `vault`, or `project:<name>` — a path alone stopped being an address the moment a vault
 *  could link more than one repository. */
const rootSchema = z.custom<DocRoot>(
  (value) =>
    value === 'vault' || (typeof value === 'string' && /^project:.+$/.test(value)),
  'root must be "vault" or "project:<name>"',
)
const docBody = z.object({
  root: rootSchema,
  path: z.string(),
  markdown: z.string(),
})
const folderBody = z.object({ root: rootSchema, path: z.string() })
const moveBody = z.object({
  root: rootSchema,
  from: z.string(),
  to: z.string(),
})
const rootBody = z.object({ root: rootSchema })
/** Git is optional, so the remote and branch are too — but a vault asked to sync needs
 *  somewhere to sync to, and that is worth refusing early rather than half-creating. */
const newVaultBody = z
  .object({
    name: z.string().min(1),
    git: z.enum(['none', 'local', 'remote']),
    remoteUrl: remoteUrlSchema.nullish(),
    branch: z.string().min(1).nullish(),
  })
  .refine(
    (body) => body.git !== 'remote' || Boolean(body.remoteUrl?.trim()),
    'a vault that syncs needs a remote',
  )
const openVaultBody = z.object({ path: z.string().min(1) })
/** The same shape a vault is made from, plus which vault it goes in: a project is a
 *  repository too, and it is made the same way. */
const newProjectBody = z
  .object({
    name: z.string().min(1),
    vault: z.string().min(1).nullish(),
    git: z.enum(['none', 'local', 'remote']).optional(),
    remoteUrl: remoteUrlSchema.nullish(),
    branch: z.string().min(1).nullish(),
  })
  .refine(
    (body) => body.git !== 'remote' || Boolean(body.remoteUrl?.trim()),
    'a project cloned from a remote needs one',
  )
const scopeBody = z.object({ root: rootSchema })
const deviceCodeBody = z.object({ deviceCode: z.string().min(1) })
const newRepoBody = z.object({ name: z.string().min(1), private: z.boolean() })
const newProfileBody = identitySchema.extend({ name: z.string().min(1) })
const pickProfileBody = z.object({ profile: z.string().min(1) })
const branchBody = z.object({ root: rootSchema, name: z.string().min(1) })

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

/** Which two points a comparison is between. Unsaid is the branches as they stand, which is
 *  what the app opens on and what every caller before this one meant. */
function basis(c: Context): DiffBasis {
  return c.req.query('basis') === 'split' ? 'split' : 'now'
}

/** Which tree a GET is asking about. Every read names one, the same way every write does. */
function root(c: Context): DocRoot {
  const result = rootSchema.safeParse(c.req.query('root'))
  if (!result.success) throw new BadRequest('root must be "vault" or "project:<name>"')
  return result.data
}

export function createApp(ctx: AppContext): Hono {
  const app = new Hono()
  app.use('/api/*', cors({ origin: WEB_ORIGINS }))

  app.get('/api/profiles', async (c) =>
    c.json({
      profiles: await ctx.listProfiles(),
      active: ctx.profile,
      githubReady: githubConfigured(),
      suggestedAuthor: await machineAuthor(ctx.home),
    }),
  )

  app.post('/api/profiles', async (c) => {
    const profile = await ctx.addProfile(await parse(c, newProfileBody))
    return c.json({ profile, vault: ctx.vault })
  })

  app.put('/api/profiles', async (c) =>
    c.json({ profile: await ctx.setIdentity(await parse(c, identitySchema)) }),
  )

  app.get('/api/profiles/key', async (c) => c.json({ publicKey: await ctx.publicKey() }))

  app.post('/api/profiles/key', async (c) => c.json(await ctx.addKey()))

  /* Signing in is two requests: one that opens a code, and one asked again while the browser
     is being answered. Holding a request open for as long as someone takes to find their
     password is a request nobody can tell from a hang. */
  app.post('/api/github/device', async (c) => c.json(await ctx.startGithub()))

  app.post('/api/github/connect', async (c) => {
    const { deviceCode } = await parse(c, deviceCodeBody)
    return c.json(await ctx.connectGithub(deviceCode))
  })

  app.delete('/api/github', async (c) =>
    c.json({ profile: await ctx.disconnectGithub() }),
  )

  app.get('/api/github/repos', async (c) => c.json({ repos: await ctx.githubRepos() }))

  app.post('/api/github/repos', async (c) =>
    c.json({ repo: await ctx.createGithubRepo(await parse(c, newRepoBody)) }),
  )

  app.get('/api/vaults', async (c) =>
    c.json({ home: ctx.home, vaults: await ctx.listVaults(), active: ctx.vault }),
  )

  app.post('/api/vaults', async (c) => {
    const vault = await ctx.addVault(await parse(c, newVaultBody))
    return c.json({ vault, config: ctx.config })
  })

  app.post('/api/vaults/open', async (c) => {
    const { path } = await parse(c, openVaultBody)
    return c.json({ config: await ctx.openVault(path) })
  })

  app.put('/api/vaults', async (c) => {
    const { profile } = await parse(c, pickProfileBody)
    return c.json({ vault: await ctx.selectProfile(profile) })
  })

  app.delete('/api/vaults', async (c) => {
    const active = await ctx.removeVault(query(c, 'name'))
    return c.json({ active, config: ctx.config })
  })

  app.get('/api/projects', async (c) => c.json({ projects: await ctx.listProjects() }))

  app.post('/api/projects', async (c) => {
    const project = await ctx.addProject(await parse(c, newProjectBody))
    return c.json({ project, config: ctx.config })
  })

  app.delete('/api/projects', async (c) => {
    await ctx.removeProject(query(c, 'name'))
    return c.json({ config: ctx.config })
  })

  app.post('/api/scope', async (c) => {
    const { root: to } = await parse(c, scopeBody)
    return c.json({ config: await ctx.setScope(to) })
  })

  /** Every tree at once: they are one sidebar, and they change together. */
  app.get('/api/tree', async (c) => c.json(await ctx.trees()))

  app.get('/api/branches', async (c) => {
    const of = root(c)
    return c.json({
      branches: await ctx.listBranches(of),
      active: await ctx.activeBranch(of),
    })
  })

  app.post('/api/branches', async (c) => {
    const { root: of, name } = await parse(c, branchBody)
    return c.json({ branch: await ctx.addBranch(of, name), config: ctx.config })
  })

  app.post('/api/branches/open', async (c) => {
    const { root: of, name } = await parse(c, branchBody)
    return c.json({ branch: await ctx.openBranch(of, name), config: ctx.config })
  })

  app.delete('/api/branches', async (c) => {
    const branches = await ctx.removeBranch(root(c), query(c, 'name'))
    return c.json({ branches, config: ctx.config })
  })

  /** Two branches compared whole. Nothing here is about a commit: what is reported is the
   *  difference between the branch you are on and the branch you named — as the two stand,
   *  or against where they parted, which is what the basis says. */
  app.get('/api/diff', async (c) =>
    c.json({ files: await ctx.diff(root(c), query(c, 'against'), basis(c)) }),
  )

  app.get('/api/diff/file', async (c) =>
    c.json(await ctx.diffFile(root(c), query(c, 'against'), query(c, 'path'), basis(c))),
  )

  /** Finished with a shell. Sockets do not end one — every way a socket has of closing is
   *  somebody meaning to come back — so this is where a tab says it is done. */
  app.delete('/api/terminal', async (c) =>
    c.json({ closed: ctx.terminals.finish(query(c, 'session')) }),
  )

  /**
   * The bytes of a file, for the things in a tree that are not text. `/api/doc` reads as
   * UTF-8, which turns a PNG into replacement characters — and turns saving it back into
   * losing it. The path goes through the tree's own resolution, so this reaches nothing a
   * document could not.
   */
  app.get('/api/file', async (c) => {
    const path = query(c, 'path')
    const type = imageTypeOf(path)
    if (!type) throw new BadRequest('not a file this serves')
    const bytes = await readFile(await ctx.rootOf(root(c)).tree.resolve(path))
    return c.body(bytes.buffer as ArrayBuffer, 200, {
      'content-type': type,
      // The file is on disk and the watcher reports writes, so the answer is only good
      // until something changes it.
      'cache-control': 'no-cache',
    })
  })

  app.get('/api/doc', async (c) =>
    c.json({ markdown: await ctx.rootOf(root(c)).tree.read(query(c, 'path')) }),
  )

  app.put('/api/doc', async (c) => {
    const { root: of, path, markdown } = await parse(c, docBody)
    const open = ctx.rootOf(of)
    const docPath = normalize(path)
    const existed = await open.tree.exists(docPath)
    open.watcher?.suppress(docPath)
    await open.tree.write(docPath, markdown)
    if (of === 'vault') {
      await ctx.open.links.update(docPath)
      ctx.sync.noteEdit()
    }
    ctx.broadcast({
      type: 'tree',
      root: of,
      event: { type: existed ? 'changed' : 'created', path: docPath },
    })
    return c.json({ ok: true } as const)
  })

  /**
   * An empty folder. Nothing is written into it, so there is no link index to update and
   * nothing for a commit to carry — git does not track a directory, only the files in one.
   * The tree still hears about it, because the sidebar draws the disk rather than the repo.
   */
  app.post('/api/folder', async (c) => {
    const { root: of, path } = await parse(c, folderBody)
    const open = ctx.rootOf(of)
    const docPath = await open.tree.mkdir(path)
    ctx.broadcast({ type: 'tree', root: of, event: { type: 'created', path: docPath } })
    return c.json({ ok: true } as const)
  })

  app.post('/api/doc/move', async (c) => {
    const body = await parse(c, moveBody)
    const open = ctx.rootOf(body.root)
    open.watcher?.suppress(normalize(body.from), normalize(body.to))
    const { from, to } = await open.tree.move(body.from, body.to)
    // Wikilinks are a vault idea, so only a vault has links to put right afterwards.
    const linksRewritten =
      body.root === 'vault' ? await ctx.open.links.rewriteForMove(from, to) : 0
    if (body.root === 'vault') ctx.sync.noteEdit()
    ctx.broadcast({ type: 'tree', root: body.root, event: { type: 'moved', from, to } })
    return c.json({ to, linksRewritten })
  })

  app.delete('/api/doc', async (c) => {
    const of = root(c)
    const open = ctx.rootOf(of)
    const path = query(c, 'path')
    open.watcher?.suppress(normalize(path))
    const removed = await open.tree.remove(path)
    if (of === 'vault') {
      ctx.open.links.forget(removed)
      ctx.sync.noteEdit()
    }
    ctx.broadcast({ type: 'tree', root: of, event: { type: 'removed', path: removed } })
    return c.json({ ok: true } as const)
  })

  app.post('/api/dream/run', async (c) => {
    const { root: of, path } = await parse(c, folderBody)
    return c.json({ run: await ctx.dreams.run({ root: of, path }) })
  })

  app.get('/api/dream/runs', (c) =>
    c.json({ runs: ctx.dreams.runsFor({ root: root(c), path: query(c, 'path') }) }),
  )

  app.get('/api/dreams', async (c) => c.json({ dreams: await ctx.dreams.summaries() }))

  app.get('/api/dream/log', (c) => c.json({ runs: ctx.dreams.log() }))

  app.get('/api/personas', (c) => c.json({ personas: ctx.opened?.personas ?? [] }))

  app.get('/api/links', async (c) => {
    const path = normalize(query(c, 'path'))
    return c.json({
      backlinks: ctx.open.links.backlinks(path),
      outbound: ctx.open.links.outbound(path),
    })
  })

  app.get('/api/config', (c) => c.json({ config: ctx.config, reset: ctx.store.reset }))

  app.put('/api/config', async (c) => {
    const config = (await parse(c, configSchema)) as BroodmotherConfig
    return c.json({ config: await ctx.setConfig(config) })
  })

  /** Asked on purpose rather than found out by a sync failing, and it names which of the
   *  four reasons it is — `auth` on its own is not something anyone can act on. */
  app.post('/api/git/check', async (c) => {
    const { root: of } = await parse(c, rootBody)
    return c.json(await ctx.checkAccess(of))
  })

  /** What git says about the open vault's checkout, and how this vault is set to sync. Two
   *  halves of one answer: the first is read off disk, the second is the machine's own
   *  setting. A project's repository is yours to commit, so nothing here speaks for it. */
  app.get('/api/git', async (c) =>
    c.json({ state: await ctx.gitState(), settings: ctx.gitSettings }),
  )

  app.put('/api/git', async (c) =>
    c.json({ settings: await ctx.setGitSettings(await parse(c, gitSettingsSchema)) }),
  )

  app.delete('/api/data', async (c) => c.json({ config: await ctx.removeEverything() }))

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
      error instanceof DreamError ||
      error instanceof PathError ||
      error instanceof ProfileError ||
      error instanceof VaultError ||
      error instanceof ProjectError ||
      error instanceof BranchError ||
      error instanceof GithubError
    )
      return c.json({ error: error.message }, 400)
    return c.json({ error: error.message }, 500)
  })

  return app
}
