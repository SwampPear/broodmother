'use client'

import type { DocRef, DocRoot, GitChange, TreeEntry } from '@broodmother/shared'
import {
  ContextMenu,
  displayName,
  FileIcon,
  fileTag,
  Icon,
  type MenuSection,
} from '../ui'
import { RenameRow } from './rename'
import { dropFolder, sameRef } from './paths'
import { type TreeDrag } from './drag'

export type TreeCommand =
  'create' | 'create-folder' | 'rename' | 'delete' | 'delete-project'

// The same commands the keys run, named after what the row is: a menu that says
// `Delete folder…` over a folder has already answered what it is about to take. Rename opens
// no dialog — the row becomes the field.
function menuFor(
  ref: DocRef,
  entry: TreeEntry,
  onCommand: (command: TreeCommand, ref: DocRef) => void,
  root: boolean,
): MenuSection[] {
  const folder = entry.kind === 'dir'
  const what = folder ? 'folder' : 'note'
  // The project's own row stands for a repository, which has no name of its own to type
  // here. It lives in the vault, so the one thing this row can do to it is take the whole
  // thing away. The vault's row has not even that: it goes from the menu at the head of
  // the tree, which is where it is switched and made.
  const ofRoot =
    ref.root === 'vault'
      ? []
      : [
          {
            id: 'delete-project',
            label: 'Delete project…',
            description: 'The repository and all of its history',
            icon: 'x' as const,
            danger: true,
            onSelect: () => onCommand('delete-project', ref),
          },
        ]
  return [
    {
      actions: [
        // Somewhere to put one is a folder. On a file the row is the note, and the only
        // things worth offering are the two that act on it.
        ...(folder
          ? [
              {
                id: 'create',
                label: 'New note here',
                icon: 'plus' as const,
                onSelect: () => onCommand('create', ref),
              },
              {
                id: 'create-folder',
                label: 'New folder here',
                icon: 'plus' as const,
                onSelect: () => onCommand('create-folder', ref),
              },
            ]
          : []),
        ...(root
          ? ofRoot
          : [
              {
                id: 'rename',
                label: `Rename ${what}`,
                icon: 'file-text' as const,
                onSelect: () => onCommand('rename', ref),
              },
              {
                id: 'delete',
                label: `Delete ${what}…`,
                icon: 'x' as const,
                danger: true,
                onSelect: () => onCommand('delete', ref),
              },
            ]),
      ],
    },
  ]
}

/** The letter VS Code puts at the end of a row, and git puts in front of a path. */
const LETTER: Record<GitChange, string> = {
  added: 'A',
  modified: 'M',
  removed: 'D',
  renamed: 'R',
  conflicted: 'C',
}

export function TreeRow({
  entry,
  root,
  scoped,
  depth,
  change,
  holds,
  count,
  expanded,
  selected,
  cursor,
  renaming,
  drag,
  onActivate,
  onFocus,
  onCommand,
  onRename,
}: {
  entry: TreeEntry
  root: DocRoot
  /** In the tree the app is working in, which is the one the tabs and the branches are
   *  about. */
  scoped: boolean
  depth: number
  /** What git says about this path: what the checkout has done to it, or — while the tree
   *  is a comparison between two branches — what the two disagree about. */
  change: GitChange | null
  /** A folder with changes somewhere inside it, marked the way VS Code marks one. */
  holds: boolean
  /** On a tree's own row: how many paths its checkout has touched. */
  count: number
  expanded: boolean
  selected: boolean
  cursor: boolean
  renaming: boolean
  drag: TreeDrag
  onActivate: () => void
  onFocus: () => void
  onCommand: (command: TreeCommand, ref: DocRef) => void
  onRename: (name: string | null) => void
}) {
  const ref: DocRef = { root, path: entry.path }
  // A tree's root has no path, so the one row wearing the empty one is the tree itself —
  // the vault, or one of its projects.
  const isRoot = entry.path === ''

  return (
    <ContextMenu label={entry.name} sections={menuFor(ref, entry, onCommand, isRoot)}>
      <li
        role="treeitem"
        // The row shows basename and extension apart; assistive tech gets the name whole.
        aria-label={entry.name}
        aria-selected={selected}
        aria-expanded={entry.kind === 'dir' ? expanded : undefined}
        data-cursor={cursor || undefined}
        data-root={isRoot || undefined}
        data-scoped={scoped || undefined}
        data-tint={depth % 6}
        data-change={change ?? undefined}
        data-holds={holds || undefined}
        data-dragging={sameRef(ref, drag.dragging) || undefined}
        data-drop={sameRef(ref, drag.target) || undefined}
        draggable={!renaming && !isRoot}
        onClick={() => {
          onFocus()
          onActivate()
        }}
        // The pane behind the rows has a menu of its own. A row that has been right-clicked
        // has answered the question, so the event stops here rather than opening both.
        onContextMenu={(event) => {
          event.stopPropagation()
          onFocus()
        }}
        onDragStart={(event) => drag.start(event, ref)}
        onDragOver={(event) => drag.overRow(event, root, entry)}
        onDrop={(event) => drag.drop(event, { root, path: dropFolder(entry) })}
        onDragEnd={drag.end}
      >
        {Array.from({ length: depth }, (_, level) => (
          <span key={level} className="indent" data-tint={level % 6} aria-hidden />
        ))}
        {entry.kind === 'dir' ? (
          <Icon name={expanded ? 'chevron-down' : 'chevron-right'} />
        ) : (
          <FileIcon path={entry.path} />
        )}
        {renaming ? (
          <RenameRow entry={entry} onDone={onRename} />
        ) : (
          <>
            <span className="name">
              {entry.kind === 'file' ? displayName(entry.name) : entry.name}
            </span>
            {/* A vault and a repository look like any other folder in a sidebar of them,
                and clicking one moves the whole app. The same pill a file wears for its
                extension says which folders those are. */}
            {isRoot && (
              <span className="tag">{root === 'vault' ? 'vault' : 'project'}</span>
            )}
            {/* The tree's own row counts its changes, the way VS Code's SCM badge does;
                the folders under it wear a dot for the same fact. */}
            {isRoot && count > 0 && (
              <span className="change-count" title={`${count} changed`}>
                {count}
              </span>
            )}
            {change ? (
              <span className="change" title={change}>
                {LETTER[change]}
              </span>
            ) : holds && !isRoot ? (
              <span className="change change-dot" title="changes inside" aria-hidden>
                •
              </span>
            ) : (
              entry.kind === 'file' &&
              fileTag(entry.name) && <span className="tag">{fileTag(entry.name)}</span>
            )}
          </>
        )}
      </li>
    </ContextMenu>
  )
}
