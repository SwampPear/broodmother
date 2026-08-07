'use client'

import { useState, type ReactNode } from 'react'
import { useApp, type App } from '../../state'
import { Icon, type IconName } from '../ui'
import { LairPanel } from './lair'
import { ProfilePanel } from './profile'
import { ProjectPanel } from './project'
import { VaultPanel } from './vault'

interface Section {
  id: string
  label: string
  icon: IconName
  /** A section is about something you have open, so it is there only while you have it. */
  open: (app: App) => boolean
  panel: () => ReactNode
}

/** Who you are, where you work, what the work is about — and, when you have one, the
 *  server that works while you are away. */
const SECTIONS: Section[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: 'user',
    open: (app) => Boolean(app.profile),
    panel: ProfilePanel,
  },
  {
    id: 'server',
    label: 'Server',
    icon: 'antenna',
    open: (app) => Boolean(app.profile),
    panel: LairPanel,
  },
  {
    id: 'vault',
    label: 'Vault',
    icon: 'layout-dashboard',
    open: (app) => Boolean(app.vault),
    panel: VaultPanel,
  },
  {
    id: 'project',
    label: 'Project',
    icon: 'folder',
    open: (app) => Boolean(app.project),
    panel: ProjectPanel,
  },
]

export function SettingsView() {
  const app = useApp()
  const [open, setOpen] = useState(SECTIONS[0].id)

  const sections = SECTIONS.filter((section) => section.open(app))
  // Closing a project while its settings are up leaves the rail without the row you were
  // on, so what is shown falls back to the first rather than to nothing.
  const current = sections.find((section) => section.id === open) ?? sections[0]
  if (!current) return <div className="empty" />
  const Panel = current.panel

  return (
    <div className="settings">
      <h1>Settings</h1>

      <div className="settings-nav" role="tablist" aria-label="Settings sections">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            aria-selected={section.id === current.id}
            aria-controls="settings-panel"
            onClick={() => setOpen(section.id)}
          >
            <Icon name={section.icon} />
            {section.label}
          </button>
        ))}
      </div>

      <div className="settings-main">
        {app.configReset.length > 0 && (
          <p className="reset" role="alert">
            The config file was malformed. These fields were reset to defaults:{' '}
            {app.configReset.join(', ')}
          </p>
        )}

        <div id="settings-panel" role="tabpanel" aria-label={current.label}>
          <Panel />
        </div>
      </div>
    </div>
  )
}
