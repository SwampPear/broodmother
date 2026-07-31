/** Which tree a path is in: the vault's markdown, or one of its projects' files. A vault
 *  has as many projects as its documents cover, so the root names which. */
export type DocRoot = 'vault' | `project:${string}`

export type DocPath = string

/** A path is only half an address now that there are many trees, so this is the whole one. */
export interface DocRef {
  root: DocRoot
  path: DocPath
}

export const projectRoot = (name: string): DocRoot => `project:${name}`

/** The project a root names, or null when it names the vault. */
export function projectOf(root: DocRoot): string | null {
  return root === 'vault' ? null : root.slice('project:'.length)
}

interface TreeFile {
  kind: 'file'
  path: DocPath
  name: string
  size: number
  modifiedAt: number
}

interface TreeDir {
  kind: 'dir'
  path: DocPath
  name: string
  children: TreeEntry[]
}

export type TreeEntry = TreeFile | TreeDir

export type TreeEvent =
  | { type: 'created'; path: DocPath }
  | { type: 'changed'; path: DocPath }
  | { type: 'removed'; path: DocPath }
  | { type: 'moved'; from: DocPath; to: DocPath }
