import {
  defaultGitSettings,
  projectOf,
  type ApiRequest,
  type ApiResponse,
  type ApiRoute,
  type Branch,
  type BroodmotherConfig,
  type DocPath,
  type DocRoot,
  type GitSettings,
  type GitState,
  type Identity,
  type GitAuthor,
  type GithubRepo,
  type Profile,
  type ProjectSummary,
  type ServerMessage,
  type SyncStatus,
  type TerminalServerMessage,
  type TreeEntry,
  type VaultSummary,
} from '@broodmother/shared'
import type { ApiClient, Connection } from './client'

export interface MockClient extends ApiClient {
  emit(message: ServerMessage): void
  /** Stands in for the pty: whatever is typed comes straight back. */
  emitTerminal(message: TerminalServerMessage): void
}

const seedDocs: Record<DocPath, string> = {
  'README.md': '# Vault\n\nEverything lives here.\n',
  'Handbook/Overview.md': '# Overview\n\nWhat this handbook covers, and who it is for.\n',
  'Handbook/Risks.md':
    '# Risks & checklist\n\n- Nothing is backed up until it is pushed\n',
  'Business/Roadmap.md':
    '# Roadmap\n\n1. Write it down\n2. Share it\n3. Keep it current\n',
}

const HANDBOOK = '/Users/you/.broodmother/you/handbook'

const seedConfig: BroodmotherConfig = {
  vaultPath: HANDBOOK,
  profile: 'you',
  checkouts: {},
  git: { [HANDBOOK]: { ...defaultGitSettings(), enabled: true } },
  project: {},
  projectBranch: {},
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
  soul: null,
  github: null,
}

function tree(paths: DocPath[]): TreeEntry[] {
  const roots: TreeEntry[] = []
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
      level = (dir as Extract<TreeEntry, { kind: 'dir' }>).children
    }
  }
  return roots
}

export function createMockClient(
  seed: {
    docs?: Record<DocPath, string>
    /** Project name to its files. A vault links as many as it likes, and the sidebar draws
     *  all of them. */
    projectDocs?: Record<string, Record<DocPath, string>>
    config?: BroodmotherConfig
    sync?: SyncStatus
    home?: string
    vaults?: VaultSummary[]
    profiles?: Profile[]
    active?: VaultSummary | null
    projects?: ProjectSummary[]
    project?: string | null
    branches?: Branch[]
    branch?: string | null
    projectBranches?: Record<string, Branch[]>
    projectBranch?: Record<string, string | null>
    gitState?: GitState
    gitSettings?: GitSettings
    publicKey?: string | null
    githubReady?: boolean
    suggestedAuthor?: GitAuthor | null
    githubRepos?: GithubRepo[]
  } = {},
): MockClient {
  const docs = { ...seedDocs, ...seed.docs }
  const projectDocs: Record<string, Record<DocPath, string>> = { ...seed.projectDocs }
  const home = seed.home ?? '/Users/you/.broodmother'
  const profiles: Profile[] = seed.profiles ?? [seedProfile]
  const vaults: VaultSummary[] = seed.vaults ?? [
    { name: 'handbook', path: `${home}/you/handbook`, profile: 'you' },
  ]
  let active: VaultSummary | null =
    seed.active === undefined ? (vaults[0] ?? null) : seed.active
  const projects: ProjectSummary[] = seed.projects ?? []
  // Who you are working as. The open vault sits in this profile's folder, so it names one
  // even before the first vault exists.
  let working: string | null = vaults[0]?.profile ?? profiles[0]?.name ?? null
  const profileOf = () =>
    profiles.find((profile) => profile.name === working) ?? profiles[0] ?? null
  /** Working as someone else is standing in their folder, so what opens is one of theirs. */
  const workAs = (name: string): VaultSummary | null => {
    working = name
    active = vaults.find((vault) => vault.profile === name) ?? null
    config = { ...config, profile: name, vaultPath: active?.path ?? null }
    return active
  }
  const found = (name: string) => projects.find((one) => one.name === name) ?? null
  const githubRepos: GithubRepo[] = seed.githubRepos ?? []
  // The browser half of the device flow, stood in for: the first ask is always pending.
  let githubAsked = false
  // Seeded from the active vault so a seed with no vaults is a machine with nothing open,
  // rather than one pointed at a vault its own listing does not have.
  let config = { ...seedConfig, vaultPath: active?.path ?? null, ...seed.config }
  // The scope is a fact about the vault, so it lives where the server puts it.
  const setScoped = (name: string | null) => {
    config = {
      ...config,
      project: { ...config.project, [config.vaultPath ?? '']: name },
    }
  }
  const scoped = () => config.project[config.vaultPath ?? ''] ?? null
  if (seed.project !== undefined) setScoped(seed.project)
  const branches: Branch[] = seed.branches ?? [
    { name: 'main', path: `${home}/handbook/local`, checkedOut: true, primary: true },
  ]
  let branch: string | null =
    seed.branch === undefined ? (branches[0]?.name ?? null) : seed.branch
  const projectBranches: Record<string, Branch[]> = seed.projectBranches ?? {}
  const projectBranch: Record<string, string | null> = { ...seed.projectBranch }
  for (const [name, list] of Object.entries(projectBranches))
    if (!(name in projectBranch))
      projectBranch[name] = list.find((one) => one.primary)?.name ?? null
  let gitState: GitState = seed.gitState ?? seedGitState
  let gitSettings: GitSettings = seed.gitSettings ??
    config.git[config.vaultPath ?? ''] ?? {
      ...defaultGitSettings(),
      enabled: gitState.repo,
    }
  let publicKey: string | null = seed.publicKey ?? null
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

  const filesIn = (root: DocRoot) => {
    const name = projectOf(root)
    if (!name) return docs
    return (projectDocs[name] ??= {})
  }
  const branchesIn = (root: DocRoot): Branch[] => {
    const name = projectOf(root)
    if (!name) return branches
    return (projectBranches[name] ??= [])
  }
  const branchOf = (root: DocRoot) => {
    const name = projectOf(root)
    return name ? (projectBranch[name] ?? null) : branch
  }
  const moveOnto = (root: DocRoot, name: string | null) => {
    const project = projectOf(root)
    if (project) projectBranch[project] = name
    else branch = name
  }

  const handlers: { [R in ApiRoute]: (body: ApiRequest<R>) => Promise<ApiResponse<R>> } =
    {
      'GET /api/tree': async () => ({
        vault: tree(Object.keys(docs)),
        projects: projects.map((one) => ({
          name: one.name,
          entries: tree(Object.keys(projectDocs[one.name] ?? {})),
        })),
      }),
      'GET /api/branches': async ({ root }) => {
        return {
          branches: [...branchesIn(root)],
          active: branchOf(root),
        }
      },
      'POST /api/branches': async ({ root, name }) => {
        const list = branchesIn(root)
        if (list.some((one) => one.name === name))
          throw new Error(`"${name}" already exists`)
        if (root === 'vault' && name === 'local')
          throw new Error('"local" is the vault’s own checkout')
        const made: Branch = {
          name,
          path: `${config.vaultPath}/${name.replaceAll('/', '-')}`,
          checkedOut: true,
          primary: false,
        }
        list.push(made)
        moveOnto(root, name)
        return { branch: made, config }
      },
      // Checking out on the way in is the whole point, so a branch with no folder gets one.
      'POST /api/branches/open': async ({ root, name }) => {
        const one = branchesIn(root).find((each) => each.name === name)
        if (!one) throw new Error(`no branch named "${name}"`)
        one.checkedOut = true
        moveOnto(root, name)
        return { branch: one, config }
      },
      'DELETE /api/branches': async ({ root, name }) => {
        const list = branchesIn(root)
        const one = list.find((each) => each.name === name)
        if (!one) throw new Error(`no branch named "${name}"`)
        if (one.primary)
          throw new Error('the repository’s own checkout cannot be removed')
        one.checkedOut = false
        if (branchOf(root) === name)
          moveOnto(root, list.find((each) => each.primary)?.name ?? null)
        return { branches: [...list], config }
      },
      'GET /api/profiles': async () => ({
        profiles: [...profiles],
        active: profileOf(),
        githubReady: seed.githubReady ?? false,
        suggestedAuthor: seed.suggestedAuthor ?? null,
      }),
      'POST /api/profiles': async ({ name, ...identity }) => {
        if (profiles.some((profile) => profile.name === name))
          throw new Error(`a profile named "${name}" already exists`)
        const profile: Profile = {
          name,
          path: `${home}/${name}/profile.json`,
          github: null,
          ...identity,
        }
        profiles.push(profile)
        return { profile, vault: workAs(name) }
      },
      'PUT /api/profiles': async (identity: Identity) => {
        const current = profileOf()
        if (!current) throw new Error('no profile yet')
        const profile = { ...current, ...identity }
        profiles.splice(profiles.indexOf(current), 1, profile)
        return { profile }
      },
      'GET /api/profiles/key': async () => ({ publicKey }),
      'POST /api/profiles/key': async () => {
        const current = profileOf()
        if (!current) throw new Error('no profile yet')
        if (publicKey) throw new Error(`${current.name} already has a key`)
        publicKey = `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI${current.name} ${current.name}@broodmother`
        return { profile: current, publicKey }
      },
      /* The device flow, with the browser half taken as read: one ask says pending, the next
         says connected, which is the two states a caller has to handle. */
      'POST /api/github/device': async () => ({
        deviceCode: 'device-code',
        userCode: 'ABCD-1234',
        verificationUri: 'https://github.com/login/device',
        intervalMs: 10,
      }),
      'POST /api/github/connect': async () => {
        const current = profileOf()
        if (!current) throw new Error('no profile yet')
        if (!githubAsked) {
          githubAsked = true
          return { pending: true, profile: current }
        }
        const connected = { ...current, github: 'you' }
        profiles.splice(profiles.indexOf(current), 1, connected)
        return { pending: false, profile: connected }
      },
      'DELETE /api/github': async () => {
        const current = profileOf()
        if (!current) throw new Error('no profile yet')
        const gone = { ...current, github: null }
        profiles.splice(profiles.indexOf(current), 1, gone)
        return { profile: gone }
      },
      'GET /api/github/repos': async () => ({ repos: [...githubRepos] }),
      'POST /api/github/repos': async ({ name, private: hidden }) => {
        const repo: GithubRepo = {
          fullName: `you/${name}`,
          cloneUrl: `https://github.com/you/${name}.git`,
          private: hidden,
          defaultBranch: 'main',
        }
        githubRepos.push(repo)
        return { repo }
      },
      /* Only the profile you are working as has vaults you can open: they are the folders
         in its folder. */
      'GET /api/vaults': async () => ({
        home,
        vaults: vaults.filter((vault) => vault.profile === working),
        active,
      }),
      'POST /api/vaults': async ({ name, git, remoteUrl, branch: head }) => {
        const profile = working
        if (!profile) throw new Error('no profile yet — pick one for this vault first')
        if (vaults.some((vault) => vault.name === name && vault.profile === profile))
          throw new Error(`a vault named "${name}" already exists`)
        if (git === 'remote' && !remoteUrl?.trim())
          throw new Error('a vault that syncs needs a remote')
        const vault = { name, path: `${home}/${profile}/${name}`, profile }
        vaults.push(vault)
        active = vault
        gitSettings = { ...defaultGitSettings(), enabled: git === 'remote' }
        gitState = {
          repo: git !== 'none',
          remoteUrl: git === 'remote' ? (remoteUrl?.trim() ?? null) : null,
          branch: git === 'none' ? null : head?.trim() || 'main',
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
        return { vault: workAs(profile) }
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
      'GET /api/projects': async () => ({ projects: [...projects] }),
      'POST /api/projects': async ({ name, vault }) => {
        if (found(name)) throw new Error(`a project named "${name}" already exists`)
        const created: ProjectSummary = {
          name,
          repo: `${active?.path ?? HANDBOOK}/.projects/${name}/local`,
        }
        projects.push(created)
        // Only the vault you are in is somewhere you can go and work.
        if (!vault || vault === active?.name) setScoped(name)
        return { project: created, config }
      },
      'DELETE /api/projects': async ({ name }) => {
        const index = projects.findIndex((one) => one.name === name)
        if (index < 0) throw new Error(`no project named "${name}"`)
        projects.splice(index, 1)
        delete projectDocs[name]
        delete projectBranches[name]
        if (scoped() === name) setScoped(null)
        return { config }
      },
      'POST /api/scope': async ({ root }) => {
        const name = projectOf(root)
        if (name && !found(name)) throw new Error(`no project named "${name}"`)
        setScoped(name)
        return { config }
      },
      'GET /api/doc': async ({ root, path }) => {
        const files = filesIn(root)
        if (!(path in files)) throw new Error(`no such document: ${path}`)
        return { markdown: files[path] }
      },
      'PUT /api/doc': async ({ root, path, markdown }) => {
        const files = filesIn(root)
        const created = !(path in files)
        files[path] = markdown
        emit({
          type: 'tree',
          root,
          event: { type: created ? 'created' : 'changed', path },
        })
        return { ok: true }
      },
      'POST /api/doc/move': async ({ root, from, to }) => {
        const files = filesIn(root)
        files[to] = files[from]
        delete files[from]
        emit({ type: 'tree', root, event: { type: 'moved', from, to } })
        return { to, linksRewritten: 3 }
      },
      'DELETE /api/doc': async ({ root, path }) => {
        delete filesIn(root)[path]
        emit({ type: 'tree', root, event: { type: 'removed', path } })
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
      'POST /api/git/check': async () => {
        if (!gitState.repo)
          return {
            state: 'no-repo' as const,
            remoteUrl: null,
            message: 'This is a folder, not a repository.',
          }
        if (!gitState.remoteUrl)
          return {
            state: 'no-remote' as const,
            remoteUrl: null,
            message: 'A repository with no remote.',
          }
        return {
          state: 'ok' as const,
          remoteUrl: gitState.remoteUrl,
          message: `Reached ${gitState.remoteUrl}.`,
        }
      },
      'GET /api/git': async () => ({ state: gitState, settings: gitSettings }),
      'PUT /api/git': async (settings) => {
        gitSettings = settings
        if (config.vaultPath)
          config = { ...config, git: { ...config.git, [config.vaultPath]: settings } }
        return { settings }
      },
      'DELETE /api/data': async () => {
        vaults.length = 0
        profiles.length = 0
        branches.length = 0
        projects.length = 0
        for (const path of Object.keys(docs)) delete docs[path]
        for (const name of Object.keys(projectDocs)) delete projectDocs[name]
        for (const name of Object.keys(projectBranches)) delete projectBranches[name]
        for (const name of Object.keys(projectBranch)) delete projectBranch[name]
        active = null
        working = null
        setScoped(null)
        branch = null
        gitState = { repo: false, remoteUrl: null, branch: null }
        gitSettings = defaultGitSettings()
        config = {
          vaultPath: null,
          profile: null,
          checkouts: {},
          git: {},
          project: {},
          projectBranch: {},
        }
        return { config }
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

    terminal(_root, onMessage, _onClose) {
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
