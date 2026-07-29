import type { GitAuthor, MotherConfig, SyncStatus, VaultPath } from '@mother/shared'
import type { Git } from './git'

export function commitMessage(paths: readonly VaultPath[]): string {
  if (paths.length === 0) return 'docs: update'
  if (paths.length === 1) return `docs: update ${paths[0]!.replace(/\.md$/i, '')}`

  const segments = paths.map((p) => p.split('/').slice(0, -1))
  const common: string[] = []
  for (let i = 0; i < segments[0]!.length; i++) {
    const segment = segments[0]![i]!
    if (!segments.every((s) => s[i] === segment)) break
    common.push(segment)
  }
  return common.length
    ? `docs: update ${common.join('/')}`
    : `docs: update ${paths.length} files`
}

export interface SyncDeps {
  git: () => Git | null
  config: () => MotherConfig
  /** Null until a profile exists: a commit needs someone to commit as. */
  author: () => GitAuthor | null
  onStatus: (status: SyncStatus) => void
  now?: () => number
}

/**
 * Pull, commit, push once the vault has been quiet for `syncIdleMs`. A conflict latches:
 * nothing syncs again until it is explicitly cleared.
 */
export class SyncLoop {
  private status: SyncStatus = {
    state: 'idle',
    lastSyncedAt: null,
    conflicted: [],
    message: null,
  }
  private lastEditAt: number | null = null
  private running = false
  private timer: NodeJS.Timeout | null = null
  private readonly now: () => number

  constructor(private readonly deps: SyncDeps) {
    this.now = deps.now ?? Date.now
  }

  get state(): SyncStatus {
    return { ...this.status, conflicted: [...this.status.conflicted] }
  }

  start(intervalMs = 1000): void {
    if (this.timer) return
    this.timer = setInterval(() => void this.tick(), intervalMs)
    this.timer.unref?.()
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  noteEdit(): void {
    this.lastEditAt = this.now()
  }

  clearConflict(): SyncStatus {
    if (this.status.state === 'conflict')
      this.set({ state: 'idle', conflicted: [], message: null })
    return this.state
  }

  /** The automatic path: only syncs once the quiet period has passed. */
  async tick(): Promise<SyncStatus> {
    const config = this.deps.config()
    if (this.status.state === 'conflict' || !config.syncEnabled || !config.remoteUrl)
      return this.state
    if (this.lastEditAt === null) return this.state
    if (this.now() - this.lastEditAt < config.syncIdleMs) return this.state
    return this.sync()
  }

  /** The manual path, still refused while a conflict is latched. */
  async syncNow(): Promise<SyncStatus> {
    if (this.status.state === 'conflict') return this.state
    return this.sync()
  }

  private async sync(): Promise<SyncStatus> {
    const config = this.deps.config()
    const git = this.deps.git()
    const author = this.deps.author()
    if (!git) return this.set({ state: 'idle', message: 'no vault is open' })
    if (!author) return this.set({ state: 'idle', message: 'no profile set up' })
    if (!config.remoteUrl)
      return this.set({ state: 'idle', message: 'no remote configured' })
    if (this.running) return this.state
    this.running = true
    this.set({ state: 'syncing', message: null })

    try {
      const before = await git.status()
      if (before.conflicted.length)
        return this.latch(before.conflicted, 'unresolved conflict')

      // Commit before pulling: rebasing onto a dirty tree fails, and the conflict we do
      // want to see is between two commits.
      if (before.changed.length) {
        await git.stageAll()
        const committed = await git.commit(commitMessage(before.changed), author)
        if (!committed.ok)
          return this.set({
            state: 'error',
            message: committed.message.trim() || 'commit failed',
          })
      }

      const pulled = await git.pull(config.branch)
      if (!pulled.ok) {
        if (pulled.failure === 'conflict') {
          const after = await git.status()
          return this.latch(after.conflicted, pulled.message)
        }
        return this.set({
          state: pulled.failure === 'offline' ? 'offline' : 'error',
          message: `${pulled.failure}: ${pulled.message.trim()}`,
        })
      }

      const pushed = await git.push(config.branch)
      if (!pushed.ok)
        return this.set({
          state: pushed.failure === 'offline' ? 'offline' : 'error',
          message: `${pushed.failure}: ${pushed.message.trim()}`,
        })

      this.lastEditAt = null
      return this.set({ state: 'idle', lastSyncedAt: this.now(), message: null })
    } catch (error) {
      return this.set({ state: 'error', message: (error as Error).message })
    } finally {
      this.running = false
    }
  }

  private latch(conflicted: VaultPath[], message: string): SyncStatus {
    return this.set({
      state: 'conflict',
      conflicted,
      message: message.trim() || 'conflict',
    })
  }

  private set(patch: Partial<SyncStatus>): SyncStatus {
    this.status = { ...this.status, ...patch }
    this.deps.onStatus(this.state)
    return this.state
  }
}
