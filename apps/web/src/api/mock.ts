import type {
  ApiRequest,
  ApiResponse,
  ApiRoute,
  MotherConfig,
  ServerMessage,
  SyncStatus,
  TerminalServerMessage,
  VaultEntry,
  VaultPath,
  VaultSummary,
} from '@mother/shared'
import type { ApiClient, Connection } from './client'

export interface MockClient extends ApiClient {
  emit(message: ServerMessage): void
  /** Stands in for the pty: whatever is typed comes straight back. */
  emitTerminal(message: TerminalServerMessage): void
}

const seedDocs: Record<VaultPath, string> = {
  'README.md': '# Vault\n\nEverything lives here.\n',
  'ECSEQ-1/Whitepaper.md':
    '# Whitepaper\n\nA flat silicon array reads polymerase kinetics.\n',
  'ECSEQ-1/Risks.md': '# Risks & kill-criteria\n\n- Signal-to-noise at 2 um pitch\n',
  'Business/Roadmap.md':
    '# Roadmap\n\n1. Sequencing\n2. Home health\n3. Phenotypic modeling\n',
}

const seedConfig: MotherConfig = {
  vaultPath: '/Users/you/.mother/proprium-docs',
  remoteUrl: 'git@github.com:Proprium-Bioscience/docs.git',
  branch: 'main',
  syncEnabled: true,
  syncIdleMs: 10_000,
  relayUrl: 'ws://127.0.0.1:3001/ws',
  displayName: 'you',
  presenceColor: '#c084fc',
  gitAuthor: { name: 'You', email: 'you@propriumbioscience.com' },
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
    config?: MotherConfig
    sync?: SyncStatus
    home?: string
    vaults?: VaultSummary[]
  } = {},
): MockClient {
  const docs = { ...seedDocs, ...seed.docs }
  const home = seed.home ?? '/Users/you/.mother'
  const vaults: VaultSummary[] = seed.vaults ?? [
    { name: 'proprium-docs', path: `${home}/proprium-docs` },
  ]
  let config = { ...seedConfig, ...seed.config }
  let sync: SyncStatus = seed.sync ?? {
    state: 'idle',
    lastSyncedAt: Date.now(),
    conflicted: [],
    message: null,
  }
  let listener: ((message: ServerMessage) => void) | null = null
  let shell: ((message: TerminalServerMessage) => void) | null = null
  const emit = (message: ServerMessage) => listener?.(message)
  const emitTerminal = (message: TerminalServerMessage) => shell?.(message)

  const handlers: { [R in ApiRoute]: (body: ApiRequest<R>) => Promise<ApiResponse<R>> } =
    {
      'GET /api/vault': async () => ({ entries: tree(Object.keys(docs)) }),
      'GET /api/vaults': async () => ({ home, vaults: [...vaults] }),
      'POST /api/vaults': async ({ name, remoteUrl, branch }) => {
        if (vaults.some((vault) => vault.name === name))
          throw new Error(`a vault named "${name}" already exists`)
        const vault = { name, path: `${home}/${name}` }
        vaults.push(vault)
        config = {
          ...config,
          vaultPath: vault.path,
          remoteUrl,
          branch,
          syncEnabled: true,
        }
        return { vault, config }
      },
      'POST /api/vaults/open': async ({ path }) => {
        config = { ...config, vaultPath: path }
        return { config }
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
      'POST /api/config/test-relay': async ({ relayUrl }) => ({
        ok: Boolean(relayUrl),
        message: relayUrl ? `relay answered at ${relayUrl}` : 'no relay configured',
      }),
      'GET /api/sync': async () => sync,
      'POST /api/sync/now': async () => {
        sync = { state: 'idle', lastSyncedAt: Date.now(), conflicted: [], message: null }
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
        send(message) {
          if (message.type === 'join') {
            emit({ type: 'session', room: message.room, state: 'connecting', peers: [] })
            emit({
              type: 'session',
              room: message.room,
              state: 'live',
              peers: [
                {
                  id: 'you',
                  displayName: config.displayName,
                  color: config.presenceColor,
                  selection: null,
                },
              ],
            })
          }
          if (message.type === 'leave') {
            emit({ type: 'session', room: message.room, state: 'solo', peers: [] })
          }
        },
        close() {
          listener = null
        },
      }
    },

    terminal(onMessage) {
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
