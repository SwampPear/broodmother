import type {
  ApiRequest,
  ApiResponse,
  ApiRoute,
  Identity,
  MotherConfig,
  Profile,
  Project,
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
  project: 'proprium',
  vaultPath: '/Users/you/.mother/proprium/proprium-docs',
  remoteUrl: 'git@github.com:Proprium-Bioscience/docs.git',
  branch: 'main',
  syncEnabled: true,
  syncIdleMs: 10_000,
  relayUrl: 'ws://127.0.0.1:3001/ws',
}

const seedProfile: Profile = {
  name: 'you',
  path: '/Users/you/.mother/profiles/you.json',
  presenceColor: '#c084fc',
  gitAuthor: { name: 'You', email: 'you@propriumbioscience.com' },
  sshKeyPath: null,
  claudeConfigDir: null,
}

const seedProject: Project = {
  name: 'proprium',
  path: '/Users/you/.mother/proprium',
  profile: 'you',
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
    profiles?: Profile[]
    projects?: Project[]
    active?: Project | null
  } = {},
): MockClient {
  const docs = { ...seedDocs, ...seed.docs }
  const home = seed.home ?? '/Users/you/.mother'
  const profiles: Profile[] = seed.profiles ?? [seedProfile]
  const projects: Project[] = seed.projects ?? [seedProject]
  let active: Project | null =
    seed.active === undefined ? (projects[0] ?? null) : seed.active
  const profileOf = (project: Project | null) =>
    profiles.find((profile) => profile.name === project?.profile) ?? null
  const vaultHome = () => active?.path ?? home
  const vaults: VaultSummary[] = seed.vaults ?? [
    { name: 'proprium-docs', path: `${vaultHome()}/proprium-docs` },
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
      'GET /api/projects': async () => ({ home, projects: [...projects], active }),
      'POST /api/projects': async ({ name, profile }) => {
        if (projects.some((project) => project.name === name))
          throw new Error(`a project named "${name}" already exists`)
        const project: Project = { name, path: `${home}/${name}`, profile }
        projects.push(project)
        active = project
        config = { ...config, project: name, vaultPath: null }
        return { project, config }
      },
      'POST /api/projects/open': async ({ name }) => {
        const project = projects.find((candidate) => candidate.name === name)
        if (!project) throw new Error(`no project named "${name}"`)
        active = project
        config = { ...config, project: name }
        return { project, config }
      },
      'PUT /api/projects': async ({ profile }) => {
        if (!active) throw new Error('no project yet')
        active = { ...active, profile }
        projects.splice(
          projects.findIndex((project) => project.name === active!.name),
          1,
          active,
        )
        return { project: active }
      },
      'DELETE /api/projects': async ({ name }) => {
        const index = projects.findIndex((project) => project.name === name)
        if (index < 0) throw new Error(`no project named "${name}"`)
        projects.splice(index, 1)
        if (active?.name === name) {
          active = projects[0] ?? null
          config = { ...config, project: active?.name ?? null, vaultPath: null }
        }
        return { active, config }
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
        if (active) active = { ...active, profile: name }
        return { profile, project: active }
      },
      'PUT /api/profiles': async (identity: Identity) => {
        const current = profileOf(active)
        if (!current) throw new Error('no profile yet')
        const profile = { ...current, ...identity }
        profiles.splice(profiles.indexOf(current), 1, profile)
        return { profile }
      },
      'GET /api/vaults': async () => {
        if (!active) throw new Error('no project yet — set one up before opening a vault')
        return { home: active.path, vaults: [...vaults] }
      },
      'POST /api/vaults': async ({ name, remoteUrl, branch }) => {
        if (vaults.some((vault) => vault.name === name))
          throw new Error(`a vault named "${name}" already exists`)
        const vault = { name, path: `${vaultHome()}/${name}` }
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
                  displayName: profileOf(active)?.name ?? 'someone',
                  color: profileOf(active)?.presenceColor ?? '#8fb8d8',
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
