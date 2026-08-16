import type { Dream } from '../dream'
import type { DocRef } from '../tree'
import type { DreamRun, DreamTrigger } from './dreams'

/** The socket route rooms live on, on the lair's own port. */
export const LAIR_ROOM_ROUTE = '/rooms'

export interface LairStatus {
  version: string
  uptime: number // seconds since boot
  sites: number
  /** Whether the claude CLI answers on the box — a dream that needs it should not find
   *  out at run time. */
  claude: boolean
}

/** A key as the lair remembers it: metadata and a hash, never the key itself. */
export interface LairKey {
  id: string
  name: string
  createdAt: number
}

/** Answered exactly once, at minting — the lair keeps only the hash from then on. */
export interface LairKeyGrant {
  id: string
  name: string
  key: string
}

export interface LairSite {
  name: string
  remote: string
  /** How the last pull went — 'never' before the first. */
  pull: 'ok' | 'failed' | 'never'
  message?: string
}

// A site is a folder in the lair's home, so its name is what a folder can be called
// without quoting anywhere: letter or digit first, then letters, digits, . _ -
const SITE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

export function siteNameOk(name: string): boolean {
  return SITE_NAME.test(name)
}

/** A dream the lair holds: filed under a site, run by the same orchestrator laptops run. */
export interface HostedDream {
  site: string
  path: string
  name: string
  triggers: DreamTrigger[]
  lastRun: DreamRun | null
}

/** The lair's own surface, spoken by the CLI and the local server — never the browser. */
interface LairRoutes {
  'GET /status': { request: null; response: LairStatus }
  'GET /keys': { request: null; response: { keys: LairKey[] } }
  'POST /keys': { request: { name: string }; response: { grant: LairKeyGrant } }
  'DELETE /keys': { request: { id: string }; response: { keys: LairKey[] } }
  'GET /key': { request: null; response: { publicKey: string } }
  'GET /sites': { request: null; response: { sites: LairSite[] } }
  'PUT /sites': {
    request: { name: string; remote: string }
    response: { site: LairSite }
  }
  'GET /dreams': { request: null; response: { dreams: HostedDream[] } }
  'PUT /dreams': {
    request: { site: string; path: string; dream: Dream }
    response: { dream: HostedDream }
  }
  'DELETE /dreams': {
    request: { site: string; path: string }
    response: { dreams: HostedDream[] }
  }
  'POST /dream/run': {
    request: { site: string; path: string }
    response: { run: DreamRun }
  }
  'POST /dream/stop': {
    request: { site: string; path: string }
    response: { run: DreamRun }
  }
  'GET /dream/runs': {
    request: { site: string; path: string }
    response: { runs: DreamRun[] }
  }
  'POST /rooms': { request: null; response: { room: string; token: string } }
}

export type LairRoute = keyof LairRoutes
export type LairRequest<R extends LairRoute> = LairRoutes[R]['request']
export type LairResponse<R extends LairRoute> = LairRoutes[R]['response']

/** How the local server reports its lair connection: the URL and whether a key is held —
 *  the key itself stays in the profile file. */
export interface LairState {
  url: string | null
  keyed: boolean
}

export type LairCheckState = 'connected' | 'refused' | 'unreachable'

export interface LairCheck {
  state: LairCheckState
  /** What it means, and what to do about it where there is something to do. */
  message: string
}

export interface GetLair {
  request: null
  response: LairState
}

export interface PutLair {
  request: { url: string; key: string }
  response: LairState
}

export interface DeleteLair {
  request: null
  response: LairState
}

/** Asks the lair's status route with the stored key and names which way it went. */
export interface PostLairCheck {
  request: null
  response: LairCheck
}

/** Mints a room on the lair and answers a full invite — the encryption key is minted
 *  here, locally, and the lair never sees it. */
export interface PostLairShare {
  request: DocRef
  response: { invite: string }
}

export interface LairDreamTarget extends DocRef {
  site: string
}

/** Reads the dream off disk and files it on the lair under the named site. */
export interface PutLairDream {
  request: LairDreamTarget
  response: { dream: HostedDream }
}

/** Takes a hosted dream off the lair; the answer is what remains hosted. */
export interface DeleteLairDream {
  request: { site: string; path: string }
  response: { dreams: HostedDream[] }
}

/** The hosted view in one answer: every site, every dream, each with its last run. */
export interface GetLairDreams {
  request: null
  response: { sites: LairSite[]; dreams: HostedDream[] }
}

/** The Repositories view in one answer: the lair's sites, its deploy key, and what the
 *  open vault would register as — `remote` null when its git has none. */
export interface LairSitesView {
  sites: LairSite[]
  publicKey: string
  vault: { name: string; remote: string | null } | null
}

export interface GetLairSites {
  request: null
  response: LairSitesView
}

/** Registers the open vault as a site. Name and remote are derived on the server at
 *  press time, which is why the request carries nothing. */
export interface PutLairSite {
  request: null
  response: { site: LairSite }
}

export interface PostLairDreamRun {
  request: { site: string; path: string }
  response: { run: DreamRun }
}

export interface PostLairDreamStop {
  request: { site: string; path: string }
  response: { run: DreamRun }
}
