import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { defaultGitSettings } from '@/core'
import type {
  BroodmotherConfig,
  GithubDevice,
  Identity,
  Profile,
  VaultSummary,
} from '@/types'
import { ConfigStore, defaultConfig } from './config'
import { NoVaultError, VaultContext, type VaultDeps } from './context'
import {
  Crontab,
  Dreams,
  RunStore,
  TriggerStore,
  systemCrontab,
  type CrontabIO,
  type DreamSite,
} from './dreams'
import { startDevice } from './github'
import { migrate } from './migrate'
import {
  ProfileError,
  broodmotherHome,
  createProfile,
  expandHome,
  findProfile,
  listProfiles,
  profileDir,
} from './profiles'
import { Relay, Terminals } from './sockets'
import {
  VaultError,
  createVault,
  deleteVault,
  findVault,
  listVaults,
  readPersona,
  type NewVault,
} from './vault'

export interface ManagerOptions {
  root?: string
  home?: string
  /** The system crontab unless a test hands in a tamer one. */
  cron?: CrontabIO
}

/**
 * The process-wide half: one config, one relay, one shell pool, one dream scheduler — and a
 * context per open vault, each window working in its own. `config.vaultPath` is demoted to
 * a memory of what was opened last, which is what a window that names no vault gets.
 */
export class VaultManager {
  readonly relay: Relay
  readonly terminals: Terminals
  readonly dreams: Dreams
  private readonly runStore: RunStore
  private readonly contexts = new Map<string, VaultContext>()
  /** The first-run state — a profile perhaps, no vault — remade when the profile moves. */
  private empty: VaultContext | null = null
  /** The address the brief hands to agents, known only once the server is listening. */
  private url = ''
  private started = false

  private constructor(
    readonly store: ConfigStore,
    readonly home: string,
    cron: CrontabIO,
  ) {
    this.relay = new Relay(() => this.config.vaultPath)
    this.runStore = new RunStore(path.join(home, 'dreams.db'))
    // The root the shell was opened from, then the vault, then the home — which is only
    // where you stand on first run, when there is nothing to stand in yet.
    this.terminals = new Terminals((vault, root) =>
      ((vault && this.contexts.get(vault)) || this.current).session(root),
    )
    // Dreams run wherever a dream file can live: the vault and projects of every open
    // context, each site answering with its own vault's notes, profile and personas.
    this.dreams = new Dreams({
      sites: () => [...this.contexts.values()].flatMap((context) => context.dreamSites()),
      vault: (site) => this.siteContext(site)?.opened?.tree ?? null,
      url: () => this.url,
      cron: new Crontab(cron),
      store: new TriggerStore(path.join(home, 'triggers.json')),
      runs: this.runStore,
      scratch: () => path.join(home, 'dreams', 'runs'),
      env: (site): Record<string, string> => {
        const claudeCfgDir = this.siteContext(site)?.profile?.claudeCfgDir
        return claudeCfgDir ? { CLAUDE_CONFIG_DIR: expandHome(claudeCfgDir) } : {}
      },
      persona: (name, site) => {
        const open = this.siteContext(site)?.opened
        return open ? readPersona(open.path, name) : Promise.resolve(null)
      },
    })
  }

  static async create(options: ManagerOptions = {}): Promise<VaultManager> {
    const home = options.home ?? broodmotherHome()
    await mkdir(home, { recursive: true })

    // App state lives above the profiles rather than inside one, so the choice of vault
    // survives switching between them — and a vault is a git working tree, which is no
    // place for state the sync loop would offer to commit.
    const store = new ConfigStore(path.join(home, 'config.json'), defaultConfig(null))
    const migrated = await migrate(home, await store.load())
    const manager = new VaultManager(store, home, options.cron ?? systemCrontab())

    const vaultPath = await resolveVault(options.root, migrated.config, home)
    // A vault sits inside the profile it commits as, so the open one settles who you are.
    const profile = vaultPath
      ? path.basename(path.dirname(vaultPath))
      : migrated.config.profile
    const config = { ...migrated.config, vaultPath, profile }
    // Persist the resolution, or the open vault and the reported config disagree.
    if (JSON.stringify(config) !== JSON.stringify(store.config)) await store.save(config)
    await manager.refreshEmpty()
    if (vaultPath) {
      await manager.ensure(vaultPath)
      // Dream history from before runs named their vault was all about the one open then.
      manager.runStore.adopt(vaultPath)
    }
    return manager
  }

  private siteContext(site: DreamSite): VaultContext | null {
    return (site.vault && this.contexts.get(site.vault)) || null
  }

  get config(): BroodmotherConfig {
    return this.store.config
  }

  /** The context a request that names no vault means: the last-opened one, or first run. */
  get current(): VaultContext {
    const target = this.config.vaultPath
    const context = target ? this.contexts.get(target) : null
    if (context) return context
    if (!this.empty) throw new Error('manager not created')
    return this.empty
  }

  /**
   * The context a window's vault names, opened off disk if this process has not seen it
   * yet — which is what a window still standing somewhere survives a server restart by.
   */
  async context(vaultPath: string | null): Promise<VaultContext> {
    if (!vaultPath) return this.current
    const open = this.contexts.get(vaultPath)
    if (open) return open
    if (!(await exists(vaultPath)))
      throw new NoVaultError(`no vault at ${vaultPath} — create or choose one first`)
    return this.ensure(vaultPath)
  }

  private async ensure(vaultPath: string): Promise<VaultContext> {
    const open = this.contexts.get(vaultPath)
    if (open) return open
    const context = await VaultContext.open(vaultPath, this.deps(vaultPath))
    this.contexts.set(vaultPath, context)
    if (this.started) context.start()
    return context
  }

  private deps(vaultPath: string | null): VaultDeps {
    return {
      home: this.home,
      store: this.store,
      broadcast: (message) => this.relay.broadcast(vaultPath, message),
      url: () => this.url,
    }
  }

  /** The no-vault context follows the config's profile, so it is remade when that moves. */
  private async refreshEmpty(): Promise<void> {
    const previous = this.empty
    this.empty = await VaultContext.open(null, this.deps(null))
    if (this.started) this.empty.start()
    await previous?.close()
  }

  async listProfiles(): Promise<Profile[]> {
    return listProfiles(this.home)
  }

  async requireProfile(name: string): Promise<Profile> {
    const profile = await findProfile(name, this.home)
    if (!profile) throw new ProfileError(`no profile named "${name}"`)
    return profile
  }

  /** Every profile's vaults: the picker lists them all, whoever you were working as. */
  async listAllVaults(): Promise<VaultSummary[]> {
    const profiles = await listProfiles(this.home)
    const vaults = await Promise.all(
      profiles.map((profile) => listVaults(profileDir(profile))),
    )
    return vaults.flat()
  }

  /** A profile made from the vault menu is one you meant to work as, so it is worked as on
   *  the spot. It holds no vaults yet, which is the first-run state with a name on it. */
  async addProfile(input: { name: string } & Identity): Promise<Profile> {
    const profile = await createProfile(input, this.home)
    await this.useProfile(profile)
    return profile
  }

  /** Working as someone else is standing in their folder, so what opens is one of their
   *  vaults. Null when they have none yet, which is where a new profile starts. */
  async selectProfile(name: string): Promise<VaultSummary | null> {
    await this.useProfile(await this.requireProfile(name))
    return this.current.vault
  }

  private async useProfile(profile: Profile): Promise<void> {
    const target = (await listVaults(profileDir(profile)))[0]?.path ?? null
    await this.store.update((config) => ({
      ...config,
      profile: profile.name,
      vaultPath: target,
    }))
    if (target) await this.ensure(target)
    else await this.refreshEmpty()
  }

  /**
   * A vault is created as the profile handed in — the caller's own — and stays bound to it.
   * A vault given a remote starts syncing, because asking for one is asking for that; a
   * plain folder or a local repository does not, because there is nowhere for it to sync to.
   */
  async addVault(input: NewVault, profile: Profile): Promise<VaultSummary> {
    const vault = await createVault(input, profile)
    await this.store.update((config) => ({
      ...config,
      vaultPath: vault.path,
      profile: profile.name,
      git: {
        ...config.git,
        [vault.path]: { ...defaultGitSettings(), enabled: input.git === 'remote' },
      },
    }))
    await this.ensure(vault.path)
    return vault
  }

  /** Opens a vault. Nothing about git is copied out of it: how it syncs is its own setting,
   *  and where it syncs is a question for the repository every time it is asked. */
  async openVault(vaultPath: string): Promise<BroodmotherConfig> {
    const config = await this.store.update((current) => ({
      ...current,
      vaultPath,
      profile: path.basename(path.dirname(vaultPath)),
    }))
    await this.ensure(vaultPath)
    return config
  }

  /** Deleting the vault you are in falls back the way startup does: whatever is left, or
   *  nothing, which is the first-run state again. */
  async removeVault(name: string, profile: Profile | null): Promise<VaultSummary | null> {
    const home = profile ? profileDir(profile) : null
    const gone = home ? await findVault(name, home) : null
    if (!home || !gone) throw new VaultError(`no vault named "${name}"`)
    // The windows standing in it hear before it goes, so they can leave for the picker.
    this.relay.broadcast(gone.path, { type: 'vault-gone' })
    // Closed before the folder goes, or the watchers report the deletion of a vault nobody
    // is in and the sync loop stands in a directory that no longer exists.
    await this.close(gone.path)
    await deleteVault(name, home)

    // Nothing filed under the path outlives it: a folder of that name made later is a
    // different vault, and it does not inherit this one's sync settings or the projects
    // that were inside it.
    if (this.config.vaultPath !== gone.path) {
      await this.store.update((config) => forget(config, gone.path))
      return this.current.vault
    }

    const next = (await listVaults(home))[0] ?? null
    await this.store.update((config) => ({
      ...forget(config, gone.path),
      vaultPath: next?.path ?? null,
    }))
    if (next) await this.ensure(next.path)
    return this.current.vault
  }

  /**
   * Everything broodmother has on disk: every profile, the vaults inside them, the projects
   * inside those, and this machine's config. The home folder itself stays — it is a folder
   * someone chose, and emptying it is what was asked for — and what stands in it afterwards
   * is a first run.
   */
  async removeEverything(): Promise<BroodmotherConfig> {
    for (const vaultPath of this.contexts.keys())
      this.relay.broadcast(vaultPath, { type: 'vault-gone' })
    for (const context of this.contexts.values()) {
      // A latched conflict outlives a refresh, and it is about a vault that is going.
      context.sync.clearConflict()
      await context.close()
    }
    this.contexts.clear()
    this.terminals.close()
    for (const entry of await readdir(this.home))
      await rm(path.join(this.home, entry), { recursive: true, force: true })
    const config = await this.store.save(defaultConfig(null))
    await this.refreshEmpty()
    return config
  }

  async setConfig(config: BroodmotherConfig): Promise<BroodmotherConfig> {
    const previous = this.config.vaultPath
    await this.store.save(config)
    if (config.vaultPath !== previous) {
      if (config.vaultPath) await this.ensure(config.vaultPath)
      else await this.refreshEmpty()
    }
    return this.config
  }

  /* Signing in is two requests: one that opens a code, and one asked again while the
     browser is being answered. The device code is nobody's until it is answered, so this
     belongs to the process rather than any vault. */
  async startGithub(): Promise<GithubDevice> {
    return startDevice()
  }

  start(url: string): void {
    this.url = url
    this.started = true
    this.dreams.start()
    this.empty?.start()
    for (const context of this.contexts.values()) context.start()
  }

  private async close(vaultPath: string): Promise<void> {
    const context = this.contexts.get(vaultPath)
    if (!context) return
    this.contexts.delete(vaultPath)
    await context.close()
  }

  async closeAll(): Promise<void> {
    this.dreams.stop()
    this.runStore.close()
    this.relay.close()
    this.terminals.close()
    await this.empty?.close()
    for (const context of this.contexts.values()) await context.close()
    this.contexts.clear()
  }
}

/** Everything this machine filed under a vault path, dropped. */
function forget(config: BroodmotherConfig, vaultPath: string): BroodmotherConfig {
  const git = { ...config.git }
  const checkouts = { ...config.checkouts }
  const project = { ...config.project }
  delete git[vaultPath]
  delete checkouts[vaultPath]
  delete project[vaultPath]
  const projectBranch = Object.fromEntries(
    Object.entries(config.projectBranch).filter(
      ([key]) => !key.startsWith(`${vaultPath}#`),
    ),
  )
  return { ...config, git, checkouts, project, projectBranch }
}

/**
 * An explicit path always wins, then whatever was open last, then the first vault the
 * profile has — the only other thing a folder there can mean is a vault someone dropped in
 * by hand. Falling through to null is normal on first run: nothing is invented, and the web
 * app asks where you work.
 */
async function resolveVault(
  root: string | undefined,
  config: BroodmotherConfig,
  home: string,
): Promise<string | null> {
  const explicit = root ?? process.env.BROODMOTHER_VAULT
  if (explicit) return path.resolve(explicit)
  if (config.vaultPath && (await exists(config.vaultPath))) return config.vaultPath
  const profile = config.profile ?? (await listProfiles(home))[0]?.name
  if (!profile) return null
  const vaults = await listVaults(path.join(home, profile))
  return vaults[0]?.path ?? null
}

const exists = (target: string) =>
  stat(target).then(
    () => true,
    () => false,
  )
