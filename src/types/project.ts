/** How much git a project gets, the same three a vault is offered. */
export type ProjectGit = 'none' | 'local' | 'remote'

/** A project to make. Where it goes is not asked: a project is a folder inside its vault. */
export interface NewProject {
  name: string
  /** The vault it belongs to. The open one when it is not named. */
  vault?: string | null
  git?: ProjectGit
  /** Required for `remote`, ignored otherwise. */
  remoteUrl?: string | null
  /** The branch to clone or to start on. Ignored for `none`. */
  branch?: string | null
}

/**
 * A repository the vault's documents are about. It lives inside the vault, so it goes where
 * the vault goes and deleting it is deleting the repository. A vault has as many as its
 * documents cover; a project belongs to the one vault.
 */
export interface ProjectSummary {
  name: string
  /** Absolute path to the repository itself, which is also its primary checkout. */
  repo: string
}
