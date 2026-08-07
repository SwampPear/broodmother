import { existsSync, readdirSync } from 'node:fs'
import { mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { execa } from 'execa'
import {
  Dreams,
  RunStore,
  Tree,
  TriggerStore,
  readPersona,
  timerScheduler,
  type DreamSite,
} from '@broodmother/server'
import {
  DreamError,
  basename,
  isDreamPath,
  projectOf,
  projectRoot,
  serializeDream,
  type DocRef,
  type Dream,
  type DreamRun,
  type DreamSummary,
  type HostedDream,
  type LairStatus,
} from '@broodmother/shared'
import { Keys } from './auth'
import { openHome, type LairHome } from './home'
import { Rooms } from './rooms'
import { SiteError, Sites } from './sites'

/**
 * The lair's whole state: keys, rooms, sites, and the same dreams orchestrator the
 * laptop runs — pointed at pushed dream files, run in the site's clone, kept in time by
 * an in-process clock, wrapped in a pull before every walk and a push after it.
 */
export class LairContext {
  readonly keys: Keys
  readonly rooms = new Rooms()
  readonly sites: Sites
  readonly dreams: Dreams
  private readonly runStore: RunStore
  private readonly startedAt = Date.now()
  private claudeReady = false
  private version = '0.0.0'

  private constructor(readonly home: LairHome) {
    this.keys = new Keys(path.join(home.root, 'keys.json'))
    this.sites = new Sites(home.sites, home.sshKeyPath)
    this.runStore = new RunStore(path.join(home.root, 'dreams.db'))
    this.dreams = new Dreams({
      sites: () => this.hostedSites(),
      vault: (site) => new Tree(site.path),
      scheduler: timerScheduler((ref) => this.dreams.run(ref)),
      store: new TriggerStore(path.join(home.root, 'triggers.json')),
      runs: this.runStore,
      scratch: () => this.home.runs,
      persona: (name, site) => readPersona(site.path, name),
      around: async (ref, site, walk) => {
        const name = projectOf(site.root)
        if (name) await this.sites.pull(name)
        try {
          await walk()
        } finally {
          if (name)
            await this.sites.push(
              name,
              `dream: ${basename(ref.path).replace(/\.dream$/, '')}`,
            )
        }
      },
    })
  }

  static async create(root: string): Promise<LairContext> {
    const context = new LairContext(await openHome(root))
    const pkg = await readFile(new URL('../package.json', import.meta.url), 'utf8')
      .then((text) => JSON.parse(text) as { version?: string })
      .catch(() => ({ version: undefined }))
    context.version = pkg.version ?? '0.0.0'
    const claude = await execa('claude', ['--version'], {
      reject: false,
      timeout: 10_000,
    }).catch(() => ({ exitCode: 1 }))
    context.claudeReady = claude.exitCode === 0
    return context
  }

  /** A site earns a place on the beat once a dream is filed under it and its clone is
   *  still there — the dream files live beside the clone, never inside it. */
  private hostedSites(): DreamSite[] {
    if (!existsSync(this.home.dreams)) return []
    return readdirSync(this.home.dreams, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(this.sites.dir(entry.name)))
      .map((entry) => ({
        root: projectRoot(entry.name),
        tree: new Tree(path.join(this.home.dreams, entry.name)),
        path: this.sites.dir(entry.name),
      }))
  }

  private dreamTree(site: string): Tree {
    return new Tree(path.join(this.home.dreams, site))
  }

  async putDream(site: string, docPath: string, dream: Dream): Promise<HostedDream> {
    if (!(await this.sites.has(site))) throw new SiteError(`no site named "${site}"`)
    if (!isDreamPath(docPath))
      throw new DreamError(`${docPath} is not a dream — dreams end in .dream`)
    await mkdir(path.join(this.home.dreams, site), { recursive: true })
    await this.dreamTree(site).write(docPath, serializeDream(dream))
    const hosted = (await this.hostedDreams()).find(
      (one) => one.site === site && one.path === docPath,
    )
    if (!hosted) throw new DreamError(`could not file ${docPath} under ${site}`)
    return hosted
  }

  async removeDream(site: string, docPath: string): Promise<HostedDream[]> {
    await this.dreamTree(site).remove(docPath)
    return this.hostedDreams()
  }

  async hostedDreams(): Promise<HostedDream[]> {
    return (await this.dreams.summaries()).map(toHosted)
  }

  async runDream(site: string, docPath: string): Promise<DreamRun> {
    return this.dreams.run(hostedRef(site, docPath))
  }

  runsFor(site: string, docPath: string): DreamRun[] {
    return this.dreams.runsFor(hostedRef(site, docPath))
  }

  async status(): Promise<LairStatus> {
    return {
      version: this.version,
      uptime: Math.floor((Date.now() - this.startedAt) / 1000),
      sites: (await this.sites.names()).length,
      claude: this.claudeReady,
    }
  }

  close(): void {
    this.dreams.stop()
    this.rooms.close()
    this.runStore.close()
  }
}

function hostedRef(site: string, docPath: string): DocRef {
  return { root: projectRoot(site), path: docPath }
}

function toHosted(summary: DreamSummary): HostedDream {
  return {
    site: projectOf(summary.ref.root) ?? summary.ref.root,
    path: summary.ref.path,
    name: summary.name,
    triggers: summary.triggers,
    lastRun: summary.lastRun,
  }
}
