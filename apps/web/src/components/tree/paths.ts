import type { DocPath, DocRef, DocRoot, TreeEntry } from '@broodmother/shared'

/** One tree the sidebar draws, and the name of the row that heads it — the vault's or the
 *  project's. Without one the entries stand on their own, with nothing to collapse into. */
export interface TreeRoot {
  root: DocRoot
  entries: TreeEntry[]
  label?: string
}

/** One visible line of the tree: an entry, which tree it is in, and how deep the folders
 *  got to it. */
export interface Row {
  entry: TreeEntry
  root: DocRoot
  depth: number
}

/** A path alone stopped being an address the moment there were two trees, so anything
 *  keyed by one is keyed by this. */
export const refKey = (ref: DocRef) => `${ref.root}:${ref.path}`

export const sameRef = (a: DocRef | null, b: DocRef | null) =>
  a !== null && b !== null && a.root === b.root && a.path === b.path

/** A tree's root is the empty path, which is also what a top-level entry's parent is. */
export function parentOf(path: DocPath): DocPath {
  const cut = path.lastIndexOf('/')
  return cut === -1 ? '' : path.slice(0, cut)
}

/** Rows are forgiving targets: a folder takes the drop itself, and a file hands it to the
 *  folder it sits in — so a drag that lands a row low still goes where it was aimed. */
export function dropFolder(entry: TreeEntry): DocPath {
  return entry.kind === 'dir' ? entry.path : parentOf(entry.path)
}

/**
 * Moves that would do nothing, or cannot be done: into the folder it already sits in, onto
 * itself, or into its own subtree — a folder cannot be moved inside itself. Crossing
 * between the vault and a project is refused too: that is a copy between two repositories,
 * and dragging a row is not how you would ask for one.
 */
export function movable(from: DocRef, to: DocRef): boolean {
  if (from.root !== to.root) return false
  return (
    to.path !== parentOf(from.path) &&
    to.path !== from.path &&
    !to.path.startsWith(`${from.path}/`)
  )
}

/** A tree's own row, which stands for the whole of it the way a folder stands for itself.
 *  Its path is the tree root, so what is created in it lands at the top. */
const rootEntry = (label: string, entries: TreeEntry[]): TreeEntry => ({
  kind: 'dir',
  path: '',
  name: label,
  children: entries,
})

export function flatten(roots: TreeRoot[], expanded: Set<string>): Row[] {
  return roots.flatMap(({ root, entries, label }) =>
    label === undefined
      ? walk(entries, root, expanded, 0)
      : walk([rootEntry(label, entries)], root, expanded, 0),
  )
}

function walk(
  entries: TreeEntry[],
  root: DocRoot,
  expanded: Set<string>,
  depth: number,
): Row[] {
  return entries.flatMap((entry) =>
    entry.kind === 'dir' && expanded.has(refKey({ root, path: entry.path }))
      ? [{ entry, root, depth }, ...walk(entry.children, root, expanded, depth + 1)]
      : [{ entry, root, depth }],
  )
}

/** Every file in every tree, as the addresses that name them. */
export function fileRefs(roots: TreeRoot[]): DocRef[] {
  const collect = (entries: TreeEntry[], root: DocRoot): DocRef[] =>
    entries.flatMap((entry) =>
      entry.kind === 'dir' ? collect(entry.children, root) : [{ root, path: entry.path }],
    )
  return roots.flatMap(({ root, entries }) => collect(entries, root))
}

/** What a path names, or null when the tree has not been told about it yet — a note just
 *  written is on disk a moment before it is in here. */
function entryAt(entries: TreeEntry[], path: DocPath): TreeEntry | null {
  for (const entry of entries) {
    if (entry.path === path) return entry
    if (entry.kind === 'dir' && path.startsWith(`${entry.path}/`))
      return entryAt(entry.children, path)
  }
  return null
}

/** Whether a path names a folder rather than a file, for the copy that has to say which. */
export function isFolder(entries: TreeEntry[], path: DocPath): boolean {
  return path === '' || entryAt(entries, path)?.kind === 'dir'
}

/** Where something asked for at `path` belongs: inside it when it names a folder, and
 *  beside it when it names a file. A tree's root is the empty path, which is what a
 *  top-level entry answers. */
export function folderOf(entries: TreeEntry[], path: DocPath): DocPath {
  if (path === '') return ''
  return entryAt(entries, path)?.kind === 'dir' ? path : parentOf(path)
}

/** What a new note is called before it is called anything, and the first number after it
 *  that the folder has not taken. A note is named by being renamed, so the only thing this
 *  has to get right is not landing on a name already there. */
export function untitledIn(entries: TreeEntry[], folder: DocPath): DocPath {
  const inside = folder ? entryAt(entries, folder) : null
  const here = folder ? (inside?.kind === 'dir' ? inside.children : []) : entries
  const taken = new Set(here.map((entry) => entry.name))
  let name = 'Untitled.md'
  for (let n = 2; taken.has(name); n++) name = `Untitled ${n}.md`
  return folder ? `${folder}/${name}` : name
}

/** Every folder on the way to a path, outermost first. */
export function ancestorsOf(path: DocPath): DocPath[] {
  const folders = path.split('/').slice(0, -1)
  return folders.map((_, index) => folders.slice(0, index + 1).join('/'))
}
