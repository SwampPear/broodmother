import type { BroodmotherConfig } from '../config/config'
import type { Worktree } from '../vault'

export interface GetWorktrees {
  request: null
  response: { worktrees: Worktree[]; active: string }
}

export interface PostWorktrees {
  request: { name: string; branch: string; create: boolean } // create cuts the branch fresh
  response: { worktree: Worktree; config: BroodmotherConfig }
}

export interface PostWorktreeOpen {
  request: { name: string }
  response: { config: BroodmotherConfig }
}

export interface DeleteWorktrees {
  request: { name: string }
  response: { worktrees: Worktree[]; config: BroodmotherConfig } // removing open falls back local
}
