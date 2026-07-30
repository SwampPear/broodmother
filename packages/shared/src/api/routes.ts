import type { DeleteDoc, GetDoc, GetLinks, PostDocMove, PutDoc } from './docs'
import type {
  GetConfig,
  GetGit,
  GetSync,
  PostSyncClearConflict,
  PostSyncNow,
  PostTestRemote,
  PutConfig,
  PutGit,
} from './git'
import type { GetProfiles, PostProfiles, PutProfiles } from './profiles'
import type {
  DeleteVaults,
  GetVault,
  GetVaults,
  PostVaultOpen,
  PostVaults,
  PutVaults,
} from './vaults'
import type {
  DeleteWorktrees,
  GetWorktrees,
  PostWorktreeOpen,
  PostWorktrees,
} from './worktrees'

interface ApiRoutes {
  'GET /api/profiles': GetProfiles
  'POST /api/profiles': PostProfiles
  'PUT /api/profiles': PutProfiles
  'GET /api/vault': GetVault
  'GET /api/worktrees': GetWorktrees
  'POST /api/worktrees': PostWorktrees
  'POST /api/worktrees/open': PostWorktreeOpen
  'DELETE /api/worktrees': DeleteWorktrees
  'GET /api/vaults': GetVaults
  'POST /api/vaults': PostVaults
  'POST /api/vaults/open': PostVaultOpen
  'PUT /api/vaults': PutVaults
  'DELETE /api/vaults': DeleteVaults
  'GET /api/doc': GetDoc
  'PUT /api/doc': PutDoc
  'POST /api/doc/move': PostDocMove
  'DELETE /api/doc': DeleteDoc
  'GET /api/links': GetLinks
  'GET /api/config': GetConfig
  'PUT /api/config': PutConfig
  'POST /api/config/test-remote': PostTestRemote
  'GET /api/git': GetGit
  'PUT /api/git': PutGit
  'GET /api/sync': GetSync
  'POST /api/sync/now': PostSyncNow
  'POST /api/sync/clear-conflict': PostSyncClearConflict
}

export type ApiRoute = keyof ApiRoutes
export type ApiRequest<R extends ApiRoute> = ApiRoutes[R]['request']
export type ApiResponse<R extends ApiRoute> = ApiRoutes[R]['response']

export interface ApiError {
  error: string
}
