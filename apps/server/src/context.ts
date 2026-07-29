import { mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import type {
  Identity,
  MotherConfig,
  Profile,
  Project,
  ServerMessage,
  VaultEvent,
} from '@mother/shared'
import { ConfigStore, defaultConfig } from './config'
import { Git } from './git/git'
import { LinkIndex } from './vault/links'
import {
  ProfileError,
  createProfile,
  expandHome,
  findProfile,
  listProfiles,
  motherHome,
  writeIdentity,
} from './profiles'
import {
  ProjectError,
  createProject,
  deleteProject,
  findProject,
  listProjects,
  setProjectProfile,
} from './projects'
import { Relay } from './sockets/relay'
import { SyncLoop } from './git/sync'
import { Terminals, type TerminalSession } from './sockets/terminal'
import { Vault } from './vault/vault'
import { listVaults } from './vault/vaults'
import { VaultWatcher } from './vault/watcher'

export interface ContextOptions {
  root?: string
  home?: string
}

export class NoVaultError extends Error {}
export class NoProjectError extends Error {}
export class NoProfileError extends Error {}

/** The disk-touching half of the app, valid only while a vault is open. */
export interface OpenVault {
  path: string
  vault: Vault
  git: Git
  links: LinkIndex
  watcher: VaultWatcher
}

/** Everything that touches disk, and the one place the project or vault can be swapped. */
export class AppContext {
  private current: OpenVault | null = null
  private activeProject: Project | null = null
  private activeProfile: Profile | null = null
  readonly sync: SyncLoop
  readonly relay: Relay
  readonly terminals: Terminals

  private constructor(
    readonly store: ConfigStore,
    readonly home: string,
  ) {
    this.relay = new Relay()
    // The project folder while there is one; the home is only where you stand on first run,
    // when there is no project to stand in yet.
    this.terminals = new Terminals(() => this.session())
    this.sync = new SyncLoop({
      git: () => this.current?.git ?? null,
      config: () => this.config,
      author: () => this.activeProfile?.gitAuthor ?? null,
      onStatus: (status) => this.broadcast({ type: 'sync', status }),
    })
  }

  static async create(options: ContextOptions = {}): Promise<AppContext> {
    const home = options.home ?? motherHome()
    await mkdir(home, { recursive: true })

    // App state lives alongside the projects rather than inside one, so the choice of
    // project and vault survives switching between them.
    const store = new ConfigStore(path.join(home, 'config.json'), defaultConfig(null))
    await store.load()

    const context = new AppContext(store, home)
    context.activeProject = await resolveProject(store.config.project, home)
    await context.loadProfile()
    const vaultPath = await resolveVault(
      options.root,
      store.config.vaultPath,
      context.activeProject,
    )
    // Persist the resolution, or the open vault and the reported config disagree.
    if (
      vaultPath !== store.config.vaultPath ||
      context.activeProject?.name !== store.config.project
    )
      await store.save({
        ...store.config,
        project: context.activeProject?.name ?? null,
        vaultPath,
      })
    await context.useVault(vaultPath)
    return context
  }

  get config(): MotherConfig {
    return this.store.config
  }

  get project(): Project | null {
    return this.activeProject
  }

  get profile(): Profile | null {
    return this.activeProfile
  }

  /** Throws rather than returning null: a vault lives in a project, so nothing that reaches
   *  for one works without it. */
  get requireProject(): Project {
    if (!this.activeProject)
      throw new NoProjectError('no project yet — set one up before opening a vault')
    return this.activeProject
  }

  /** Throws rather than returning null: nothing that commits works without an identity. */
  get requireProfile(): Profile {
    if (!this.activeProfile)
      throw new NoProfileError('no profile yet — pick one for this project first')
    return this.activeProfile
  }

  /** Throws rather than returning null: every route that needs a vault needs a real one. */
  get open(): OpenVault {
    if (!this.current)
      throw new NoVaultError('no vault is open — create or choose one first')
    return this.current
  }

  get opened(): OpenVault | null {
    return this.current
  }

  broadcast(message: ServerMessage): void {
    this.relay.broadcast(message)
  }

  async setConfig(config: MotherConfig): Promise<MotherConfig> {
    const previous = this.config.vaultPath
    if (config.project !== this.config.project) {
      this.activeProject = await resolveProject(config.project, this.home)
      await this.loadProfile()
    }
    await this.store.save({ ...config, project: this.activeProject?.name ?? null })
    if (config.vaultPath !== previous) await this.useVault(config.vaultPath)
    return this.config
  }

  async listProjects(): Promise<Project[]> {
    return listProjects(this.home)
  }

  async addProject(name: string, profile: string): Promise<Project> {
    const project = await createProject(name, profile, this.home)
    await this.useProject(project)
    return project
  }

  async openProject(name: string): Promise<Project> {
    const project = await findProject(name, this.home)
    if (!project) throw new ProjectError(`no project named "${name}"`)
    await this.useProject(project)
    return project
  }

  /** Deleting the project you are in falls back the way startup does: whatever is left, or
   *  nothing, which is the first-run state again. */
  async removeProject(name: string): Promise<Project | null> {
    await deleteProject(name, this.home)
    if (this.activeProject?.name !== name) return this.activeProject

    const next = (await listProjects(this.home))[0] ?? null
    if (next) await this.useProject(next)
    else {
      this.activeProject = null
      await this.loadProfile()
      await this.store.save({ ...this.config, project: null, vaultPath: null })
      await this.useVault(null)
    }
    return this.activeProject
  }

  async listProfiles(): Promise<Profile[]> {
    return listProfiles(this.home)
  }

  /** A profile made from the project menu is one you meant to work as, so it is selected on
   *  the spot — unless there is no project yet, which is first run creating one next. */
  async addProfile(input: { name: string } & Identity): Promise<Profile> {
    const profile = await createProfile(input, this.home)
    if (this.activeProject) await this.useProfile(profile)
    return profile
  }

  async selectProfile(name: string): Promise<Project> {
    const profile = await findProfile(name, this.home)
    if (!profile) throw new ProfileError(`no profile named "${name}"`)
    await this.useProfile(profile)
    return this.requireProject
  }

  async setIdentity(identity: Identity): Promise<Profile> {
    this.activeProfile = await writeIdentity(this.requireProfile, identity)
    // The key the vault's git offers is fixed when the vault opens, so it has to be reopened
    // to pick up a changed one.
    await this.useVault(this.config.vaultPath)
    return this.activeProfile
  }

  /** Switching project switches vaults with it: a vault belongs to the project it sits in. */
  private async useProject(project: Project): Promise<void> {
    this.activeProject = project
    await this.loadProfile()
    const kept = inside(project.path, this.config.vaultPath)
      ? this.config.vaultPath
      : null
    const vaultPath = kept ?? (await listVaults(project.path))[0]?.path ?? null
    await this.store.save({ ...this.config, project: project.name, vaultPath })
    await this.useVault(vaultPath)
  }

  private async useProfile(profile: Profile): Promise<void> {
    this.activeProject = await setProjectProfile(this.requireProject, profile.name)
    this.activeProfile = profile
    await this.useVault(this.config.vaultPath)
  }

  /** A project names its profile; a name pointing at nothing is the same as naming none. */
  private async loadProfile(): Promise<void> {
    const name = this.activeProject?.profile
    this.activeProfile = name ? await findProfile(name, this.home) : null
  }

  private session(): TerminalSession {
    const claudeConfigDir = this.activeProfile?.claudeConfigDir
    return {
      cwd: this.activeProject?.path ?? this.home,
      env: claudeConfigDir ? { CLAUDE_CONFIG_DIR: expandHome(claudeConfigDir) } : {},
    }
  }

  /** Opens a vault, adopting the remote that the vault's own clone already points at. */
  async openVault(vaultPath: string): Promise<MotherConfig> {
    await this.useVault(vaultPath)
    const remoteUrl = (await this.current?.git.remoteUrl()) ?? null
    return this.store.save({
      ...this.config,
      vaultPath,
      ...(remoteUrl ? { remoteUrl, syncEnabled: true } : {}),
    })
  }

  start(): void {
    this.sync.start()
  }

  async close(): Promise<void> {
    this.sync.stop()
    this.relay.close()
    this.terminals.close()
    await this.current?.watcher.close()
  }

  private async useVault(vaultPath: string | null): Promise<void> {
    await this.current?.watcher.close()
    if (!vaultPath) {
      this.current = null
      return
    }
    await mkdir(vaultPath, { recursive: true })
    const vault = new Vault(vaultPath)
    const links = new LinkIndex(vault)
    await links.rebuild()
    this.current = {
      path: vaultPath,
      vault,
      links,
      git: new Git(vaultPath, this.activeProfile?.sshKeyPath ?? null),
      watcher: new VaultWatcher(vaultPath, (event) => this.onVaultEvent(event)),
    }
  }

  private onVaultEvent(event: VaultEvent): void {
    if (event.type !== 'moved') {
      if (event.type === 'removed') this.current?.links.forget(event.path)
      else void this.current?.links.update(event.path)
    }
    this.sync.noteEdit()
    this.broadcast({ type: 'vault', event })
  }
}

const exists = (target: string) =>
  stat(target).then(
    () => true,
    () => false,
  )

const inside = (dir: string, target: string | null): target is string =>
  !!target && (target === dir || target.startsWith(dir + path.sep))

/**
 * Whatever was active last, then the only other thing a folder in the home can mean — a
 * project someone dropped in by hand. Null is the first-run state: nothing is invented,
 * the web app asks where you work.
 */
async function resolveProject(
  remembered: string | null,
  home: string,
): Promise<Project | null> {
  const projects = await listProjects(home)
  return projects.find((project) => project.name === remembered) ?? projects[0] ?? null
}

/**
 * An explicit path always wins, then whatever was open last, then the first vault in the
 * project. Falling through to null is normal on first run — the web app shows the picker.
 */
async function resolveVault(
  root: string | undefined,
  remembered: string | null,
  project: Project | null,
): Promise<string | null> {
  const explicit = root ?? process.env.MOTHER_VAULT
  if (explicit) return path.resolve(explicit)
  if (remembered && (await exists(remembered))) return remembered
  if (!project) return null
  const vaults = await listVaults(project.path)
  return vaults[0]?.path ?? null
}
