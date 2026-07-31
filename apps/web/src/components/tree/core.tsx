'use client'

import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { DocRef, DocRoot } from '@broodmother/shared'
import { ContextMenu, type MenuSection } from '../ui'
import { ancestorsOf, flatten, refKey, sameRef, type Row, type TreeRoot } from './paths'
import { type TreeCommand, TreeRow } from './row'
import { useTreeDrag } from './drag'

export type { TreeCommand }

/** The top of the vault: what the rows leave over, and where anything asked for from the
 *  empty part of the pane lands. */
const VAULT_TOP: DocRef = { root: 'vault', path: '' }

/**
 * The sidebar: the vault's documents, and under them the files of every project it links.
 * All of them drawn as one tree, because that is what they are to work in — the notes about
 * the thing and the things themselves.
 *
 * It is also where you switch between them. Touching any row hands its root up as the scope,
 * so the tabs, the branch selector and the next shell are about the tree you just clicked
 * in. Clicking is the whole gesture; there is no separate control that says where you are.
 */
export function FileTree({
  roots,
  current,
  scope,
  head,
  onOpen,
  onOpenFolder,
  onScope,
  onCommand,
  onCreateProject,
  onMove,
  renaming,
  onRename,
}: {
  roots: TreeRoot[]
  current: DocRef | null
  /** The root the app is standing in, so its rows can say so. */
  scope: DocRoot
  head?: ReactNode
  onOpen: (ref: DocRef) => void
  /** A folder was selected. It has no document to show, so the pane goes blank. */
  onOpenFolder: (ref: DocRef) => void
  /** The root a row belongs to, raised on every touch of one. */
  onScope: (root: DocRoot) => void
  onCommand: (command: TreeCommand, ref: DocRef) => void
  onCreateProject: () => void
  onMove: (root: DocRoot, from: string, to: string) => void
  /** The row waiting to be named — a note just created, which is nothing until it is. */
  renaming: DocRef | null
  /** The filename typed into that row, or null if it was abandoned. The row closes either
   *  way; whether anything moves is the caller's to decide. */
  onRename: (ref: DocRef, name: string | null) => void
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [cursor, setCursor] = useState(0)

  const rows = flatten(roots, expanded)
  const at = Math.min(cursor, rows.length - 1)
  const row = rows[at]

  function toggle(ref: DocRef, open: boolean) {
    setExpanded((previous) => {
      const next = new Set(previous)
      if (open) next.add(refKey(ref))
      else next.delete(refKey(ref))
      return next
    })
  }

  const drag = useTreeDrag({
    expanded,
    onExpand: (ref) => toggle(ref, true),
    onMove,
  })

  // Where you clicked is where you are working, whether the row opens a document, a folder
  // or a whole repository. Raised before the row acts, so what the click opens lands in the
  // scope it belongs to rather than in the one you were leaving.
  function activate(going: Row) {
    const ref = { root: going.root, path: going.entry.path }
    onScope(going.root)
    if (going.entry.kind !== 'dir') return onOpen(ref)
    toggle(ref, !expanded.has(refKey(ref)))
    onOpenFolder(ref)
  }

  // A row cannot be typed into while the folder holding it is shut.
  useEffect(() => {
    if (renaming === null) return
    setExpanded(
      (previous) =>
        new Set([
          ...previous,
          ...ancestorsOf(renaming.path).map((path) =>
            refKey({ root: renaming.root, path }),
          ),
        ]),
    )
    // The whole ref matters, and an object identity would rerun this every render.
  }, [renaming?.root, renaming?.path])

  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    if (!row) return
    const ref: DocRef = { root: row.root, path: row.entry.path }
    const keys: Record<string, () => void> = {
      ArrowDown: () => setCursor(Math.min(cursor + 1, rows.length - 1)),
      ArrowUp: () => setCursor(Math.max(cursor - 1, 0)),
      ArrowRight: () => row.entry.kind === 'dir' && toggle(ref, true),
      ArrowLeft: () => row.entry.kind === 'dir' && toggle(ref, false),
      Enter: () => activate(row),
      n: () => onCommand('create', ref),
      r: () => onCommand('rename', ref),
      d: () => onCommand('delete', ref),
    }
    const handler = keys[event.key]
    if (!handler) return
    event.preventDefault()
    handler()
  }

  // What the pane behind the rows offers, which is what a row offers minus everything that
  // needs a row: the top of the vault is somewhere to put things, not something to rename.
  // A project goes here for the same reason a note does — it is the part of the sidebar that
  // belongs to no row, and linking a repository is a sidebar act now that switching between
  // them is one.
  const paneMenu: MenuSection[] = [
    {
      actions: [
        {
          id: 'new-note',
          label: 'New note',
          icon: 'plus',
          onSelect: () => onCommand('create', VAULT_TOP),
        },
        {
          id: 'new-project',
          label: 'New project…',
          icon: 'plus',
          onSelect: onCreateProject,
        },
      ],
    },
  ]

  return (
    <nav className="tree" aria-label="vault">
      {head}
      <ContextMenu label="Vault" sections={paneMenu}>
        <ul
          role="tree"
          tabIndex={0}
          onKeyDown={onKeyDown}
          // Whatever the rows leave over is the vault's root, which is how a file comes back
          // out of a folder. A project's root is a row of its own, so it is not this.
          data-drop={
            drag.target?.root === 'vault' && drag.target.path === '' ? true : undefined
          }
          onDragOver={drag.overRoot}
          onDrop={(event) => drag.drop(event, VAULT_TOP)}
          onDragLeave={drag.leaveList}
        >
          {rows.map(({ entry, root, depth }, index) => {
            const ref: DocRef = { root, path: entry.path }
            return (
              <TreeRow
                key={refKey(ref)}
                entry={entry}
                root={root}
                scoped={root === scope}
                depth={depth}
                expanded={expanded.has(refKey(ref))}
                selected={sameRef(ref, current)}
                cursor={index === at}
                renaming={sameRef(ref, renaming)}
                drag={drag}
                onActivate={() => activate({ entry, root, depth })}
                onFocus={() => setCursor(index)}
                onCommand={onCommand}
                onRename={(name) => onRename(ref, name)}
              />
            )
          })}
        </ul>
      </ContextMenu>
    </nav>
  )
}
