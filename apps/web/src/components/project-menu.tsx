'use client'

import { useState } from 'react'
import type { Profile, Project } from '@broodmother/shared'
import { Icon } from './icons'
import { Menu, type MenuSection } from './menu'
import { Modal } from './modal'

const logo = <img className="logo" src="/logo.png" alt="" width={20} height={20} />

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?'

/**
 * The head of the tree, and the only place a project or a profile is chosen. Both live here
 * because they are one question asked twice: where you are working, and who you are while
 * you do it.
 */
export function ProjectMenu({
  projects,
  activeName,
  profiles,
  activeProfile,
  onSelect,
  onAdd,
  onDelete,
  onSelectProfile,
  onAddProfile,
  onSettings,
}: {
  projects: Project[]
  activeName: string
  profiles: Profile[]
  /** Name of the profile the active project works as, null until one is picked. */
  activeProfile: string | null
  onSelect: (name: string) => void
  onAdd: () => void
  onDelete: (name: string) => void
  onSelectProfile: (name: string) => void
  onAddProfile: () => void
  onSettings: () => void
}) {
  const [open, setOpen] = useState(false)
  // Double-clicking a project drills into what can be done to that one, in the same
  // surface: a menu that changed under you reads better than a second menu on top.
  const [options, setOptions] = useState<Project | null>(null)
  const [confirming, setConfirming] = useState<Project | null>(null)

  const active = projects.find((project) => project.name === activeName) ?? projects[0]

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
              label: 'Delete project…',
              description: 'Its folder and every vault in it',
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
          heading: 'Projects',
          actions: projects.map((project) => ({
            id: project.name,
            label: project.name,
            description: project.profile ?? 'no profile yet',
            selected: project.name === active?.name,
            onSelect: () => {
              close()
              if (project.name !== active?.name) onSelect(project.name)
            },
            onSecondClick: () => setOptions(project),
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
            { id: 'add', label: 'Add a project…', icon: 'plus', onSelect: onAdd },
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
          label={options ? options.name : 'Projects'}
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
          <Icon name="chevrons-up-down" />
        </Menu>
      ) : (
        logo
      )}

      {confirming && (
        <Modal
          title={`Delete ${confirming.name}?`}
          description={`${confirming.path} and every vault inside it are removed from disk. Anything not pushed is gone with them.`}
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
                delete project
              </button>
            </>
          }
        >
          <p className="hint">
            A project is a folder, so this is the folder going away. Moving it out of your
            broodmother home by hand does the same thing without deleting anything. The
            profile it worked as is a file of its own and stays where it is.
          </p>
        </Modal>
      )}
    </div>
  )
}
