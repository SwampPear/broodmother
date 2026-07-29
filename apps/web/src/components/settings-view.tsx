'use client'

import { useEffect, useState } from 'react'
import type { Identity, MotherConfig } from '@mother/shared'
import { opalFrom } from '../colors'
import { useApp } from '../state'

type TestResult = { ok: boolean; message: string } | null

export function SettingsView() {
  const app = useApp()
  const [draft, setDraft] = useState<MotherConfig | null>(null)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [remoteResult, setRemoteResult] = useState<TestResult>(null)
  const [relayResult, setRelayResult] = useState<TestResult>(null)

  useEffect(() => setDraft(app.config), [app.config])
  useEffect(() => {
    if (app.profile)
      setIdentity({
        presenceColor: app.profile.presenceColor,
        gitAuthor: app.profile.gitAuthor,
        sshKeyPath: app.profile.sshKeyPath,
        claudeConfigDir: app.profile.claudeConfigDir,
      })
  }, [app.profile])

  if (!draft) return <div className="empty" />

  const set = <K extends keyof MotherConfig>(key: K, value: MotherConfig[K]) =>
    setDraft({ ...draft, [key]: value })

  const testRemote = async () =>
    setRemoteResult(
      await app.client.request('POST /api/config/test-remote', {
        remoteUrl: draft.remoteUrl ?? '',
        branch: draft.branch,
      }),
    )

  const testRelay = async () =>
    setRelayResult(
      await app.client.request('POST /api/config/test-relay', {
        relayUrl: draft.relayUrl ?? '',
      }),
    )

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

      {/* Both are settled when the vault is created and read from it afterwards: retyping
          them here would point mother at a folder it never cloned. */}
      <label>
        Vault path
        <input value={draft.vaultPath ?? ''} readOnly />
      </label>

      <label>
        Remote URL
        <input value={draft.remoteUrl ?? ''} readOnly />
      </label>

      <p className="hint">
        The vault folder and its remote belong to the vault. To work somewhere else, make
        a new project — its vaults live in its own folder.
      </p>

      <label>
        Branch
        <input
          value={draft.branch}
          onChange={(event) => set('branch', event.target.value)}
        />
      </label>

      <div className="row">
        <button type="button" onClick={() => void testRemote()}>
          test remote
        </button>
        {remoteResult && (
          <span className="result" data-ok={remoteResult.ok}>
            {remoteResult.ok ? 'ok' : 'failed'} · {remoteResult.message}
          </span>
        )}
      </div>

      <label className="check">
        <input
          type="checkbox"
          checked={draft.syncEnabled}
          onChange={(event) => set('syncEnabled', event.target.checked)}
        />
        Sync enabled
      </label>

      <label>
        Idle before sync (ms)
        <input
          type="number"
          value={draft.syncIdleMs}
          onChange={(event) => set('syncIdleMs', Number(event.target.value))}
        />
      </label>

      <label>
        Relay URL
        <input
          value={draft.relayUrl ?? ''}
          onChange={(event) => set('relayUrl', event.target.value || null)}
        />
      </label>

      <div className="row">
        <button type="button" onClick={() => void testRelay()}>
          test relay
        </button>
        {relayResult && (
          <span className="result" data-ok={relayResult.ok}>
            {relayResult.ok ? 'ok' : 'failed'} · {relayResult.message}
          </span>
        )}
      </div>

      <button type="submit">save</button>

      {identity && (
        <fieldset className="profile-settings">
          <legend>
            Profile · {app.profile?.name}
            {app.project ? ` · ${app.project.name}` : ''}
          </legend>
          <p className="hint">
            Who you commit and show up as in this project, and the credentials you do it
            with. It is stored in the profile's own file rather than in this machine's
            config, so editing it here changes it for every project that picked it.
          </p>

          <label>
            Presence color
            <select
              value={identity.presenceColor}
              onChange={(event) =>
                setIdentity({ ...identity, presenceColor: event.target.value })
              }
            >
              {opalFrom(app.profile?.presenceColor).map((color) => (
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
              value={identity.claudeConfigDir ?? ''}
              placeholder="~/.claude"
              onChange={(event) =>
                setIdentity({ ...identity, claudeConfigDir: event.target.value || null })
              }
            />
          </label>

          <p className="hint">
            The key git offers in this project's vaults, and the Claude login its
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
