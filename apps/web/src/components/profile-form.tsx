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
  color: string
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
  const [claudeCfgDir, setclaudeCfgDir] = useState('')
  const [color, setColor] = useState(
    opal.find(
      (option) => !existing.some((profile) => profile.color === option.hex),
    )?.hex ?? opal[0]!.hex,
  )
  // Rotated once, off the colour this form opened on: swatches that reshuffle under the
  // cursor as you pick are worse than a palette that starts somewhere unexpected.
  const [palette] = useState(() => opalFrom(color))
  const [error, setError] = useState('')

  useEffect(
    () => onState?.({ ready: Boolean(name.trim() && email.trim()), color }),
    [name, email, color, onState],
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
      color,
      gitAuthor: { name: authorName.trim() || trimmed, email: email.trim() },
      sshKeyPath: sshKeyPath.trim() || null,
      claudeCfgDir: claudeCfgDir.trim() || null,
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
          value={claudeCfgDir}
          onChange={(event) => setclaudeCfgDir(event.target.value)}
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
              checked={color === option.hex}
              onChange={() => setColor(option.hex)}
            />
            <span style={{ background: option.hex }} aria-hidden />
            <span className="sr-only">opal {option.name}</span>
          </label>
        ))}
      </fieldset>

      {/* The button that makes the profile lives in the caller's chrome, and is dead until
          both of these are filled. A dead button with no reason on it reads as broken, so
          it says what it is waiting for. */}
      {!error && !(name.trim() && email.trim()) && (
        <p className="hint">
          A profile needs a name and a git author email; the rest can stay empty.
        </p>
      )}

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
