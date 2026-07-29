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
} from '@broodmother/shared'
import { api, type ApiClient, type Connection } from './api'

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
  /** The last change the vault reported, so an open document can follow a write it did not
   *  make itself. */
  vaultEvent: VaultEvent | null
  notice: string | null
  dismissNotice(): void
  create(path: VaultPath): Promise<void>
  move(from: VaultPath, to: VaultPath): Promise<void>
  remove(path: VaultPath): Promise<void>
  save(path: VaultPath, markdown: string): Promise<void>
  syncNow(): Promise<void>
  clearConflict(): Promise<void>
  saveConfig(config: BroodmotherConfig): Promise<void>
  createVault(input: { name: string; remoteUrl: string; branch: string }): Promise<void>
  openVault(path: string): Promise<void>
  deleteVault(name: string): Promise<void>
  addProfile(input: { name: string } & Identity): Promise<void>
  selectProfile(name: string): Promise<void>
  saveIdentity(identity: Identity): Promise<void>
}

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
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [home, setHome] = useState('')
  const [vaultEvent, setVaultEvent] = useState<VaultEvent | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const connection = useRef<Connection | null>(null)

  const loadVault = () =>
    client
      .request('GET /api/vault', null)
      .then((result) => setEntries(result.entries))
      .catch(() => setEntries([]))

  const loadVaults = () =>
    client.request('GET /api/vaults', null).then((result) => {
      setVaults(result.vaults)
      setVault(result.active)
      setHome(result.home)
    })

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
    void Promise.allSettled([loadVaults(), loadProfiles(), loadConfig()]).then(() =>
      setReady(true),
    )
    void client.request('GET /api/sync', null).then(setSync)

    connection.current = client.connect((message) => {
      switch (message.type) {
        case 'vault':
          setVaultEvent(message.event)
          void loadVault()
          break
        case 'sync':
          setSync(message.status)
          break
        case 'error':
          setNotice(message.message)
          break
      }
    })
    return () => connection.current?.close()
  }, [client])

  const run = async (work: () => Promise<string | void>) => {
    try {
      const message = await work()
      if (message) setNotice(message)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
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
        await Promise.all([loadVaults(), loadProfiles(), loadVault()])
        return `created ${result.vault.name}`
      }),

    openVault: (path) =>
      run(async () => {
        const result = await client.request('POST /api/vaults/open', { path })
        setConfig(result.config)
        await Promise.all([loadVaults(), loadProfiles(), loadVault()])
        return `opened ${path}`
      }),

    deleteVault: (name) =>
      run(async () => {
        const result = await client.request('DELETE /api/vaults', { name })
        setConfig(result.config)
        await Promise.all([loadVaults(), loadProfiles(), loadVault()])
        return `deleted ${name}`
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
