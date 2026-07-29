import { watch, type FSWatcher } from 'chokidar'
import path from 'node:path'
import type { VaultEvent } from '@broodmother/shared'
import { toVaultPath } from './paths'

const DEBOUNCE_MS = 100
const SUPPRESS_MS = 2000

/** Watches the vault and drops the echo of the app's own writes. */
export class VaultWatcher {
  /** Resolves once chokidar's initial scan is done; before that, events are missed. */
  readonly ready: Promise<void>
  private readonly watcher: FSWatcher
  private readonly pending = new Map<
    string,
    { event: VaultEvent; timer: NodeJS.Timeout }
  >()
  private readonly suppressed = new Map<string, number>()

  constructor(
    readonly root: string,
    private readonly onEvent: (event: VaultEvent) => void,
    private readonly debounceMs = DEBOUNCE_MS,
  ) {
    this.watcher = watch(root, {
      ignoreInitial: true,
      followSymlinks: false,
      ignored: (target) => target !== root && path.basename(target).startsWith('.'),
    })
    this.ready = new Promise((resolve) => this.watcher.once('ready', () => resolve()))
    this.watcher.on('add', (p) =>
      this.queue({ type: 'created', path: toVaultPath(root, p) }),
    )
    this.watcher.on('change', (p) =>
      this.queue({ type: 'changed', path: toVaultPath(root, p) }),
    )
    this.watcher.on('unlink', (p) =>
      this.queue({ type: 'removed', path: toVaultPath(root, p) }),
    )
  }

  suppress(...paths: string[]): void {
    const until = Date.now() + SUPPRESS_MS
    for (const p of paths) this.suppressed.set(p, until)
  }

  private isSuppressed(vaultPath: string): boolean {
    const until = this.suppressed.get(vaultPath)
    if (until === undefined) return false
    if (until < Date.now()) {
      this.suppressed.delete(vaultPath)
      return false
    }
    return true
  }

  private queue(event: VaultEvent & { path: string }): void {
    const existing = this.pending.get(event.path)
    if (existing) clearTimeout(existing.timer)
    const timer = setTimeout(() => {
      this.pending.delete(event.path)
      if (!this.isSuppressed(event.path)) this.onEvent(event)
    }, this.debounceMs)
    timer.unref?.()
    this.pending.set(event.path, { event, timer })
  }

  async close(): Promise<void> {
    for (const { timer } of this.pending.values()) clearTimeout(timer)
    this.pending.clear()
    await this.watcher.close()
  }
}
