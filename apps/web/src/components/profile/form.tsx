'use client'

import { useEffect, useState, type FormEvent } from 'react'
import type { GitAuthor, Identity, Profile } from '@broodmother/shared'
import { opal, opalFrom } from '../../colors'

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
  suggested,
  onSubmit,
  onState,
}: {
  id: string
  existing: Profile[]
  /** Who git on this machine already says you are. The fields open on it rather than on
   *  nothing: it is almost always the answer, and it is one nobody should have to retype. */
  suggested?: GitAuthor | null
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
    opal.find((option) => !existing.some((profile) => profile.color === option.hex))
      ?.hex ?? opal[0]!.hex,
  )
  // Rotated once, off the colour this form opened on: swatches that reshuffle under the
  // cursor as you pick are worse than a palette that starts somewhere unexpected.
  const [palette] = useState(() => opalFrom(color))
  const [error, setError] = useState('')

  /**
   * Who the profile commits as once the empty fields are read as what they say. Every field
   * here works the way the credentials below them do: what is written in grey is what you
   * get by leaving it alone, so the answer git already has is taken by typing nothing.
   */
  const author = {
    name: authorName.trim() || suggested?.name?.trim() || name.trim(),
    email: email.trim() || suggested?.email?.trim() || '',
  }

  useEffect(
    () => onState?.({ ready: Boolean(name.trim() && author.email), color }),
    [name, author.email, color, onState],
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
    if (!author.email.includes('@'))
      return setError('The git author email needs an @ in it.')
    onSubmit({
      name: trimmed,
      color,
      gitAuthor: { name: author.name || trimmed, email: author.email },
      sshKeyPath: sshKeyPath.trim() || null,
      claudeCfgDir: claudeCfgDir.trim() || null,
      // Who claude is while it works as this profile. Written on the profile's own page
      // rather than here: a new profile is a name and an author, not an essay.
      soul: null,
    })
  }

  return (
    <form id={id} className="fields" onSubmit={submit}>
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

      <fieldset className="swatches">
        <legend>Color</legend>
        {palette.map((option) => (
          <label key={option.hex} data-tip={`opal ${option.name}`}>
            <input
              type="radio"
              name="color"
              value={option.hex}
              checked={color === option.hex}
              onChange={() => setColor(option.hex)}
            />
            <span style={{ background: option.hex }} aria-hidden />
            <span className="sr-only">opal {option.name}</span>
          </label>
        ))}
      </fieldset>

      {/* Who you are to git, and to Claude. Two programs, two boxes: what goes in each is
          read off what it is for rather than off a list of five fields in a row. */}
      <fieldset className="field-group">
        <legend>Git</legend>
        <label>
          Author name
          <input
            value={authorName}
            onChange={(event) => setAuthorName(event.target.value)}
            placeholder={suggested?.name || name.trim() || 'John Doe'}
          />
        </label>

        <label>
          Author email
          <input
            value={email}
            onChange={(event) => {
              setEmail(event.target.value)
              setError('')
            }}
            placeholder={suggested?.email || 'john@example.com'}
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
      </fieldset>

      <fieldset className="field-group">
        <legend>Claude</legend>
        <label>
          Config directory
          <input
            value={claudeCfgDir}
            onChange={(event) => setclaudeCfgDir(event.target.value)}
            placeholder="~/.claude"
          />
        </label>
      </fieldset>

      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
