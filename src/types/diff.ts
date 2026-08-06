import type { DocPath } from './tree'

// What became of a path between the two branches.
export type DiffChange = 'added' | 'modified' | 'removed' | 'renamed'

// What the working tree has done to a path.
export type GitChange = DiffChange | 'conflicted'

// Every path a checkout has touched, and how.
export type TreeChanges = Record<DocPath, GitChange>

// 'now' compares to current state of other branch, 'split' compares them since divergence.
export type DiffBasis = 'now' | 'split'

// One path that differs between two branches, as they stand.
export interface DiffFile {
  path: DocPath // where it is on current branch
  change: DiffChange // diff change status
  from: DocPath | null // name on other branch, if renamed. null otherwise
}
