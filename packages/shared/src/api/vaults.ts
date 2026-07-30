import type { BroodmotherConfig } from '../config/config'
import type { VaultEntry, VaultSummary } from '../vault'

export interface GetVault {
  request: null
  response: { entries: VaultEntry[] } // the tree of the open checkout
}

export interface GetVaults {
  request: null
  response: { home: string; vaults: VaultSummary[]; active: VaultSummary | null } // active is null on a fresh machine
}

export interface PostVaults {
  request: {
    name: string
    git: 'none' | 'local' | 'remote'
    remoteUrl?: string | null // required for `remote`
    branch?: string | null    // to clone or to start on; ignored for `none`
  }
  response: { vault: VaultSummary; config: BroodmotherConfig }
}

export interface PostVaultOpen {
  request: { path: string }
  response: { config: BroodmotherConfig }
}

export interface PutVaults {
  request: { profile: string }
  response: { vault: VaultSummary | null } // null on first run: nothing to bind it to yet
}

export interface DeleteVaults {
  request: { name: string } // the folder and everything in it
  response: { active: VaultSummary | null; config: BroodmotherConfig }
}
