import type { Identity, MotherConfig, Profile, Project } from './config'
import type { SyncStatus } from './sync'
import type { VaultEntry, VaultEvent, VaultPath, VaultSummary } from './vault'

export interface Backlink {
  from: VaultPath
  to: VaultPath
  context: string
}

export interface MoveResult {
  to: VaultPath
  /** How many documents had a link rewritten — the rename dialog reports this. */
  linksRewritten: number
}

/**
 * Every HTTP route the web app may call, keyed by `METHOD path`. The server implements
 * exactly these and the web app calls exactly these; nothing else crosses the boundary.
 */
export interface ApiRoutes {
  /** `active` is null on a fresh machine — nothing is assumed, the app asks. */
  'GET /api/projects': {
    request: null
    response: { home: string; projects: Project[]; active: Project | null }
  }
  'POST /api/projects': {
    request: { name: string; profile: string }
    response: { project: Project; config: MotherConfig }
  }
  'POST /api/projects/open': {
    request: { name: string }
    response: { project: Project; config: MotherConfig }
  }
  /** Points the active project at another profile; the name is the folder, so it is not
   *  editable here. */
  'PUT /api/projects': {
    request: { profile: string }
    response: { project: Project }
  }
  /** Removes the project folder and every vault in it. Deleting the active project falls
   *  back to whatever is left, or to none, which is the first-run state again. */
  'DELETE /api/projects': {
    request: { name: string }
    response: { active: Project | null; config: MotherConfig }
  }
  /** `active` is the profile the active project works as — null until both exist. */
  'GET /api/profiles': {
    request: null
    response: { profiles: Profile[]; active: Profile | null }
  }
  /** Creating a profile from the project menu also selects it, when there is a project to
   *  select it for; on first run there is not, and the project picks it up at creation. */
  'POST /api/profiles': {
    request: { name: string } & Identity
    response: { profile: Profile; project: Project | null }
  }
  /** Edits the active profile; the name is the file, so it is not editable here. */
  'PUT /api/profiles': { request: Identity; response: { profile: Profile } }
  'GET /api/vault': { request: null; response: { entries: VaultEntry[] } }
  /** `home` is the active project's folder: its vaults are the folders inside it. */
  'GET /api/vaults': {
    request: null
    response: { home: string; vaults: VaultSummary[] }
  }
  /** A vault is always git-backed, so the remote is settled at creation, not after. */
  'POST /api/vaults': {
    request: { name: string; remoteUrl: string; branch: string }
    response: { vault: VaultSummary; config: MotherConfig }
  }
  'POST /api/vaults/open': {
    request: { path: string }
    response: { config: MotherConfig }
  }
  'GET /api/doc': { request: { path: VaultPath }; response: { markdown: string } }
  'PUT /api/doc': {
    request: { path: VaultPath; markdown: string }
    response: { ok: true }
  }
  'POST /api/doc/move': {
    request: { from: VaultPath; to: VaultPath }
    response: MoveResult
  }
  'DELETE /api/doc': { request: { path: VaultPath }; response: { ok: true } }
  'GET /api/links': {
    request: { path: VaultPath }
    response: { backlinks: Backlink[]; outbound: Backlink[] }
  }
  'GET /api/config': {
    request: null
    /** `reset` names fields the server had to repair on a malformed config file. */
    response: { config: MotherConfig; reset: string[] }
  }
  'PUT /api/config': { request: MotherConfig; response: { config: MotherConfig } }
  'POST /api/config/test-remote': {
    request: { remoteUrl: string; branch: string }
    response: { ok: boolean; message: string }
  }
  'GET /api/sync': { request: null; response: SyncStatus }
  'POST /api/sync/now': { request: null; response: SyncStatus }
  'POST /api/sync/clear-conflict': { request: null; response: SyncStatus }
}

export type ApiRoute = keyof ApiRoutes
export type ApiRequest<R extends ApiRoute> = ApiRoutes[R]['request']
export type ApiResponse<R extends ApiRoute> = ApiRoutes[R]['response']

export interface ApiError {
  error: string
}

export type WsRoute = '/ws' | '/terminal'

/** `/ws` is server-to-client only: the vault and the sync loop report, nobody asks. */
export type ServerMessage =
  | { type: 'vault'; event: VaultEvent }
  | { type: 'sync'; status: SyncStatus }
  | { type: 'error'; message: string }
