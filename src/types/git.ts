// General interface settings for git.
export interface GitSettings {
  enabled: boolean // sync loop runs in this vault
  autoCommit: boolean // commit local edits automatically
  pull: boolean // rebase before push
  push: boolean // push after commit
  idleMs: number // idle period before sync run
}

// Only identifier for git.
export interface GitAuthor {
  name: string // name, as it appears in git config
  email: string // email, also as it appears in git config
}

// Read off the checkout, never stored — the repository is the truth about where it syncs.
export interface GitState {
  repo: boolean // false when the checkout is a plain folder
  remoteUrl: string | null // git remote URL, null when the repo has none
  branch: string | null // null on checkout not on branch, or on a checkout with no repo
}

// Why a checkout can or cannot reach its remote.
export type AccessState = 'no-repo' | 'no-remote' | 'ok' | 'offline' | 'auth' | 'other'

export interface AccessCheck {
  state: AccessState
  remoteUrl: string | null
  message: string
}
