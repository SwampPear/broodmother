'use client'

import { useCallback, useState, type CSSProperties } from 'react'
import type { Profile } from '@mother/shared'
import { opal } from '../colors'
import { Modal } from './modal'
import { ProfileForm, type ProfileDraft, type ProfileFormState } from './profile-form'

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
  current,
  onSelect,
  onCreate,
  onClose,
}: {
  existing: Profile[]
  /** The mother home, named in the first-run copy so the folder is not a surprise. */
  home?: string
  /** The profile in use, so the row that is already yours reads as chosen. */
  current?: string | null
  onSelect: (name: string) => void
  onCreate: (draft: ProfileDraft) => void
  onClose?: () => void
}) {
  const [form, setForm] = useState<ProfileFormState>({
    ready: false,
    presenceColor: opal[0].hex,
  })
  const onState = useCallback((next: ProfileFormState) => setForm(next), [])
  const first = !onClose && existing.length === 0

  const pick = (name: string) => {
    onSelect(name)
    onClose?.()
  }

  return (
    <Modal
      title={first ? 'Welcome to mother' : 'Profiles'}
      description={
        first
          ? `A profile is who you commit and collaborate as, and the credentials you do it with. It is a file in ${home || '~/.mother'}/profiles, and every project picks one.`
          : 'A profile is who you commit and collaborate as. It lives on this machine rather than in a project, so the same one serves every project that picks it.'
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
            form="new-profile"
            style={{ '--accent': form.presenceColor } as CSSProperties}
            disabled={!form.ready}
          >
            {first ? 'create profile' : 'add profile'}
          </button>
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
          onSubmit={onCreate}
          onState={onState}
        />
      </div>
    </Modal>
  )
}
