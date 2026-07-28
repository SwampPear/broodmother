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
  DivergenceChoice,
  DivergenceReport,
  DocsConfig,
  Peer,
  RoomId,
  SessionState,
  SyncStatus,
  VaultEntry,
  VaultPath,
} from '@docs/shared'
import { api, type ApiClient, type Connection } from './api'

export interface Session {
  room: RoomId
  path: VaultPath
  state: SessionState
  peers: Peer[]
}

export interface App {
  client: ApiClient
  entries: VaultEntry[]
  sync: SyncStatus
  config: DocsConfig | null
  configReset: string[]
  session: Session | null
  divergence: DivergenceReport | null
  notice: string | null
  dismissNotice(): void
  create(path: VaultPath): Promise<void>
  move(from: VaultPath, to: VaultPath): Promise<void>
  remove(path: VaultPath): Promise<void>
  save(path: VaultPath, markdown: string): Promise<void>
  syncNow(): Promise<void>
  clearConflict(): Promise<void>
  saveConfig(config: DocsConfig): Promise<void>
  share(path: VaultPath): void
  resolveDivergence(choice: DivergenceChoice): void
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

/** The relay keys rooms by `${repoId}/${path}`; the web app has no way to learn repoId
 *  yet, so it sends the path and lets the server qualify it — see CONTRACT-REQUEST.md. */
const roomFor = (path: VaultPath): RoomId => path

export function AppProvider({
  client = api,
  children,
}: {
  client?: ApiClient
  children: ReactNode
}) {
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [sync, setSync] = useState<SyncStatus>(idleSync)
  const [config, setConfig] = useState<DocsConfig | null>(null)
  const [configReset, setConfigReset] = useState<string[]>([])
  const [session, setSession] = useState<Session | null>(null)
  const [divergence, setDivergence] = useState<DivergenceReport | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const connection = useRef<Connection | null>(null)
  const sharing = useRef<VaultPath | null>(null)

  const loadVault = () =>
    client.request('GET /api/vault', null).then((result) => setEntries(result.entries))

  useEffect(() => {
    void loadVault()
    void client.request('GET /api/config', null).then((result) => {
      setConfig(result.config)
      setConfigReset(result.reset)
    })
    void client.request('GET /api/sync', null).then(setSync)

    connection.current = client.connect((message) => {
      switch (message.type) {
        case 'vault':
          void loadVault()
          break
        case 'sync':
          setSync(message.status)
          break
        case 'session':
          setSession({
            room: message.room,
            path: sharing.current ?? message.room,
            state: message.state,
            peers: message.peers,
          })
          break
        case 'divergence':
          setDivergence(message.report)
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
    config,
    configReset,
    session,
    divergence,
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

    share: (path) => {
      sharing.current = path
      setSession({ room: roomFor(path), path, state: 'connecting', peers: [] })
      connection.current?.send({ type: 'join', room: roomFor(path), path })
    },

    resolveDivergence: (choice) => {
      if (!divergence) return
      connection.current?.send({
        type: 'resolveDivergence',
        room: divergence.room,
        choice,
      })
      setDivergence(null)
      if (choice === 'keepLocal') setSession(null)
    },
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
