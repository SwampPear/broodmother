'use client'

import { useState, type CSSProperties, type FormEvent } from 'react'
import { useApp } from '../state'
import { Modal } from './modal'

/**
 * Every folder in the project is a vault, so this both lists them and makes one. It is the
 * whole app until a vault is open — a modal with no way out — and the same surface reached
 * from ⌘K afterwards, where it can be dismissed.
 */
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

  // The colour picked at setup follows you here: same flow, same button.
  const accent = app.profile?.presenceColor

  return (
    <Modal
      title="Vaults"
      description={`Every folder in ${app.vaultHome || '~/.mother'} is a vault.`}
      onClose={onClose}
      footer={
        <>
          {onClose && (
            <button type="button" onClick={onClose}>
              cancel
            </button>
          )}
          <button
            type="submit"
            form="new-vault"
            style={accent ? ({ '--accent': accent } as CSSProperties) : undefined}
            disabled={busy || !name.trim() || !remoteUrl.trim()}
          >
            {busy ? 'creating…' : 'create vault'}
          </button>
        </>
      }
    >
      <div className="vault-picker">
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

        <form id="new-vault" className="fields" onSubmit={submit}>
          <h2>New vault</h2>
          <label>
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="handbook"
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
            The remote is checked before anything is written. An existing branch is
            cloned; an empty one is initialised and pushed on the first sync.
          </p>
        </form>
      </div>
    </Modal>
  )
}
