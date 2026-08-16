import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import {
  defaultGitSettings,
  parseDream,
  projectOf,
  projectRoot,
  siteNameOk,
  type AccessCheck,
  type Branch,
  type BroodmotherConfig,
  type DiffBasis,
  type DiffFile,
  type DocPath,
  type DocRef,
  type DocRoot,
  type GitSettings,
  type GithubDevice,
  type GithubRepo,
  type GitState,
  type HostedDream,
  type Identity,
  type LairCheck,
  type LairDreamTarget,
  type LairSite,
  type LairSitesView,
  type LairState,
  type NewProject,
  type Persona,
  type Profile,
  type ProjectSummary,
  type ServerMessage,
  type TreeChanges,
  type TreeEntry,
  type TreeEvent,
  type VaultSummary,
} from '@broodmother/shared'
import { brief, type BriefState } from './brief'
import {
  BranchError,
  createBranch,
  findBranch,
  listBranches,
  openBranch,
  removeBranch,
  type Checkouts,
} from './branches'
import { ConfigStore, defaultConfig } from './config'
import { diffFiles, mergeBase, readBlob, resolveRef } from './diff'
import {
  Crontab,
  Dreams,
  RunStore,
  TriggerStore,
  crontabScheduler,
  systemCrontab,
  type CrontabIO,
  type DreamSite,
} from './dreams'
import {
  GithubError,
  createRepo as createGithubRepo,
  login as githubLogin,
  poll as githubPoll,
  repos as githubRepos,
  startDevice,
} from './github'
import { Git, GitWatcher, SyncLoop } from './git'
import { LairError, askLair, checkLair, mintInvite } from './lair'
import { migrate } from './migrate'
import {
  ProjectError,
  createProject,
  deleteProject,
  listProjects,
  projectCheckouts,
} from './project'
import {
  ProfileError,
  broodmotherHome,
  createProfile,
  expandHome,
  findProfile,
  generateKey,
  keyFile,
  listProfiles,
  profileDir,
  readAccount,
  readLairAccount,
  readPublicKey,
  writeAccount,
  writeIdentity,
  writeLairAccount,
  type LairAccount,
} from './profiles'
import { Relay, Terminals, type TerminalSession } from './sockets'
import { Tree, TreeWatcher } from './tree'
import {
  LinkIndex,
  PRIMARY,
  VaultError,
  checkoutPath,
  createVault,
  deleteVault,
  findVault,
  listVaults,
  readPersona,
  scanPersonas,
  scanSkills,
  vaultCheckouts,
  type NewVault,
  type Skill,
} from './vault'

export interface ContextOptions {
  root?: string
  home?: string
  /** The system crontab unless a test hands in a tamer one. */
  cron?: CrontabIO
}

export class NoVaultError extends Error {}
export class NoProjectError extends Error {}
export class NoProfileError extends Error {}

/** The lair gives a first clone ten minutes; the proxy hanging up sooner would report a
 *  failure the lair never had. */
const REGISTER_TIMEOUT_MS = 615_000

/** The disk-touching half of a vault, valid only while one is open. */
export interface OpenVault {
  path: string
  tree: Tree
  git: Git
  links: LinkIndex
  /** What the checkout's `.skills/` folder carries, rescanned as the watcher reports it. */
  skills: Skill[]
  /** The same for `.personas/`: the voices a dream's Claude node can wear. */
  personas: Persona[]
  watcher: TreeWatcher
  /** On the repository's own state, so a commit made in a shell reaches the sidebar. */
  gitWatcher: GitWatcher
}

/**
 * The same for each project the vault links. Every one of them is open — the sidebar draws
 * them all and switching between them is a click — but only the one you are in is watched:
 * a `TreeWatcher` is chokidar over the whole folder, and a code repository's `node_modules`
 * is not something to hold four of.
 */
export interface OpenProject {
  name: string
  path: string
  tree: Tree
  git: Git
  watcher: TreeWatcher | null
  /** Open for every project, scoped or not: the sidebar wears git's letters for all of
   *  them, and a commit in a background shell has to reach the rows it is about. */
  gitWatcher: GitWatcher | null
}

/** Everything that touches disk, and the one place any root can be swapped. */
export class AppContext {
  private vaultOpen: OpenVault | null = null
  private readonly projectsOpen = new Map<string, OpenProject>()
  private activeProfile: Profile | null = null
  /** The open profile's host token, read once when the profile is: every checkout's git is
   *  built with it, and reading a file per git command is a file read per git command. */
  private hostToken: string | null = null
  /** The address the brief hands to agents, known only once the server is listening. */
  private url = ''
  readonly sync: SyncLoop
  readonly relay: Relay
  readonly terminals: Terminals
  readonly dreams: Dreams
  private readonly runStore: RunStore

  private constructor(
    readonly store: ConfigStore,
    readonly home: string,
    cron: CrontabIO,
  ) {
    this.relay = new Relay()
    this.runStore = new RunStore(path.join(home, 'dreams.db'))
    // The root the shell was opened from, then the vault, then the home — which is only
    // where you stand on first run, when there is nothing to stand in yet.
    this.terminals = new Terminals((root) => this.session(root))
    // Sync is the vault's alone: committing markdown you are typing is what it is for, and
    // committing a code repository nobody asked it to would be a different program.
    this.sync = new SyncLoop({
      git: () => this.vaultOpen?.git ?? null,
      settings: () => this.gitSettings,
      author: () => this.activeProfile?.gitAuthor ?? null,
      onStatus: (status) => this.broadcast({ type: 'sync', status }),
    })
    // Dreams run wherever a dream file can live: the vault, and every open project.
    this.dreams = new Dreams({
      sites: () => {
        const sites: DreamSite[] = []
        if (this.vaultOpen)
          sites.push({
            root: 'vault',
            tree: this.vaultOpen.tree,
            path: this.vaultOpen.path,
          })
        for (const project of this.projectsOpen.values())
          sites.push({
            root: projectRoot(project.name),
            tree: project.tree,
            path: project.path,
          })
        return sites
      },
      vault: () => this.vaultOpen?.tree ?? null,
      scheduler: crontabScheduler(new Crontab(cron), () => this.url),
      store: new TriggerStore(path.join(home, 'triggers.json')),
      runs: this.runStore,
      scratch: () => path.join(home, 'dreams', 'runs'),
      env: (): Record<string, string> => {
        const env: Record<string, string> = {}
        const claudeCfgDir = this.activeProfile?.claudeCfgDir
        if (claudeCfgDir) env.CLAUDE_CONFIG_DIR = expandHome(claudeCfgDir)
        if (process.env.ANTHROPIC_API_KEY)
          env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
        return env
      },
      persona: (name) =>
        this.vaultOpen ? readPersona(this.vaultOpen.path, name) : Promise.resolve(null),
      brief: (site) => brief(this.briefState(site.path, site.root)),
    })
  }

  static async create(options: ContextOptions = {}): Promise<AppContext> {
    const home = options.home ?? broodmotherHome()
    await mkdir(home, { recursive: true })

    // App state lives above the profiles rather than inside one, so the choice of vault
    // survives switching between them — and a vault is a git working tree, which is no
    // place for state the sync loop would offer to commit.
    const store = new ConfigStore(path.join(home, 'config.json'), defaultConfig(null))
    const migrated = await migrate(home, await store.load())
    const context = new AppContext(store, home, options.cron ?? systemCrontab())

    const vaultPath = await resolveVault(options.root, migrated.config, home)
    // A vault sits inside the profile it commits as, so the open one settles who you are.
    const profile = vaultPath
      ? path.basename(path.dirname(vaultPath))
      : migrated.config.profile
    const config = { ...migrated.config, vaultPath, profile }
    // Persist the resolution, or the open vault and the reported config disagree.
    if (JSON.stringify(config) !== JSON.stringify(store.config)) await store.save(config)
    await context.loadProfile()
    await context.useVault(vaultPath)
    return context
  }

  get config(): BroodmotherConfig {
    return this.store.config
  }

  /** The open vault as the web app sees it, or null on first run. */
  get vault(): VaultSummary | null {
    const target = this.config.vaultPath
    if (!target) return null
    return {
      name: path.basename(target),
      path: target,
      profile: path.basename(path.dirname(target)),
    }
  }

  /** The folder the vaults you can open are in. Null until there is a profile to be them. */
  private get vaultHome(): string | null {
    return this.activeProfile ? profileDir(this.activeProfile) : null
  }

  /** Where you are working: the vault, or one of its projects. A project named here that is
   *  no longer linked is the vault, which is what unlinking the one you were in leaves. */
  get scope(): DocRoot {
    const vault = this.config.vaultPath
    const name = vault ? this.config.project[vault] : null
    return name && this.projectsOpen.has(name) ? projectRoot(name) : 'vault'
  }

  /** The project the scope is in, or null when it is the vault — which is an ordinary state,
   *  not a first run. */
  get project(): ProjectSummary | null {
    const name = projectOf(this.scope)
    const open = name ? this.projectsOpen.get(name) : null
    return open ? { name: open.name, repo: open.path } : null
  }

  get profile(): Profile | null {
    return this.activeProfile
  }

  /** How the open vault syncs. A vault nobody has configured uses the defaults, which sync
   *  nothing — git is opt-in, the same way it is optional. */
  get gitSettings(): GitSettings {
    return this.settingsFor(this.config.vaultPath)
  }

  settingsFor(vaultPath: string | null): GitSettings {
    return (vaultPath && this.config.git[vaultPath]) || defaultGitSettings()
  }

  async setGitSettings(settings: GitSettings): Promise<GitSettings> {
    const target = this.requireVault.path
    await this.store.save({
      ...this.config,
      git: { ...this.config.git, [target]: settings },
    })
    await this.sync.refresh()
    return settings
  }

  /** What git says about the open vault's checkout, which is the truth about whether it has
   *  a repository at all and where it syncs. */
  async gitState(): Promise<GitState> {
    const git = this.vaultOpen?.git
    if (!git || !(await git.isRepo()))
      return { repo: false, remoteUrl: null, branch: null }
    return { repo: true, remoteUrl: await git.remoteUrl(), branch: await git.branch() }
  }

  /** Throws rather than returning null: nothing that commits works without an identity. */
  get requireProfile(): Profile {
    if (!this.activeProfile)
      throw new NoProfileError('no profile yet — pick one for this vault first')
    return this.activeProfile
  }

  /** Throws rather than returning null: creating a vault needs somewhere to put it and the
   *  home is always that, but opening one needs the vault to exist. */
  get requireVault(): VaultSummary {
    const vault = this.vault
    if (!vault) throw new NoVaultError('no vault is open — create or choose one first')
    return vault
  }

  /** Throws rather than returning null: every route that needs a vault needs a real one. */
  get open(): OpenVault {
    if (!this.vaultOpen)
      throw new NoVaultError('no vault is open — create or choose one first')
    return this.vaultOpen
  }

  get opened(): OpenVault | null {
    return this.vaultOpen
  }

  /** The project the scope is in, as the half that touches disk. */
  get openedProject(): OpenProject | null {
    const name = projectOf(this.scope)
    return name ? (this.projectsOpen.get(name) ?? null) : null
  }

  /** The tree a request names. There is always a vault; a project has to be one the vault
   *  links, and naming one it does not is a mistake worth saying out loud. */
  rootOf(root: DocRoot): OpenVault | OpenProject {
    if (root === 'vault') return this.open
    const name = projectOf(root)!
    const project = this.projectsOpen.get(name)
    if (!project) throw new NoProjectError(`no project named "${name}" in this vault`)
    return project
  }

  /** The vault's documents and every project's files, which is the whole sidebar — each
   *  with what git says its checkout has touched, so the rows can wear it. */
  async trees(): Promise<{
    vault: TreeEntry[]
    vaultChanges: TreeChanges
    projects: { name: string; entries: TreeEntry[]; changes: TreeChanges }[]
  }> {
    return {
      vault: await this.open.tree.list(),
      vaultChanges: await this.open.git.changes(),
      projects: await Promise.all(
        [...this.projectsOpen.values()].map(async (project) => ({
          name: project.name,
          entries: await project.tree.list(),
          changes: await project.git.changes(),
        })),
      ),
    }
  }

  broadcast(message: ServerMessage): void {
    this.relay.broadcast(message)
  }

  async setConfig(config: BroodmotherConfig): Promise<BroodmotherConfig> {
    const previous = this.config.vaultPath
    await this.store.save(config)
    if (config.vaultPath !== previous) {
      await this.loadProfile()
      await this.useVault(config.vaultPath)
    }
    return this.config
  }

  /** The profile's vaults. A machine with no profile yet has none to list. */
  async listVaults(): Promise<VaultSummary[]> {
    return this.vaultHome ? listVaults(this.vaultHome) : []
  }

  /** Deleting the vault you are in falls back the way startup does: whatever is left, or
   *  nothing, which is the first-run state again. */
  async removeVault(name: string): Promise<VaultSummary | null> {
    const home = this.vaultHome
    const gone = home ? await findVault(name, home) : null
    if (!home || !gone) throw new VaultError(`no vault named "${name}"`)
    await deleteVault(name, home)

    // Nothing filed under the path outlives it: a folder of that name made later is a
    // different vault, and it does not inherit this one's sync settings or the projects
    // that were inside it.
    const config = this.forget(gone.path)
    if (this.config.vaultPath !== gone.path) {
      await this.store.save(config)
      return this.vault
    }

    const next = (await listVaults(home))[0] ?? null
    await this.store.save({ ...config, vaultPath: next?.path ?? null })
    await this.loadProfile()
    await this.useVault(next?.path ?? null)
    return this.vault
  }

  /** Everything this machine filed under a vault path, dropped. */
  private forget(vaultPath: string): BroodmotherConfig {
    const git = { ...this.config.git }
    const checkouts = { ...this.config.checkouts }
    const project = { ...this.config.project }
    delete git[vaultPath]
    delete checkouts[vaultPath]
    delete project[vaultPath]
    const projectBranch = Object.fromEntries(
      Object.entries(this.config.projectBranch).filter(
        ([key]) => !key.startsWith(`${vaultPath}#`),
      ),
    )
    return { ...this.config, git, checkouts, project, projectBranch }
  }

  /**
   * Everything broodmother has on disk: every profile, the vaults inside them, the projects
   * inside those, and this machine's config. The home folder itself stays — it is a folder
   * someone chose, and emptying it is what was asked for — and what stands in it afterwards
   * is a first run.
   */
  async removeEverything(): Promise<BroodmotherConfig> {
    // A latched conflict outlives a refresh, and it is about a vault that is going.
    this.sync.clearConflict()
    // Closed before the folders go, or the watcher reports the deletion of a vault nobody
    // is in and the shells sit in a working directory that no longer exists.
    await this.useVault(null)
    this.terminals.close()
    for (const entry of await readdir(this.home))
      await rm(path.join(this.home, entry), { recursive: true, force: true })
    this.activeProfile = null
    return this.store.save(defaultConfig(null))
  }

  async listProfiles(): Promise<Profile[]> {
    return listProfiles(this.home)
  }

  /** A profile made from the vault menu is one you meant to work as, so it is worked as on
   *  the spot. It holds no vaults yet, which is the first-run state with a name on it. */
  async addProfile(input: { name: string } & Identity): Promise<Profile> {
    const profile = await createProfile(input, this.home)
    await this.useProfile(profile)
    return profile
  }

  /** Working as someone else is standing in their folder, so what opens is one of their
   *  vaults. Null when they have none yet, which is where a new profile starts. */
  async selectProfile(name: string): Promise<VaultSummary | null> {
    const profile = await findProfile(name, this.home)
    if (!profile) throw new ProfileError(`no profile named "${name}"`)
    await this.useProfile(profile)
    return this.vault
  }

  /** Whether the root named can reach its remote, and which reason it cannot. */
  async checkAccess(root: DocRoot): Promise<AccessCheck> {
    return this.rootOf(root).git.checkAccess()
  }

  /** The public half of the open profile's key, or null when it has none yet. */
  async publicKey(): Promise<string | null> {
    return this.activeProfile ? readPublicKey(this.activeProfile) : null
  }

  /**
   * Makes a key and points the profile at it, so the next git command offers it. The vault
   * reopens for the same reason changing the identity does: the key a checkout's git offers
   * is fixed when it opens.
   */
  async addKey(): Promise<{ profile: Profile; publicKey: string }> {
    const profile = this.requireProfile
    const publicKey = await generateKey(profile)
    this.activeProfile = await writeIdentity(profile, {
      ...profile,
      sshKeyPath: keyFile(profile),
    })
    await this.useVault(this.config.vaultPath)
    return { profile: this.activeProfile, publicKey }
  }

  /**
   * The answer to a device code, once the browser has given one. Connecting is the profile's
   * — the token is what it pushes with, the way its key is — so the vault reopens for the
   * same reason a new key makes it: what a checkout's git offers is fixed when it opens.
   */
  async connectGithub(
    deviceCode: string,
  ): Promise<{ pending: boolean; profile: Profile }> {
    const profile = this.requireProfile
    const answer = await githubPoll(deviceCode)
    if (!answer.token) return { pending: true, profile }

    const login = await githubLogin(answer.token)
    this.activeProfile = await writeAccount(profile, { login, token: answer.token })
    this.hostToken = answer.token
    await this.useVault(this.config.vaultPath)
    return { pending: false, profile: this.activeProfile }
  }

  /** The token goes and nothing else does. What was pushed with it stays pushed, and the
   *  vaults it reached are still there — this is a credential, not a relationship. */
  async disconnectGithub(): Promise<Profile> {
    this.activeProfile = await writeAccount(this.requireProfile, null)
    this.hostToken = null
    await this.useVault(this.config.vaultPath)
    return this.activeProfile
  }

  /** Throws rather than returning empty: a picker with nothing in it and no reason why is
   *  worse than being told the connection is gone. */
  private async requireToken(): Promise<string> {
    const account = await readAccount(this.requireProfile)
    if (!account)
      throw new GithubError(`${this.requireProfile.name} is not connected to GitHub`)
    return account.token
  }

  async startGithub(): Promise<GithubDevice> {
    return startDevice()
  }

  /** The URL and whether a key is held — the key itself stays in the profile file. */
  async lairState(): Promise<LairState> {
    const profile = this.activeProfile
    if (!profile) return { url: null, keyed: false }
    const account = await readLairAccount(profile)
    return { url: account?.url ?? null, keyed: account !== null }
  }

  async setLair(url: string, key: string): Promise<LairState> {
    this.activeProfile = await writeLairAccount(this.requireProfile, { url, key })
    return this.lairState()
  }

  async clearLair(): Promise<LairState> {
    this.activeProfile = await writeLairAccount(this.requireProfile, null)
    return { url: null, keyed: false }
  }

  private async requireLair(): Promise<LairAccount> {
    const account = await readLairAccount(this.requireProfile)
    if (!account)
      throw new LairError('no lair yet — point Settings at one and paste its key')
    return account
  }

  async lairCheck(): Promise<LairCheck> {
    return checkLair(await this.requireLair())
  }

  /** The document is read only to prove it is there: a room is a random id, and what is
   *  being shared is the sharer's business, not the invite's. */
  async lairShare(ref: DocRef): Promise<string> {
    await this.rootOf(ref.root).tree.read(ref.path)
    return mintInvite(await this.requireLair())
  }

  async lairPushDream(target: LairDreamTarget): Promise<HostedDream> {
    const account = await this.requireLair()
    const dream = parseDream(await this.rootOf(target.root).tree.read(target.path))
    const answer = await askLair(account, 'PUT /dreams', {
      site: target.site,
      path: target.path,
      dream,
    })
    return answer.dream
  }

  async lairRemoveDream(target: { site: string; path: string }): Promise<HostedDream[]> {
    const account = await this.requireLair()
    return (await askLair(account, 'DELETE /dreams', target)).dreams
  }

  async lairDreams(): Promise<{ sites: LairSite[]; dreams: HostedDream[] }> {
    const account = await this.requireLair()
    const [sites, dreams] = await Promise.all([
      askLair(account, 'GET /sites', null),
      askLair(account, 'GET /dreams', null),
    ])
    return { sites: sites.sites, dreams: dreams.dreams }
  }

  /** What the open vault would register as: its folder's name, its checkout's remote. */
  private async siteCandidate(): Promise<LairSitesView['vault']> {
    const vaultPath = this.config.vaultPath
    if (!vaultPath || !this.vaultOpen) return null
    return {
      name: path.basename(vaultPath),
      remote: await this.vaultOpen.git.remoteUrl(),
    }
  }

  async lairSites(): Promise<LairSitesView> {
    const account = await this.requireLair()
    const [sites, key] = await Promise.all([
      askLair(account, 'GET /sites', null),
      askLair(account, 'GET /key', null),
    ])
    return {
      sites: sites.sites,
      publicKey: key.publicKey,
      vault: await this.siteCandidate(),
    }
  }

  /** Files the open vault as a site, name and remote derived here at press time — the
   *  browser names nothing. */
  async lairRegister(): Promise<LairSite> {
    const account = await this.requireLair()
    const candidate = await this.siteCandidate()
    if (!candidate)
      throw new NoVaultError('no vault is open — create or choose one first')
    if (!siteNameOk(candidate.name))
      throw new LairError(`"${candidate.name}" is not a name a site can have`)
    if (!candidate.remote)
      throw new LairError(
        'this vault has no remote — the lair clones over git, and there is nothing here to clone from',
      )
    const { site } = await askLair(
      account,
      'PUT /sites',
      { name: candidate.name, remote: candidate.remote },
      fetch,
      REGISTER_TIMEOUT_MS,
    )
    return site
  }

  async lairRunDream(target: {
    site: string
    path: string
  }): Promise<{ run: import('@broodmother/shared').DreamRun }> {
    const answer = await askLair(await this.requireLair(), 'POST /dream/run', target)
    return answer as { run: import('@broodmother/shared').DreamRun }
  }

  async lairStopDream(target: {
    site: string
    path: string
  }): Promise<{ run: import('@broodmother/shared').DreamRun }> {
    const answer = await askLair(await this.requireLair(), 'POST /dream/stop', target)
    return answer as { run: import('@broodmother/shared').DreamRun }
  }

  async githubRepos(): Promise<GithubRepo[]> {
    return githubRepos(await this.requireToken())
  }

  async createGithubRepo(input: { name: string; private: boolean }): Promise<GithubRepo> {
    return createGithubRepo(await this.requireToken(), input)
  }

  async setIdentity(identity: Identity): Promise<Profile> {
    this.activeProfile = await writeIdentity(this.requireProfile, identity)
    // The key a checkout's git offers is fixed when it opens, so both are reopened to pick
    // up a changed one.
    await this.useVault(this.config.vaultPath)
    return this.activeProfile
  }

  private async useProfile(profile: Profile): Promise<void> {
    this.activeProfile = profile
    this.hostToken = (await readAccount(profile))?.token ?? null
    const target = (await listVaults(profileDir(profile)))[0]?.path ?? null
    await this.store.save({ ...this.config, profile: profile.name, vaultPath: target })
    // The key a checkout's git offers is fixed when it opens, so both are reopened to pick
    // up the new profile's.
    await this.useVault(target)
  }

  /** The open vault sits inside the profile it commits as, so the path names it. With no
   *  vault the config remembers who you were working as, and a name pointing at nothing
   *  falls back to whichever profile is on disk. */
  private async loadProfile(): Promise<void> {
    const target = this.config.vaultPath
    const name = target ? path.basename(path.dirname(target)) : this.config.profile
    this.activeProfile = name ? await findProfile(name, this.home) : null
    if (!this.activeProfile && !target)
      this.activeProfile = (await listProfiles(this.home))[0] ?? null
    this.hostToken = this.activeProfile
      ? ((await readAccount(this.activeProfile))?.token ?? null)
      : null
  }

  /** Where a shell opens: the root it was opened from, the vault if that root is gone, and
   *  the home only on a first run with neither. */
  private session(root: DocRoot | null): TerminalSession {
    const name = root ? projectOf(root) : projectOf(this.scope)
    const project = name ? this.projectsOpen.get(name) : null
    const claudeCfgDir = this.activeProfile?.claudeCfgDir
    const cwd = project?.path ?? this.vaultOpen?.path ?? this.home
    const here = project ? projectRoot(project.name) : 'vault'
    return {
      cwd,
      env: {
        ...(claudeCfgDir ? { CLAUDE_CONFIG_DIR: expandHome(claudeCfgDir) } : {}),
        BROODMOTHER_BRIEF: brief(this.briefState(cwd, here)),
      },
    }
  }

  /** What an agent opened here is told about where it is standing. A snapshot: a shell
   *  someone is typing in is not somewhere to send an update, so the routes in it are how
   *  a long-lived one catches up. */
  private briefState(cwd: string, scope: DocRoot): BriefState {
    const vault = this.vault
    const state = this.sync.state.state
    return {
      api: this.url,
      profile: this.activeProfile?.name ?? null,
      soul: this.activeProfile?.soul ?? null,
      vault:
        vault && this.vaultOpen
          ? { name: vault.name, path: vault.path, checkout: this.vaultOpen.path }
          : null,
      projects: [...this.projectsOpen.values()].map((project) => ({
        name: project.name,
        path: project.path,
      })),
      skills: this.vaultOpen?.skills ?? [],
      scope,
      cwd,
      sync: state === 'conflict' ? 'conflicted' : state === 'off' ? 'off' : 'on',
    }
  }

  /**
   * A vault is created as the profile you are working as, and stays bound to it. A vault
   * given a remote starts syncing, because asking for one is asking for that; a plain
   * folder or a local repository does not, because there is nowhere for it to sync to.
   */
  async addVault(input: NewVault): Promise<VaultSummary> {
    const profile = this.requireProfile
    const vault = await createVault(input, profile)
    await this.store.save({
      ...this.config,
      vaultPath: vault.path,
      profile: profile.name,
      git: {
        ...this.config.git,
        [vault.path]: { ...defaultGitSettings(), enabled: input.git === 'remote' },
      },
    })
    await this.useVault(vault.path)
    return vault
  }

  /** Opens a vault. Nothing about git is copied out of it: how it syncs is its own setting,
   *  and where it syncs is a question for the repository every time it is asked. */
  async openVault(vaultPath: string): Promise<BroodmotherConfig> {
    const config = await this.store.save({
      ...this.config,
      vaultPath,
      profile: path.basename(path.dirname(vaultPath)),
    })
    // The profile is settled before the vault opens: it is what picks the key git offers.
    await this.loadProfile()
    await this.useVault(vaultPath)
    return config
  }

  async listProjects(): Promise<ProjectSummary[]> {
    return listProjects(this.requireVault.path)
  }

  /** Made and scoped to in one gesture: a repository you are not going to work in is a step
   *  nobody wants on its own. A project made in a vault you are not in is left for the next
   *  time you are there — the scope is a fact about the vault you are standing in. */
  async addProject(input: NewProject): Promise<ProjectSummary> {
    const home = this.vaultHome
    const vault =
      input.vault && home ? await findVault(input.vault, home) : this.requireVault
    if (!vault) throw new ProjectError(`no vault named "${input.vault}"`)

    const project = await createProject(vault.path, input, this.requireProfile)
    if (vault.path !== this.vault?.path) return project
    await this.useProjects()
    await this.setScope(projectRoot(project.name))
    return project
  }

  /**
   * Where you are working. Every project is open already, so nothing is loaded or dropped
   * here: what moves is which root the tabs, the branches and the next shell are about, and
   * which one is worth watching for changes.
   */
  async setScope(root: DocRoot): Promise<BroodmotherConfig> {
    const vault = this.requireVault.path
    const name = projectOf(root)
    if (name && !this.projectsOpen.has(name))
      throw new ProjectError(`no project named "${name}"`)
    const config = await this.store.save({
      ...this.config,
      project: { ...this.config.project, [vault]: name },
    })
    await this.watchScope()
    return config
  }

  /** Deleting the one you are in leaves the vault's documents on their own, which is where
   *  every vault starts. */
  async removeProject(name: string): Promise<void> {
    const vault = this.requireVault.path
    await this.closeProject(name)
    await deleteProject(vault, name)
    const { [this.branchKey(vault, name)]: _gone, ...projectBranch } =
      this.config.projectBranch
    const scoped = this.config.project[vault] === name
    await this.store.save({
      ...this.config,
      projectBranch,
      project: scoped ? { ...this.config.project, [vault]: null } : this.config.project,
    })
    if (scoped) await this.watchScope()
  }

  start(url: string): void {
    this.url = url
    this.sync.start()
    this.dreams.start()
  }

  async close(): Promise<void> {
    this.sync.stop()
    this.dreams.stop()
    this.runStore.close()
    this.relay.close()
    this.terminals.close()
    await this.vaultOpen?.watcher.close()
    await this.vaultOpen?.gitWatcher.close()
    for (const project of this.projectsOpen.values()) {
      await project.watcher?.close()
      await project.gitWatcher?.close()
    }
  }

  /**
   * The folder of the checkout open in a vault. The config keeps the folder rather than the
   * branch because this has to be answerable without asking git — the terminals, the
   * watcher and git itself all need it before anything is listed.
   */
  checkoutFor(vaultPath: string | null): string {
    return (vaultPath && this.config.checkouts[vaultPath]) || PRIMARY
  }

  /** The directory the vault's document tree, git and sync all sit in. */
  get root(): string | null {
    const vault = this.config.vaultPath
    return vault ? checkoutPath(vault, this.checkoutFor(vault)) : null
  }

  private branchKey(vault: string, project: string): string {
    return `${vault}#${project}`
  }

  /** Where each root's checkouts are, which is the one thing branches differ on. */
  private async checkoutsFor(root: DocRoot): Promise<Checkouts> {
    const vault = this.requireVault.path
    const name = projectOf(root)
    if (!name) return vaultCheckouts(vault)
    if (!this.projectsOpen.has(name))
      throw new NoProjectError(`no project named "${name}"`)
    return projectCheckouts(vault, name)
  }

  async listBranches(root: DocRoot): Promise<Branch[]> {
    const name = projectOf(root)
    if (name && !this.projectsOpen.has(name)) return []
    if (!this.config.vaultPath) return []
    return listBranches(await this.checkoutsFor(root))
  }

  /** The branch of the open checkout, or null when that root has no repository. */
  async activeBranch(root: DocRoot): Promise<string | null> {
    const open = root === 'vault' ? this.root : (this.rootPathOf(root) ?? null)
    if (!open) return null
    const branches = await this.listBranches(root)
    return branches.find((one) => one.path === open)?.name ?? null
  }

  /** Cut off the branch this root is open on: a new branch continues the work you are in. */
  async addBranch(root: DocRoot, name: string): Promise<Branch> {
    const branch = await createBranch(
      await this.checkoutsFor(root),
      name,
      await this.activeBranch(root),
      this.activeProfile?.sshKeyPath,
    )
    await this.moveInto(root, branch)
    return branch
  }

  /**
   * Opening a branch is moving into its checkout, and it gets one here if it has none —
   * which is what makes picking a branch off the remote a single gesture.
   */
  async openBranch(root: DocRoot, name: string): Promise<Branch> {
    const branch = await openBranch(
      await this.checkoutsFor(root),
      name,
      this.activeProfile?.sshKeyPath,
    )
    await this.moveInto(root, branch)
    return branch
  }

  /**
   * Every path that differs between the branch this root is standing on and the branch
   * named. Both refs are read out of the repository itself: a worktree shares its object
   * database with the checkout it came from, so neither branch has to have a folder.
   */
  async diff(root: DocRoot, against: string, basis?: DiffBasis): Promise<DiffFile[]> {
    const sides = await this.sidesOf(root, against, basis)
    if (!sides) return []
    return diffFiles(sides.git, sides.against, sides.current)
  }

  /** One of those files, as each branch has it. */
  async diffFile(
    root: DocRoot,
    against: string,
    path: DocPath,
    basis?: DiffBasis,
  ): Promise<{ against: string | null; current: string | null }> {
    const sides = await this.sidesOf(root, against, basis)
    if (!sides) return { against: null, current: null }
    // A rename is one file under two names, so the other branch is asked for the name it
    // has rather than the one this branch gave it.
    const files = await diffFiles(sides.git, sides.against, sides.current)
    const source = files.find((one) => one.path === path)?.from ?? path
    return {
      against: await readBlob(sides.git, sides.against, source),
      current: await readBlob(sides.git, sides.current, path),
    }
  }

  /**
   * The repository and the two refs to read out of it, or null when there is nothing to
   * compare — no repository, or a branch asked to be compared with itself.
   *
   * The basis is the whole of what `split` changes: `git diff A...B` is defined as the diff
   * from the merge base of the two to B, so resolving the far side to that commit is all it
   * takes — the file list and the two sides of each file both come out of the same pair of
   * refs, and neither has to know which basis produced them.
   */
  private async sidesOf(
    root: DocRoot,
    against: string,
    basis: DiffBasis = 'now',
  ): Promise<{ git: Git; against: string; current: string } | null> {
    const current = await this.activeBranch(root)
    if (!current || current === against) return null
    const git = new Git((await this.checkoutsFor(root)).primary)
    const from = await resolveRef(git, against)
    if (!from) throw new BranchError(`no branch named "${against}"`)
    const here = await resolveRef(git, current)
    if (!here) return null
    // Two branches with nothing in common have no split to compare from. The far side stays
    // the branch itself, which is a comparison rather than an error.
    const far = basis === 'split' ? ((await mergeBase(git, from, here)) ?? from) : from
    return { git, against: far, current: here }
  }

  /** Removing the checkout you are in falls back to the repository's own. */
  async removeBranch(root: DocRoot, name: string): Promise<Branch[]> {
    const checkouts = await this.checkoutsFor(root)
    const gone = await findBranch(checkouts, name)
    if (!gone) throw new BranchError(`no branch named "${name}"`)
    const here = gone.path === (root === 'vault' ? this.root : this.rootPathOf(root))
    await removeBranch(checkouts, name)
    if (here) await this.moveInto(root, { ...gone, path: checkouts.primary })
    return listBranches(checkouts)
  }

  /**
   * The folder is what gets recorded, not the branch: a checkout moved onto another branch
   * from a terminal is still the folder you are standing in.
   */
  private async moveInto(root: DocRoot, branch: Branch): Promise<void> {
    const vault = this.requireVault.path
    const folder = path.basename(branch.path)
    if (root === 'vault') {
      await this.store.save({
        ...this.config,
        checkouts: { ...this.config.checkouts, [vault]: folder },
      })
      await this.useVault(vault)
      return
    }
    const name = projectOf(root)!
    await this.store.save({
      ...this.config,
      projectBranch: {
        ...this.config.projectBranch,
        [this.branchKey(vault, name)]: folder,
      },
    })
    await this.reopenProject(name)
  }

  /** Where a root's open checkout is, or null when it names a project the vault has lost. */
  private rootPathOf(root: DocRoot): string | null {
    const name = projectOf(root)
    if (!name) return this.root
    return this.projectsOpen.get(name)?.path ?? null
  }

  /** One project, back onto whichever checkout the config now names — what moving it onto
   *  another branch leaves to do. The others are untouched. */
  private async reopenProject(name: string): Promise<void> {
    const vaultPath = this.config.vaultPath
    await this.closeProject(name)
    if (!vaultPath) return
    const target = await this.checkoutOf(vaultPath, name)
    if (!target) return
    this.projectsOpen.set(name, {
      name,
      path: target,
      tree: new Tree(target),
      git: new Git(target, this.activeProfile?.sshKeyPath ?? null, this.hostToken),
      watcher: null,
      gitWatcher: null,
    })
    await this.watchScope()
  }

  private async useVault(vaultPath: string | null): Promise<void> {
    await this.vaultOpen?.watcher.close()
    await this.vaultOpen?.gitWatcher.close()
    if (!vaultPath) {
      this.vaultOpen = null
      await this.useProjects()
      await this.sync.refresh()
      return
    }
    // The vault is a folder of checkouts; what is opened is the one you are in.
    const target = checkoutPath(vaultPath, this.checkoutFor(vaultPath))
    await mkdir(target, { recursive: true })
    const tree = new Tree(target)
    const links = new LinkIndex(tree)
    await links.rebuild()
    this.vaultOpen = {
      path: target,
      tree,
      links,
      skills: await scanSkills(target),
      personas: await scanPersonas(target),
      git: new Git(target, this.activeProfile?.sshKeyPath ?? null, this.hostToken),
      watcher: new TreeWatcher(target, (event) => this.onTreeEvent('vault', event), {
        skipped: await this.ignoredIn(target),
      }),
      gitWatcher: new GitWatcher(target, () => this.onGitEvent('vault')),
    }
    // The vault underneath changed, so what the status line says about syncing has to. A
    // clone and a plain folder do not report the same thing.
    await this.sync.refresh()
    await this.useProjects()
  }

  /**
   * Every project in the vault, each at its own checkout — the repository itself unless a
   * branch of it has been opened. A project whose folder has been taken away underneath is
   * left out rather than opened as an empty tree at a path that is not there.
   */
  private async useProjects(): Promise<void> {
    for (const name of [...this.projectsOpen.keys()]) await this.closeProject(name)
    const vaultPath = this.config.vaultPath
    if (!vaultPath) return

    for (const project of await listProjects(vaultPath)) {
      const target = await this.checkoutOf(vaultPath, project.name)
      if (!target) continue
      this.projectsOpen.set(project.name, {
        name: project.name,
        path: target,
        tree: new Tree(target),
        git: new Git(target, this.activeProfile?.sshKeyPath ?? null, this.hostToken),
        watcher: null,
        // Watched whether or not the project is the scope: a commit made in any shell
        // changes what the sidebar says, and this watch is two files, not a repository.
        gitWatcher: new GitWatcher(target, () =>
          this.onGitEvent(projectRoot(project.name)),
        ),
      })
    }
    await this.watchScope()
  }

  /** Where a project's open branch lives, or null when that folder is gone. */
  private async checkoutOf(vaultPath: string, name: string): Promise<string | null> {
    const checkouts = projectCheckouts(vaultPath, name)
    const folder = this.config.projectBranch[this.branchKey(vaultPath, name)]
    const target =
      folder && folder !== path.basename(checkouts.primary)
        ? path.join(checkouts.worktrees, folder)
        : checkouts.primary
    return (await exists(target)) ? target : null
  }

  /**
   * What a watch on this folder should not descend into: what the repository ignores, which
   * is what the tree already leaves out of the sidebar. A folder that is not a repository
   * ignores nothing and is watched whole.
   *
   * It is asked of git rather than kept as a list of names here — the dependency folder of
   * whatever this repository is written in is already named in its `.gitignore`, and a list
   * of `node_modules`, `.venv`, `target`, `vendor` is a list nobody can keep up to date.
   */
  private ignoredIn(folder: string): Promise<Set<string>> {
    return new Git(folder).ignored()
  }

  /** One project watcher, on the one you are in. The others' trees can go stale: nothing is
   *  looking at them, and the scope landing on one refetches it. */
  private async watchScope(): Promise<void> {
    const here = projectOf(this.scope)
    for (const project of this.projectsOpen.values()) {
      if (project.name === here && !project.watcher) {
        project.watcher = new TreeWatcher(
          project.path,
          (event) => this.onTreeEvent(projectRoot(project.name), event),
          { skipped: await this.ignoredIn(project.path) },
        )
      } else if (project.name !== here && project.watcher) {
        await project.watcher.close()
        project.watcher = null
      }
    }
  }

  private async closeProject(name: string): Promise<void> {
    const project = this.projectsOpen.get(name)
    if (!project) return
    await project.watcher?.close()
    await project.gitWatcher?.close()
    this.projectsOpen.delete(name)
  }

  /** The repository moved under a root — a commit, a stage, a checkout — without a file
   *  event to say so. The empty path names the whole tree: no document has it, so nothing
   *  follows it anywhere, and the client reads the place again the way it does for any
   *  tree event. Not `onTreeEvent`: there is no edit here for the sync to wait on, and no
   *  link to reindex. */
  private onGitEvent(root: DocRoot): void {
    this.broadcast({ type: 'tree', root, event: { type: 'changed', path: '' } })
  }

  private onTreeEvent(root: DocRoot, event: TreeEvent): void {
    if (root === 'vault' && event.type !== 'moved') {
      if (event.type === 'removed') this.vaultOpen?.links.forget(event.path)
      else void this.vaultOpen?.links.update(event.path)
    }
    // Only the vault syncs, so only its edits are worth waiting on before one runs.
    if (root === 'vault') this.sync.noteEdit()
    // Rescanning whole costs less than being clever about which half of a move mattered.
    if (root === 'vault' && touchesFolder(event, '.skills')) void this.refreshSkills()
    if (root === 'vault' && touchesFolder(event, '.personas')) void this.refreshPersonas()
    this.broadcast({ type: 'tree', root, event })
  }

  private async refreshSkills(): Promise<void> {
    const open = this.vaultOpen
    if (open) open.skills = await scanSkills(open.path)
  }

  private async refreshPersonas(): Promise<void> {
    const open = this.vaultOpen
    if (open) open.personas = await scanPersonas(open.path)
  }
}

function touchesFolder(event: TreeEvent, folder: string): boolean {
  const touched = event.type === 'moved' ? [event.from, event.to] : [event.path]
  return touched.some((path) => path === folder || path.startsWith(`${folder}/`))
}

const exists = (target: string) =>
  stat(target).then(
    () => true,
    () => false,
  )

/**
 * An explicit path always wins, then whatever was open last, then the first vault the
 * profile has — the only other thing a folder there can mean is a vault someone dropped in
 * by hand. Falling through to null is normal on first run: nothing is invented, and the web
 * app asks where you work.
 */
async function resolveVault(
  root: string | undefined,
  config: BroodmotherConfig,
  home: string,
): Promise<string | null> {
  const explicit = root ?? process.env.BROODMOTHER_VAULT
  if (explicit) return path.resolve(explicit)
  if (config.vaultPath && (await exists(config.vaultPath))) return config.vaultPath
  const profile = config.profile ?? (await listProfiles(home))[0]?.name
  if (!profile) return null
  const vaults = await listVaults(path.join(home, profile))
  return vaults[0]?.path ?? null
}
