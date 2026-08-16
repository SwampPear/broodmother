'use client'

import { useState } from 'react'
import type { VaultSummary } from '@broodmother/shared'
import { Confirm, Icon, Menu, type MenuSection } from '../ui'

const logo = <img className="logo" src="/logo.png" alt="" width={20} height={20} />

/** The row a second gesture drilled into, and what can be done to it. */
interface Drilled {
  vault: VaultSummary
}

/**
 * The head of the tree: which vault you are in. Which project inside it is not asked here
 * — the sidebar lists them all and clicking one is how you go there, so a second list
 * saying the same thing would be a second answer to a question already on screen. Neither
 * is the branch, which is one control at the end of the tab bar, nor the profile, which
 * reads from the foot of the same sidebar.
 */
export function VaultMenu({
  vaults,
  activePath,
  activeProject,
  open,
  onOpenChange,
  onSelect,
  onAdd,
  onDelete,
  onCreateProject,
  onSettings,
}: {
  vaults: VaultSummary[]
  activePath: string
  /** Name of the project the scope is in, null when it is the vault. Named beside the vault
   *  rather than chosen here. */
  activeProject: string | null
  /** Controlled, because ⌘K asks for this menu too — `Switch vault` is this list, not a
   *  second surface that does the same thing. */
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (path: string) => void
  onAdd: () => void
  onDelete: (name: string) => void
  onCreateProject: () => void
  onSettings: () => void
}) {
  // Double-clicking a row drills into what can be done to that one, in the same surface:
  // a menu that changed under you reads better than a second menu on top.
  const [options, setOptions] = useState<Drilled | null>(null)
  const [confirming, setConfirming] = useState<Drilled | null>(null)

  const active = vaults.find((vault) => vault.path === activePath) ?? vaults[0]

  const close = () => {
    onOpenChange(false)
    setOptions(null)
  }

  const drilled = (into: Drilled): MenuSection[] => [
    {
      heading: into.vault.name,
      actions: [
        {
          id: 'delete',
          label: 'Delete vault…',
          icon: 'x',
          danger: true,
          onSelect: () => {
            close()
            setConfirming(into)
          },
        },
      ],
    },
  ]

  const vaultSection: MenuSection = {
    heading: 'Vaults',
    // No profile on the rows: these are the folders in one profile's folder, and the
    // section below says which profile that is.
    actions: vaults.map((vault) => ({
      id: vault.path,
      label: vault.name,
      selected: vault.path === active?.path,
      onSelect: () => {
        close()
        if (vault.path !== active?.path) onSelect(vault.path)
      },
      onSecondClick: () => setOptions({ vault }),
    })),
  }

  const sections: MenuSection[] = options
    ? drilled(options)
    : [
        // A heading over a list with nothing in it is noise. On a machine with no vault the
        // menu is the rows that make one, which is the whole point of it opening there.
        ...(vaults.length > 0 ? [vaultSection] : []),
        {
          actions: [
            { id: 'add', label: 'New vault…', icon: 'plus', onSelect: onAdd },
            {
              id: 'link-project',
              label: 'New project…',
              icon: 'plus',
              onSelect: onCreateProject,
            },
            { id: 'settings', label: 'Settings', icon: 'settings', onSelect: onSettings },
          ],
        },
      ]

  const label = options ? options.vault.name : 'Where you work'

  return (
    <div className="tree-head vault">
      {/* Opens whether or not there is a vault to name. A machine with none is where you
          most need the row that makes one, and hiding the menu until one exists is what
          made the first vault a gate instead of a choice. */}
      <Menu
        label={label}
        sections={sections}
        anchorClass="vault-anchor"
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next)
          if (!next) setOptions(null)
        }}
      >
        {logo}
        <span className="name">{active?.name ?? 'No vault'}</span>
        {/* The project is where the work is, so it is named beside the vault rather than
            found by opening the menu that would change it. */}
        {activeProject && <span className="in-project">{activeProject}</span>}
        <Icon name="chevrons-up-down" />
      </Menu>

      {confirming && (
        <Confirm
          title={`Delete ${confirming.vault.name}?`}
          description={`${confirming.vault.path} and everything in it are removed from disk. Anything not pushed is gone with it.`}
          action="delete vault"
          onConfirm={() => onDelete(confirming.vault.name)}
          onClose={() => setConfirming(null)}
        >
          A vault is a folder, so this is the folder going away — the git history inside
          it with everything else, and every project that was in it. What you pushed is
          still on the remote, and cloning it again makes the vault again. The profile it
          worked as is the folder around it and stays where it is.
        </Confirm>
      )}
    </div>
  )
}
