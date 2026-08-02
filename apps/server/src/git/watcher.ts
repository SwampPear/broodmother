import path from 'node:path'
import { watch, type FSWatcher } from 'chokidar'
import { Git } from './core'

const DEBOUNCE_MS = 100

/**
 * Watches the repository's own state rather than the files in it. A commit, a stage or a
 * branch move made in a shell changes what the sidebar should say about every row without
 * touching a single document — and the tree watcher deliberately never looks inside
 * `.git`, so nothing else would notice.
 *
 * Two files say all of it: the index moves on every stage and commit, and HEAD moves when
 * the checkout changes branch. They are asked for by way of git rather than assumed at
 * `.git/`, because a worktree's `.git` is a file pointing somewhere else. The object store
 * is left alone — it is huge, and nothing a sidebar says is written there.
 */
export class GitWatcher {
  private watcher: FSWatcher | null = null
  private timer: NodeJS.Timeout | null = null
  private closed = false

  constructor(checkout: string, onChange: () => void, debounceMs = DEBOUNCE_MS) {
    void (async () => {
      // A folder with no repository has no state to watch, which is an ordinary thing for
      // a vault to be — the watcher just never opens.
      const dir = await new Git(checkout).gitDir()
      if (!dir || this.closed) return
      this.watcher = watch([path.join(dir, 'index'), path.join(dir, 'HEAD')], {
        ignoreInitial: true,
      })
      // A watch that fails leaves stale letters, which is worth less than the server.
      this.watcher.on('error', (cause) => {
        console.error(`broodmother: watching ${dir} failed — ${String(cause)}`)
      })
      const fire = () => {
        if (this.timer) clearTimeout(this.timer)
        this.timer = setTimeout(onChange, debounceMs)
        this.timer.unref?.()
      }
      // All three: git replaces the index by renaming a lockfile over it, and which event
      // that lands as depends on the platform's watcher.
      this.watcher.on('add', fire)
      this.watcher.on('change', fire)
      this.watcher.on('unlink', fire)
    })()
  }

  async close(): Promise<void> {
    this.closed = true
    if (this.timer) clearTimeout(this.timer)
    await this.watcher?.close()
  }
}
