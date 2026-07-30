'use client'

import { useState, type CSSProperties, type FormEvent } from 'react'
import { useApp } from '../../state'
import { Modal } from '../ui'

type VaultGit = 'none' | 'local' | 'remote'

/** What each choice actually gets you, in the order of how much git it is. */
const GIT_CHOICES: { value: VaultGit; label: string; hint: string }[] = [
  {
    value: 'none',
    label: 'No git',
    hint: 'A plain folder of markdown. No history, no sync — you can make it a repository later from a terminal.',
  },
  {
    value: 'local',
    label: 'Git, no remote',
    hint: 'A repository on this machine: history and worktrees, nothing pushed anywhere.',
  },
  {
    value: 'remote',
    label: 'Git with a remote',
    hint: 'The remote is checked before anything is written. An existing branch is cloned; an empty one is initialised and pushed on the first sync.',
  },
]

/**
 * Every folder in the broodmother home is a vault, so this both lists them and makes one. It
 * is the whole app until a vault is open — a modal with no way out — and the same surface
 * reached from ⌘K afterwards, where it can be dismissed.
 */
export function VaultPicker({ onClose }: { onClose?: () => void }) {
  const app = useApp()
  const [name, setName] = useState('')
  const [git, setGit] = useState<VaultGit>('remote')
  const [remoteUrl, setRemoteUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)

  const current = app.config?.vaultPath ?? null
  // First run is having none, not being unable to dismiss: a home with vaults in it that
  // simply has none open is the picker, not an introduction.
  const first = app.vaults.length === 0
  const chosen = GIT_CHOICES.find((choice) => choice.value === git)!

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setFailed(null)
    // A remote is proven reachable before anything is written, so this is where an
    // unreachable one is found out — and where it has to be said.
    const reason = await app.createVault({
      name: name.trim(),
      git,
      remoteUrl: git === 'remote' ? remoteUrl.trim() : null,
      branch: git === 'none' ? null : branch,
    })
    setBusy(false)
    if (reason) return setFailed(reason)
    setName('')
    setRemoteUrl('')
    onClose?.()
  }

  const open = async (path: string) => {
    await app.openVault(path)
    onClose?.()
  }

  // The colour picked at setup follows you here: same flow, same button.
  const accent = app.profile?.color

  return (
    <Modal
      title={first ? 'Your first vault' : 'Vaults'}
      description={
        first
          ? `A vault is where you work: a folder of markdown in ${app.home || '~/.broodmother'}, with git behind it if you want one.`
          : `Every folder in ${app.home || '~/.broodmother'} is a vault.`
      }
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
            disabled={busy || !name.trim() || (git === 'remote' && !remoteUrl.trim())}
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
          {app.profile && (
            <p className="hint">
              It commits and shows up as <strong>{app.profile.name}</strong>, and its
              terminals run with that profile&rsquo;s credentials. You can change it later
              from the vault menu.
            </p>
          )}
          <label>
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="handbook"
              required
            />
          </label>
          <fieldset className="git-choice">
            <legend>Git</legend>
            {GIT_CHOICES.map((choice) => (
              <label key={choice.value} className="check">
                <input
                  type="radio"
                  name="vault-git"
                  value={choice.value}
                  checked={git === choice.value}
                  onChange={() => setGit(choice.value)}
                />
                {choice.label}
              </label>
            ))}
          </fieldset>

          {git === 'remote' && (
            <label>
              Git remote
              <input
                value={remoteUrl}
                onChange={(event) => setRemoteUrl(event.target.value)}
                placeholder="git@github.com:you/vault.git"
                required
              />
            </label>
          )}
          {git !== 'none' && (
            <label>
              Branch
              <input
                value={branch}
                onChange={(event) => setBranch(event.target.value)}
                required
              />
            </label>
          )}
          <p className="hint">{chosen.hint}</p>

          {failed && (
            <p className="field-error" role="alert">
              {failed}
            </p>
          )}
        </form>
      </div>
    </Modal>
  )
}
