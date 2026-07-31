'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  defaultGitSettings,
  projectOf,
  projectRoot,
  type Branch,
  type BroodmotherConfig,
  type DocPath,
  type DocRef,
  type DocRoot,
  type GitAuthor,
  type GitSettings,
  type GithubDevice,
  type GithubRepo,
  type GitState,
  type Identity,
  type NewProject,
  type Profile,
  type ProjectSummary,
  type SyncStatus,
  type TreeEntry,
  type TreeEvent,
  type VaultSummary,
} from '@broodmother/shared'
import { api, type ApiClient, type Connection } from './api'

/** Why an action failed, or null when it did not. */
export type Failure = string | null

/** The last change a tree reported, and which tree reported it. */
export interface RootEvent {
  root: DocRoot
  event: TreeEvent
}

export interface App {
  client: ApiClient
  /** The vault's documents, and every project's files beside them, by project name. */
  entries: { vault: TreeEntry[]; projects: Record<string, TreeEntry[]> }
  sync: SyncStatus
  /** False until config, vaults and profiles have answered — the shell gates on all three,
   *  and rendering before they land shows the home screen for a frame. */
  ready: boolean
  config: BroodmotherConfig | null
  configReset: string[]
  /** The profile the open vault commits as, null until one is picked. */
  profile: Profile | null
  profiles: Profile[]
  /** Whether this build can connect to GitHub at all — a client id is a build-time thing. */
  githubReady: boolean
  /** Who git on this machine says you are, for a profile nobody has filled in yet. */
  suggestedAuthor: GitAuthor | null
  /** The broodmother home: the folder the vaults are folders in. */
  home: string
  /** Null until a vault exists — the app asks where you work before anything else. */
  vault: VaultSummary | null
  vaults: VaultSummary[]
  /** Where you are working: the vault, or one of its projects. Every project is open at
   *  once, so this settles nothing about what is loaded — it is what the tabs, the branches
   *  and a new shell are all about. */
  scope: DocRoot
  setScope(root: DocRoot): Promise<Failure>
  /** Every branch of the scope's repository, checked out or not, and which one you are in.
   *  No other root's branches are fetched: the one control that switches them is about the
   *  root you are standing in. */
  branches: Branch[]
  branch: string | null
  /** The project the scope is in, or null when it is the vault — which is where every vault
   *  starts. */
  project: ProjectSummary | null
  projects: ProjectSummary[]
  /** What git says about the open vault's checkout — `repo: false` is a vault with none,
   *  which is an ordinary thing for a vault to be. */
  gitState: GitState
  /** How the open vault is set to sync. */
  gitSettings: GitSettings
  /** Where you are standing, as one string: the vault, the root you are scoped to, and that
   *  root's branch. Anything kept per place is filed under this, and anything read out of
   *  one goes stale the moment it changes — the same document name on another branch is
   *  another document. The vault's branch is deliberately absent from a project's key: they
   *  are separate repositories, and moving one is not a move of the other. Before the vault
   *  has answered, its half is empty rather than absent, so the key is always a key and the
   *  placeholder is one a reader can recognise. */
  scopeKey: string
  /** The last change either tree reported, so an open document can follow a write it did
   *  not make itself. */
  treeEvent: RootEvent | null
  notice: string | null
  dismissNotice(): void
  create(ref: DocRef): Promise<Failure>
  createFolder(ref: DocRef): Promise<Failure>
  move(root: DocRoot, from: DocPath, to: DocPath): Promise<Failure>
  remove(ref: DocRef): Promise<Failure>
  save(ref: DocRef, markdown: string): Promise<Failure>
  syncNow(): Promise<Failure>
  clearConflict(): Promise<Failure>
  saveConfig(config: BroodmotherConfig): Promise<Failure>
  saveGitSettings(settings: GitSettings): Promise<Failure>
  createVault(input: {
    name: string
    git: 'none' | 'local' | 'remote'
    remoteUrl?: string | null
    branch?: string | null
  }): Promise<Failure>
  openVault(path: string): Promise<Failure>
  deleteVault(name: string): Promise<Failure>
  /** Makes the folder if it is not there yet, then links it. The scope moves onto a project
   *  in the open vault: you meant to work in it. */
  addProject(input: NewProject): Promise<Failure>
  /** Unlinks it. The repository stays exactly where it is. */
  removeProject(name: string): Promise<Failure>
  /** Empties the broodmother home. Every vault, every profile, and the config with them. */
  deleteAllData(): Promise<Failure>
  addBranch(root: DocRoot, name: string): Promise<Failure>
  /** Checks the branch out if it has no folder yet, then moves into it either way. */
  openBranch(root: DocRoot, name: string): Promise<Failure>
  deleteBranch(root: DocRoot, name: string): Promise<Failure>
  addProfile(input: { name: string } & Identity): Promise<Failure>
  selectProfile(name: string): Promise<Failure>
  saveIdentity(identity: Identity): Promise<Failure>
  /** Opens a device code. Answering it is the browser's job; `connectGithub` collects it. */
  startGithub(): Promise<GithubDevice | string>
  /** One ask for the answer. True once the profile is connected, false while still waiting. */
  connectGithub(deviceCode: string): Promise<boolean | string>
  disconnectGithub(): Promise<Failure>
  githubRepos(): Promise<GithubRepo[]>
  createGithubRepo(input: {
    name: string
    private: boolean
  }): Promise<GithubRepo | string>
}

/** Long enough to collect a burst of writes, short enough to feel like no wait at all. */
const TREE_COALESCE_MS = 60

const idleSync: SyncStatus = {
  state: 'off',
  lastSyncedAt: undefined,
  conflicted: [],
  message: undefined,
}

const EMPTY_TREES = {
  vault: [] as TreeEntry[],
  projects: {} as Record<string, TreeEntry[]>,
}

/** What the app assumes before the server answers: a vault with no repository, which is the
 *  quiet claim. Guessing the other way would flash a git UI at a folder that has none. */
const noGit: GitState = { repo: false, remoteUrl: null, branch: null }

/** Where the config says you are working. The scope is the server's to remember — a relaunch
 *  stands where you left off — so it is read out of the config rather than held beside it. */
function scopeOf(config: BroodmotherConfig | null): DocRoot {
  const name = config?.vaultPath ? config.project[config.vaultPath] : null
  return name ? projectRoot(name) : 'vault'
}

const AppContext = createContext<App | null>(null)

export function useApp(): App {
  const app = useContext(AppContext)
  if (!app) throw new Error('useApp outside AppProvider')
  return app
}

export function AppProvider({
  client = api,
  children,
}: {
  client?: ApiClient
  children: ReactNode
}) {
  const [entries, setEntries] = useState(EMPTY_TREES)
  const [sync, setSync] = useState<SyncStatus>(idleSync)
  const [ready, setReady] = useState(false)
  const [config, setConfig] = useState<BroodmotherConfig | null>(null)
  const [configReset, setConfigReset] = useState<string[]>([])
  const [githubReady, setGithubReady] = useState(false)
  const [suggestedAuthor, setSuggestedAuthor] = useState<GitAuthor | null>(null)
  const [vault, setVault] = useState<VaultSummary | null>(null)
  const [vaults, setVaults] = useState<VaultSummary[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [branch, setBranch] = useState<string | null>(null)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [gitState, setGitState] = useState<GitState>(noGit)
  const [gitSettings, setGitSettings] = useState<GitSettings>(defaultGitSettings)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [home, setHome] = useState('')
  const [treeEvent, setTreeEvent] = useState<RootEvent | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const connection = useRef<Connection | null>(null)
  const treeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadTree = () =>
    client
      .request('GET /api/tree', null)
      .then((result) =>
        setEntries({
          vault: result.vault,
          projects: Object.fromEntries(
            result.projects.map((project) => [project.name, project.entries]),
          ),
        }),
      )
      .catch(() => setEntries(EMPTY_TREES))

  /**
   * The tree is the whole tree, so it is fetched once for a burst rather than once per file
   * in it. An agent laying down a directory of notes is dozens of events in a moment, and
   * each one asking for the same answer would be dozens of reads of the same disk.
   */
  const reloadTree = () => {
    if (treeTimer.current) clearTimeout(treeTimer.current)
    treeTimer.current = setTimeout(() => {
      treeTimer.current = null
      void loadTree()
    }, TREE_COALESCE_MS)
  }

  const loadVaults = () =>
    client.request('GET /api/vaults', null).then((result) => {
      setVaults(result.vaults)
      setVault(result.active)
      setHome(result.home)
    })

  const loadProjects = () =>
    client
      .request('GET /api/projects', null)
      .then((result) => setProjects(result.projects))
      // 409s until a vault is open, which is a state and not a failure.
      .catch(() => setProjects([]))

  /** The scope's branches and no other root's. The root is passed rather than read off the
   *  state because this runs straight after the answer that moved it, and that answer is
   *  newer than anything React has rendered. */
  const loadBranches = (root: DocRoot) =>
    client
      .request('GET /api/branches', { root })
      .then((result) => {
        setBranches(result.branches)
        setBranch(result.active)
      })
      // 409s until a vault is open, which is a state and not a failure.
      .catch(() => {
        setBranches([])
        setBranch(null)
      })

  const loadProfiles = () =>
    client.request('GET /api/profiles', null).then((result) => {
      setProfiles(result.profiles)
      setProfile(result.active)
      setGithubReady(result.githubReady)
      setSuggestedAuthor(result.suggestedAuthor)
    })

  const loadConfig = () =>
    client.request('GET /api/config', null).then((result) => {
      setConfig(result.config)
      setConfigReset(result.reset)
      return result.config
    })

  const loadGit = () =>
    client
      .request('GET /api/git', null)
      .then((result) => {
        setGitState(result.state)
        setGitSettings(result.settings)
      })
      // 409s until a vault is open, which is a state and not a failure.
      .catch(() => setGitState(noGit))

  /** Everything that is a fact about where you are standing, which is everything that
   *  changes when you switch vault, scope or branch. The config is the one that says which
   *  root the branches are about, so it is what the caller hands in. */
  const loadPlace = (config: BroodmotherConfig | null) =>
    Promise.all([
      loadVaults(),
      loadProjects(),
      loadBranches(scopeOf(config)),
      loadTree(),
      loadGit(),
    ])

  useEffect(() => {
    void loadTree()
    void loadGit()
    void Promise.allSettled([
      loadVaults(),
      loadProjects(),
      loadProfiles(),
      loadConfig().then((config) => loadBranches(scopeOf(config))),
    ]).then(() => setReady(true))
    void client.request('GET /api/sync', null).then(setSync)

    connection.current = client.connect((message) => {
      switch (message.type) {
        case 'tree':
          // The event goes out at once — an open document follows the file it is showing
          // without waiting on anything — and the tree catches up a moment later.
          setTreeEvent({ root: message.root, event: message.event })
          reloadTree()
          break
        case 'sync':
          setSync(message.status)
          break
        case 'error':
          setNotice(message.message)
          break
      }
    })
    return () => {
      if (treeTimer.current) clearTimeout(treeTimer.current)
      connection.current?.close()
    }
  }, [client])

  /**
   * Every action goes through here, and every one of them can fail. The failure still lands
   * in the status line, but it is handed back as well: a modal that asked for the work is
   * the thing that has to say whether it worked, and it cannot read a line behind itself.
   */
  /** What went wrong, as the one sentence a panel has room for. */
  const reasonOf = (error: unknown): string =>
    error instanceof Error ? error.message : String(error)

  const run = async (work: () => Promise<string | void>): Promise<Failure> => {
    try {
      const message = await work()
      if (message) setNotice(message)
      return null
    } catch (error) {
      const reason = reasonOf(error)
      setNotice(reason)
      return reason
    }
  }

  const scope = scopeOf(config)
  const scopedProject = projectOf(scope)

  const value: App = {
    client,
    entries,
    sync,
    ready,
    config,
    configReset,
    profile,
    profiles,
    githubReady,
    suggestedAuthor,
    home,
    vault,
    vaults,
    scope,
    branches,
    branch,
    project: projects.find((one) => one.name === scopedProject) ?? null,
    projects,
    gitState,
    gitSettings,
    scopeKey: `${config?.vaultPath ?? ''}#${scope}#${branch ?? ''}`,
    treeEvent,
    notice,
    dismissNotice: () => setNotice(null),

    create: (ref) =>
      run(async () => {
        await client.request('PUT /api/doc', { ...ref, markdown: '' })
        return `created ${ref.path}`
      }),

    createFolder: (ref) =>
      run(async () => {
        await client.request('POST /api/folder', ref)
        return `created ${ref.path}`
      }),

    move: (root, from, to) =>
      run(async () => {
        const result = await client.request('POST /api/doc/move', { root, from, to })
        return `moved to ${result.to} · ${result.linksRewritten} links rewritten`
      }),

    remove: (ref) =>
      run(async () => {
        await client.request('DELETE /api/doc', ref)
        return `deleted ${ref.path}`
      }),

    save: (ref, markdown) =>
      run(async () => {
        await client.request('PUT /api/doc', { ...ref, markdown })
      }),

    syncNow: () =>
      run(async () => {
        setSync(await client.request('POST /api/sync/now', null))
      }),

    clearConflict: () =>
      run(async () => {
        setSync(await client.request('POST /api/sync/clear-conflict', null))
      }),

    saveConfig: (next) =>
      run(async () => {
        const result = await client.request('PUT /api/config', next)
        setConfig(result.config)
        setConfigReset([])
        return 'settings saved'
      }),

    saveGitSettings: (settings) =>
      run(async () => {
        const result = await client.request('PUT /api/git', settings)
        setGitSettings(result.settings)
        return 'sync settings saved'
      }),

    createVault: (input) =>
      run(async () => {
        const result = await client.request('POST /api/vaults', input)
        setConfig(result.config)
        await Promise.all([loadPlace(result.config), loadProfiles()])
        return `created ${result.vault.name}`
      }),

    // Every switch below reloads git: whether there is a repository, and where it points,
    // is a fact about the checkout you land in and not about the one you left.
    openVault: (path) =>
      run(async () => {
        const result = await client.request('POST /api/vaults/open', { path })
        setConfig(result.config)
        await Promise.all([loadPlace(result.config), loadProfiles()])
        return `opened ${path}`
      }),

    deleteVault: (name) =>
      run(async () => {
        const result = await client.request('DELETE /api/vaults', { name })
        setConfig(result.config)
        await Promise.all([loadPlace(result.config), loadProfiles()])
        return `deleted ${name}`
      }),

    addProject: (input) =>
      run(async () => {
        const result = await client.request('POST /api/projects', input)
        setConfig(result.config)
        await loadPlace(result.config)
        return `created ${result.project.name}`
      }),

    // Silent: moving the scope is a click in the sidebar, and the whole app changing under
    // you already says it happened. A line saying so as well is a line about your own hand.
    setScope: (root) =>
      run(async () => {
        const result = await client.request('POST /api/scope', { root })
        setConfig(result.config)
        await loadPlace(result.config)
      }),

    removeProject: (name) =>
      run(async () => {
        const result = await client.request('DELETE /api/projects', { name })
        setConfig(result.config)
        await loadPlace(result.config)
        return `deleted ${name}`
      }),

    deleteAllData: () =>
      run(async () => {
        const result = await client.request('DELETE /api/data', null)
        setConfig(result.config)
        setConfigReset([])
        await Promise.all([loadPlace(result.config), loadProfiles()])
        return 'deleted everything in the broodmother home'
      }),

    addBranch: (root, name) =>
      run(async () => {
        const result = await client.request('POST /api/branches', { root, name })
        setConfig(result.config)
        await loadPlace(result.config)
        return `created ${result.branch.name}`
      }),

    openBranch: (root, name) =>
      run(async () => {
        const result = await client.request('POST /api/branches/open', { root, name })
        setConfig(result.config)
        await loadPlace(result.config)
        return `switched to ${name}`
      }),

    deleteBranch: (root, name) =>
      run(async () => {
        const result = await client.request('DELETE /api/branches', { root, name })
        setConfig(result.config)
        await loadPlace(result.config)
        return `removed ${name}`
      }),

    addProfile: (input) =>
      run(async () => {
        const result = await client.request('POST /api/profiles', input)
        await Promise.all([loadVaults(), loadProfiles()])
        return `created ${result.profile.name}`
      }),

    selectProfile: (name) =>
      run(async () => {
        await client.request('PUT /api/vaults', { profile: name })
        await Promise.all([loadVaults(), loadProfiles()])
        return `working as ${name}`
      }),

    saveIdentity: (identity) =>
      run(async () => {
        const result = await client.request('PUT /api/profiles', identity)
        setProfile(result.profile)
        await loadProfiles()
        return 'profile saved'
      }),

    /* The three below hand their failures back rather than raising a notice: they happen
       inside a panel that has somewhere of its own to say what went wrong, and a toast over
       a sign-in that is still open reads as though the sign-in ended. */
    startGithub: () =>
      client
        .request('POST /api/github/device', null)
        .catch((error: unknown) => reasonOf(error)),

    connectGithub: (deviceCode) =>
      client
        .request('POST /api/github/connect', { deviceCode })
        .then((result) => {
          if (!result.pending) setProfile(result.profile)
          return !result.pending
        })
        .catch((error: unknown) => reasonOf(error)),

    disconnectGithub: () =>
      run(async () => {
        const result = await client.request('DELETE /api/github', null)
        setProfile(result.profile)
        await loadProfiles()
        return 'disconnected from GitHub'
      }),

    githubRepos: () =>
      client
        .request('GET /api/github/repos', null)
        .then((result) => result.repos)
        .catch(() => []),

    createGithubRepo: (input) =>
      client
        .request('POST /api/github/repos', input)
        .then((result) => result.repo)
        .catch((error: unknown) => reasonOf(error)),
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
