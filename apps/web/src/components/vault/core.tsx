'use client'

import { useState, type FormEvent } from 'react'
import { tilde } from '@broodmother/shared'
import { useApp } from '../../state'
import { RemoteField } from '../github'
import { Button, Choices, Modal, type Choice } from '../ui'

type VaultGit = 'none' | 'local' | 'remote'

/** What each choice actually gets you, in the order of how much git it is. */
const GIT_CHOICES: Choice<VaultGit>[] = [
  {
    value: 'none',
    label: 'No git',
    hint: 'A plain folder of markdown. No history and no sync. You can make it a repository later from a terminal.',
  },
  {
    value: 'local',
    label: 'Git, no remote',
  },
  {
    value: 'remote',
    label: 'Git, remote',
    hint: 'The remote is checked before anything is written. An existing branch is cloned, and an empty one is started here and pushed on the first sync.',
  },
]

/**
 * Every folder in the broodmother home is a vault, so this both lists them and makes one.
 * It is always dismissable, including on a machine with no vaults at all: an empty app is
 * a state you are allowed to stand in, and making the first vault is the same gesture as
 * making the tenth — the selector at the head of the tree, or ⌘K.
 */
export function VaultPicker({ onClose }: { onClose: () => void }) {
  const app = useApp()
  const [name, setName] = useState('')
  const [git, setGit] = useState<VaultGit>('remote')
  const [remoteUrl, setRemoteUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)

  const current = app.config?.vaultPath ?? null
  // First run is having none, not being unable to dismiss: a home with vaults in it
  // that simply has none open is the picker, not an introduction.
  const first = app.vaults.length === 0

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
      title={first ? 'New vault' : 'Vaults'}
      description={
        first
          ? `A vault is where you work. It is a folder of markdown in ${tilde(app.home || '~/.broodmother')}, with git behind it if you want one.`
          : `Every folder in ${tilde(app.home || '~/.broodmother')} is a vault.`
      }
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>cancel</Button>
          <Button
            accent={accent}
            form="new-vault"
            disabled={busy || !name.trim() || (git === 'remote' && !remoteUrl.trim())}
          >
            {busy ? 'creating…' : 'create vault'}
          </Button>
        </>
      }
    >
      <div className="vault-picker">
        {app.vaults.length > 0 && (
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
        )}

        <form id="new-vault" className="fields" onSubmit={submit}>
          {/* Named here only where there is a list above to tell it apart from. On first
              run the modal's own title says it. */}
          {!first && <h2>New vault</h2>}
          <label>
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="handbook"
              required
            />
          </label>
          <Choices
            legend="Git"
            name="vault-git"
            value={git}
            options={GIT_CHOICES}
            onChange={setGit}
          />

          {git === 'remote' && (
            <RemoteField
              value={remoteUrl}
              onChange={setRemoteUrl}
              placeholder="git@github.com:you/vault.git"
              suggested={name.trim() || 'vault'}
            />
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
