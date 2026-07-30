import type { BroodmotherConfig } from '../config/config'
import type { GitSettings, GitState } from '../config/git'
import type { SyncStatus } from '../sync'

export interface GetConfig {
  request: null
  response: { config: BroodmotherConfig; reset: string[] } // reset names fields repaired on a malformed file
}

export interface PutConfig {
  request: BroodmotherConfig
  response: { config: BroodmotherConfig }
}

export interface PostTestRemote {
  request: { remoteUrl: string; branch: string }
  response: { ok: boolean; message: string }
}

export interface GetGit {
  request: null
  response: { state: GitState; settings: GitSettings } // state is read off the checkout, settings are this machine's
}

export interface PutGit {
  request: GitSettings // how the open vault syncs
  response: { settings: GitSettings }
}

export interface GetSync {
  request: null
  response: SyncStatus
}

export interface PostSyncNow {
  request: null
  response: SyncStatus
}

export interface PostSyncClearConflict {
  request: null
  response: SyncStatus
}
