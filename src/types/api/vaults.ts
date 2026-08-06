import type { BroodmotherConfig } from '../core'
import type { VaultSummary } from '../vault'

export interface GetVaults {
  request: null
  response: { home: string; vaults: VaultSummary[]; active: VaultSummary | null } // active is null on a fresh machine
}

export interface PostVaults {
  request: {
    name: string
    git: 'none' | 'local' | 'remote'
    remoteUrl?: string | null // required for `remote`
    branch?: string | null // to clone or to start on; ignored for `none`
    profile?: string | null // whose folder it goes in; unsaid is the caller's own
  }
  response: { vault: VaultSummary; config: BroodmotherConfig }
}

export interface PostVaultOpen {
  request: { path: string }
  response: { config: BroodmotherConfig }
}

export interface PutVaults {
  request: { profile: string }
  // null on first run: nothing to bind it to yet
  response: { vault: VaultSummary | null }
}

export interface DeleteVaults {
  request: { name: string; profile?: string } // the folder and everything in it
  response: { active: VaultSummary | null; config: BroodmotherConfig }
}
