export interface GitSettings {
  enabled: boolean    // sync loop runs in this vault
  autoCommit: boolean // commit local edits automatically
  pull: boolean       // rebase before push
  push: boolean       // push after commit
  idleMs: number      // idle period before sync run
}

export interface GitAuthor {
  name: string  // name, as it appears in git config
  email: string // email, same thing
}

/** Read off the checkout, never stored — the repository is the truth about where it syncs. */
export interface GitState {
  repo: boolean            // false when vault is a plain folder
  remoteUrl: string | null // git remote URL, null when the repo has none
  branch: string | null    // null on checkout not on branch, or on vault with no repo
}

export const defaultGitSettings = (): GitSettings => ({
  enabled: false, autoCommit: true, pull: true, push: true, idleMs: 10_000 })
  