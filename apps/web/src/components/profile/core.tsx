'use client'

import { useCallback, useState } from 'react'
import { tilde } from '@/core'
import type { GitAuthor, Profile } from '@/types'
import { opal } from '../../colors'
import { Button, Modal } from '../ui'
import { type ProfileDraft, ProfileForm, type ProfileFormState } from './form'

/**
 * Who you work as: pick one of the profiles on this machine, or make one. Profiles are
 * shared by every project, so this lists what is already there before offering to add to it.
 *
 * The same modal is first run: with no `onClose` there is no cancel, no escape and no
 * click-away, because a project with nobody to commit as has nothing to go back to.
 */
export function ProfilePicker({
  existing,
  home,
  suggested,
  current,
  onSelect,
  onCreate,
  onClose,
}: {
  existing: Profile[]
  /** The broodmother home, named in the first-run copy so the folder is not a surprise. */
  home?: string
  /** Who git on this machine says you are, which is what the form opens on. */
  suggested?: GitAuthor | null
  /** The profile in use, so the row that is already yours reads as chosen. */
  current?: string | null
  onSelect: (name: string) => void
  /** Resolves to the reason it failed, or null. The modal is the thing that asked, so the
   *  modal is the thing that says. */
  onCreate: (draft: ProfileDraft) => Promise<string | null>
  onClose?: () => void
}) {
  const [form, setForm] = useState<ProfileFormState>({
    ready: false,
    color: opal[0].hex,
  })
  const onState = useCallback((next: ProfileFormState) => setForm(next), [])
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const first = !onClose && existing.length === 0

  // Writing a profile touches disk and can be refused. Until it comes back the button says
  // so, and if it comes back a failure that is said here rather than only in the status
  // line — on first run this modal has no way out, and the line is behind it.
  const create = async (draft: ProfileDraft) => {
    setBusy(true)
    setFailed(null)
    const reason = await onCreate(draft)
    setBusy(false)
    if (reason) setFailed(reason)
  }

  const pick = (name: string) => {
    onSelect(name)
    onClose?.()
  }

  return (
    <Modal
      title={first ? 'Welcome to broodmother' : 'Profiles'}
      description={`A profile is who you commit as. It's in ${tilde(home || '~/.broodmother')}/profiles.`}
      onClose={onClose}
      footer={
        <>
          {onClose && <Button onClick={onClose}>cancel</Button>}
          <Button form="new-profile" accent={form.color} disabled={!form.ready || busy}>
            {busy ? 'creating…' : first ? 'create profile' : 'add profile'}
          </Button>
        </>
      }
    >
      <div className="vault-picker">
        {existing.length > 0 && (
          <ul className="vault-list">
            {existing.map((profile) => (
              <li key={profile.name}>
                <button
                  type="button"
                  aria-current={profile.name === current}
                  onClick={() => pick(profile.name)}
                >
                  <span className="vault-name">{profile.name}</span>
                  <span className="vault-path">{profile.gitAuthor.email}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <ProfileForm
          id="new-profile"
          existing={existing}
          suggested={suggested}
          onSubmit={(draft) => void create(draft)}
          onState={onState}
        />

        {failed && (
          <p className="field-error" role="alert">
            {failed}
          </p>
        )}
      </div>
    </Modal>
  )
}
