import { projectOf, tilde, type DocRoot } from '@broodmother/shared'
import { DEFAULT_SOUL } from './soul'

/** How much the vault syncs, in the one word the brief has room for. */
export type BriefSync = 'off' | 'on' | 'conflicted'

/** The room an agent wakes up in, as the terminal spawning it sees the room. */
export interface BriefState {
  api: string
  profile: string | null
  soul: string | null
  /** `path` is the vault folder, `checkout` the branch folder open inside it. */
  vault: { name: string; path: string; checkout: string } | null
  projects: { name: string; path: string }[]
  scope: DocRoot
  cwd: string
  sync: BriefSync
}

const OPENING = `
You are running in a terminal inside broodmother, a Mac app for reading and writing a
folder of markdown. The .md files on disk are the source of truth and git is the history,
so edit the files directly rather than reaching for a database or an API. Someone may have
the file you are editing open in the browser beside you — the editor follows the file on
disk, so prefer small edits over rewriting a document out from under them.
`.trim()

const SYNC: Record<BriefSync, string> = {
  off: 'off — nothing is committed or pushed for you',
  on: 'on — the vault commits and pushes itself once it goes quiet',
  conflicted: 'conflicted — a pull left conflicts for someone to resolve',
}

const HERE = `## Here

Never commit or push unless you were asked to: the vault may be syncing on a timer, and a
commit of yours rides out with it. Never edit broodmother's config.json by hand — the
routes above are how it changes.`

const SOUL = '## Who you are'

const MARK = '   ← you are here'

export function brief(state: BriefState): string {
  return [
    OPENING,
    where(state),
    trees(state),
    asking(state.api),
    HERE,
    `${SOUL}\n\n${state.soul?.trim() || DEFAULT_SOUL}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

function where(state: BriefState): string {
  const { vault } = state
  return section('Where you are', [
    ['profile', state.profile ?? 'none yet'],
    ['vault', vault ? `${vault.name} — ${tilde(vault.path)}` : 'none is open yet'],
    ['scope', state.scope],
    ['cwd', tilde(state.cwd)],
    ['sync', SYNC[state.sync]],
  ])
}

function trees(state: BriefState): string {
  if (!state.vault) return ''
  const here = projectOf(state.scope)
  return `${section('The trees', [
    ['vault', tilde(state.vault.checkout) + (here ? '' : MARK)],
    ...state.projects.map((project): [string, string] => [
      `project ${project.name}`,
      tilde(project.path) + (project.name === here ? MARK : ''),
    ]),
  ])}

The vault is the notes. A project is a code repository those notes are about, checked out
inside the vault; there are as many as the notes cover, and all of them are open at once.`
}

function asking(api: string): string {
  return `## Asking the app

The app's backend is at ${api} — loopback, no auth, JSON. GET and DELETE
take their parameters in the query string, POST and PUT take a JSON body, and a failure
comes back as {"error": "..."}. A route naming a tree takes a root: 'vault' or
'project:<name>'.

Read and write documents on disk; the app is watching and the browser follows. Reach for
the API for the four things the filesystem cannot do.

  POST /api/doc/move      {root, from, to}  moves a document and rewrites every wikilink
                                            pointing at it, which mv leaves broken
  GET  /api/links         ?path=            a document's backlinks and outbound links
  POST /api/branches/open {root, name}      opens a branch, making its checkout if new
  POST /api/sync/now      {}                commits, pulls and pushes the open vault now

And for state, once what you were told above has gone stale under you.

  GET /api/config     what is open: vault, profile, scope, checkouts, per-vault git
  GET /api/vaults     every vault of this profile, and the one that is open
  GET /api/projects   the open vault's projects
  GET /api/tree       the vault's tree and every project's, as the sidebar draws them
  GET /api/branches   ?root=   a root's branches, and which of them is checked out
  GET /api/sync       whether sync is on, when it last ran, what is conflicted

  curl -s '${api}/api/links?path=notes/sync.md'`
}

function section(title: string, rows: [string, string][]): string {
  const width = Math.max(...rows.map(([label]) => label.length)) + 2
  const body = rows.map(([label, value]) => `  ${label.padEnd(width)}${value}`)
  return `## ${title}\n\n${body.join('\n')}`
}
