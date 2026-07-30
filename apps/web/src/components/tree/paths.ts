import type { VaultEntry, VaultPath } from '@broodmother/shared'

/** One visible line of the tree: an entry, and how deep the folders got to it. */
export interface Row {
  entry: VaultEntry
  depth: number
}

/** The vault root is the empty path, which is also what a top-level entry's parent is. */
export function parentOf(path: VaultPath): VaultPath {
  const cut = path.lastIndexOf('/')
  return cut === -1 ? '' : path.slice(0, cut)
}

/** Rows are forgiving targets: a folder takes the drop itself, and a file hands it to the
 *  folder it sits in — so a drag that lands a row low still goes where it was aimed. */
export function dropFolder(entry: VaultEntry): VaultPath {
  return entry.kind === 'dir' ? entry.path : parentOf(entry.path)
}

/** Moves that would do nothing, or cannot be done: into the folder it already sits in,
 *  onto itself, or into its own subtree — a folder cannot be moved inside itself. */
export function movable(from: VaultPath, folder: VaultPath): boolean {
  return folder !== parentOf(from) && folder !== from && !folder.startsWith(`${from}/`)
}

export function flatten(
  entries: VaultEntry[],
  expanded: Set<VaultPath>,
  depth = 0,
): Row[] {
  return entries.flatMap((entry) =>
    entry.kind === 'dir' && expanded.has(entry.path)
      ? [{ entry, depth }, ...flatten(entry.children, expanded, depth + 1)]
      : [{ entry, depth }],
  )
}

export function filePaths(entries: VaultEntry[]): VaultPath[] {
  return entries.flatMap((entry) =>
    entry.kind === 'dir' ? filePaths(entry.children) : [entry.path],
  )
}

/** What a path names, or null when the tree has not been told about it yet — a note just
 *  written is on disk a moment before it is in here. */
function entryAt(entries: VaultEntry[], path: VaultPath): VaultEntry | null {
  for (const entry of entries) {
    if (entry.path === path) return entry
    if (entry.kind === 'dir' && path.startsWith(`${entry.path}/`))
      return entryAt(entry.children, path)
  }
  return null
}

/** Where something asked for at `path` belongs: inside it when it names a folder, and
 *  beside it when it names a file. The vault root is the empty path, which is what a
 *  top-level entry answers. */
export function folderOf(entries: VaultEntry[], path: VaultPath): VaultPath {
  return entryAt(entries, path)?.kind === 'dir' ? path : parentOf(path)
}

/** What a new note is called before it is called anything, and the first number after it
 *  that the folder has not taken. A note is named by being renamed, so the only thing this
 *  has to get right is not landing on a name already there. */
export function untitledIn(entries: VaultEntry[], folder: VaultPath): VaultPath {
  const inside = folder ? entryAt(entries, folder) : null
  const here = folder ? (inside?.kind === 'dir' ? inside.children : []) : entries
  const taken = new Set(here.map((entry) => entry.name))
  let name = 'Untitled.md'
  for (let n = 2; taken.has(name); n++) name = `Untitled ${n}.md`
  return folder ? `${folder}/${name}` : name
}

/** Every folder on the way to a path, outermost first. */
export function ancestorsOf(path: VaultPath): VaultPath[] {
  const folders = path.split('/').slice(0, -1)
  return folders.map((_, index) => folders.slice(0, index + 1).join('/'))
}
