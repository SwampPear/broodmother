'use client'

import { useState } from 'react'
import type { Worktree } from '@broodmother/shared'
import { Icon } from './icons'
import { Menu, type MenuSection } from './menu'
import { Modal } from './modal'

/**
 * Which checkout you are working in, at the end of the tab bar. It sits here rather than in
 * the vault menu because it belongs to the tabs beside it: switching changes what those tabs
 * are, and a control that changes the row it is in should be in that row.
 */
export function WorktreeMenu({
  worktrees,
  active,
  onSelect,
  onAdd,
  onDelete,
}: {
  worktrees: Worktree[]
  active: string
  onSelect: (name: string) => void
  onAdd: () => void
  onDelete: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [dropping, setDropping] = useState<Worktree | null>(null)

  const current = worktrees.find((one) => one.name === active)
  const close = () => setOpen(false)

  const sections: MenuSection[] = [
    {
      heading: 'Worktree',
      actions: worktrees.map((worktree) => ({
        id: worktree.name,
        label: worktree.name,
        description: worktree.branch ?? 'no branch',
        selected: worktree.name === active,
        onSelect: () => {
          close()
          if (worktree.name !== active) onSelect(worktree.name)
        },
        // The clone is the repository the others point into, so it has nothing to drop.
        onSecondClick: worktree.primary ? undefined : () => setDropping(worktree),
      })),
    },
    {
      actions: [{ id: 'add', label: 'New worktree…', icon: 'plus', onSelect: onAdd }],
    },
  ]

  return (
    <div className="worktree-menu">
      <Menu
        label="Worktree"
        // The button wears a branch name, which says nothing about what it does.
        anchorLabel="Worktree"
        sections={sections}
        anchorClass="worktree-anchor"
        open={open}
        onOpenChange={setOpen}
      >
        <Icon name="branch" />
        <span className="name">{current?.branch ?? active}</span>
        <Icon name="chevrons-up-down" />
      </Menu>

      {dropping && (
        <Modal
          title={`Remove ${dropping.name}?`}
          description={`${dropping.path} is removed from disk and from git's list of worktrees.`}
          size="small"
          onClose={() => setDropping(null)}
          footer={
            <>
              <button type="button" onClick={() => setDropping(null)}>
                cancel
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  onDelete(dropping.name)
                  setDropping(null)
                }}
              >
                remove worktree
              </button>
            </>
          }
        >
          <p className="hint">
            The branch <strong>{dropping.branch ?? 'it is on'}</strong> is not deleted —
            it stays in the repository and can be checked out again. Work that has not
            been committed in this folder is not anywhere else, and git will refuse rather
            than throw it away.
          </p>
        </Modal>
      )}
    </div>
  )
}
