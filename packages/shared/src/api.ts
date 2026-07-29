import type { Identity, BroodmotherConfig, Profile } from './config'
import type { SyncStatus } from './sync'
import type { VaultEntry, VaultEvent, VaultPath, VaultSummary, Worktree } from './vault'

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
  /** `active` is the profile the open vault commits as — null until both exist. */
  'GET /api/profiles': {
    request: null
    response: { profiles: Profile[]; active: Profile | null }
  }
  /** Creating a profile from the vault menu also selects it, when there is a vault to
   *  select it for; on first run there is not, and the vault picks it up at creation. */
  'POST /api/profiles': {
    request: { name: string } & Identity
    response: { profile: Profile; vault: VaultSummary | null }
  }
  /** Edits the active profile; the name is the file, so it is not editable here. */
  'PUT /api/profiles': { request: Identity; response: { profile: Profile } }
  'GET /api/vault': { request: null; response: { entries: VaultEntry[] } }
  /** The checkouts in the open vault. `local` is the clone; the rest are its branches. */
  'GET /api/worktrees': {
    request: null
    response: { worktrees: Worktree[]; active: string }
  }
  /** `create` cuts the branch fresh off the primary; otherwise it is one that exists. */
  'POST /api/worktrees': {
    request: { name: string; branch: string; create: boolean }
    response: { worktree: Worktree; config: BroodmotherConfig }
  }
  'POST /api/worktrees/open': {
    request: { name: string }
    response: { config: BroodmotherConfig }
  }
  /** Removing the one you are in falls back to the vault's own checkout. */
  'DELETE /api/worktrees': {
    request: { name: string }
    response: { worktrees: Worktree[]; config: BroodmotherConfig }
  }
  /** `home` is the broodmother home: its vaults are the folders inside it. `active` is null
   *  on a fresh machine — nothing is assumed, the app asks. */
  'GET /api/vaults': {
    request: null
    response: { home: string; vaults: VaultSummary[]; active: VaultSummary | null }
  }
  /** A vault is always git-backed, so the remote is settled at creation, not after. */
  'POST /api/vaults': {
    request: { name: string; remoteUrl: string; branch: string }
    response: { vault: VaultSummary; config: BroodmotherConfig }
  }
  'POST /api/vaults/open': {
    request: { path: string }
    response: { config: BroodmotherConfig }
  }
  /** Points the open vault at another profile; the name is the folder, so it is not
   *  editable here. Null when there is no vault open to bind it to: on first run this only
   *  settles the identity the first vault gets created as. */
  'PUT /api/vaults': {
    request: { profile: string }
    response: { vault: VaultSummary | null }
  }
  /** Removes the vault folder and everything in it. Deleting the open vault falls back to
   *  whatever is left, or to none, which is the first-run state again. */
  'DELETE /api/vaults': {
    request: { name: string }
    response: { active: VaultSummary | null; config: BroodmotherConfig }
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
    response: { config: BroodmotherConfig; reset: string[] }
  }
  'PUT /api/config': {
    request: BroodmotherConfig
    response: { config: BroodmotherConfig }
  }
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
