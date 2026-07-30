'use client'

import { useState } from 'react'
import type { Profile, VaultSummary } from '@broodmother/shared'
import { Icon, Menu, type MenuSection, Modal } from '../ui'

const logo = <img className="logo" src="/logo.png" alt="" width={20} height={20} />

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'

/**
 * Where the vault and the profile are chosen — one question asked twice: where you are
 * working, and who you are while you do it. It sits in the tab bar rather than above the
 * tree, because the top of the sidebar is the window's own row and belongs to nothing else.
 * The button wears both answers: the profile as its coloured initial, the vault by name.
 */
export function VaultMenu({
  vaults,
  activePath,
  profiles,
  activeProfile,
  onSelect,
  onAdd,
  onDelete,
  onSelectProfile,
  onAddProfile,
  onSettings,
}: {
  vaults: VaultSummary[]
  activePath: string
  profiles: Profile[]
  /** Name of the profile the open vault commits as, null until one is picked. */
  activeProfile: string | null
  onSelect: (path: string) => void
  onAdd: () => void
  onDelete: (name: string) => void
  onSelectProfile: (name: string) => void
  onAddProfile: () => void
  onSettings: () => void
}) {
  const [open, setOpen] = useState(false)
  // Double-clicking a vault drills into what can be done to that one, in the same surface:
  // a menu that changed under you reads better than a second menu on top.
  const [options, setOptions] = useState<VaultSummary | null>(null)
  const [confirming, setConfirming] = useState<VaultSummary | null>(null)

  const active = vaults.find((vault) => vault.path === activePath) ?? vaults[0]
  const profile = profiles.find((one) => one.name === activeProfile)

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
          // A section with anything selected in it is a radio group, so the row that makes
          // a new profile sits below with the other things you can do, not among them.
          heading: 'Profile',
          actions: profiles.map((profile) => ({
            id: `profile:${profile.name}`,
            label: profile.name,
            description: profile.gitAuthor.email,
            badge: { text: initial(profile.name), color: profile.color },
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
    <div className="vault-menu">
      {active ? (
        <Menu
          label={options ? options.name : 'Vaults'}
          // The button wears a vault and a profile, neither of which says what it opens.
          anchorLabel="Vault and profile"
          sections={sections}
          anchorClass="vault-anchor"
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) setOptions(null)
          }}
        >
          {profile ? (
            <span
              className="menu-badge"
              style={{ background: profile.color }}
              aria-hidden
            >
              {initial(profile.name)}
            </span>
          ) : (
            logo
          )}
          <span className="name">{active.name}</span>
          <Icon name="chevrons-up-down" />
        </Menu>
      ) : (
        logo
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
