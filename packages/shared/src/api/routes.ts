import type {
  DeleteBranches,
  GetBranches,
  PostBranchOpen,
  PostBranches,
} from './branches'
import type { DeleteData } from './data'
import type { DeleteDoc, GetDoc, GetLinks, PostDocMove, PostFolder, PutDoc } from './docs'
import type {
  GetConfig,
  GetGit,
  GetSync,
  PostSyncClearConflict,
  PostSyncNow,
  PostGitCheck,
  PutConfig,
  PutGit,
} from './git'
import type {
  DeleteGithub,
  GetGithubRepos,
  PostGithubConnect,
  PostGithubDevice,
  PostGithubRepos,
} from './github'
import type {
  GetProfileKey,
  GetProfiles,
  PostProfileKey,
  PostProfiles,
  PutProfiles,
} from './profiles'
import type { DeleteProjects, GetProjects, PostProjects } from './projects'
import type { PostScope } from './scope'
import type { GetTree } from './tree'
import type {
  DeleteVaults,
  GetVaults,
  PostVaultOpen,
  PostVaults,
  PutVaults,
} from './vaults'

interface ApiRoutes {
  'GET /api/profiles': GetProfiles
  'POST /api/profiles': PostProfiles
  'PUT /api/profiles': PutProfiles
  'GET /api/profiles/key': GetProfileKey
  'POST /api/profiles/key': PostProfileKey
  'POST /api/github/device': PostGithubDevice
  'POST /api/github/connect': PostGithubConnect
  'DELETE /api/github': DeleteGithub
  'GET /api/github/repos': GetGithubRepos
  'POST /api/github/repos': PostGithubRepos
  'GET /api/tree': GetTree
  'GET /api/branches': GetBranches
  'POST /api/branches': PostBranches
  'POST /api/branches/open': PostBranchOpen
  'DELETE /api/branches': DeleteBranches
  'GET /api/vaults': GetVaults
  'POST /api/vaults': PostVaults
  'POST /api/vaults/open': PostVaultOpen
  'PUT /api/vaults': PutVaults
  'DELETE /api/vaults': DeleteVaults
  'GET /api/projects': GetProjects
  'POST /api/projects': PostProjects
  'DELETE /api/projects': DeleteProjects
  'POST /api/scope': PostScope
  'GET /api/doc': GetDoc
  'PUT /api/doc': PutDoc
  'POST /api/doc/move': PostDocMove
  'DELETE /api/doc': DeleteDoc
  'POST /api/folder': PostFolder
  'GET /api/links': GetLinks
  'GET /api/config': GetConfig
  'PUT /api/config': PutConfig
  'POST /api/git/check': PostGitCheck
  'GET /api/git': GetGit
  'PUT /api/git': PutGit
  'GET /api/sync': GetSync
  'POST /api/sync/now': PostSyncNow
  'POST /api/sync/clear-conflict': PostSyncClearConflict
  'DELETE /api/data': DeleteData
}

export type ApiRoute = keyof ApiRoutes
export type ApiRequest<R extends ApiRoute> = ApiRoutes[R]['request']
export type ApiResponse<R extends ApiRoute> = ApiRoutes[R]['response']

export interface ApiError {
  error: string
}
