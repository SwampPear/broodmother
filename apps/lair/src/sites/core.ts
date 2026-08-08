import { readdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { Git } from '@broodmother/server'
import { siteNameOk, type GitAuthor, type LairSite } from '@broodmother/shared'

export class SiteError extends Error {}

/** Commits a dream's output wears: the lair is the author, the dream is the message. */
const LAIR_AUTHOR: GitAuthor = { name: 'broodmother lair', email: 'lair@broodmother' }

interface PullState {
  pull: LairSite['pull']
  message?: string
}

/**
 * The repositories dreams run against: one clone per registered remote, pulled before a
 * run and pushed after one, with the lair's own key offered as a deploy key. How the
 * last pull went is kept here and answered on the sites route, so a clone that lost its
 * remote says so on the page rather than at run time.
 */
export class Sites {
  private readonly pulls = new Map<string, PullState>()

  constructor(
    private readonly root: string,
    private readonly sshKeyPath: string | null,
  ) {}

  dir(name: string): string {
    return path.join(this.root, name)
  }

  private git(name: string): Git {
    return new Git(this.dir(name), this.sshKeyPath)
  }

  private assertName(name: string): void {
    if (!siteNameOk(name)) throw new SiteError(`"${name}" is not a name a site can have`)
  }

  async names(): Promise<string[]> {
    const entries = await readdir(this.root, { withFileTypes: true }).catch(() => [])
    return entries
      .filter((entry) => entry.isDirectory() && siteNameOk(entry.name))
      .map((entry) => entry.name)
      .sort()
  }

  async has(name: string): Promise<boolean> {
    return (await this.names()).includes(name)
  }

  async add(name: string, remote: string): Promise<LairSite> {
    this.assertName(name)
    if (await this.has(name)) {
      const current = await this.git(name).remoteUrl()
      if (current !== remote)
        throw new SiteError(`"${name}" already exists and points at ${current}`)
      return this.summary(name)
    }
    const cloned = await new Git(this.root, this.sshKeyPath).run(
      ['clone', remote, name],
      600_000,
    )
    if (cloned.exitCode !== 0) {
      await rm(this.dir(name), { recursive: true, force: true })
      throw new SiteError(String(cloned.stderr).trim() || `could not clone ${remote}`)
    }
    this.pulls.set(name, { pull: 'ok' })
    return this.summary(name)
  }

  private async summary(name: string): Promise<LairSite> {
    const state = this.pulls.get(name) ?? { pull: 'never' as const }
    return {
      name,
      remote: (await this.git(name).remoteUrl()) ?? '',
      pull: state.pull,
      ...(state.message ? { message: state.message } : {}),
    }
  }

  async list(): Promise<LairSite[]> {
    return Promise.all((await this.names()).map((name) => this.summary(name)))
  }

  /** Best effort by design: a run on a stale clone beats a run that never happens, and
   *  the failure is kept to be answered for. */
  async pull(name: string): Promise<void> {
    const git = this.git(name)
    const branch = await git.branch()
    if (!branch) return
    const pulled = await git.pull(branch)
    this.pulls.set(
      name,
      pulled.ok ? { pull: 'ok' } : { pull: 'failed', message: pulled.message },
    )
  }

  /** Commits whatever the run left and pushes it home; a clean tree does nothing. */
  async push(name: string, message: string): Promise<void> {
    const git = this.git(name)
    const changes = await git.changes()
    if (Object.keys(changes).length === 0) return
    await git.stageAll()
    const committed = await git.commit(message, LAIR_AUTHOR)
    if (!committed.ok) {
      this.pulls.set(name, { pull: 'failed', message: committed.message })
      return
    }
    const branch = await git.branch()
    if (!branch) return
    const pushed = await git.push(branch)
    if (!pushed.ok) this.pulls.set(name, { pull: 'failed', message: pushed.message })
  }
}
