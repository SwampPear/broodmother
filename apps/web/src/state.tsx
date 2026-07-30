'use client'

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  Identity,
  BroodmotherConfig,
  Profile,
  SyncStatus,
  VaultEntry,
  VaultEvent,
  VaultPath,
  VaultSummary,
  Worktree,
} from '@broodmother/shared'
import { api, type ApiClient, type Connection } from './api'

/** Why an action failed, or null when it did not. */
export type Failure = string | null

export interface App {
  client: ApiClient
  entries: VaultEntry[]
  sync: SyncStatus
  /** False until config, vaults and profiles have answered — the shell gates on all three,
   *  and rendering before they land shows the home screen for a frame. */
  ready: boolean
  config: BroodmotherConfig | null
  configReset: string[]
  /** The profile the open vault commits as, null until one is picked. */
  profile: Profile | null
  profiles: Profile[]
  /** The broodmother home: the folder the vaults are folders in. */
  home: string
  /** Null until a vault exists — the app asks where you work before anything else. */
  vault: VaultSummary | null
  vaults: VaultSummary[]
  /** The checkouts in the open vault, and which one you are in. */
  worktrees: Worktree[]
  worktree: string
  /** Which checkout is open, as one string: the vault, and the worktree inside it. Anything
   *  kept per checkout is filed under this, and anything read out of one goes stale the
   *  moment it changes — the same document name on another branch is another document.
   *  Before the vault has answered, the vault half is empty rather than absent, so the key
   *  is always a key and the placeholder is one a reader can recognise. */
  checkout: string
  /** The last change the vault reported, so an open document can follow a write it did not
   *  make itself. */
  vaultEvent: VaultEvent | null
  notice: string | null
  dismissNotice(): void
  create(path: VaultPath): Promise<Failure>
  move(from: VaultPath, to: VaultPath): Promise<Failure>
  remove(path: VaultPath): Promise<Failure>
  save(path: VaultPath, markdown: string): Promise<Failure>
  syncNow(): Promise<Failure>
  clearConflict(): Promise<Failure>
  saveConfig(config: BroodmotherConfig): Promise<Failure>
  createVault(input: {
    name: string
    remoteUrl: string
    branch: string
  }): Promise<Failure>
  openVault(path: string): Promise<Failure>
  deleteVault(name: string): Promise<Failure>
  addWorktree(input: { name: string; branch: string; create: boolean }): Promise<Failure>
  openWorktree(name: string): Promise<Failure>
  deleteWorktree(name: string): Promise<Failure>
  addProfile(input: { name: string } & Identity): Promise<Failure>
  selectProfile(name: string): Promise<Failure>
  saveIdentity(identity: Identity): Promise<Failure>
}

/** Long enough to collect a burst of writes, short enough to feel like no wait at all. */
const TREE_COALESCE_MS = 60

const idleSync: SyncStatus = {
  state: 'idle',
  lastSyncedAt: null,
  conflicted: [],
  message: null,
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
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [sync, setSync] = useState<SyncStatus>(idleSync)
  const [ready, setReady] = useState(false)
  const [config, setConfig] = useState<BroodmotherConfig | null>(null)
  const [configReset, setConfigReset] = useState<string[]>([])
  const [vault, setVault] = useState<VaultSummary | null>(null)
  const [vaults, setVaults] = useState<VaultSummary[]>([])
  const [worktrees, setWorktrees] = useState<Worktree[]>([])
  const [worktree, setWorktree] = useState('local')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [home, setHome] = useState('')
  const [vaultEvent, setVaultEvent] = useState<VaultEvent | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const connection = useRef<Connection | null>(null)
  const treeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadVault = () =>
    client
      .request('GET /api/vault', null)
      .then((result) => setEntries(result.entries))
      .catch(() => setEntries([]))

  /**
   * The tree is the whole tree, so it is fetched once for a burst rather than once per file
   * in it. An agent laying down a directory of notes is dozens of events in a moment, and
   * each one asking for the same answer would be dozens of reads of the same disk.
   */
  const reloadTree = () => {
    if (treeTimer.current) clearTimeout(treeTimer.current)
    treeTimer.current = setTimeout(() => {
      treeTimer.current = null
      void loadVault()
    }, TREE_COALESCE_MS)
  }

  const loadVaults = () =>
    client.request('GET /api/vaults', null).then((result) => {
      setVaults(result.vaults)
      setVault(result.active)
      setHome(result.home)
    })

  const loadWorktrees = () =>
    client
      .request('GET /api/worktrees', null)
      .then((result) => {
        setWorktrees(result.worktrees)
        setWorktree(result.active)
      })
      // 409s until a vault is open, which is a state and not a failure.
      .catch(() => setWorktrees([]))

  const loadProfiles = () =>
    client.request('GET /api/profiles', null).then((result) => {
      setProfiles(result.profiles)
      setProfile(result.active)
    })

  const loadConfig = () =>
    client.request('GET /api/config', null).then((result) => {
      setConfig(result.config)
      setConfigReset(result.reset)
    })

  useEffect(() => {
    void loadVault()
    void loadWorktrees()
    void Promise.allSettled([loadVaults(), loadProfiles(), loadConfig()]).then(() =>
      setReady(true),
    )
    void client.request('GET /api/sync', null).then(setSync)

    connection.current = client.connect((message) => {
      switch (message.type) {
        case 'vault':
          // The event goes out at once — an open document follows the file it is showing
          // without waiting on anything — and the tree catches up a moment later.
          setVaultEvent(message.event)
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
  const run = async (work: () => Promise<string | void>): Promise<Failure> => {
    try {
      const message = await work()
      if (message) setNotice(message)
      return null
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      setNotice(reason)
      return reason
    }
  }

  const value: App = {
    client,
    entries,
    sync,
    ready,
    config,
    configReset,
    profile,
    profiles,
    home,
    vault,
    vaults,
    worktrees,
    worktree,
    checkout: `${config?.vaultPath ?? ''}#${worktree}`,
    vaultEvent,
    notice,
    dismissNotice: () => setNotice(null),

    create: (path) =>
      run(async () => {
        await client.request('PUT /api/doc', { path, markdown: '' })
        return `created ${path}`
      }),

    move: (from, to) =>
      run(async () => {
        const result = await client.request('POST /api/doc/move', { from, to })
        return `moved to ${result.to} · ${result.linksRewritten} links rewritten`
      }),

    remove: (path) =>
      run(async () => {
        await client.request('DELETE /api/doc', { path })
        return `deleted ${path}`
      }),

    save: (path, markdown) =>
      run(async () => {
        await client.request('PUT /api/doc', { path, markdown })
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

    createVault: (input) =>
      run(async () => {
        const result = await client.request('POST /api/vaults', input)
        setConfig(result.config)
        await Promise.all([loadVaults(), loadProfiles(), loadWorktrees(), loadVault()])
        return `created ${result.vault.name}`
      }),

    openVault: (path) =>
      run(async () => {
        const result = await client.request('POST /api/vaults/open', { path })
        setConfig(result.config)
        await Promise.all([loadVaults(), loadProfiles(), loadWorktrees(), loadVault()])
        return `opened ${path}`
      }),

    deleteVault: (name) =>
      run(async () => {
        const result = await client.request('DELETE /api/vaults', { name })
        setConfig(result.config)
        await Promise.all([loadVaults(), loadProfiles(), loadVault()])
        return `deleted ${name}`
      }),

    addWorktree: (input) =>
      run(async () => {
        const result = await client.request('POST /api/worktrees', input)
        setConfig(result.config)
        await Promise.all([loadWorktrees(), loadVault()])
        return `created ${result.worktree.name}`
      }),

    openWorktree: (name) =>
      run(async () => {
        const result = await client.request('POST /api/worktrees/open', { name })
        setConfig(result.config)
        await Promise.all([loadWorktrees(), loadVault()])
        return `switched to ${name}`
      }),

    deleteWorktree: (name) =>
      run(async () => {
        const result = await client.request('DELETE /api/worktrees', { name })
        setConfig(result.config)
        await Promise.all([loadWorktrees(), loadVault()])
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
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
