import { watch, type FSWatcher, type Stats } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import type { TreeEvent } from '@/types'
import { RESERVED, TEMP_SUFFIX, toDocPath } from '../fs'

const DEBOUNCE_MS = 100
/**
 * How long a write of the app's own is allowed to echo for. One write can arrive as more
 * than one event, so this cannot be spent on the first — but it was two seconds, which is
 * long enough to swallow an agent editing the same file straight after a save. It only has
 * to outlast the echo of a local write, which is immediate.
 */
const SUPPRESS_MS = 250

/**
 * Whether a path is beneath something the tree does not list. `skipped` holds git's ignore
 * list as the tree read it — top of each ignored thing, so `node_modules` rather than the
 * forty thousand paths inside it — which means every ancestor has to be asked about, not
 * just the name on the end.
 */
export function isSkipped(
  root: string,
  target: string,
  skipped: ReadonlySet<string>,
): boolean {
  if (target === root) return false
  let prefix = ''
  for (const segment of toDocPath(root, target).split('/')) {
    if (RESERVED.has(segment)) return true
    prefix = prefix ? `${prefix}/${segment}` : segment
    if (skipped.has(prefix)) return true
  }
  return false
}

export interface TreeWatchOptions {
  /**
   * What the tree leaves out, which is git's ignore list. Asked for rather than handed
   * over because the answer goes stale: a dependency folder installed after the watch
   * opened is not in the list git gave when it did.
   */
  skipped?: () => Promise<ReadonlySet<string>>
  debounceMs?: number
}

async function noneSkipped(): Promise<ReadonlySet<string>> {
  return new Set<string>()
}

/** Watches a tree and drops the echo of the app's own writes. */
export class TreeWatcher {
  /** Settled once the watch is standing and knows what it does not list. */
  readonly ready: Promise<void>
  private watcher: FSWatcher | null = null
  private skipped: ReadonlySet<string> = new Set()
  private asking: Promise<void> | null = null
  private closed = false
  private failed = false
  private readonly openedAt = Date.now()
  /** Paths this watch has already reported, so a second write to one is a change rather
   *  than another creation. Holds what has moved, not what is on disk. */
  private readonly reported = new Set<string>()
  private readonly pending = new Map<string, NodeJS.Timeout>()
  private readonly suppressed = new Map<string, number>()
  private readonly debounceMs: number
  private readonly ask: () => Promise<ReadonlySet<string>>
  /** What the tree is called, which is the name macOS reports it under. */
  private readonly self: string

  constructor(
    readonly root: string,
    private readonly onEvent: (event: TreeEvent) => void,
    { skipped = noneSkipped, debounceMs = DEBOUNCE_MS }: TreeWatchOptions = {},
  ) {
    this.debounceMs = debounceMs
    this.ask = skipped
    this.self = path.basename(root)
    this.open()
    this.ready = this.refresh()
  }

  /**
   * One recursive watch for the whole tree, which macOS answers with a single FSEvents
   * stream. Watching a directory apiece costs a file descriptor apiece — a repository with
   * its dependencies on disk wants more of them than the process is allowed to open, and
   * running out is what this used to die of.
   */
  private open(): void {
    try {
      this.watcher = watch(this.root, { recursive: true }, (_, name) => {
        if (name) this.queue(String(name).split(path.sep).join('/'))
      })
      this.watcher.on('error', (cause) => this.fail(cause))
    } catch (cause) {
      this.fail(cause)
    }
  }

  /* What is left when a watch fails is a tree that stops refreshing on its own, which is
     worth less than the app and is not worth the app. Said once: a watch that has fallen
     over says so again on every event it cannot deliver. */
  private fail(cause: unknown): void {
    if (this.failed) return
    this.failed = true
    console.error(`broodmother: watching ${this.root} failed — ${String(cause)}`)
  }

  /** Asks again what the tree leaves out, one question at a time. */
  private refresh(): Promise<void> {
    this.asking ??= this.ask()
      .then((skipped) => {
        this.skipped = skipped
      })
      .catch((cause: unknown) => this.fail(cause))
      .finally(() => {
        this.asking = null
      })
    return this.asking
  }

  suppress(...paths: string[]): void {
    const until = Date.now() + SUPPRESS_MS
    for (const p of paths) this.suppressed.set(p, until)
  }

  /** Inside the window the change is the app's own and is dropped; past it, the entry is
   *  spent and whatever comes next belongs to somebody else. */
  private isSuppressed(docPath: string): boolean {
    const until = this.suppressed.get(docPath)
    if (until === undefined) return false
    if (until < Date.now()) {
      this.suppressed.delete(docPath)
      return false
    }
    return true
  }

  private isSkipped(docPath: string): boolean {
    return isSkipped(this.root, path.join(this.root, docPath), this.skipped)
  }

  private queue(name: string): void {
    // The app's own atomic writes land as a temp file renamed over the real one. The
    // rename's echo is the real path's to report; the temp name is nothing's, and on a
    // busy machine its appearance and disappearance outlive the debounce and leak out.
    if (name.endsWith(TEMP_SUFFIX)) return
    // The tree naming itself is not news about anything in it. macOS says it whenever a
    // write touches the folder, and says it to every watch in the process rather than the
    // one the write was under — the path that actually moved arrives separately, and only
    // ever at the watch that owns it.
    if (name === this.self) return
    if (this.isSkipped(name)) return
    const existing = this.pending.get(name)
    if (existing) clearTimeout(existing)
    const timer = setTimeout(() => void this.flush(name), this.debounceMs)
    timer.unref?.()
    this.pending.set(name, timer)
  }

  private async flush(docPath: string): Promise<void> {
    this.pending.delete(docPath)
    // Asked again since this was queued: an install lands thousands of events inside the
    // folder git had not been asked about yet.
    if (this.closed || this.isSkipped(docPath)) return
    const stats = await stat(path.join(this.root, docPath)).catch(() => null)
    if (this.closed) return
    const type = this.classify(docPath, stats)
    // A folder that was not there when git was last asked may be one it now ignores, which
    // is what a dependency folder installed after the watch opened is.
    if (type === 'created' && stats?.isDirectory()) void this.refresh()
    if (this.isSuppressed(docPath)) return
    this.onEvent({ type, path: docPath })
  }

  /** macOS reports every kind of change the same way, so what happened is what is on disk
   *  once the debounce expires: gone is a removal, and a path this watch has not reported
   *  before that came into being since it opened is a creation. */
  private classify(
    docPath: string,
    stats: Stats | null,
  ): 'created' | 'changed' | 'removed' {
    if (!stats) {
      this.reported.delete(docPath)
      return 'removed'
    }
    if (this.reported.has(docPath)) return 'changed'
    this.reported.add(docPath)
    return stats.birthtimeMs >= this.openedAt ? 'created' : 'changed'
  }

  async close(): Promise<void> {
    this.closed = true
    for (const timer of this.pending.values()) clearTimeout(timer)
    this.pending.clear()
    this.watcher?.close()
    this.watcher = null
  }
}
