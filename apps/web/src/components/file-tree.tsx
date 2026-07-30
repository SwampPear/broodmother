'use client'

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import type { VaultEntry, VaultPath } from '@broodmother/shared'
import { ContextMenu } from './context-menu'
import { Icon, displayName, fileTag, iconFor } from './icons'
import type { MenuSection } from './menu'

export type TreeCommand = 'create' | 'move' | 'delete'

/** How long a shut folder waits under a drag before it opens on its own. Finder's
 *  spring-loaded folders: the way into a subfolder is to hover over the folder above it,
 *  rather than to drop, expand, and pick the file up again. */
const SPRING_MS = 600

interface Row {
  entry: VaultEntry
  depth: number
}

/** The vault root is the empty path, which is also what a top-level entry's parent is. */
function parentOf(path: VaultPath): VaultPath {
  const cut = path.lastIndexOf('/')
  return cut === -1 ? '' : path.slice(0, cut)
}

function basename(path: VaultPath): string {
  return path.slice(path.lastIndexOf('/') + 1)
}

/** Rows are forgiving targets: a folder takes the drop itself, and a file hands it to the
 *  folder it sits in — so a drag that lands a row low still goes where it was aimed. */
function dropFolder(entry: VaultEntry): VaultPath {
  return entry.kind === 'dir' ? entry.path : parentOf(entry.path)
}

/** Moves that would do nothing, or cannot be done: into the folder it already sits in,
 *  onto itself, or into its own subtree — a folder cannot be moved inside itself. */
function movable(from: VaultPath, folder: VaultPath): boolean {
  return folder !== parentOf(from) && folder !== from && !folder.startsWith(`${from}/`)
}

function flatten(entries: VaultEntry[], expanded: Set<VaultPath>, depth = 0): Row[] {
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
function ancestorsOf(path: VaultPath): VaultPath[] {
  const folders = path.split('/').slice(0, -1)
  return folders.map((_, index) => folders.slice(0, index + 1).join('/'))
}

/**
 * The row, typed into where it sits. Only the basename is in the field, because only the
 * basename is what the row ever showed — the extension is the tag beside it, and it comes
 * back on the way out rather than being something to type around.
 */
function RenameRow({
  entry,
  onDone,
}: {
  entry: VaultEntry
  onDone: (name: string | null) => void
}) {
  const shown = entry.kind === 'file' ? displayName(entry.name) : entry.name
  const extension = entry.name.slice(shown.length)
  const [value, setValue] = useState(shown)
  const input = useRef<HTMLInputElement>(null)
  // Enter commits and then blurs, and the blur must not commit a second time; Escape
  // abandons and must not have the blur put it back.
  const settled = useRef(false)

  useEffect(() => {
    input.current?.focus()
    input.current?.select()
    input.current?.scrollIntoView({ block: 'nearest' })
  }, [])

  const finish = (name: string | null) => {
    if (settled.current) return
    settled.current = true
    onDone(name)
  }

  return (
    <input
      ref={input}
      className="name rename"
      aria-label={`Rename ${entry.name}`}
      spellCheck={false}
      autoComplete="off"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      // The row underneath opens a document on a click and runs single-letter commands on
      // a keypress. Neither is what typing a name means.
      onClick={(event) => event.stopPropagation()}
      onBlur={() => finish(value.trim() ? `${value.trim()}${extension}` : null)}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter')
          finish(value.trim() ? `${value.trim()}${extension}` : null)
        else if (event.key === 'Escape') finish(null)
      }}
    />
  )
}

export function FileTree({
  entries,
  current,
  head,
  onOpen,
  onCommand,
  onMove,
  renaming,
  onRename,
}: {
  entries: VaultEntry[]
  current: VaultPath | null
  head?: ReactNode
  onOpen: (path: VaultPath) => void
  onCommand: (command: TreeCommand, path: VaultPath) => void
  onMove: (from: VaultPath, to: VaultPath) => void
  /** The row waiting to be named — a note just created, which is nothing until it is. */
  renaming: VaultPath | null
  /** The filename typed into that row, or null if it was abandoned. The row closes either
   *  way; whether anything moves is the caller's to decide. */
  onRename: (path: VaultPath, name: string | null) => void
}) {
  const [expanded, setExpanded] = useState<Set<VaultPath>>(new Set())
  const [cursor, setCursor] = useState(0)
  // What is in the hand, and the folder that would take it — the root being the empty
  // path, so `null` is the one value that means nothing is a target.
  const [dragging, setDragging] = useState<VaultPath | null>(null)
  const [target, setTarget] = useState<VaultPath | null>(null)
  const spring = useRef<{ path: VaultPath; timer: ReturnType<typeof setTimeout> } | null>(
    null,
  )
  const rows = flatten(entries, expanded)
  const row = rows[Math.min(cursor, rows.length - 1)]

  const toggle = (path: VaultPath, open: boolean) =>
    setExpanded((previous) => {
      const next = new Set(previous)
      if (open) next.add(path)
      else next.delete(path)
      return next
    })

  const activate = (going: Row) => {
    if (going.entry.kind === 'dir')
      toggle(going.entry.path, !expanded.has(going.entry.path))
    else onOpen(going.entry.path)
  }

  const cancelSpring = () => {
    if (spring.current) clearTimeout(spring.current.timer)
    spring.current = null
  }

  // A drag can end anywhere, including outside the window, and a timer left running would
  // open a folder under nobody's pointer.
  useEffect(() => cancelSpring, [])

  // A row cannot be typed into while the folder holding it is shut, and a note made from
  // the menu of a folder you had not opened lands in exactly that place.
  useEffect(() => {
    if (renaming === null) return
    setExpanded((previous) => new Set([...previous, ...ancestorsOf(renaming)]))
  }, [renaming])

  /** Arms, keeps, or drops the timer that opens the folder being hovered. Called on every
   *  drag-over, so moving off a folder is what disarms it. */
  const armSpring = (entry: VaultEntry) => {
    const shut =
      entry.kind === 'dir' && !expanded.has(entry.path) && entry.path !== dragging
    if (!shut) return cancelSpring()
    if (spring.current?.path === entry.path) return
    cancelSpring()
    spring.current = {
      path: entry.path,
      timer: setTimeout(() => {
        spring.current = null
        toggle(entry.path, true)
      }, SPRING_MS),
    }
  }

  const endDrag = () => {
    cancelSpring()
    setDragging(null)
    setTarget(null)
  }

  /** Claims a drag for `folder`, or refuses it. The browser allows a drop only where the
   *  default was prevented, so refusing is simply declining to do that. */
  const claim = (event: DragEvent, from: VaultPath, folder: VaultPath) => {
    if (!movable(from, folder)) return setTarget(null)
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setTarget(folder)
  }

  const overRow = (event: DragEvent, entry: VaultEntry) => {
    if (dragging === null) return
    // The list under these rows is the root target; a row that has the pointer is the one
    // that answers for it.
    event.stopPropagation()
    armSpring(entry)
    claim(event, dragging, dropFolder(entry))
  }

  const drop = (event: DragEvent, folder: VaultPath) => {
    event.preventDefault()
    event.stopPropagation()
    // The state is what a same-window drag carries; the transfer is what survives one that
    // started somewhere else, and it is the only reading either way that is guaranteed.
    const from = dragging ?? event.dataTransfer.getData('text/plain')
    endDrag()
    if (!from || !movable(from, folder)) return
    onMove(from, folder ? `${folder}/${basename(from)}` : basename(from))
  }

  // The same three commands the keys run, for the hand that reached for the mouse.
  const menuFor = (path: VaultPath): MenuSection[] => [
    {
      actions: [
        {
          id: 'create',
          label: 'New note here',
          icon: 'plus',
          onSelect: () => onCommand('create', path),
        },
        {
          id: 'move',
          label: 'Rename or move…',
          icon: 'file-text',
          onSelect: () => onCommand('move', path),
        },
        {
          id: 'delete',
          label: 'Delete…',
          icon: 'x',
          danger: true,
          onSelect: () => onCommand('delete', path),
        },
      ],
    },
  ]

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (!row) return
    const keys: Record<string, () => void> = {
      ArrowDown: () => setCursor(Math.min(cursor + 1, rows.length - 1)),
      ArrowUp: () => setCursor(Math.max(cursor - 1, 0)),
      ArrowRight: () => row.entry.kind === 'dir' && toggle(row.entry.path, true),
      ArrowLeft: () => row.entry.kind === 'dir' && toggle(row.entry.path, false),
      Enter: () => activate(row),
      n: () => onCommand('create', row.entry.path),
      r: () => onCommand('move', row.entry.path),
      d: () => onCommand('delete', row.entry.path),
    }
    const handler = keys[event.key]
    if (!handler) return
    event.preventDefault()
    handler()
  }

  return (
    <nav className="tree" aria-label="vault">
      {head}
      <ul
        role="tree"
        tabIndex={0}
        onKeyDown={onKeyDown}
        // Whatever the rows leave over is the vault root: a drag that lands between them,
        // or below the last one, is how something comes back out of a folder.
        data-drop={target === '' || undefined}
        onDragOver={(event) => dragging !== null && claim(event, dragging, '')}
        onDrop={(event) => drop(event, '')}
        // A drag-leave also fires stepping from a row onto one of its own spans, so only a
        // pointer that has actually left the list clears the target.
        onDragLeave={(event) => {
          const to = event.relatedTarget
          if (to instanceof Node && event.currentTarget.contains(to)) return
          cancelSpring()
          setTarget(null)
        }}
      >
        {rows.map(({ entry, depth }, index) => (
          <ContextMenu key={entry.path} label={entry.name} sections={menuFor(entry.path)}>
            <li
              role="treeitem"
              // The row shows a basename and a separate extension tag; assistive tech gets
              // the filename whole rather than the two glued together.
              aria-label={entry.name}
              aria-selected={entry.path === current}
              aria-expanded={entry.kind === 'dir' ? expanded.has(entry.path) : undefined}
              data-cursor={index === Math.min(cursor, rows.length - 1) || undefined}
              data-tint={depth % 6}
              data-dragging={entry.path === dragging || undefined}
              data-drop={entry.path === target || undefined}
              // Selecting the text of a name being typed is not picking the row up.
              draggable={entry.path !== renaming}
              onClick={() => {
                setCursor(index)
                activate({ entry, depth })
              }}
              onContextMenu={() => setCursor(index)}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move'
                // A path is the one thing every other place that takes a drop can use —
                // a terminal, an editor, the field of a rename.
                event.dataTransfer.setData('text/plain', entry.path)
                setDragging(entry.path)
              }}
              onDragOver={(event) => overRow(event, entry)}
              onDrop={(event) => drop(event, dropFolder(entry))}
              onDragEnd={endDrag}
            >
              {Array.from({ length: depth }, (_, level) => (
                <span key={level} className="indent" data-tint={level % 6} aria-hidden />
              ))}
              {entry.kind === 'dir' ? (
                <Icon
                  name={expanded.has(entry.path) ? 'chevron-down' : 'chevron-right'}
                />
              ) : (
                <Icon name={iconFor(entry.path)} />
              )}
              {entry.path === renaming ? (
                <RenameRow entry={entry} onDone={(name) => onRename(entry.path, name)} />
              ) : (
                <>
                  <span className="name">
                    {entry.kind === 'file' ? displayName(entry.name) : entry.name}
                  </span>
                  {entry.kind === 'file' && fileTag(entry.name) && (
                    <span className="tag">{fileTag(entry.name)}</span>
                  )}
                </>
              )}
            </li>
          </ContextMenu>
        ))}
      </ul>
    </nav>
  )
}
