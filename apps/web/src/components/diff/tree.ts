import type { DiffChange, DiffFile, DocPath, TreeEntry } from '@/types'

/**
 * The tree a comparison draws: the paths that differ, and the folders on the way to them.
 * Built out of the difference rather than filtered out of the sidebar, because a file the
 * other branch has and this one does not is nowhere on disk to be filtered.
 */
export function entriesFor(files: DiffFile[]): TreeEntry[] {
  const roots: TreeEntry[] = []

  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    const parts = file.path.split('/').filter(Boolean)
    let level = roots
    for (const [depth, name] of parts.entries()) {
      const path = parts.slice(0, depth + 1).join('/')
      if (depth === parts.length - 1) {
        level.push({ kind: 'file', path, name, size: 0, modifiedAt: 0 })
        break
      }
      const found = level.find((entry) => entry.kind === 'dir' && entry.path === path)
      const folder: TreeEntry = found ?? { kind: 'dir', path, name, children: [] }
      if (!found) level.push(folder)
      level = folder.kind === 'dir' ? folder.children : level
    }
  }
  return sorted(roots)
}

/** Folders first, then by name — the order every other tree in the app is in. */
function sorted(entries: TreeEntry[]): TreeEntry[] {
  for (const entry of entries) if (entry.kind === 'dir') sorted(entry.children)
  return entries.sort((a, b) =>
    a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'dir' ? -1 : 1,
  )
}

/** What became of each path, for the rows to say so. */
export function changesOf(files: DiffFile[]): Record<DocPath, DiffChange> {
  return Object.fromEntries(files.map((file) => [file.path, file.change]))
}
