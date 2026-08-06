// The half of the device flow a browser has to answer: a short code, and where to type it.
export interface GithubDevice {
  /** Held by the app and sent back while waiting. Never shown — it is not what you type. */
  deviceCode: string // held by app and sent back while waiting
  userCode: string // auth code
  verificationUri: string
  intervalMs: number // how long GitHub asks to be left alone between asks
}

// A repository you can push to, as the picker needs it.
export interface GithubRepo {
  fullName: string
  cloneUrl: string
  private: boolean
  defaultBranch: string
}
