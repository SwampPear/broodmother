import type { MotherConfig } from './config'
import type {
  DivergenceChoice,
  DivergenceReport,
  Peer,
  RoomId,
  SessionState,
} from './collab'
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
  'GET /api/vault': { request: null; response: { entries: VaultEntry[] } }
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
  'POST /api/config/test-relay': {
    request: { relayUrl: string }
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

/** `update` and `awareness` are base64-encoded Yjs payloads — the socket carries JSON. */
export type ClientMessage =
  | { type: 'join'; room: RoomId; path: VaultPath }
  | { type: 'leave'; room: RoomId }
  | { type: 'resolveDivergence'; room: RoomId; choice: DivergenceChoice }
  | { type: 'update'; room: RoomId; update: string }
  | { type: 'awareness'; room: RoomId; awareness: string }

export type ServerMessage =
  | { type: 'vault'; event: VaultEvent }
  | { type: 'sync'; status: SyncStatus }
  | { type: 'session'; room: RoomId; state: SessionState; peers: Peer[] }
  | { type: 'divergence'; report: DivergenceReport }
  | { type: 'update'; room: RoomId; update: string }
  | { type: 'awareness'; room: RoomId; awareness: string }
  | { type: 'error'; message: string }
