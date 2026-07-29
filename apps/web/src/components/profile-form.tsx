'use client'

import { useEffect, useState, type FormEvent } from 'react'
import type { Identity, Profile } from '@broodmother/shared'
import { opal, opalFrom } from '../colors'

export interface ProfileDraft extends Identity {
  name: string
}

/** What the caller's chrome needs from a form it does not own: whether the submit button
 *  is live, and the colour it is being asked to wear. */
export interface ProfileFormState {
  ready: boolean
  presenceColor: string
}

/**
 * The fields a profile is made of: who you commit as, the colour you are shown in, and
 * the credentials you work with. The submit button lives with the caller's chrome and
 * reaches the form through `form={id}`.
 */
export function ProfileForm({
  id,
  existing,
  onSubmit,
  onState,
}: {
  id: string
  existing: Profile[]
  onSubmit: (draft: ProfileDraft) => void
  /** The submit button lives in the caller's chrome, so the state it dresses on has to
   *  reach it. */
  onState?: (state: ProfileFormState) => void
}) {
  const [name, setName] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [email, setEmail] = useState('')
  const [sshKeyPath, setSshKeyPath] = useState('')
  const [claudeConfigDir, setClaudeConfigDir] = useState('')
  const [presenceColor, setColor] = useState(
    opal.find(
      (option) => !existing.some((profile) => profile.presenceColor === option.hex),
    )?.hex ?? opal[0]!.hex,
  )
  // Rotated once, off the colour this form opened on: swatches that reshuffle under the
  // cursor as you pick are worse than a palette that starts somewhere unexpected.
  const [palette] = useState(() => opalFrom(presenceColor))
  const [error, setError] = useState('')

  useEffect(
    () => onState?.({ ready: Boolean(name.trim() && email.trim()), presenceColor }),
    [name, email, presenceColor, onState],
  )

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (existing.some((profile) => profile.name.toLowerCase() === trimmed.toLowerCase()))
      return setError(`A profile named ${trimmed} already exists.`)
    if (trimmed.startsWith('.') || /[/\\]/.test(trimmed))
      return setError(
        'The name becomes a file, so it cannot be a path or start with a dot.',
      )
    if (!email.includes('@')) return setError('The git author email needs an @ in it.')
    onSubmit({
      name: trimmed,
      presenceColor,
      gitAuthor: { name: authorName.trim() || trimmed, email: email.trim() },
      sshKeyPath: sshKeyPath.trim() || null,
      claudeConfigDir: claudeConfigDir.trim() || null,
    })
  }

  return (
    <form id={id} className="fields" onSubmit={submit}>
      <h2>New profile</h2>
      <label>
        Profile name
        <input
          value={name}
          autoFocus
          onChange={(event) => {
            setName(event.target.value)
            setError('')
          }}
          placeholder="john"
          required
        />
      </label>

      <label>
        Git author name
        <input
          value={authorName}
          onChange={(event) => setAuthorName(event.target.value)}
          placeholder={name.trim() || 'John Doe'}
        />
      </label>

      <label>
        Git author email
        <input
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setError('')
          }}
          placeholder="john@example.com"
          required
        />
      </label>

      <label>
        SSH key
        <input
          value={sshKeyPath}
          onChange={(event) => setSshKeyPath(event.target.value)}
          placeholder="~/.ssh/id_ed25519"
        />
      </label>

      <label>
        Claude config directory
        <input
          value={claudeConfigDir}
          onChange={(event) => setClaudeConfigDir(event.target.value)}
          placeholder="~/.claude"
        />
      </label>

      <p className="hint">
        Both are paths to credentials you already have: the key git offers in this
        profile's vaults, and the Claude login its terminals run as. Left empty, git and
        Claude use their own defaults.
      </p>

      <fieldset className="swatches">
        <legend>Presence colour</legend>
        {palette.map((option) => (
          <label key={option.hex} title={`opal ${option.name}`}>
            <input
              type="radio"
              name="presence"
              value={option.hex}
              checked={presenceColor === option.hex}
              onChange={() => setColor(option.hex)}
            />
            <span style={{ background: option.hex }} aria-hidden />
            <span className="sr-only">opal {option.name}</span>
          </label>
        ))}
      </fieldset>

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
