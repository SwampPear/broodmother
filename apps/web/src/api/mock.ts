import {
  defaultGitSettings,
  type ApiRequest,
  type ApiResponse,
  type ApiRoute,
  type GitSettings,
  type GitState,
  type Identity,
  type BroodmotherConfig,
  type Profile,
  type ServerMessage,
  type SyncStatus,
  type TerminalServerMessage,
  type VaultEntry,
  type VaultPath,
  type VaultSummary,
  type Worktree,
} from '@broodmother/shared'
import type { ApiClient, Connection } from './client'

export interface MockClient extends ApiClient {
  emit(message: ServerMessage): void
  /** Stands in for the pty: whatever is typed comes straight back. */
  emitTerminal(message: TerminalServerMessage): void
}

const seedDocs: Record<VaultPath, string> = {
  'README.md': '# Vault\n\nEverything lives here.\n',
  'Handbook/Overview.md': '# Overview\n\nWhat this handbook covers, and who it is for.\n',
  'Handbook/Risks.md':
    '# Risks & checklist\n\n- Nothing is backed up until it is pushed\n',
  'Business/Roadmap.md':
    '# Roadmap\n\n1. Write it down\n2. Share it\n3. Keep it current\n',
}

const HANDBOOK = '/Users/you/.broodmother/handbook'

const seedConfig: BroodmotherConfig = {
  vaultPath: HANDBOOK,
  profiles: { [HANDBOOK]: 'you' },
  worktrees: {},
  git: { [HANDBOOK]: { ...defaultGitSettings(), enabled: true } },
}

/** The seeded vault is a clone, which is the case with the most UI hanging off it. */
const seedGitState: GitState = {
  repo: true,
  remoteUrl: 'git@github.com:you/handbook.git',
  branch: 'main',
}

const seedProfile: Profile = {
  name: 'you',
  path: '/Users/you/.broodmother/profiles/you.json',
  color: '#c084fc',
  gitAuthor: { name: 'You', email: 'you@example.com' },
  sshKeyPath: null,
  claudeCfgDir: null,
}

function tree(paths: VaultPath[]): VaultEntry[] {
  const roots: VaultEntry[] = []
  for (const path of [...paths].sort()) {
    const parts = path.split('/')
    let level = roots
    for (const [depth, name] of parts.entries()) {
      const here = parts.slice(0, depth + 1).join('/')
      if (depth === parts.length - 1) {
        level.push({ kind: 'file', path: here, name, size: 0, modifiedAt: 0 })
        break
      }
      const existing = level.find((entry) => entry.kind === 'dir' && entry.path === here)
      const dir = existing ?? { kind: 'dir' as const, path: here, name, children: [] }
      if (!existing) level.push(dir)
      level = (dir as Extract<VaultEntry, { kind: 'dir' }>).children
    }
  }
  return roots
}

export function createMockClient(
  seed: {
    docs?: Record<VaultPath, string>
    config?: BroodmotherConfig
    sync?: SyncStatus
    home?: string
    vaults?: VaultSummary[]
    profiles?: Profile[]
    active?: VaultSummary | null
    worktrees?: Worktree[]
    worktree?: string
    gitState?: GitState
    gitSettings?: GitSettings
  } = {},
): MockClient {
  const docs = { ...seedDocs, ...seed.docs }
  const home = seed.home ?? '/Users/you/.broodmother'
  const profiles: Profile[] = seed.profiles ?? [seedProfile]
  const vaults: VaultSummary[] = seed.vaults ?? [
    { name: 'handbook', path: `${home}/handbook`, profile: 'you' },
  ]
  let active: VaultSummary | null =
    seed.active === undefined ? (vaults[0] ?? null) : seed.active
  // Set only while no vault is open: the identity the first vault will be created as, the
  // way the server holds one before there is anything to bind it to.
  let pending: string | null = null
  const profileOf = (vault: VaultSummary | null) => {
    const name = vault?.profile ?? pending
    if (name) return profiles.find((profile) => profile.name === name) ?? null
    return vault ? null : (profiles[0] ?? null)
  }
  /** Binding in place: the list and the active vault are the same vault, so both move. */
  const bind = (vault: VaultSummary, profile: string): VaultSummary => {
    const bound = { ...vault, profile }
    const index = vaults.findIndex((one) => one.path === vault.path)
    if (index >= 0) vaults.splice(index, 1, bound)
    return bound
  }
  // Seeded from the active vault so a seed with no vaults is a machine with nothing open,
  // rather than one pointed at a vault its own listing does not have.
  let config = { ...seedConfig, vaultPath: active?.path ?? null, ...seed.config }
  const worktrees: Worktree[] = seed.worktrees ?? [
    { name: 'local', path: `${home}/handbook/local`, branch: 'main', primary: true },
  ]
  let worktree = seed.worktree ?? 'local'
  let gitState: GitState = seed.gitState ?? seedGitState
  let gitSettings: GitSettings = seed.gitSettings ??
    config.git[config.vaultPath ?? ''] ?? {
      ...defaultGitSettings(),
      enabled: gitState.repo,
    }
  let sync: SyncStatus = seed.sync ?? {
    state: 'idle',
    lastSyncedAt: Date.now(),
    conflicted: [],
    message: undefined,
  }
  let listener: ((message: ServerMessage) => void) | null = null
  let shell: ((message: TerminalServerMessage) => void) | null = null
  const emit = (message: ServerMessage) => listener?.(message)
  const emitTerminal = (message: TerminalServerMessage) => shell?.(message)

  const handlers: { [R in ApiRoute]: (body: ApiRequest<R>) => Promise<ApiResponse<R>> } =
    {
      'GET /api/vault': async () => ({ entries: tree(Object.keys(docs)) }),
      'GET /api/worktrees': async () => ({ worktrees: [...worktrees], active: worktree }),
      'POST /api/worktrees': async ({ name, branch, create }) => {
        if (worktrees.some((one) => one.name === name))
          throw new Error(`"${name}" already exists`)
        if (name === 'local') throw new Error('"local" is the vault’s own checkout')
        const made: Worktree = {
          name,
          path: `${config.vaultPath}/${name}`,
          branch: create ? branch : branch,
          primary: false,
        }
        worktrees.push(made)
        worktree = name
        return { worktree: made, config }
      },
      'POST /api/worktrees/open': async ({ name }) => {
        if (!worktrees.some((one) => one.name === name))
          throw new Error(`no worktree named "${name}"`)
        worktree = name
        return { config }
      },
      'DELETE /api/worktrees': async ({ name }) => {
        const index = worktrees.findIndex((one) => one.name === name)
        if (index < 0) throw new Error(`no worktree named "${name}"`)
        if (worktrees[index]!.primary) throw new Error('"local" cannot be removed')
        worktrees.splice(index, 1)
        if (worktree === name) worktree = 'local'
        return { worktrees: [...worktrees], config }
      },
      'GET /api/profiles': async () => ({
        profiles: [...profiles],
        active: profileOf(active),
      }),
      'POST /api/profiles': async ({ name, ...identity }) => {
        if (profiles.some((profile) => profile.name === name))
          throw new Error(`a profile named "${name}" already exists`)
        const profile: Profile = {
          name,
          path: `${home}/profiles/${name}.json`,
          ...identity,
        }
        profiles.push(profile)
        if (active) active = bind(active, name)
        else pending = name
        return { profile, vault: active }
      },
      'PUT /api/profiles': async (identity: Identity) => {
        const current = profileOf(active)
        if (!current) throw new Error('no profile yet')
        const profile = { ...current, ...identity }
        profiles.splice(profiles.indexOf(current), 1, profile)
        return { profile }
      },
      'GET /api/vaults': async () => ({ home, vaults: [...vaults], active }),
      'POST /api/vaults': async ({ name, git, remoteUrl, branch }) => {
        if (vaults.some((vault) => vault.name === name))
          throw new Error(`a vault named "${name}" already exists`)
        if (git === 'remote' && !remoteUrl?.trim())
          throw new Error('a vault that syncs needs a remote')
        const vault = {
          name,
          path: `${home}/${name}`,
          profile: profileOf(active)?.name ?? profiles[0]?.name ?? null,
        }
        vaults.push(vault)
        active = vault
        pending = null
        gitSettings = { ...defaultGitSettings(), enabled: git === 'remote' }
        gitState = {
          repo: git !== 'none',
          remoteUrl: git === 'remote' ? (remoteUrl?.trim() ?? null) : null,
          branch: git === 'none' ? null : branch?.trim() || 'main',
        }
        config = {
          ...config,
          vaultPath: vault.path,
          git: { ...config.git, [vault.path]: gitSettings },
        }
        return { vault, config }
      },
      'POST /api/vaults/open': async ({ path }) => {
        active = vaults.find((vault) => vault.path === path) ?? active
        config = { ...config, vaultPath: path }
        return { config }
      },
      'PUT /api/vaults': async ({ profile }) => {
        if (!profiles.some((one) => one.name === profile))
          throw new Error(`no profile named "${profile}"`)
        if (!active) {
          pending = profile
          return { vault: null }
        }
        active = bind(active, profile)
        return { vault: active }
      },
      'DELETE /api/vaults': async ({ name }) => {
        const index = vaults.findIndex((vault) => vault.name === name)
        if (index < 0) throw new Error(`no vault named "${name}"`)
        vaults.splice(index, 1)
        if (active?.name === name) {
          active = vaults[0] ?? null
          config = { ...config, vaultPath: active?.path ?? null }
        }
        return { active, config }
      },
      'GET /api/doc': async ({ path }) => {
        if (!(path in docs)) throw new Error(`no such document: ${path}`)
        return { markdown: docs[path] }
      },
      'PUT /api/doc': async ({ path, markdown }) => {
        const created = !(path in docs)
        docs[path] = markdown
        emit({ type: 'vault', event: { type: created ? 'created' : 'changed', path } })
        return { ok: true }
      },
      'POST /api/doc/move': async ({ from, to }) => {
        docs[to] = docs[from]
        delete docs[from]
        emit({ type: 'vault', event: { type: 'moved', from, to } })
        return { to, linksRewritten: 3 }
      },
      'DELETE /api/doc': async ({ path }) => {
        delete docs[path]
        emit({ type: 'vault', event: { type: 'removed', path } })
        return { ok: true }
      },
      'GET /api/links': async ({ path }) => ({
        backlinks: [{ from: 'README.md', to: path, context: 'see [[' + path + ']]' }],
        outbound: [],
      }),
      'GET /api/config': async () => ({ config, reset: [] }),
      'PUT /api/config': async (next) => {
        config = next
        return { config }
      },
      'POST /api/config/test-remote': async ({ remoteUrl, branch }) => ({
        ok: Boolean(remoteUrl),
        message: remoteUrl ? `reached ${remoteUrl} (${branch})` : 'no remote configured',
      }),
      'GET /api/git': async () => ({ state: gitState, settings: gitSettings }),
      'PUT /api/git': async (settings) => {
        gitSettings = settings
        if (config.vaultPath)
          config = { ...config, git: { ...config.git, [config.vaultPath]: settings } }
        return { settings }
      },
      'GET /api/sync': async () => sync,
      'POST /api/sync/now': async () => {
        sync = {
          state: 'idle',
          lastSyncedAt: Date.now(),
          conflicted: [],
          message: undefined,
        }
        emit({ type: 'sync', status: sync })
        return sync
      },
      'POST /api/sync/clear-conflict': async () => {
        sync = { ...sync, state: 'idle', conflicted: [] }
        emit({ type: 'sync', status: sync })
        return sync
      },
    }

  return {
    request<R extends ApiRoute>(route: R, body: ApiRequest<R>) {
      const handler = handlers[route] as (b: ApiRequest<R>) => Promise<ApiResponse<R>>
      return handler(body)
    },

    connect(onMessage): Connection {
      listener = onMessage
      return {
        send() {},
        close() {
          listener = null
        },
      }
    },

    terminal(onMessage, _onClose) {
      shell = onMessage
      return {
        send(message) {
          if (message.type === 'input')
            emitTerminal({ type: 'output', data: message.data })
        },
        close() {
          shell = null
        },
      }
    },

    emit,
    emitTerminal,
  }
}
