'use client'

import { useEffect, useState } from 'react'
import type { MotherConfig } from '@mother/shared'
import { opal } from '../colors'
import { useApp } from '../state'

type TestResult = { ok: boolean; message: string } | null

export function SettingsView() {
  const app = useApp()
  const [draft, setDraft] = useState<MotherConfig | null>(null)
  const [remoteResult, setRemoteResult] = useState<TestResult>(null)
  const [relayResult, setRelayResult] = useState<TestResult>(null)

  useEffect(() => setDraft(app.config), [app.config])

  if (!draft) return <div className="empty">loading settings…</div>

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

      <label>
        Vault path
        <input
          value={draft.vaultPath}
          onChange={(event) => set('vaultPath', event.target.value)}
        />
      </label>

      <label>
        Remote URL
        <input
          value={draft.remoteUrl ?? ''}
          onChange={(event) => set('remoteUrl', event.target.value || null)}
        />
      </label>

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

      <label>
        Display name
        <input
          value={draft.displayName}
          onChange={(event) => set('displayName', event.target.value)}
        />
      </label>

      <label>
        Presence color
        <select
          value={draft.presenceColor}
          onChange={(event) => set('presenceColor', event.target.value)}
        >
          {opal.map((color) => (
            <option key={color.hex} value={color.hex}>
              opal {color.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Git author name
        <input
          value={draft.gitAuthor.name}
          onChange={(event) =>
            set('gitAuthor', { ...draft.gitAuthor, name: event.target.value })
          }
        />
      </label>

      <label>
        Git author email
        <input
          value={draft.gitAuthor.email}
          onChange={(event) =>
            set('gitAuthor', { ...draft.gitAuthor, email: event.target.value })
          }
        />
      </label>

      <button type="submit">save</button>
    </form>
  )
}
