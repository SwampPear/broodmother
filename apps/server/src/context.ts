import { mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import type { MotherConfig, ServerMessage, VaultEvent } from '@mother/shared'
import { ConfigStore, defaultConfig } from './config'
import { Git } from './git'
import { LinkIndex } from './links'
import { Relay } from './relay'
import { SyncLoop } from './sync'
import { Terminals } from './terminal'
import { Vault } from './vault'
import { listVaults, vaultHome } from './vaults'
import { VaultWatcher } from './watcher'

export interface ContextOptions {
  root?: string
  home?: string
}

export class NoVaultError extends Error {}

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
  readonly sync: SyncLoop
  readonly relay: Relay
  readonly terminals: Terminals

  private constructor(
    readonly store: ConfigStore,
    readonly home: string,
  ) {
    this.relay = new Relay(() => this.config)
    this.terminals = new Terminals(() => this.config.vaultPath ?? this.home)
    this.sync = new SyncLoop({
      git: () => this.current?.git ?? null,
      config: () => this.config,
      hasLiveSession: () => this.relay.hasLiveSession(),
      onStatus: (status) => this.broadcast({ type: 'sync', status }),
    })
  }

  static async create(options: ContextOptions = {}): Promise<AppContext> {
    const home = options.home ?? vaultHome()
    await mkdir(home, { recursive: true })

    // App state lives alongside the vaults rather than inside one, so the choice of vault
    // survives switching between them.
    const store = new ConfigStore(path.join(home, 'config.json'), defaultConfig(null))
    await store.load()

    const context = new AppContext(store, home)
    const vaultPath = await resolveVault(options.root, store.config.vaultPath, home)
    // Persist the resolution, or the open vault and the reported config disagree.
    if (vaultPath !== store.config.vaultPath)
      await store.save({ ...store.config, vaultPath })
    await context.useVault(vaultPath)
    return context
  }

  get config(): MotherConfig {
    return this.store.config
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

  async setConfig(config: MotherConfig): Promise<MotherConfig> {
    const previous = this.config.vaultPath
    await this.store.save(config)
    if (config.vaultPath !== previous) await this.useVault(config.vaultPath)
    return this.config
  }

  /** Opens a vault, adopting the remote that the vault's own clone already points at. */
  async openVault(vaultPath: string): Promise<MotherConfig> {
    await this.useVault(vaultPath)
    const remoteUrl = (await this.current?.git.remoteUrl()) ?? null
    return this.store.save({
      ...this.config,
      vaultPath,
      ...(remoteUrl ? { remoteUrl, syncEnabled: true } : {}),
    })
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
      git: new Git(vaultPath),
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
 * home. Falling through to null is normal on first run — the web app shows the picker.
 */
async function resolveVault(
  root: string | undefined,
  remembered: string | null,
  home: string,
): Promise<string | null> {
  const explicit = root ?? process.env.MOTHER_VAULT
  if (explicit) return path.resolve(explicit)
  if (remembered && (await exists(remembered))) return remembered
  const vaults = await listVaults(home)
  return vaults[0]?.path ?? null
}
