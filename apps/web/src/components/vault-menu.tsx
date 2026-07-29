'use client'

import { useState } from 'react'
import type { Profile, VaultSummary, Worktree } from '@broodmother/shared'
import { Icon } from './icons'
import { Menu, type MenuSection } from './menu'
import { Modal } from './modal'

const logo = <img className="logo" src="/logo.png" alt="" width={20} height={20} />

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'

/**
 * The head of the tree, and the only place a vault or a profile is chosen. Both live here
 * because they are one question asked twice: where you are working, and who you are while
 * you do it.
 */
export function VaultMenu({
  vaults,
  activePath,
  profiles,
  activeProfile,
  worktrees,
  activeWorktree,
  onSelect,
  onAdd,
  onDelete,
  onSelectProfile,
  onAddProfile,
  onSelectWorktree,
  onAddWorktree,
  onDeleteWorktree,
  onSettings,
}: {
  vaults: VaultSummary[]
  activePath: string
  profiles: Profile[]
  /** Name of the profile the open vault commits as, null until one is picked. */
  activeProfile: string | null
  worktrees: Worktree[]
  activeWorktree: string
  onSelect: (path: string) => void
  onAdd: () => void
  onDelete: (name: string) => void
  onSelectProfile: (name: string) => void
  onAddProfile: () => void
  onSelectWorktree: (name: string) => void
  onAddWorktree: () => void
  onDeleteWorktree: (name: string) => void
  onSettings: () => void
}) {
  const [open, setOpen] = useState(false)
  // Double-clicking a vault drills into what can be done to that one, in the same surface:
  // a menu that changed under you reads better than a second menu on top.
  const [options, setOptions] = useState<VaultSummary | null>(null)
  const [confirming, setConfirming] = useState<VaultSummary | null>(null)
  const [dropping, setDropping] = useState<Worktree | null>(null)

  const active = vaults.find((vault) => vault.path === activePath) ?? vaults[0]

  const close = () => {
    setOpen(false)
    setOptions(null)
  }

  const sections: MenuSection[] = options
    ? [
        {
          heading: options.name,
          actions: [
            {
              id: 'delete',
              label: 'Delete vault…',
              description: 'Its folder and everything in it',
              icon: 'x',
              danger: true,
              onSelect: () => {
                close()
                setConfirming(options)
              },
            },
          ],
        },
      ]
    : [
        {
          heading: 'Vaults',
          actions: vaults.map((vault) => ({
            id: vault.path,
            label: vault.name,
            description: vault.profile ?? 'no profile yet',
            selected: vault.path === active?.path,
            onSelect: () => {
              close()
              if (vault.path !== active?.path) onSelect(vault.path)
            },
            onSecondClick: () => setOptions(vault),
          })),
        },
        {
          // Where you are working inside the vault: `local` is the clone on the default
          // branch, and the rest are branches checked out beside it.
          heading: 'Worktree',
          actions: worktrees.map((worktree) => ({
            id: `worktree:${worktree.name}`,
            label: worktree.name,
            description: worktree.branch ?? 'no branch',
            selected: worktree.name === activeWorktree,
            onSelect: () => {
              close()
              if (worktree.name !== activeWorktree) onSelectWorktree(worktree.name)
            },
            // The clone is the repository the others point into, so it has nothing to drop.
            onSecondClick: worktree.primary ? undefined : () => setDropping(worktree),
          })),
        },
        {
          // A section with anything selected in it is a radio group, so the row that makes
          // a new profile sits below with the other things you can do, not among them.
          heading: 'Profile',
          actions: profiles.map((profile) => ({
            id: `profile:${profile.name}`,
            label: profile.name,
            description: profile.gitAuthor.email,
            badge: { text: initial(profile.name), color: profile.presenceColor },
            selected: profile.name === activeProfile,
            onSelect: () => {
              close()
              if (profile.name !== activeProfile) onSelectProfile(profile.name)
            },
          })),
        },
        {
          actions: [
            { id: 'add', label: 'New vault…', icon: 'plus', onSelect: onAdd },
            {
              id: 'new-worktree',
              label: 'New worktree…',
              icon: 'plus',
              onSelect: onAddWorktree,
            },
            {
              id: 'new-profile',
              label: 'New profile…',
              icon: 'plus',
              onSelect: onAddProfile,
            },
            { id: 'settings', label: 'Settings', icon: 'settings', onSelect: onSettings },
          ],
        },
      ]

  return (
    <div className="tree-head project">
      {active ? (
        <Menu
          label={options ? options.name : 'Vaults'}
          sections={sections}
          anchorClass="project-anchor"
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) setOptions(null)
          }}
        >
          {logo}
          <span className="name">{active.name}</span>
          {activeWorktree !== 'local' && (
            <span className="worktree-tag">{activeWorktree}</span>
          )}
          <Icon name="chevrons-up-down" />
        </Menu>
      ) : (
        logo
      )}

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
                  onDeleteWorktree(dropping.name)
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

      {confirming && (
        <Modal
          title={`Delete ${confirming.name}?`}
          description={`${confirming.path} and everything in it are removed from disk. Anything not pushed is gone with it.`}
          size="small"
          onClose={() => setConfirming(null)}
          footer={
            <>
              <button type="button" onClick={() => setConfirming(null)}>
                cancel
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  onDelete(confirming.name)
                  setConfirming(null)
                }}
              >
                delete vault
              </button>
            </>
          }
        >
          <p className="hint">
            A vault is a folder, so this is the folder going away — the git history inside
            it with everything else. What you pushed is still on the remote, and cloning
            it again makes the vault again. The profile it worked as is a file of its own
            and stays where it is.
          </p>
        </Modal>
      )}
    </div>
  )
}
