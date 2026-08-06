import type { GitSettings } from '@/types'

export function defaultGitSettings(): GitSettings {
  return {
    enabled: false,
    autoCommit: true,
    pull: true,
    push: true,
    idleMs: 10_000,
  }
}
