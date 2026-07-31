'use client'

import { useState } from 'react'
import type { Profile, VaultSummary } from '@broodmother/shared'
import { Confirm, Icon, Menu, type MenuSection } from '../ui'

const logo = <img className="logo" src="/logo.png" alt="" width={20} height={20} />

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'

/** The row a second gesture drilled into, and what can be done to it. */
interface Drilled {
  vault: VaultSummary
}

/**
 * The head of the tree: which vault you are in, and who you are while you work in it. Which
 * project inside it is not asked here — the sidebar lists them all and clicking one is how
 * you go there, so a second list saying the same thing would be a second answer to a
 * question already on screen. Neither is the branch, which is one control at the end of the
 * tab bar.
 */
export function VaultMenu({
  vaults,
  activePath,
  activeProject,
  profiles,
  activeProfile,
  open,
  onOpenChange,
  onSelect,
  onAdd,
  onDelete,
  onCreateProject,
  onSelectProfile,
  onAddProfile,
  onSettings,
}: {
  vaults: VaultSummary[]
  activePath: string
  /** Name of the project the scope is in, null when it is the vault. Named beside the vault
   *  rather than chosen here. */
  activeProject: string | null
  profiles: Profile[]
  /** Name of the profile you are working as, whose vaults these are. Null until one is
   *  picked, which is only ever a first run. */
  activeProfile: string | null
  /** Controlled, because ⌘K asks for this menu too — `Switch vault` is this list, not a
   *  second surface that does the same thing. */
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (path: string) => void
  onAdd: () => void
  onDelete: (name: string) => void
  onCreateProject: () => void
  onSelectProfile: (name: string) => void
  onAddProfile: () => void
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
          description: 'Its folder and everything in it',
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
          // A section with anything selected in it is a radio group, so the rows that make
          // a new one sit below with the other things you can do, not among them.
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
              id: 'link-project',
              label: 'New project…',
              icon: 'plus',
              onSelect: onCreateProject,
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
