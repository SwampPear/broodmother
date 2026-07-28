import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import type { DocsConfig, ServerMessage, VaultEvent } from '@docs/shared'
import { ConfigStore, defaultConfig } from './config'
import { Git } from './git'
import { LinkIndex } from './links'
import { Relay } from './relay'
import { SyncLoop } from './sync'
import { Vault } from './vault'
import { VaultWatcher } from './watcher'

export interface ContextOptions {
  root?: string
}

/** Everything that touches disk, and the one place the vault can be swapped. */
export class AppContext {
  vault!: Vault
  git!: Git
  links!: LinkIndex
  watcher!: VaultWatcher
  readonly sync: SyncLoop
  readonly relay: Relay

  private constructor(readonly store: ConfigStore) {
    this.relay = new Relay(() => this.config)
    this.sync = new SyncLoop({
      git: () => this.git,
      config: () => this.config,
      hasLiveSession: () => this.relay.hasLiveSession(),
      onStatus: (status) => this.broadcast({ type: 'sync', status }),
    })
  }

  static async create(options: ContextOptions = {}): Promise<AppContext> {
    const root = path.resolve(options.root ?? process.env.DOCS_VAULT ?? process.cwd())
    await mkdir(root, { recursive: true })
    const store = new ConfigStore(
      path.join(root, '.docs', 'config.json'),
      defaultConfig(root),
    )
    await store.load()

    const context = new AppContext(store)
    await context.useVault(store.config.vaultPath)
    return context
  }

  get config(): DocsConfig {
    return this.store.config
  }

  broadcast(message: ServerMessage): void {
    this.relay.broadcast(message)
  }

  async setConfig(config: DocsConfig): Promise<DocsConfig> {
    const previous = this.config.vaultPath
    await this.store.save(config)
    if (config.vaultPath !== previous) await this.useVault(config.vaultPath)
    return this.config
  }

  start(): void {
    this.sync.start()
  }

  async close(): Promise<void> {
    this.sync.stop()
    this.relay.close()
    await this.watcher.close()
  }

  private async useVault(vaultPath: string): Promise<void> {
    await this.watcher?.close()
    await mkdir(vaultPath, { recursive: true })
    this.vault = new Vault(vaultPath)
    this.git = new Git(vaultPath)
    this.links = new LinkIndex(this.vault)
    await this.links.rebuild()
    this.watcher = new VaultWatcher(vaultPath, (event) => this.onVaultEvent(event))
  }

  private onVaultEvent(event: VaultEvent): void {
    if (event.type !== 'moved') {
      if (event.type === 'removed') this.links.forget(event.path)
      else void this.links.update(event.path)
    }
    this.sync.noteEdit()
    this.broadcast({ type: 'vault', event })
  }
}
