import { watch, type FSWatcher } from 'chokidar'
import path from 'node:path'
import type { VaultEvent } from '@broodmother/shared'
import { toVaultPath } from '../fs'

const DEBOUNCE_MS = 100
/**
 * How long a write of the app's own is allowed to echo for. One write can arrive as more
 * than one event, so this cannot be spent on the first — but it was two seconds, which is
 * long enough to swallow an agent editing the same file straight after a save. It only has
 * to outlast the echo of a local write, which is immediate.
 */
const SUPPRESS_MS = 250

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
    // Folders too. A directory made or removed by something else — an agent laying out a
    // section, a sync pull dropping one — changes the tree, and a tree that does not
    // change is a tree that is wrong.
    this.watcher.on('addDir', (p) => {
      if (p !== root) this.queue({ type: 'created', path: toVaultPath(root, p) })
    })
    this.watcher.on('unlinkDir', (p) => {
      if (p !== root) this.queue({ type: 'removed', path: toVaultPath(root, p) })
    })
  }

  suppress(...paths: string[]): void {
    const until = Date.now() + SUPPRESS_MS
    for (const p of paths) this.suppressed.set(p, until)
  }

  /** Inside the window the change is the app's own and is dropped; past it, the entry is
   *  spent and whatever comes next belongs to somebody else. */
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
