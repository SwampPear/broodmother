import { execa } from 'execa'
import type { GitAuthor, VaultPath } from '@docs/shared'

export interface GitStatus {
  changed: VaultPath[]
  conflicted: VaultPath[]
  ahead: number
  behind: number
}

export type RemoteFailure = 'offline' | 'diverged' | 'auth' | 'conflict' | 'other'

export interface GitFailure {
  ok: false
  failure: RemoteFailure
  message: string
}

export type GitResult = { ok: true } | GitFailure

/** Anything that can throw away work. The guard is the promise, not the convention. */
const DESTRUCTIVE: Array<[RegExp, string]> = [
  [/^reset$/, 'reset'],
  [/^clean$/, 'clean'],
  [/^checkout$/, 'checkout'],
  [/^restore$/, 'restore'],
  [/^rm$/, 'rm'],
  [/^stash$/, 'stash'],
  [/^gc$/, 'gc'],
  [/^prune$/, 'prune'],
  [/^filter-branch$/, 'filter-branch'],
]

export function assertNonDestructive(args: readonly string[]): void {
  const command = args.find(
    (a, i) => !a.startsWith('-') && (i === 0 || args[i - 1] !== '-c'),
  )
  for (const [pattern, name] of DESTRUCTIVE)
    if (command && pattern.test(command))
      throw new Error(`refusing to run destructive git ${name}`)
  if (
    args.includes('--force') ||
    args.includes('-f') ||
    args.includes('--force-with-lease')
  )
    throw new Error('refusing to run a forced git command')
}

export function classifyRemoteError(text: string): RemoteFailure {
  const t = text.toLowerCase()
  if (
    /could not resolve host|connection refused|network is unreachable|no route to host|connection timed out|operation timed out|temporary failure in name resolution|failed to connect/.test(
      t,
    )
  )
    return 'offline'
  if (/non-fast-forward|fetch first|updates were rejected|behind its remote/.test(t))
    return 'diverged'
  if (
    /authentication failed|permission denied|could not read from remote repository|terminal prompts disabled|invalid username or password/.test(
      t,
    )
  )
    return 'auth'
  return 'other'
}

function fieldsAfter(record: string, spaces: number): string {
  let index = -1
  for (let i = 0; i < spaces; i++) {
    index = record.indexOf(' ', index + 1)
    if (index === -1) return ''
  }
  return record.slice(index + 1)
}

export function parseStatus(stdout: string): GitStatus {
  const records = stdout.split('\0').filter((r) => r.length > 0)
  const status: GitStatus = { changed: [], conflicted: [], ahead: 0, behind: 0 }

  for (let i = 0; i < records.length; i++) {
    const record = records[i]!
    const kind = record[0]
    if (kind === '#') {
      const ab = /^# branch\.ab \+(\d+) -(\d+)$/.exec(record)
      if (ab) {
        status.ahead = Number(ab[1])
        status.behind = Number(ab[2])
      }
    } else if (kind === '1') {
      status.changed.push(fieldsAfter(record, 8))
    } else if (kind === '2') {
      status.changed.push(fieldsAfter(record, 9))
      i++ // the original path of a rename is its own NUL-separated field
    } else if (kind === 'u') {
      status.conflicted.push(fieldsAfter(record, 10))
    } else if (kind === '?') {
      status.changed.push(fieldsAfter(record, 1))
    }
  }
  return status
}

export class Git {
  constructor(readonly root: string) {}

  async run(args: string[], timeout = 60_000) {
    assertNonDestructive(args)
    return execa('git', args, {
      cwd: this.root,
      timeout,
      reject: false,
      env: {
        GIT_TERMINAL_PROMPT: '0',
        GIT_ASKPASS: 'true',
        GIT_SSH_COMMAND: 'ssh -oBatchMode=yes',
      },
    })
  }

  async isRepo(): Promise<boolean> {
    const result = await this.run(['rev-parse', '--git-dir'])
    return result.exitCode === 0
  }

  async ignored(): Promise<Set<string>> {
    const result = await this.run([
      'ls-files',
      '-o',
      '-i',
      '--exclude-standard',
      '--directory',
      '-z',
    ])
    if (result.exitCode !== 0) return new Set()
    return new Set(
      String(result.stdout)
        .split('\0')
        .filter(Boolean)
        .map((p) => (p.endsWith('/') ? p.slice(0, -1) : p)),
    )
  }

  async status(): Promise<GitStatus> {
    const result = await this.run([
      'status',
      '--porcelain=v2',
      '--branch',
      '--untracked-files=all',
      '-z',
    ])
    if (result.exitCode !== 0)
      throw new Error(String(result.stderr) || 'git status failed')
    return parseStatus(String(result.stdout))
  }

  async pull(branch: string): Promise<GitResult> {
    const result = await this.run(['pull', '--rebase', '--no-edit', 'origin', branch])
    if (result.exitCode === 0) return { ok: true }
    const message = `${result.stdout}\n${result.stderr}`
    if (/couldn't find remote ref|does not appear to have any commits/i.test(message))
      return { ok: true } // nothing pushed to the remote branch yet
    const failure = /conflict|could not apply|merge failed/i.test(message)
      ? 'conflict'
      : classifyRemoteError(message)
    return { ok: false, failure, message: String(result.stderr) || String(result.stdout) }
  }

  async stageAll(): Promise<void> {
    const result = await this.run(['add', '-A'])
    if (result.exitCode !== 0) throw new Error(String(result.stderr) || 'git add failed')
  }

  async commit(message: string, author: GitAuthor): Promise<GitResult> {
    const result = await this.run([
      '-c',
      `user.name=${author.name}`,
      '-c',
      `user.email=${author.email}`,
      'commit',
      '-m',
      message,
    ])
    if (result.exitCode === 0) return { ok: true }
    return {
      ok: false,
      failure: 'other',
      message: String(result.stderr) || String(result.stdout),
    }
  }

  async push(branch: string): Promise<GitResult> {
    const result = await this.run(['push', 'origin', `HEAD:${branch}`])
    if (result.exitCode === 0) return { ok: true }
    const message = `${result.stdout}\n${result.stderr}`
    return {
      ok: false,
      failure: classifyRemoteError(message),
      message: String(result.stderr) || String(result.stdout),
    }
  }

  async testRemote(
    remoteUrl: string,
    branch: string,
  ): Promise<{ ok: boolean; message: string }> {
    const result = await this.run(['ls-remote', '--heads', remoteUrl, branch], 15_000)
    if (result.exitCode !== 0) {
      const message = `${result.stdout}\n${result.stderr}`
      return {
        ok: false,
        message: `${classifyRemoteError(message)}: ${String(result.stderr).trim()}`,
      }
    }
    return {
      ok: true,
      message: String(result.stdout).trim()
        ? `${branch} found on remote`
        : `remote reachable, branch ${branch} does not exist yet`,
    }
  }
}
