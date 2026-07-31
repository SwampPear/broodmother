'use client'

import { tilde } from '@broodmother/shared'
import { useApp } from '../../state'
import { GitSettingsSection } from './git'
import { Panel } from './layout'

/**
 * What the open vault is, and how it syncs. Nothing here is typed: where a vault lives and
 * who it commits as are settled when it is made and changed by making another or by picking
 * a profile, which are both gestures somewhere else. What is left to set is git.
 */
export function VaultPanel() {
  const app = useApp()

  if (!app.config) return null

  return (
    <Panel hint="Where you work. A folder of markdown in your broodmother home, with as much git behind it as you want.">
      <fieldset className="field-group">
        <legend>Where</legend>

        {/* Settled when the vault is created and read from it afterwards. Retyping it here
            would point broodmother at a folder it never made. */}
        <label>
          Folder
          <input value={tilde(app.config.vaultPath ?? '')} readOnly />
        </label>

        <label>
          Commits as
          <input value={app.vault?.profile ?? 'nobody yet'} readOnly />
        </label>

        <p className="hint">
          The folder is settled when the vault is made. To work somewhere else, make
          another vault. Every folder in your broodmother home is one.
        </p>
      </fieldset>

      <GitSettingsSection />
    </Panel>
  )
}
