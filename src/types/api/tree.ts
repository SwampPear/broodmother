import type { TreeChanges } from '../diff'
import type { TreeEntry } from '../tree'

// Every tree in one answer: they are drawn as one sidebar and change together. Each
//  project the vault links is here whether or not it is the one you are working in — the
//  sidebar is how you switch, so it has to be able to draw what you would switch to.
//  What git says each checkout has touched rides along, so the tree and the state it is
// decorated with are one snapshot rather than two answers that can disagree.
export interface GetTree {
  request: null
  response: {
    vault: TreeEntry[]
    vaultChanges: TreeChanges
    projects: { name: string; entries: TreeEntry[]; changes: TreeChanges }[]
  }
}
