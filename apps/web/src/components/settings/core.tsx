'use client'

import { useEffect, useState } from 'react'
import type { Identity, BroodmotherConfig } from '@broodmother/shared'
import { opalFrom } from '../../colors'
import { useApp } from '../../state'
import { GitSettingsFields } from './git'

export function SettingsView() {
  const app = useApp()
  const [draft, setDraft] = useState<BroodmotherConfig | null>(null)
  const [identity, setIdentity] = useState<Identity | null>(null)

  useEffect(() => setDraft(app.config), [app.config])
  useEffect(() => {
    if (app.profile)
      setIdentity({
        color: app.profile.color,
        gitAuthor: app.profile.gitAuthor,
        sshKeyPath: app.profile.sshKeyPath,
        claudeCfgDir: app.profile.claudeCfgDir,
      })
  }, [app.profile])

  if (!draft) return <div className="empty" />

  return (
    <form
      className="settings"
      onSubmit={(event) => {
        event.preventDefault()
        void app.saveConfig(draft)
      }}
    >
      <h1>Settings</h1>

      {app.configReset.length > 0 && (
        <p className="reset" role="alert">
          The config file was malformed. These fields were reset to defaults:{' '}
          {app.configReset.join(', ')}
        </p>
      )}

      {/* Settled when the vault is created and read from it afterwards: retyping it here
          would point broodmother at a folder it never made. */}
      <label>
        Vault path
        <input value={draft.vaultPath ?? ''} readOnly />
      </label>

      <p className="hint">
        The vault folder belongs to the vault. To work somewhere else, make another vault
        — every folder in your broodmother home is one.
      </p>

      <GitSettingsFields />

      <button type="submit">save</button>

      {identity && (
        <fieldset className="profile-settings">
          <legend>
            Profile · {app.profile?.name}
            {app.vault ? ` · ${app.vault.name}` : ''}
          </legend>
          <p className="hint">
            Who you commit and show up as in this vault, and the credentials you do it
            with. It is stored in the profile's own file rather than in this machine's
            config, so editing it here changes it for every vault that picked it.
          </p>

          <label>
            Presence color
            <select
              value={identity.color}
              onChange={(event) =>
                setIdentity({ ...identity, color: event.target.value })
              }
            >
              {opalFrom(app.profile?.color).map((color) => (
                <option key={color.hex} value={color.hex}>
                  opal {color.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Git author name
            <input
              value={identity.gitAuthor.name}
              onChange={(event) =>
                setIdentity({
                  ...identity,
                  gitAuthor: { ...identity.gitAuthor, name: event.target.value },
                })
              }
            />
          </label>

          <label>
            Git author email
            <input
              value={identity.gitAuthor.email}
              onChange={(event) =>
                setIdentity({
                  ...identity,
                  gitAuthor: { ...identity.gitAuthor, email: event.target.value },
                })
              }
            />
          </label>

          <label>
            SSH key
            <input
              value={identity.sshKeyPath ?? ''}
              placeholder="~/.ssh/id_ed25519"
              onChange={(event) =>
                setIdentity({ ...identity, sshKeyPath: event.target.value || null })
              }
            />
          </label>

          <label>
            Claude config directory
            <input
              value={identity.claudeCfgDir ?? ''}
              placeholder="~/.claude"
              onChange={(event) =>
                setIdentity({ ...identity, claudeCfgDir: event.target.value || null })
              }
            />
          </label>

          <p className="hint">
            The key git offers in this profile's vaults, and the Claude login their
            terminals run as. Left empty, git and Claude use their own defaults.
          </p>

          <button type="button" onClick={() => void app.saveIdentity(identity)}>
            save profile
          </button>
        </fieldset>
      )}
    </form>
  )
}
