'use client'

import { useState, type CSSProperties, type FormEvent } from 'react'
import type { Profile } from '@mother/shared'
import { Modal } from './modal'

/**
 * Name it, say who you are in it, and it exists on disk.
 *
 * The same modal is first run: with no `onClose` there is no cancel, no escape and no
 * click-away, because an app with no project has nowhere to put a vault. The profile is
 * chosen here rather than assumed — the same identity does not fit every project.
 */
export function AddProject({
  existing,
  profiles,
  defaultProfile,
  home,
  onCreate,
  onClose,
}: {
  existing: string[]
  profiles: Profile[]
  defaultProfile?: string | null
  /** The mother home, named in the first-run copy so the folder is not a surprise. */
  home?: string
  onCreate: (input: { name: string; profile: string }) => void
  onClose?: () => void
}) {
  const [name, setName] = useState('')
  const [profile, setProfile] = useState(defaultProfile ?? profiles[0]?.name ?? '')
  const [error, setError] = useState('')
  const first = !onClose

  const accent = profiles.find((one) => one.name === profile)?.presenceColor

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (existing.some((taken) => taken.toLowerCase() === trimmed.toLowerCase()))
      return setError(`A project named ${trimmed} already exists.`)
    if (trimmed.startsWith('.') || /[/\\]/.test(trimmed))
      return setError(
        'The name becomes a folder, so it cannot be a path or start with a dot.',
      )
    onCreate({ name: trimmed, profile })
  }

  return (
    <Modal
      title={first ? 'Your first project' : 'Add a project'}
      description={
        first
          ? `A project is where your vaults live: a folder in ${home || '~/.mother'}, working as one of your profiles.`
          : 'A project is a folder in your mother home, and its vaults live inside it. Switching project switches to that project’s vaults.'
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
            form="add-project"
            style={accent ? ({ '--accent': accent } as CSSProperties) : undefined}
            disabled={!name.trim() || !profile}
          >
            {first ? 'create project' : 'add project'}
          </button>
        </>
      }
    >
      <form id="add-project" className="fields" onSubmit={submit}>
        <label>
          Project name
          <input
            value={name}
            autoFocus
            onChange={(event) => {
              setName(event.target.value)
              setError('')
            }}
            placeholder="acme"
            required
          />
        </label>

        <label>
          Profile
          <select value={profile} onChange={(event) => setProfile(event.target.value)}>
            {profiles.map((one) => (
              <option key={one.name} value={one.name}>
                {one.name} · {one.gitAuthor.email}
              </option>
            ))}
          </select>
        </label>

        <p className="hint">
          The project commits and shows up as this profile, and its terminals run with
          that profile’s credentials. You can change it later from the project menu.
        </p>

        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
