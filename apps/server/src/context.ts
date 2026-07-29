import { mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import type {
  Identity,
  BroodmotherConfig,
  Profile,
  ServerMessage,
  VaultEvent,
  VaultSummary,
} from '@broodmother/shared'
import { ConfigStore, defaultConfig } from './config'
import { Git } from './git/git'
import { migrateProjects } from './migrate'
import { LinkIndex } from './vault/links'
import {
  ProfileError,
  createProfile,
  expandHome,
  findProfile,
  listProfiles,
  broodmotherHome,
  writeIdentity,
} from './profiles'
import { Relay } from './sockets/relay'
import { SyncLoop } from './git/sync'
import { Terminals, type TerminalSession } from './sockets/terminal'
import { Vault } from './vault/vault'
import {
  VaultError,
  createVault,
  deleteVault,
  findVault,
  listVaults,
  type NewVault,
} from './vault/vaults'
import { VaultWatcher } from './vault/watcher'

export interface ContextOptions {
  root?: string
  home?: string
}

export class NoVaultError extends Error {}
export class NoProfileError extends Error {}

/** The disk-touching half of the app, valid only while a vault is open. */
export interface OpenVault {
  path: string
  vault: Vault
  git: Git
  links: LinkIndex
  watcher: VaultWatcher
}

/** Everything that touches disk, and the one place the vault can be swapped. */
export class AppContext {
  private current: OpenVault | null = null
  private activeProfile: Profile | null = null
  readonly sync: SyncLoop
  readonly relay: Relay
  readonly terminals: Terminals

  private constructor(
    readonly store: ConfigStore,
    readonly home: string,
  ) {
    this.relay = new Relay()
    // The open vault while there is one; the home is only where you stand on first run,
    // when there is no vault to stand in yet.
    this.terminals = new Terminals(() => this.session())
    this.sync = new SyncLoop({
      git: () => this.current?.git ?? null,
      config: () => this.config,
      author: () => this.activeProfile?.gitAuthor ?? null,
      onStatus: (status) => this.broadcast({ type: 'sync', status }),
    })
  }

  static async create(options: ContextOptions = {}): Promise<AppContext> {
    const home = options.home ?? broodmotherHome()
    await mkdir(home, { recursive: true })

    // App state lives alongside the vaults rather than inside one, so the choice of vault
    // survives switching between them — and a vault is a git working tree, which is no
    // place for state the sync loop would offer to commit.
    const store = new ConfigStore(path.join(home, 'config.json'), defaultConfig(null))
    await store.load()

    const migrated = await migrateProjects(home, store.config)
    const context = new AppContext(store, home)
    const vaultPath = await resolveVault(options.root, migrated.config.vaultPath, home)
    // Persist the resolution, or the open vault and the reported config disagree.
    if (vaultPath !== store.config.vaultPath || migrated.moved.length > 0)
      await store.save({ ...migrated.config, vaultPath })
    await context.loadProfile()
    await context.useVault(vaultPath)
    return context
  }

  get config(): BroodmotherConfig {
    return this.store.config
  }

  /** The open vault as the web app sees it, or null on first run. */
  get vault(): VaultSummary | null {
    const target = this.config.vaultPath
    if (!target) return null
    return {
      name: path.basename(target),
      path: target,
      profile: this.config.profiles[target] ?? null,
    }
  }

  get profile(): Profile | null {
    return this.activeProfile
  }

  /** Throws rather than returning null: nothing that commits works without an identity. */
  get requireProfile(): Profile {
    if (!this.activeProfile)
      throw new NoProfileError('no profile yet — pick one for this vault first')
    return this.activeProfile
  }

  /** Throws rather than returning null: creating a vault needs somewhere to put it and the
   *  home is always that, but opening one needs the vault to exist. */
  get requireVault(): VaultSummary {
    const vault = this.vault
    if (!vault) throw new NoVaultError('no vault is open — create or choose one first')
    return vault
  }

  /** Throws rather than returning null: every route that needs a vault needs a real one. */
  get open(): OpenVault {
    if (!this.current)
      throw new NoVaultError('no vault is open — create or choose one first')
    return this.current
  }

  get opened(): OpenVault | null {
    return this.current
  }

  broadcast(message: ServerMessage): void {
    this.relay.broadcast(message)
  }

  async setConfig(config: BroodmotherConfig): Promise<BroodmotherConfig> {
    const previous = this.config.vaultPath
    await this.store.save(config)
    if (config.vaultPath !== previous) {
      await this.loadProfile()
      await this.useVault(config.vaultPath)
    }
    return this.config
  }

  async listVaults(): Promise<VaultSummary[]> {
    return listVaults(this.home, this.config.profiles)
  }

  /** Deleting the vault you are in falls back the way startup does: whatever is left, or
   *  nothing, which is the first-run state again. */
  async removeVault(name: string): Promise<VaultSummary | null> {
    const gone = await findVault(name, this.home, this.config.profiles)
    if (!gone) throw new VaultError(`no vault named "${name}"`)
    await deleteVault(name, this.home)

    // The binding outlives nothing: a folder of that name made later is a different vault.
    const profiles = { ...this.config.profiles }
    delete profiles[gone.path]
    if (this.config.vaultPath !== gone.path) {
      await this.store.save({ ...this.config, profiles })
      return this.vault
    }

    const next = (await listVaults(this.home, profiles))[0] ?? null
    await this.store.save({ ...this.config, profiles, vaultPath: next?.path ?? null })
    await this.loadProfile()
    await this.useVault(next?.path ?? null)
    return this.vault
  }

  async listProfiles(): Promise<Profile[]> {
    return listProfiles(this.home)
  }

  /** A profile made from the vault menu is one you meant to work as, so it is selected on
   *  the spot — unless there is no vault yet, which is first run creating one next. */
  async addProfile(input: { name: string } & Identity): Promise<Profile> {
    const profile = await createProfile(input, this.home)
    if (this.config.vaultPath) await this.useProfile(profile)
    else this.activeProfile = profile
    return profile
  }

  /** Null when there is no vault to bind it to: on first run this is only the identity the
   *  first vault will be created as, and it is the vault that records it. */
  async selectProfile(name: string): Promise<VaultSummary | null> {
    const profile = await findProfile(name, this.home)
    if (!profile) throw new ProfileError(`no profile named "${name}"`)
    if (!this.config.vaultPath) {
      this.activeProfile = profile
      return null
    }
    await this.useProfile(profile)
    return this.vault
  }

  async setIdentity(identity: Identity): Promise<Profile> {
    this.activeProfile = await writeIdentity(this.requireProfile, identity)
    // The key the vault's git offers is fixed when the vault opens, so it has to be reopened
    // to pick up a changed one.
    await this.useVault(this.config.vaultPath)
    return this.activeProfile
  }

  private async useProfile(profile: Profile): Promise<void> {
    const target = this.requireVault.path
    await this.store.save({
      ...this.config,
      profiles: { ...this.config.profiles, [target]: profile.name },
    })
    this.activeProfile = profile
    // The key the vault's git offers is fixed when the vault opens, so it has to be
    // reopened to pick up the new profile's.
    await this.useVault(target)
  }

  /** The config names the open vault's profile; a name pointing at nothing is the same as
   *  naming none. */
  private async loadProfile(): Promise<void> {
    const target = this.config.vaultPath
    const name = target ? this.config.profiles[target] : null
    if (name) {
      this.activeProfile = await findProfile(name, this.home)
      return
    }
    // An open vault with no binding is one waiting for an identity, and the app asks. With
    // no vault at all there is nothing to bind to yet, so the profile on disk stands in —
    // it is what the first vault gets created as.
    this.activeProfile = target ? null : ((await listProfiles(this.home))[0] ?? null)
  }

  private session(): TerminalSession {
    const claudeConfigDir = this.activeProfile?.claudeConfigDir
    return {
      cwd: this.config.vaultPath ?? this.home,
      env: claudeConfigDir ? { CLAUDE_CONFIG_DIR: expandHome(claudeConfigDir) } : {},
    }
  }

  /** A vault is created as the profile you are working as, and stays bound to it. */
  async addVault(input: NewVault): Promise<VaultSummary> {
    const profile = this.requireProfile
    const vault = await createVault(input, profile, this.home)
    await this.store.save({
      ...this.config,
      vaultPath: vault.path,
      profiles: { ...this.config.profiles, [vault.path]: profile.name },
      remoteUrl: input.remoteUrl,
      branch: input.branch,
      syncEnabled: true,
    })
    await this.useVault(vault.path)
    return vault
  }

  /** Opens a vault, adopting the remote that the vault's own clone already points at. */
  async openVault(vaultPath: string): Promise<BroodmotherConfig> {
    const config = await this.store.save({ ...this.config, vaultPath })
    // The profile is settled before the vault opens: it is what picks the key git offers.
    await this.loadProfile()
    await this.useVault(vaultPath)
    const remoteUrl = (await this.current?.git.remoteUrl()) ?? null
    return remoteUrl
      ? this.store.save({ ...config, remoteUrl, syncEnabled: true })
      : config
  }

  start(): void {
    this.sync.start()
  }

  async close(): Promise<void> {
    this.sync.stop()
    this.relay.close()
    this.terminals.close()
    await this.current?.watcher.close()
  }

  private async useVault(vaultPath: string | null): Promise<void> {
    await this.current?.watcher.close()
    if (!vaultPath) {
      this.current = null
      return
    }
    await mkdir(vaultPath, { recursive: true })
    const vault = new Vault(vaultPath)
    const links = new LinkIndex(vault)
    await links.rebuild()
    this.current = {
      path: vaultPath,
      vault,
      links,
      git: new Git(vaultPath, this.activeProfile?.sshKeyPath ?? null),
      watcher: new VaultWatcher(vaultPath, (event) => this.onVaultEvent(event)),
    }
  }

  private onVaultEvent(event: VaultEvent): void {
    if (event.type !== 'moved') {
      if (event.type === 'removed') this.current?.links.forget(event.path)
      else void this.current?.links.update(event.path)
    }
    this.sync.noteEdit()
    this.broadcast({ type: 'vault', event })
  }
}

const exists = (target: string) =>
  stat(target).then(
    () => true,
    () => false,
  )

/**
 * An explicit path always wins, then whatever was open last, then the first vault in the
 * home — the only other thing a folder there can mean is a vault someone dropped in by
 * hand. Falling through to null is normal on first run: nothing is invented, and the web
 * app asks where you work.
 */
async function resolveVault(
  root: string | undefined,
  remembered: string | null,
  home: string,
): Promise<string | null> {
  const explicit = root ?? process.env.BROODMOTHER_VAULT
  if (explicit) return path.resolve(explicit)
  if (remembered && (await exists(remembered))) return remembered
  const vaults = await listVaults(home)
  return vaults[0]?.path ?? null
}
