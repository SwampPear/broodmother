'use client'

import { useState, type FormEvent } from 'react'
import { useApp } from '../state'

export function VaultPicker({ onClose }: { onClose?: () => void }) {
  const app = useApp()
  const [name, setName] = useState('')
  const [remoteUrl, setRemoteUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [busy, setBusy] = useState(false)

  const current = app.config?.vaultPath ?? null

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    await app.createVault({ name: name.trim(), remoteUrl: remoteUrl.trim(), branch })
    setBusy(false)
    setName('')
    setRemoteUrl('')
    onClose?.()
  }

  const open = async (path: string) => {
    await app.openVault(path)
    onClose?.()
  }

  return (
    <div className="vault-picker">
      <header>
        <h1>vaults</h1>
        <p>
          Every folder in <code>{app.vaultHome || '~/.mother'}</code> is a vault.
        </p>
      </header>

      {app.vaults.length > 0 ? (
        <ul className="vault-list">
          {app.vaults.map((vault) => (
            <li key={vault.path}>
              <button
                type="button"
                aria-current={vault.path === current}
                onClick={() => void open(vault.path)}
              >
                <span className="vault-name">{vault.name}</span>
                <span className="vault-path">{vault.path}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty-note">No vaults yet — create the first one below.</p>
      )}

      <form onSubmit={submit}>
        <h2>New vault</h2>
        <label>
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="proprium-docs"
            required
          />
        </label>
        <label>
          Git remote
          <input
            value={remoteUrl}
            onChange={(event) => setRemoteUrl(event.target.value)}
            placeholder="git@github.com:you/vault.git"
            required
          />
        </label>
        <label>
          Branch
          <input
            value={branch}
            onChange={(event) => setBranch(event.target.value)}
            required
          />
        </label>
        <p className="hint">
          The remote is checked before anything is written. An existing branch is cloned;
          an empty one is initialised and pushed on the first sync.
        </p>
        <div className="actions">
          <button type="submit" disabled={busy || !name.trim() || !remoteUrl.trim()}>
            {busy ? 'creating…' : 'create vault'}
          </button>
          {onClose && current && (
            <button type="button" onClick={onClose}>
              cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
