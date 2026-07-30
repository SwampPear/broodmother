import type { Identity, Profile } from '../config'
import type { VaultSummary } from '../vault'

export interface GetProfiles {
  request: null
  response: { profiles: Profile[]; active: Profile | null } // active is null until a vault picks one
}

export interface PostProfiles {
  request: { name: string } & Identity
  response: { profile: Profile; vault: VaultSummary | null } // also selects it, if a vault is open
}

export interface PutProfiles {
  request: Identity // the name is the file, so it is not editable here
  response: { profile: Profile }
}
