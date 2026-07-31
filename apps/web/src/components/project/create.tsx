'use client'

import { useState, type FormEvent } from 'react'
import { basename, tilde, type NewProject, type ProjectGit } from '@broodmother/shared'
import { useApp } from '../../state'
import { RemoteField } from '../github'
import { Button, Choices, Modal, Select, type Choice } from '../ui'

/** What each choice gets you when the folder has to be made, in the order of how much git
 *  it is. A folder that is already there is linked as it stands and gets none of it. */
const GIT_CHOICES: Choice<ProjectGit>[] = [
  {
    value: 'none',
    label: 'No git',
    hint: 'A plain folder of code. No history and no branches. You can make it a repository later from a terminal.',
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

/** What a project is called when nothing is typed, in the placeholders that say so. */
const EXAMPLE = 'silly-little-api'

/** The last segment of a path typed with or without a trailing slash. */
const nameFrom = (repo: string) => basename(repo.trim().replace(/\/+$/, ''))

/**
 * A project is a repository these documents are about. This makes one where there is nothing
 * yet, with the same three amounts of git a vault is offered, and links a folder you already
 * have exactly as it stands without writing anything into it.
 */
export function CreateProject({
  onCreate,
  onClose,
}: {
  /** Resolves to the reason it failed, or null. */
  onCreate: (input: NewProject) => Promise<string | null>
  onClose: () => void
}) {
  const app = useApp()
  const [repo, setRepo] = useState('')
  const [name, setName] = useState('')
  const [vault, setVault] = useState(app.vault?.name ?? '')
  const [git, setGit] = useState<ProjectGit>('local')
  const [remoteUrl, setRemoteUrl] = useState('')
  const [branch, setBranch] = useState('main')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)

  // Typed over, or taken from the folder — a repository at `~/dev/api` is called `api`
  // unless you say otherwise.
  const called = name.trim() || nameFrom(repo)
  /** Where a folder nobody names is made, which is what the empty field stands for. */
  const home = () =>
    `${tilde(app.home || '~/.broodmother')}/.projects/${called || EXAMPLE}`

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setFailed(null)
    const reason = await onCreate({
      name: called,
      repo: repo.trim(),
      vault: vault || null,
      git,
      remoteUrl: git === 'remote' ? remoteUrl.trim() : null,
      branch: git === 'none' ? null : branch,
    })
    setBusy(false)
    if (reason) return setFailed(reason)
    onClose()
  }

  return (
    <Modal
      title="New project"
      description="A project is a repository these documents are about. broodmother reads it, opens branches of it in the vault, and runs your terminals in it."
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>cancel</Button>
          <Button
            form="new-project"
            disabled={busy || !called || (git === 'remote' && !remoteUrl.trim())}
          >
            {busy ? 'creating…' : 'create project'}
          </Button>
        </>
      }
    >
      <form id="new-project" className="fields" onSubmit={submit}>
        <label>
          Name
          <input
            value={name}
            autoFocus
            placeholder={nameFrom(repo) || EXAMPLE}
            onChange={(event) => {
              setName(event.target.value)
              setFailed(null)
            }}
            required
          />
        </label>
        <label>
          Folder
          <input
            value={repo}
            placeholder={home()}
            onChange={(event) => {
              setRepo(event.target.value)
              setFailed(null)
            }}
          />
        </label>
        <label>
          Vault
          <Select
            label="Vault"
            value={vault}
            options={app.vaults.map((one) => ({ value: one.name, label: one.name }))}
            onChange={setVault}
          />
        </label>
        <Choices
          legend="Git"
          name="project-git"
          value={git}
          options={GIT_CHOICES}
          onChange={setGit}
        />

        {git === 'remote' && (
          <RemoteField
            value={remoteUrl}
            onChange={setRemoteUrl}
            placeholder="git@github.com:you/api.git"
            suggested={called || 'api'}
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
    </Modal>
  )
}
