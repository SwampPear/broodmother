'use client'

import { useState } from 'react'
import { useAttempt, useLoad } from '../../hooks'
import { useApp } from '../../state'
import { Button, Select } from '../ui'

/** Making one is a choice in the same list as picking one, because from here they are the
 *  same question: which repository is this? */
const NEW = 'new-repository'

/**
 * Where a repository comes from. Connected to GitHub, that is a list of your own and the
 * option of one that does not exist yet; connected to nothing, it is the URL field it has
 * always been — which is still the answer for GitLab, for a server of your own, and for
 * anyone who would rather type it.
 */
export function RemoteField({
  value,
  onChange,
  placeholder,
  suggested,
}: {
  value: string
  onChange: (remoteUrl: string) => void
  placeholder: string
  /** What a repository made from here is called, when nothing else is typed. */
  suggested: string
}) {
  const app = useApp()
  const attempt = useAttempt()
  const [picked, setPicked] = useState('')
  const [name, setName] = useState('')

  const connected = Boolean(app.profile?.github)
  // The client is what the read goes through; `app` itself is a fresh object every render,
  // and asking on that is asking again forever.
  const repos = useLoad(connected ? () => app.githubRepos() : null, [
    app.client,
    connected,
  ])
  const known = repos.value ?? []

  if (!connected)
    return (
      <label>
        Git remote
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required
        />
      </label>
    )

  const making = picked === NEW || repos.value?.length === 0

  async function create() {
    await attempt.run(async () => {
      const repo = await app.createGithubRepo({
        name: name.trim() || suggested,
        private: true,
      })
      if (typeof repo === 'string') return repo
      repos.set((were) => [repo, ...(were ?? [])])
      setPicked(repo.fullName)
      onChange(repo.cloneUrl)
      return null
    })
  }

  return (
    <>
      <label>
        Repository
        <Select
          label="Repository"
          value={making ? NEW : picked}
          options={[
            ...known.map((repo) => ({
              value: repo.fullName,
              label: repo.private ? `${repo.fullName} · private` : repo.fullName,
            })),
            { value: NEW, label: 'a new private repository…' },
          ]}
          onChange={(next) => {
            setPicked(next)
            attempt.say(null)
            const repo = known.find((one) => one.fullName === next)
            onChange(repo?.cloneUrl ?? '')
          }}
        />
      </label>

      {making && (
        <>
          <label>
            New repository name
            <input
              value={name}
              placeholder={suggested}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          {/* Made before anything is written on this side: a name GitHub refuses is worth
              hearing about here rather than halfway through creating a vault. Once it is
              made it is simply the one that is picked, which is what the list now says. */}
          <Button onClick={() => void create()} disabled={attempt.busy}>
            {attempt.busy ? 'creating…' : 'create repository'}
          </Button>
        </>
      )}

      {attempt.failed && (
        <p className="field-error" role="alert">
          {attempt.failed}
        </p>
      )}

      <p className="hint">
        Private, and yours. broodmother pushes to it with the connection on your profile,
        so there is no key to add anywhere.
      </p>
    </>
  )
}
