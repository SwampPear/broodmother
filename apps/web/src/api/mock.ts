import {
  basename,
  defaultGitSettings,
  parseDream,
  projectOf,
  projectRoot,
  runOrder,
  triggerLabel,
  type ApiRequest,
  type ApiResponse,
  type ApiRoute,
  type Branch,
  type BroodmotherConfig,
  type DiffBasis,
  type DiffFile,
  type DocPath,
  type DocRoot,
  type DreamRun,
  type GitSettings,
  type GitState,
  type Identity,
  type GitAuthor,
  type GithubRepo,
  type HostedDream,
  type LairCheck,
  type LairSite,
  type Persona,
  type Profile,
  type ProjectSummary,
  type ServerMessage,
  type SyncStatus,
  type TerminalServerMessage,
  type TreeChanges,
  type TreeEntry,
  type VaultSummary,
} from '@broodmother/shared'
import type { ApiClient, Connection } from './client'

export interface MockClient extends ApiClient {
  emit(message: ServerMessage): void
  /** Stands in for the pty: whatever is typed comes straight back. */
  emitTerminal(message: TerminalServerMessage): void
  /** The socket under a terminal dropping, which is what a machine going to sleep is. */
  dropTerminal(): void
  /** And coming back — to the same shell, or to a new one when that shell is gone. */
  resumeTerminal(resumed?: boolean): void
  /** Every name a shell has been asked for by, which is what survives a reload. */
  terminalNames(): string[]
  /** And the ones something has said it is finished with, which is what ends one. */
  finishedTerminals(): string[]
}

const seedDocs: Record<DocPath, string> = {
  'README.md': '# Vault\n\nEverything lives here.\n',
  'Handbook/Overview.md': '# Overview\n\nWhat this handbook covers, and who it is for.\n',
  'Handbook/Risks.md':
    '# Risks & checklist\n\n- Nothing is backed up until it is pushed\n',
  'Business/Roadmap.md':
    '# Roadmap\n\n1. Write it down\n2. Share it\n3. Keep it current\n',
}

const HANDBOOK = '/Users/you/.broodmother/you/handbook'

const seedConfig: BroodmotherConfig = {
  vaultPath: HANDBOOK,
  profile: 'you',
  checkouts: {},
  git: { [HANDBOOK]: { ...defaultGitSettings(), enabled: true } },
  project: {},
  projectBranch: {},
}

/** The seeded vault is a clone, which is the case with the most UI hanging off it. */
const seedGitState: GitState = {
  repo: true,
  remoteUrl: 'git@github.com:you/handbook.git',
  branch: 'main',
}

const seedProfile: Profile = {
  name: 'you',
  path: '/Users/you/.broodmother/profiles/you.json',
  color: '#c084fc',
  gitAuthor: { name: 'You', email: 'you@example.com' },
  sshKeyPath: null,
  claudeCfgDir: null,
  soul: null,
  github: null,
  lair: null,
}

/** `folders` are the ones holding nothing yet: every other folder is implied by a path
 *  through it, and one nobody has put anything in has no path to be implied by. */
function tree(paths: DocPath[], folders: Iterable<DocPath> = []): TreeEntry[] {
  const roots: TreeEntry[] = []
  const all = [...paths, ...[...folders].map((path) => `${path}/`)]
  for (const path of all.sort()) {
    const parts = path.split('/').filter(Boolean)
    const file = !path.endsWith('/')
    let level = roots
    for (const [depth, name] of parts.entries()) {
      const here = parts.slice(0, depth + 1).join('/')
      if (file && depth === parts.length - 1) {
        level.push({ kind: 'file', path: here, name, size: 0, modifiedAt: 0 })
        break
      }
      const existing = level.find((entry) => entry.kind === 'dir' && entry.path === here)
      const dir = existing ?? { kind: 'dir' as const, path: here, name, children: [] }
      if (!existing) level.push(dir)
      level = (dir as Extract<TreeEntry, { kind: 'dir' }>).children
    }
  }
  return roots
}

export function createMockClient(
  seed: {
    docs?: Record<DocPath, string>
    /** Project name to its files. A vault links as many as it likes, and the sidebar draws
     *  all of them. */
    projectDocs?: Record<string, Record<DocPath, string>>
    config?: BroodmotherConfig
    sync?: SyncStatus
    home?: string
    vaults?: VaultSummary[]
    profiles?: Profile[]
    active?: VaultSummary | null
    projects?: ProjectSummary[]
    project?: string | null
    branches?: Branch[]
    branch?: string | null
    /** What git says the vault's checkout has touched, for the rows to wear. */
    changes?: TreeChanges
    /** The same per project, by name. */
    projectChanges?: Record<string, TreeChanges>
    /** What differs from the branch you are on, by the branch being compared against. */
    diff?: Record<string, DiffFile[]>
    /** The same, held against where the two parted rather than against the branch as it
     *  stands. Unseeded, both bases answer with `diff` — most tests are not about which. */
    diffAtSplit?: Record<string, DiffFile[]>
    /** How that branch has those files, so a side-by-side has a left-hand side. */
    diffDocs?: Record<string, Record<DocPath, string>>

    /** What the vault's `.personas/` folder carries, for a dream's picker to offer. */
    personas?: Persona[]

    /** The lair this machine already points at, when a test starts with one connected. */
    lair?: string | null
    /** What the check answers, for asking how the panel wears each of the three states. */
    lairCheck?: LairCheck
    lairSites?: LairSite[]
    lairDreams?: HostedDream[]

    /** Routes that never answer, for asking what the app does while it is waiting. */
    stall?: ApiRoute[]

    projectBranches?: Record<string, Branch[]>
    projectBranch?: Record<string, string | null>
    gitState?: GitState
    gitSettings?: GitSettings
    publicKey?: string | null
    githubReady?: boolean
    suggestedAuthor?: GitAuthor | null
    githubRepos?: GithubRepo[]
  } = {},
): MockClient {
  const docs = { ...seedDocs, ...seed.docs }
  const projectDocs: Record<string, Record<DocPath, string>> = { ...seed.projectDocs }
  const home = seed.home ?? '/Users/you/.broodmother'
  const profiles: Profile[] = seed.profiles ?? [seedProfile]
  const vaults: VaultSummary[] = seed.vaults ?? [
    { name: 'handbook', path: `${home}/you/handbook`, profile: 'you' },
  ]
  let active: VaultSummary | null =
    seed.active === undefined ? (vaults[0] ?? null) : seed.active
  /** A project lives inside its vault, so the seeded ones are the open vault's and nobody
   *  else's — switching vault is switching which of these lists is the answer. */
  const byVault: Record<string, ProjectSummary[]> = {
    [active?.path ?? '']: seed.projects ?? [],
  }
  const projectsIn = (vault: string | null) => (byVault[vault ?? ''] ??= [])
  const projects = () => projectsIn(active?.path ?? null)
  // Who you are working as. The open vault sits in this profile's folder, so it names one
  // even before the first vault exists.
  let working: string | null = vaults[0]?.profile ?? profiles[0]?.name ?? null
  const profileOf = () =>
    profiles.find((profile) => profile.name === working) ?? profiles[0] ?? null
  /** Working as someone else is standing in their folder, so what opens is one of theirs. */
  const workAs = (name: string): VaultSummary | null => {
    working = name
    active = vaults.find((vault) => vault.profile === name) ?? null
    config = { ...config, profile: name, vaultPath: active?.path ?? null }
    return active
  }
  const found = (name: string) => projects().find((one) => one.name === name) ?? null
  const githubRepos: GithubRepo[] = seed.githubRepos ?? []
  // The browser half of the device flow, stood in for: the first ask is always pending.
  let githubAsked = false
  // Seeded from the active vault so a seed with no vaults is a machine with nothing open,
  // rather than one pointed at a vault its own listing does not have.
  let config = { ...seedConfig, vaultPath: active?.path ?? null, ...seed.config }
  // The scope is a fact about the vault, so it lives where the server puts it.
  const setScoped = (name: string | null) => {
    config = {
      ...config,
      project: { ...config.project, [config.vaultPath ?? '']: name },
    }
  }
  const scoped = () => config.project[config.vaultPath ?? ''] ?? null
  if (seed.project !== undefined) setScoped(seed.project)
  const branches: Branch[] = seed.branches ?? [
    { name: 'main', path: `${home}/handbook/local`, checkedOut: true, primary: true },
  ]
  let branch: string | null =
    seed.branch === undefined ? (branches[0]?.name ?? null) : seed.branch
  const projectBranches: Record<string, Branch[]> = seed.projectBranches ?? {}
  const projectBranch: Record<string, string | null> = { ...seed.projectBranch }
  for (const [name, list] of Object.entries(projectBranches))
    if (!(name in projectBranch))
      projectBranch[name] = list.find((one) => one.primary)?.name ?? null
  let gitState: GitState = seed.gitState ?? seedGitState
  let gitSettings: GitSettings = seed.gitSettings ??
    config.git[config.vaultPath ?? ''] ?? {
      ...defaultGitSettings(),
      enabled: gitState.repo,
    }
  let publicKey: string | null = seed.publicKey ?? null
  let sync: SyncStatus = seed.sync ?? {
    state: 'idle',
    lastSyncedAt: Date.now(),
    conflicted: [],
    message: undefined,
  }
  let listener: ((message: ServerMessage) => void) | null = null
  let shell: ((message: TerminalServerMessage) => void) | null = null
  let shellLive: ((live: boolean) => void) | null = null
  /** What the last connection asked for, and every name asked for so far. */
  let named = ''
  const sessions = new Set<string>()
  /** The shells something has said it is finished with, which is what ends one. */
  const finished: string[] = []
  const dreamRuns: DreamRun[] = []
  let lairUrl: string | null = seed.lair ?? null
  let lairKeyed = lairUrl !== null
  const lairSites: LairSite[] = seed.lairSites ?? []
  const lairDreams: HostedDream[] = seed.lairDreams ?? []
  const emit = (message: ServerMessage) => listener?.(message)
  const emitTerminal = (message: TerminalServerMessage) => shell?.(message)

  const dirs: Record<string, Set<DocPath>> = { vault: new Set() }
  const dirsIn = (root: DocRoot) => (dirs[root] ??= new Set())
  const filesIn = (root: DocRoot) => {
    const name = projectOf(root)
    if (!name) return docs
    return (projectDocs[name] ??= {})
  }
  const branchesIn = (root: DocRoot): Branch[] => {
    const name = projectOf(root)
    if (!name) return branches
    return (projectBranches[name] ??= [])
  }
  const branchOf = (root: DocRoot) => {
    const name = projectOf(root)
    return name ? (projectBranch[name] ?? null) : branch
  }
  /** What differs, on the basis asked for. A seed that says nothing about the split says
   *  the same thing on both, which is what a repository nobody has committed to since. */
  const differing = (against: string, basis?: DiffBasis): DiffFile[] =>
    (basis === 'split' ? seed.diffAtSplit?.[against] : undefined) ??
    seed.diff?.[against] ??
    []
  const moveOnto = (root: DocRoot, name: string | null) => {
    const project = projectOf(root)
    if (project) projectBranch[project] = name
    else branch = name
  }

  const handlers: { [R in ApiRoute]: (body: ApiRequest<R>) => Promise<ApiResponse<R>> } =
    {
      'GET /api/tree': async () => ({
        vault: tree(Object.keys(docs), dirs.vault),
        vaultChanges: seed.changes ?? {},
        projects: projects().map((one) => ({
          name: one.name,
          entries: tree(
            Object.keys(projectDocs[one.name] ?? {}),
            dirsIn(`project:${one.name}`),
          ),
          changes: seed.projectChanges?.[one.name] ?? {},
        })),
      }),
      /* The branch being compared against is the key, and the basis chooses between two
         seeds: a diff here is between two branches, and which files those are is seeded
         rather than worked out. */
      'GET /api/diff': async ({ against, basis }) => ({
        files: differing(against, basis),
      }),
      'GET /api/diff/file': async ({ root, against, path, basis }) => {
        const source = differing(against, basis).find((one) => one.path === path)
        return {
          against: seed.diffDocs?.[against]?.[source?.from ?? path] ?? null,
          current: filesIn(root)[path] ?? null,
        }
      },
      'GET /api/branches': async ({ root }) => {
        return {
          branches: [...branchesIn(root)],
          active: branchOf(root),
        }
      },
      'POST /api/branches': async ({ root, name }) => {
        const list = branchesIn(root)
        if (list.some((one) => one.name === name))
          throw new Error(`"${name}" already exists`)
        if (root === 'vault' && name === 'local')
          throw new Error('"local" is the vault’s own checkout')
        const made: Branch = {
          name,
          path: `${config.vaultPath}/${name.replaceAll('/', '-')}`,
          checkedOut: true,
          primary: false,
        }
        list.push(made)
        moveOnto(root, name)
        return { branch: made, config }
      },
      // Checking out on the way in is the whole point, so a branch with no folder gets one.
      'POST /api/branches/open': async ({ root, name }) => {
        const one = branchesIn(root).find((each) => each.name === name)
        if (!one) throw new Error(`no branch named "${name}"`)
        one.checkedOut = true
        moveOnto(root, name)
        return { branch: one, config }
      },
      'DELETE /api/branches': async ({ root, name }) => {
        const list = branchesIn(root)
        const one = list.find((each) => each.name === name)
        if (!one) throw new Error(`no branch named "${name}"`)
        if (one.primary)
          throw new Error('the repository’s own checkout cannot be removed')
        one.checkedOut = false
        if (branchOf(root) === name)
          moveOnto(root, list.find((each) => each.primary)?.name ?? null)
        return { branches: [...list], config }
      },
      'GET /api/profiles': async () => ({
        profiles: [...profiles],
        active: profileOf(),
        githubReady: seed.githubReady ?? false,
        suggestedAuthor: seed.suggestedAuthor ?? null,
      }),
      'POST /api/profiles': async ({ name, ...identity }) => {
        if (profiles.some((profile) => profile.name === name))
          throw new Error(`a profile named "${name}" already exists`)
        const profile: Profile = {
          name,
          path: `${home}/${name}/profile.json`,
          github: null,
          lair: null,
          ...identity,
        }
        profiles.push(profile)
        return { profile, vault: workAs(name) }
      },
      'PUT /api/profiles': async (identity: Identity) => {
        const current = profileOf()
        if (!current) throw new Error('no profile yet')
        const profile = { ...current, ...identity }
        profiles.splice(profiles.indexOf(current), 1, profile)
        return { profile }
      },
      'GET /api/profiles/key': async () => ({ publicKey }),
      'POST /api/profiles/key': async () => {
        const current = profileOf()
        if (!current) throw new Error('no profile yet')
        if (publicKey) throw new Error(`${current.name} already has a key`)
        publicKey = `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI${current.name} ${current.name}@broodmother`
        return { profile: current, publicKey }
      },
      /* The device flow, with the browser half taken as read: one ask says pending, the next
         says connected, which is the two states a caller has to handle. */
      'POST /api/github/device': async () => ({
        deviceCode: 'device-code',
        userCode: 'ABCD-1234',
        verificationUri: 'https://github.com/login/device',
        intervalMs: 10,
      }),
      'POST /api/github/connect': async () => {
        const current = profileOf()
        if (!current) throw new Error('no profile yet')
        if (!githubAsked) {
          githubAsked = true
          return { pending: true, profile: current }
        }
        const connected = { ...current, github: 'you' }
        profiles.splice(profiles.indexOf(current), 1, connected)
        return { pending: false, profile: connected }
      },
      'DELETE /api/github': async () => {
        const current = profileOf()
        if (!current) throw new Error('no profile yet')
        const gone = { ...current, github: null }
        profiles.splice(profiles.indexOf(current), 1, gone)
        return { profile: gone }
      },
      'GET /api/github/repos': async () => ({ repos: [...githubRepos] }),
      'POST /api/github/repos': async ({ name, private: hidden }) => {
        const repo: GithubRepo = {
          fullName: `you/${name}`,
          cloneUrl: `https://github.com/you/${name}.git`,
          private: hidden,
          defaultBranch: 'main',
        }
        githubRepos.push(repo)
        return { repo }
      },
      /* Only the profile you are working as has vaults you can open: they are the folders
         in its folder. */
      'GET /api/vaults': async () => ({
        home,
        vaults: vaults.filter((vault) => vault.profile === working),
        active,
      }),
      'POST /api/vaults': async ({ name, git, remoteUrl, branch: head }) => {
        const profile = working
        if (!profile) throw new Error('no profile yet — pick one for this vault first')
        if (vaults.some((vault) => vault.name === name && vault.profile === profile))
          throw new Error(`a vault named "${name}" already exists`)
        if (git === 'remote' && !remoteUrl?.trim())
          throw new Error('a vault that syncs needs a remote')
        const vault = { name, path: `${home}/${profile}/${name}`, profile }
        vaults.push(vault)
        active = vault
        gitSettings = { ...defaultGitSettings(), enabled: git === 'remote' }
        gitState = {
          repo: git !== 'none',
          remoteUrl: git === 'remote' ? (remoteUrl?.trim() ?? null) : null,
          branch: git === 'none' ? null : head?.trim() || 'main',
        }
        config = {
          ...config,
          vaultPath: vault.path,
          git: { ...config.git, [vault.path]: gitSettings },
        }
        return { vault, config }
      },
      'POST /api/vaults/open': async ({ path }) => {
        active = vaults.find((vault) => vault.path === path) ?? active
        config = { ...config, vaultPath: path }
        return { config }
      },
      'PUT /api/vaults': async ({ profile }) => {
        if (!profiles.some((one) => one.name === profile))
          throw new Error(`no profile named "${profile}"`)
        return { vault: workAs(profile) }
      },
      'DELETE /api/vaults': async ({ name }) => {
        const index = vaults.findIndex((vault) => vault.name === name)
        if (index < 0) throw new Error(`no vault named "${name}"`)
        vaults.splice(index, 1)
        if (active?.name === name) {
          active = vaults[0] ?? null
          config = { ...config, vaultPath: active?.path ?? null }
        }
        return { active, config }
      },
      'GET /api/projects': async () => {
        if (!active) throw new Error('no vault is open — create or choose one first')
        return { projects: [...projects()] }
      },
      'POST /api/projects': async ({ name, vault }) => {
        const target = vault ? (vaults.find((one) => one.name === vault) ?? null) : active
        if (!target) throw new Error(`no vault named "${vault}"`)
        const created: ProjectSummary = {
          name,
          repo: `${target.path}/.projects/${name}/local`,
        }
        const inside = projectsIn(target.path)
        if (inside.some((one) => one.name === name))
          throw new Error(`a project named "${name}" already exists`)
        inside.push(created)
        // Only the vault you are in is somewhere you can go and work.
        if (target.path === active?.path) setScoped(name)
        return { project: created, config }
      },
      'DELETE /api/projects': async ({ name }) => {
        const index = projects().findIndex((one) => one.name === name)
        if (index < 0) throw new Error(`no project named "${name}"`)
        projects().splice(index, 1)
        delete projectDocs[name]
        delete projectBranches[name]
        if (scoped() === name) setScoped(null)
        return { config }
      },
      'POST /api/scope': async ({ root }) => {
        const name = projectOf(root)
        if (name && !found(name)) throw new Error(`no project named "${name}"`)
        setScoped(name)
        return { config }
      },
      'GET /api/doc': async ({ root, path }) => {
        const files = filesIn(root)
        if (!(path in files)) throw new Error(`no such document: ${path}`)
        return { markdown: files[path] }
      },
      /* A run here finishes the moment it starts: what is under test at this end is the
         asking and the painting, not the walking. */
      'POST /api/dream/run': async ({ root, path }) => {
        const files = filesIn(root)
        if (!(path in files)) throw new Error(`no such dream: ${path}`)
        const dream = parseDream(files[path])
        const order = runOrder(dream)
        if (!order) throw new Error('the dream has a cycle — untangle it first')
        const byId = new Map(dream.nodes.map((node) => [node.id, node]))
        const run: DreamRun = {
          id: `run-${dreamRuns.length + 1}`,
          ref: { root, path },
          startedAt: 0,
          finishedAt: 0,
          state: 'done',
          steps: order.flat().flatMap((id) => {
            const node = byId.get(id)
            return node
              ? [
                  {
                    node: id,
                    name: node.name,
                    kind: node.kind,
                    state: 'done' as const,
                    output: `ran ${node.name}`,
                  },
                ]
              : []
          }),
        }
        dreamRuns.push(run)
        return { run }
      },
      'GET /api/dream/runs': async ({ root, path }) => ({
        runs: dreamRuns
          .filter((run) => run.ref.root === root && run.ref.path === path)
          .reverse(),
      }),
      'GET /api/dreams': async () => {
        const roots: DocRoot[] = [
          'vault',
          ...Object.keys(seed.projectDocs ?? {}).map(projectRoot),
        ]
        const dreams = roots.flatMap((root) =>
          Object.entries(filesIn(root))
            .filter(([path]) => path.endsWith('.dream'))
            .flatMap(([path, text]) => {
              let dream
              try {
                dream = parseDream(text)
              } catch {
                return []
              }
              const wired = new Set(dream.edges.map((edge) => edge.from))
              return [
                {
                  ref: { root, path },
                  name: basename(path).replace(/\.dream$/, ''),
                  triggers: dream.nodes.flatMap((node) => {
                    const label = triggerLabel(node)
                    return label && wired.has(node.id) ? [{ kind: node.kind, label }] : []
                  }),
                  lastRun:
                    dreamRuns.findLast(
                      (run) => run.ref.root === root && run.ref.path === path,
                    ) ?? null,
                },
              ]
            }),
        )
        return { dreams }
      },
      'GET /api/dream/log': async () => ({ runs: [...dreamRuns].reverse() }),
      'GET /api/personas': async () => ({ personas: [...(seed.personas ?? [])] }),
      'GET /api/lair': async () => ({ url: lairUrl, keyed: lairKeyed }),
      'PUT /api/lair': async ({ url, key }) => {
        if (!url || !key) throw new Error('a lair needs both a URL and a key')
        lairUrl = url
        lairKeyed = true
        const current = profileOf()
        if (current)
          profiles.splice(profiles.indexOf(current), 1, { ...current, lair: url })
        return { url: lairUrl, keyed: lairKeyed }
      },
      'DELETE /api/lair': async () => {
        lairUrl = null
        lairKeyed = false
        const current = profileOf()
        if (current)
          profiles.splice(profiles.indexOf(current), 1, { ...current, lair: null })
        return { url: null, keyed: false }
      },
      'POST /api/lair/check': async () => {
        if (!lairUrl) throw new Error('no lair to check — set one first')
        return (
          seed.lairCheck ?? { state: 'connected', message: `connected to ${lairUrl}` }
        )
      },
      'POST /api/lair/share': async () => {
        if (!lairKeyed) throw new Error('no lair to share through — set one first')
        return { invite: `${lairUrl}#mock-room.mock-token.mock-key` }
      },
      'PUT /api/lair/dream': async ({ root, path, site }) => {
        const text = filesIn(root)[path]
        if (text === undefined) throw new Error(`no such dream: ${path}`)
        const dream = parseDream(text)
        const wired = new Set(dream.edges.map((edge) => edge.from))
        const hosted: HostedDream = {
          site,
          path,
          name: basename(path).replace(/\.dream$/, ''),
          triggers: dream.nodes.flatMap((node) => {
            const label = triggerLabel(node)
            return label && wired.has(node.id) ? [{ kind: node.kind, label }] : []
          }),
          lastRun: null,
        }
        const existing = lairDreams.findIndex(
          (one) => one.site === site && one.path === path,
        )
        if (existing >= 0) lairDreams.splice(existing, 1, hosted)
        else lairDreams.push(hosted)
        return { dream: hosted }
      },
      'GET /api/lair/dreams': async () => ({
        sites: [...lairSites],
        dreams: [...lairDreams],
      }),
      'PUT /api/doc': async ({ root, path, markdown }) => {
        const files = filesIn(root)
        const created = !(path in files)
        files[path] = markdown
        emit({
          type: 'tree',
          root,
          event: { type: created ? 'created' : 'changed', path },
        })
        return { ok: true }
      },
      'POST /api/folder': async ({ root, path }) => {
        dirsIn(root).add(path)
        emit({ type: 'tree', root, event: { type: 'created', path } })
        return { ok: true }
      },
      'POST /api/doc/move': async ({ root, from, to }) => {
        const files = filesIn(root)
        files[to] = files[from]
        delete files[from]
        emit({ type: 'tree', root, event: { type: 'moved', from, to } })
        return { to, linksRewritten: 3 }
      },
      /* Nothing here is running a shell, so what is under test at this end is that closing a
         tab says it is finished with one — the names it says it about are kept. */
      'DELETE /api/terminal': async ({ session }) => {
        finished.push(session)
        return { closed: 1 }
      },
      'DELETE /api/doc': async ({ root, path }) => {
        delete filesIn(root)[path]
        emit({ type: 'tree', root, event: { type: 'removed', path } })
        return { ok: true }
      },
      'GET /api/links': async ({ path }) => ({
        backlinks: [{ from: 'README.md', to: path, context: 'see [[' + path + ']]' }],
        outbound: [],
      }),
      'GET /api/config': async () => ({ config, reset: [] }),
      'PUT /api/config': async (next) => {
        config = next
        return { config }
      },
      'POST /api/git/check': async () => {
        if (!gitState.repo)
          return {
            state: 'no-repo' as const,
            remoteUrl: null,
            message: 'This is a folder, not a repository.',
          }
        if (!gitState.remoteUrl)
          return {
            state: 'no-remote' as const,
            remoteUrl: null,
            message: 'A repository with no remote.',
          }
        return {
          state: 'ok' as const,
          remoteUrl: gitState.remoteUrl,
          message: `Reached ${gitState.remoteUrl}.`,
        }
      },
      'GET /api/git': async () => ({ state: gitState, settings: gitSettings }),
      'PUT /api/git': async (settings) => {
        gitSettings = settings
        if (config.vaultPath)
          config = { ...config, git: { ...config.git, [config.vaultPath]: settings } }
        return { settings }
      },
      'DELETE /api/data': async () => {
        vaults.length = 0
        profiles.length = 0
        branches.length = 0
        for (const path of Object.keys(byVault)) delete byVault[path]
        for (const path of Object.keys(docs)) delete docs[path]
        for (const name of Object.keys(projectDocs)) delete projectDocs[name]
        for (const name of Object.keys(projectBranches)) delete projectBranches[name]
        for (const name of Object.keys(projectBranch)) delete projectBranch[name]
        active = null
        working = null
        setScoped(null)
        branch = null
        gitState = { repo: false, remoteUrl: null, branch: null }
        gitSettings = defaultGitSettings()
        config = {
          vaultPath: null,
          profile: null,
          checkouts: {},
          git: {},
          project: {},
          projectBranch: {},
        }
        return { config }
      },

      'GET /api/sync': async () => sync,
      'POST /api/sync/now': async () => {
        sync = {
          state: 'idle',
          lastSyncedAt: Date.now(),
          conflicted: [],
          message: undefined,
        }
        emit({ type: 'sync', status: sync })
        return sync
      },
      'POST /api/sync/clear-conflict': async () => {
        sync = { ...sync, state: 'idle', conflicted: [] }
        emit({ type: 'sync', status: sync })
        return sync
      },
    }

  return {
    request<R extends ApiRoute>(route: R, body: ApiRequest<R>) {
      // A backend that has not answered yet, which every backend is for a moment. What a
      // test written against this asks is what is on screen during that moment.
      if (seed.stall?.includes(route)) return new Promise<never>(() => {})
      const handler = handlers[route] as (b: ApiRequest<R>) => Promise<ApiResponse<R>>
      return handler(body)
    },

    connect(onMessage): Connection {
      listener = onMessage
      return {
        send() {},
        close() {
          listener = null
        },
      }
    },

    terminal({ session }, onMessage, onLive) {
      shell = onMessage
      shellLive = onLive ?? null
      named = session
      sessions.add(session)
      // The server answers with the name before it says anything else, and a socket delivers
      // it a turn later — sending it inside this call would reach a caller that does not have
      // the connection back yet. Nothing here survives a reload, so nothing is ever resumed.
      queueMicrotask(() => onMessage({ type: 'ready', session, resumed: false }))
      return {
        send(message) {
          if (message.type === 'input')
            emitTerminal({ type: 'output', data: message.data })
        },
        close() {
          shell = null
          shellLive = null
        },
      }
    },

    emit,
    emitTerminal,
    dropTerminal: () => shellLive?.(false),
    resumeTerminal(resumed = true) {
      shellLive?.(true)
      shell?.({ type: 'ready', session: named, resumed })
    },
    terminalNames: () => [...sessions],
    finishedTerminals: () => [...finished],
  }
}
