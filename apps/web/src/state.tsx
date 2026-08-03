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
  type TreeChanges,
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
  /** What git says each checkout has touched, the same way around — read with the tree,
   *  so the rows and the letters they wear are one snapshot. */
  changes: { vault: TreeChanges; projects: Record<string, TreeChanges> }
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
   *  Every root's branches are held, so moving the scope is one synchronous step — the key,
   *  the tabs and this menu all turn over in the same paint, with nothing to wait for. */
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
   *  are separate repositories, and moving one is not a move of the other. Until the place
   *  has answered — the config on the way in, or a fresh vault's branches — the key wears a
   *  leading `#`: still a key, but not yet the name of anywhere, and everything filed per
   *  place knows not to treat it as one. */
  scopeKey: string
  /** The last change either tree reported, so an open document can follow a write it did
   *  not make itself. */
  treeEvent: RootEvent | null
  notice: string | null
  dismissNotice(): void
  /** An empty note unless told otherwise — a dream is born with its first trigger. */
  create(ref: DocRef, contents?: string): Promise<Failure>
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

const NO_CHANGES = {
  vault: {} as TreeChanges,
  projects: {} as Record<string, TreeChanges>,
}

/** A vault's projects, and the vault they were read out of. A project belongs to the vault
 *  holding it, so a list is only ever about one — and which one has to be written down, or
 *  the vault you have just left goes on filling the sidebar until its replacement answers. */
interface VaultProjects {
  vault: string | null
  list: ProjectSummary[]
}

const NO_PROJECTS: VaultProjects = { vault: null, list: [] }

/** What the app assumes before the server answers: a vault with no repository, which is the
 *  quiet claim. Guessing the other way would flash a git UI at a folder that has none. */
const noGit: GitState = { repo: false, remoteUrl: null, branch: null }

/** Where the config says you are working. The scope is the server's to remember — a relaunch
 *  stands where you left off — so it is read out of the config rather than held beside it. */
function scopeOf(config: BroodmotherConfig | null): DocRoot {
  const name = config?.vaultPath ? config.project[config.vaultPath] : null
  return name ? projectRoot(name) : 'vault'
}

/** A root's branches and which one its checkout is on. */
interface RootBranches {
  branches: Branch[]
  active: string | null
}

/** Which repository an entry is about: the root alone is not enough, because another
 *  vault's `vault` root is another repository. */
const rootKey = (vaultPath: string | null, root: DocRoot) => `${vaultPath ?? ''}#${root}`

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
  const [changes, setChanges] = useState(NO_CHANGES)
  const [sync, setSync] = useState<SyncStatus>(idleSync)
  const [ready, setReady] = useState(false)
  const [config, setConfig] = useState<BroodmotherConfig | null>(null)
  const [configReset, setConfigReset] = useState<string[]>([])
  const [githubReady, setGithubReady] = useState(false)
  const [suggestedAuthor, setSuggestedAuthor] = useState<GitAuthor | null>(null)
  const [vault, setVault] = useState<VaultSummary | null>(null)
  const [vaults, setVaults] = useState<VaultSummary[]>([])
  const [branchesByRoot, setBranchesByRoot] = useState<Record<string, RootBranches>>({})
  const [projects, setProjects] = useState<VaultProjects>(NO_PROJECTS)
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
      .then((result) => {
        setEntries({
          vault: result.vault,
          projects: Object.fromEntries(
            result.projects.map((project) => [project.name, project.entries]),
          ),
        })
        setChanges({
          vault: result.vaultChanges,
          projects: Object.fromEntries(
            result.projects.map((project) => [project.name, project.changes]),
          ),
        })
      })
      .catch(() => {
        setEntries(EMPTY_TREES)
        setChanges(NO_CHANGES)
      })

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

  /** The projects of the vault named, filed under it. No vault is no projects: the ones in
   *  a vault nobody has open are not somewhere you can go and work. */
  const loadProjects = async (vault: string | null): Promise<ProjectSummary[]> => {
    if (!vault) {
      setProjects(NO_PROJECTS)
      return []
    }
    // 409s until a vault is open, which is a state and not a failure.
    const result = await client.request('GET /api/projects', null).catch(() => null)
    const list = result?.projects ?? []
    setProjects({ vault, list })
    return list
  }

  /** One root's branches, filed under the repository they are about. A failure files an
   *  empty answer rather than nothing: a vault with no repository has no branches, and that
   *  is a fact about the place — known, not still on its way. */
  const loadBranches = (vaultPath: string | null, root: DocRoot) =>
    client
      .request('GET /api/branches', { root })
      .then((result) =>
        setBranchesByRoot((all) => ({
          ...all,
          [rootKey(vaultPath, root)]: {
            branches: result.branches,
            active: result.active,
          },
        })),
      )
      .catch(() =>
        setBranchesByRoot((all) => ({
          ...all,
          [rootKey(vaultPath, root)]: { branches: [], active: null },
        })),
      )

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
   *  changes when you switch vault, scope or branch. Every root's branches come in, not
   *  just the scope's: they are what lets a later scope move be one synchronous step, with
   *  nothing left to fetch between the click and the whole app standing somewhere else. */
  const loadPlace = (config: BroodmotherConfig | null) => {
    const vaultPath = config?.vaultPath ?? null
    return Promise.all([
      loadVaults(),
      loadTree(),
      loadGit(),
      loadProjects(vaultPath).then((list) =>
        vaultPath
          ? Promise.all(
              ['vault' as DocRoot, ...list.map((one) => projectRoot(one.name))].map(
                (root) => loadBranches(vaultPath, root),
              ),
            )
          : [],
      ),
    ])
  }

  useEffect(() => {
    // The config first, and everything about where you are standing from it: which vault is
    // open is what the rest of the place is an answer about.
    void Promise.allSettled([loadProfiles(), loadConfig().then(loadPlace)]).then(() =>
      setReady(true),
    )
    void client.request('GET /api/sync', null).then(setSync)

    let dropped = false
    connection.current = client.connect(
      (message) => {
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
      },
      /* Everything that happened while the socket was down was sent to a socket that was not
         there — this connection reports what changes, not what is, and nothing repeats it.
         So a connection that comes back reads the place again rather than trusting a screen
         that stopped being told things at some point it cannot name. */
      (live) => {
        if (!live) return void (dropped = true)
        if (!dropped) return
        dropped = false
        void loadConfig().then((config) => loadPlace(config))
        void client.request('GET /api/sync', null).then(setSync)
      },
    )
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

  /** A switch the backend has just confirmed, filed ahead of the reload: the key moves in
   *  this paint, and `loadPlace` catches the rest of the place up behind it. */
  const branchMoved = (config: BroodmotherConfig, root: DocRoot, branch: Branch) =>
    setBranchesByRoot((all) => {
      const key = rootKey(config.vaultPath, root)
      const known = all[key]?.branches ?? []
      const branches = known.some((one) => one.name === branch.name)
        ? known.map((one) => (one.name === branch.name ? branch : one))
        : [...known, branch]
      return { ...all, [key]: { branches, active: branch.name } }
    })

  const scope = scopeOf(config)
  const scopedProject = projectOf(scope)
  const vaultPath = config?.vaultPath ?? null
  // Only ever the open vault's own. A list read out of another one — the vault you were in a
  // moment ago, or one whose answer arrived late — names repositories that are not here.
  const here = projects.vault === vaultPath ? projects.list : []
  const scopeBranches = branchesByRoot[rootKey(vaultPath, scope)]
  // The key is a place once the config has said which vault this is and the scope's
  // repository has answered — a vaultless config has nothing further to wait for.
  const settled = config !== null && (vaultPath === null || scopeBranches !== undefined)

  const value: App = {
    client,
    entries,
    changes,
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
    branches: scopeBranches?.branches ?? [],
    branch: scopeBranches?.active ?? null,
    project: here.find((one) => one.name === scopedProject) ?? null,
    projects: here,
    gitState,
    gitSettings,
    // `-` where a vault would be: an app with none is somewhere you can stand, and its key
    // has to be tellable from one still waiting for the vault's name to arrive.
    scopeKey: `${settled ? '' : '#'}${vaultPath ?? '-'}#${scope}#${scopeBranches?.active ?? ''}`,
    treeEvent,
    notice,
    dismissNotice: () => setNotice(null),

    create: (ref, contents = '') =>
      run(async () => {
        await client.request('PUT /api/doc', { ...ref, markdown: contents })
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

    /**
     * Silent: moving the scope is a click in the sidebar, and the whole app changing under
     * you already says it happened. A line saying so as well is a line about your own hand.
     *
     * And synchronous. Where you are working is the client's to say — the click has already
     * said it — and with every root's branches already in hand there is nothing to fetch:
     * the config moves, the key moves with it, and the tabs, the branch menu and the panel
     * all turn over in the same paint. The request is how the backend is told, not how the
     * app finds out.
     */
    setScope: (root) =>
      run(async () => {
        // The tree raises this on every touch of a row, and standing still is not a move.
        if (root === scope || !config || !vaultPath) return
        const was = config
        setConfig({
          ...config,
          project: { ...config.project, [vaultPath]: projectOf(root) },
        })
        try {
          const result = await client.request('POST /api/scope', { root })
          setConfig(result.config)
        } catch (cause) {
          // Put back where it was: the app is standing somewhere the backend does not agree
          // it is, and a sidebar that lies about which project you are in is worse than one
          // that says the move did not happen.
          setConfig(was)
          throw cause
        }
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
        branchMoved(result.config, root, result.branch)
        await loadPlace(result.config)
        return `created ${result.branch.name}`
      }),

    openBranch: (root, name) =>
      run(async () => {
        const result = await client.request('POST /api/branches/open', { root, name })
        setConfig(result.config)
        branchMoved(result.config, root, result.branch)
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

    /* Both of these move the vault: working as someone else is standing in their folder, so
       what opens is one of their vaults — or none, which is where a new profile starts. The
       config is what says which, and it is read back rather than assumed, or the app goes on
       drawing the last vault's projects under the name of a vault that is not open. */
    addProfile: (input) =>
      run(async () => {
        const result = await client.request('POST /api/profiles', input)
        await Promise.all([loadProfiles(), loadConfig().then(loadPlace)])
        return `created ${result.profile.name}`
      }),

    selectProfile: (name) =>
      run(async () => {
        await client.request('PUT /api/vaults', { profile: name })
        await Promise.all([loadProfiles(), loadConfig().then(loadPlace)])
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
