'use client'

import type { VaultPath } from '@broodmother/shared'
import { ContextMenu } from './context-menu'
import { Icon, displayName, iconFor } from './icons'
import { Menu, type MenuAction, type MenuSection } from './menu'
import { TERMINALS, type TerminalKind } from './terminal-kinds'

export type Tab =
  | { id: string; kind: 'doc'; path: VaultPath }
  | { id: string; kind: 'terminal'; shell: TerminalKind }

/** What the plus offers: a place in the vault, or one of the shells. */
export type NewTab = 'note' | TerminalKind

export const docTab = (path: VaultPath): Tab => ({ id: `doc:${path}`, kind: 'doc', path })

const name = (tab: Tab) =>
  tab.kind === 'terminal'
    ? TERMINALS[tab.shell].name
    : displayName(tab.path.slice(tab.path.lastIndexOf('/') + 1))

const icon = (tab: Tab) =>
  tab.kind === 'terminal' ? TERMINALS[tab.shell].icon : iconFor(tab.path)

const NEW: (Omit<MenuAction, 'onSelect' | 'id'> & { id: NewTab })[] = [
  { id: 'note', label: 'New note', icon: 'plus' },
  { id: 'shell', label: 'Terminal', icon: 'terminal' },
  { id: 'claude', label: 'Claude Code', icon: 'claude' },
]

/**
 * What is open, across the top. A document tab is a place in the vault and the URL follows
 * it; a terminal tab is a running shell that takes the whole pane, which is why the strip
 * holds both — a terminal you can only have at the bottom of the window is a panel, not a
 * thing you work in.
 */
export function TabStrip({
  tabs,
  activeId,
  onPick,
  onClose,
  onNew,
  onRename,
  onCloseMany,
}: {
  tabs: Tab[]
  /** Null while the route is showing something no tab stands for, like settings. */
  activeId: string | null
  onPick: (tab: Tab) => void
  onClose: (tab: Tab) => void
  onNew: (what: NewTab) => void
  /** A tab is a document, so renaming one renames the file it stands for. */
  onRename: (tab: Tab) => void
  onCloseMany: (tabs: Tab[]) => void
}) {
  /**
   * What a right click on a tab offers. Closing is about the strip; renaming is about the
   * document, because a tab has no name of its own to change — it wears the file's.
   */
  const menuFor = (tab: Tab, index: number): MenuSection[] => {
    const rightward = tabs.slice(index + 1)
    const others = tabs.filter((one) => one.id !== tab.id)
    return [
      {
        actions: [
          ...(tab.kind === 'doc'
            ? [
                {
                  id: 'rename',
                  // No ellipsis: the name is typed on the row in the tree, and nothing
                  // opens to ask for it.
                  label: 'Rename',
                  description: 'the file this tab stands for',
                  onSelect: () => onRename(tab),
                },
              ]
            : []),
          { id: 'close', label: 'Close', onSelect: () => onClose(tab) },
        ],
      },
      {
        actions: [
          {
            id: 'close-right',
            label: 'Close to the right',
            disabled: rightward.length === 0,
            onSelect: () => onCloseMany(rightward),
          },
          {
            id: 'close-others',
            label: 'Close others',
            disabled: others.length === 0,
            onSelect: () => onCloseMany(others),
          },
          {
            id: 'close-all',
            label: 'Close all',
            danger: true,
            onSelect: () => onCloseMany(tabs),
          },
        ],
      },
    ]
  }

  return (
    <div className="tabs" role="tablist" aria-label="Open tabs">
      {tabs.map((tab, index) => (
        <ContextMenu key={tab.id} label={name(tab)} sections={menuFor(tab, index)}>
          <div
            className="tab"
            role="tab"
            tabIndex={0}
            aria-selected={tab.id === activeId}
            data-active={tab.id === activeId || undefined}
            data-shell={tab.kind === 'terminal' ? tab.shell : undefined}
            onClick={() => onPick(tab)}
            onKeyDown={(event) => event.key === 'Enter' && onPick(tab)}
            // Middle click closes, the way every other tab strip does.
            onAuxClick={(event) => event.button === 1 && onClose(tab)}
          >
            <Icon name={icon(tab)} />
            <span className="tab-name">{name(tab)}</span>
            <button
              type="button"
              className="tab-close"
              aria-label={`Close ${name(tab)}`}
              onClick={(event) => {
                event.stopPropagation()
                onClose(tab)
              }}
            >
              <Icon name="x" />
            </button>
          </div>
        </ContextMenu>
      ))}
      {/* The same menu the tree opens on a right click, for the one gesture that has no row
          to sit on: what a new tab could be. */}
      <Menu
        label="New tab"
        anchorLabel="New tab"
        anchorClass="tab-new"
        sections={[
          {
            actions: NEW.map((action) => ({
              ...action,
              onSelect: () => onNew(action.id),
            })),
          },
        ]}
      >
        <Icon name="plus" />
      </Menu>
    </div>
  )
}
