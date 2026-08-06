import type { GitAuthor } from '../git'
import type { Identity, Profile } from '../profile'
import type { VaultSummary } from '../vault'

export interface GetProfiles {
  request: null
  response: {
    profiles: Profile[]
    active: Profile | null // null until a vault picks one
    // Whether this build can connect to GitHub at all. A button that cannot work is worse
    // than no button, and only a build with a client id can.
    githubReady: boolean
    // Who git on this machine says you are, for filling in a profile nobody has made yet.
    // Null where git has never been told.
    suggestedAuthor: GitAuthor | null
  }
}

export interface PostProfiles {
  request: { name: string } & Identity
  response: { profile: Profile; vault: VaultSummary | null } // also selects it, if a vault is open
}

export interface PutProfiles {
  request: Identity // the name is the file, so it is not editable here
  response: { profile: Profile }
}

// The public half of the profile's key, or null when it has none. Only ever the public
// half: the private one stays on disk and has no reason to cross the wire.
export interface GetProfileKey {
  request: null
  response: { publicKey: string | null }
}

// Makes one, and points the profile at it. Refuses rather than overwriting a key that is
// already there — the one it replaced would stop opening whatever it opened.
export interface PostProfileKey {
  request: null
  response: { profile: Profile; publicKey: string }
}
