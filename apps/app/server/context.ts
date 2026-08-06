import { mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { defaultGitSettings, projectOf, projectRoot } from '@/core'
import type {
  AccessCheck,
  Branch,
  BroodmotherConfig,
  DiffBasis,
  DiffFile,
  DocPath,
  DocRoot,
  GithubRepo,
  GitSettings,
  GitState,
  Identity,
  NewProject,
  Persona,
  Profile,
  ProjectSummary,
  ServerMessage,
  TreeChanges,
  TreeEntry,
  TreeEvent,
  VaultSummary,
} from '@/types'
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
import type { ConfigStore } from './config'
import { diffFiles, mergeBase, readBlob, resolveRef } from './diff'
import type { DreamSite } from './dreams'
import {
  GithubError,
  createRepo as createGithubRepo,
  login as githubLogin,
  poll as githubPoll,
  repos as githubRepos,
} from './github'
import { Git, GitWatcher, SyncLoop } from './git'
import {
  expandHome,
  findProfile,
  generateKey,
  keyFile,
  listProfiles,
  profileDir,
  readAccount,
  readPublicKey,
  writeAccount,
  writeIdentity,
} from './profiles'
import type { TerminalSession } from './sockets'
import { Tree, TreeWatcher } from './tree'
import {
  LinkIndex,
  PRIMARY,
  checkoutPath,
  findVault,
  listVaults,
  scanPersonas,
  scanSkills,
  vaultCheckouts,
  type Skill,
} from './vault'
import {
  ProjectError,
  createProject,
  deleteProject,
  listProjects,
  projectCheckouts,
} from './project'

export class NoVaultError extends Error {}
export class NoProjectError extends Error {}
export class NoProfileError extends Error {}

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
 * them all and switching between them is a click — but only the one you are in is watched,
 * because nobody is looking at the others and every write in one is an event to carry.
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

/** What a vault's context borrows from the process it lives in: the shared config, the one
 *  relay every window listens on, and the address agents are told to call back. */
export interface VaultDeps {
  home: string
  store: ConfigStore
  broadcast: (message: ServerMessage) => void
  url: () => string
}

/**
 * One open vault: its checkout, its projects, the profile it commits as and its own sync
 * loop. Several can stand at once — each window works in its own — so nothing here reaches
 * for machine-global state beyond the shared config, and the vault a context is about never
 * changes underneath it. Null is the first-run state: a profile perhaps, but no vault yet.
 */
export class VaultContext {
  private vaultOpen: OpenVault | null = null
  private readonly projectsOpen = new Map<string, OpenProject>()
  private activeProfile: Profile | null = null
  /** The open profile's host token, read once when the profile is: every checkout's git is
   *  built with it, and reading a file per git command is a file read per git command. */
  private hostToken: string | null = null
  readonly sync: SyncLoop

  private constructor(
    readonly vaultPath: string | null,
    private readonly deps: VaultDeps,
  ) {
    // Sync is the vault's alone: committing markdown you are typing is what it is for, and
    // committing a code repository nobody asked it to would be a different program.
    this.sync = new SyncLoop({
      git: () => this.vaultOpen?.git ?? null,
      settings: () => this.gitSettings,
      author: () => this.activeProfile?.gitAuthor ?? null,
      onStatus: (status) => this.broadcast({ type: 'sync', status }),
    })
  }

  static async open(vaultPath: string | null, deps: VaultDeps): Promise<VaultContext> {
    const context = new VaultContext(vaultPath, deps)
    // The profile is settled before the vault opens: it is what picks the key git offers.
    await context.loadProfile()
    await context.useVault()
    return context
  }

  private get store(): ConfigStore {
    return this.deps.store
  }

  get home(): string {
    return this.deps.home
  }

  get config(): BroodmotherConfig {
    return this.store.config
  }

  /** The open vault as the web app sees it, or null on first run. */
  get vault(): VaultSummary | null {
    const target = this.vaultPath
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
    const name = this.vaultPath ? this.config.project[this.vaultPath] : null
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
    return this.settingsFor(this.vaultPath)
  }

  settingsFor(vaultPath: string | null): GitSettings {
    return (vaultPath && this.config.git[vaultPath]) || defaultGitSettings()
  }

  async setGitSettings(settings: GitSettings): Promise<GitSettings> {
    const target = this.requireVault.path
    await this.store.update((config) => ({
      ...config,
      git: { ...config.git, [target]: settings },
    }))
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
    this.deps.broadcast(message)
  }

  /** The profile's vaults. A machine with no profile yet has none to list. */
  async listVaults(): Promise<VaultSummary[]> {
    return this.vaultHome ? listVaults(this.vaultHome) : []
  }

  /** Where dreams can live in this context: the vault, and every open project — each
   *  naming the vault it belongs to, because `vault` alone is any window's root. */
  dreamSites(): DreamSite[] {
    const vaultPath = this.vaultPath
    if (!vaultPath) return []
    const sites: DreamSite[] = []
    if (this.vaultOpen)
      sites.push({
        vault: vaultPath,
        root: 'vault',
        tree: this.vaultOpen.tree,
        path: this.vaultOpen.path,
      })
    for (const project of this.projectsOpen.values())
      sites.push({
        vault: vaultPath,
        root: projectRoot(project.name),
        tree: project.tree,
        path: project.path,
      })
    return sites
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
    await this.useVault()
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
    await this.useVault()
    return { pending: false, profile: this.activeProfile }
  }

  /** The token goes and nothing else does. What was pushed with it stays pushed, and the
   *  vaults it reached are still there — this is a credential, not a relationship. */
  async disconnectGithub(): Promise<Profile> {
    this.activeProfile = await writeAccount(this.requireProfile, null)
    this.hostToken = null
    await this.useVault()
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
    await this.useVault()
    return this.activeProfile
  }

  /** The open vault sits inside the profile it commits as, so the path names it. With no
   *  vault the config remembers who you were working as, and a name pointing at nothing
   *  falls back to whichever profile is on disk. */
  private async loadProfile(): Promise<void> {
    const target = this.vaultPath
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
  session(root: DocRoot | null): TerminalSession {
    const name = root ? projectOf(root) : projectOf(this.scope)
    const project = name ? this.projectsOpen.get(name) : null
    const claudeCfgDir = this.activeProfile?.claudeCfgDir
    const cursorCfgDir = this.activeProfile?.cursorCfgDir
    const cwd = project?.path ?? this.vaultOpen?.path ?? this.home
    const here = project ? projectRoot(project.name) : 'vault'
    return {
      cwd,
      env: {
        ...(claudeCfgDir ? { CLAUDE_CONFIG_DIR: expandHome(claudeCfgDir) } : {}),
        ...(cursorCfgDir ? { CURSOR_CONFIG_DIR: expandHome(cursorCfgDir) } : {}),
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
      api: this.deps.url(),
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
    const config = await this.store.update((current) => ({
      ...current,
      project: { ...current.project, [vault]: name },
    }))
    await this.watchScope()
    return config
  }

  /** Deleting the one you are in leaves the vault's documents on their own, which is where
   *  every vault starts. */
  async removeProject(name: string): Promise<void> {
    const vault = this.requireVault.path
    await this.closeProject(name)
    await deleteProject(vault, name)
    const scoped = this.config.project[vault] === name
    await this.store.update((config) => {
      const { [this.branchKey(vault, name)]: _gone, ...projectBranch } =
        config.projectBranch
      return {
        ...config,
        projectBranch,
        project: scoped ? { ...config.project, [vault]: null } : config.project,
      }
    })
    if (scoped) await this.watchScope()
  }

  start(): void {
    this.sync.start()
  }

  async close(): Promise<void> {
    this.sync.stop()
    await this.vaultOpen?.watcher.close()
    await this.vaultOpen?.gitWatcher.close()
    for (const name of [...this.projectsOpen.keys()]) await this.closeProject(name)
    this.vaultOpen = null
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
    const vault = this.vaultPath
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
    if (!this.vaultPath) return []
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
      await this.store.update((config) => ({
        ...config,
        checkouts: { ...config.checkouts, [vault]: folder },
      }))
      await this.useVault()
      return
    }
    const name = projectOf(root)!
    await this.store.update((config) => ({
      ...config,
      projectBranch: {
        ...config.projectBranch,
        [this.branchKey(vault, name)]: folder,
      },
    }))
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
    const vaultPath = this.vaultPath
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

  /** The vault's checkout and projects, (re)opened off disk — what a changed key, token or
   *  branch leaves to do, since all three are fixed when a checkout's git opens. */
  private async useVault(): Promise<void> {
    await this.vaultOpen?.watcher.close()
    await this.vaultOpen?.gitWatcher.close()
    const vaultPath = this.vaultPath
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
        skipped: () => this.ignoredIn(target),
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
    const vaultPath = this.vaultPath
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
          { skipped: () => this.ignoredIn(project.path) },
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
