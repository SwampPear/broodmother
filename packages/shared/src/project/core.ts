/** How much git a project that has to be made gets, the same three a vault is offered. */
export type ProjectGit = 'none' | 'local' | 'remote'

/**
 * A project to make and link. The folder is only ever created when it is not there yet: a
 * repository you already have is linked exactly as it stands, whatever `git` says.
 */
export interface NewProject {
  name: string
  /** Where the folder is, or is to be made. Empty makes it in the broodmother home. */
  repo: string
  /** The vault it belongs to. The open one when it is not named. */
  vault?: string | null
  git?: ProjectGit
  /** Required for `remote`, ignored otherwise. */
  remoteUrl?: string | null
  /** The branch to clone or to start on. Ignored for `none`. */
  branch?: string | null
}

/**
 * A repository the vault's documents are about, linked by path rather than owned: it was
 * yours before broodmother heard of it, and unlinking one leaves it exactly where it is.
 * A vault has as many as its documents cover; a project belongs to the one vault.
 */
export interface ProjectSummary {
  name: string
  /** Absolute path to the repository itself, which is also its primary checkout. */
  repo: string
  /** The folder is gone. Listed anyway — a project you moved is worth saying so about. */
  missing: boolean
}
