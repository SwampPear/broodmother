import type { TreeEntry } from '../tree'

/** Every tree in one answer: they are drawn as one sidebar and change together. Each
 *  project the vault links is here whether or not it is the one you are working in — the
 *  sidebar is how you switch, so it has to be able to draw what you would switch to. */
export interface GetTree {
  request: null
  response: {
    vault: TreeEntry[]
    projects: { name: string; entries: TreeEntry[] }[]
  }
}
