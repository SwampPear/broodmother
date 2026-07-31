'use client'

import { useEffect, useState } from 'react'
import type { Identity } from '@broodmother/shared'
import { opalFrom } from '../../colors'
import { InlineEditor } from '../../editor'
import { useApp } from '../../state'
import { Button, Select } from '../ui'
import { DangerZone } from './danger'
import { GithubAccount } from './github'
import { ProfileKey } from './key'
import { Panel } from './layout'

export function ProfilePanel() {
  const app = useApp()
  const [identity, setIdentity] = useState<Identity | null>(null)

  useEffect(() => {
    if (app.profile)
      setIdentity({
        color: app.profile.color,
        gitAuthor: app.profile.gitAuthor,
        sshKeyPath: app.profile.sshKeyPath,
        claudeCfgDir: app.profile.claudeCfgDir,
        soul: app.profile.soul,
      })
  }, [app.profile])

  if (!identity) return null

  return (
    <Panel hint="Who you commit and show up as in this vault. It is saved in the profile itself rather than in this machine's config, so changing it here changes it for every vault that uses this profile.">
      <label>
        Color
        <Select
          label="Color"
          value={identity.color}
          options={opalFrom(app.profile?.color).map((color) => ({
            value: color.hex,
            label: `opal ${color.name}`,
            badge: { text: '', color: color.hex },
          }))}
          onChange={(color) => setIdentity({ ...identity, color })}
        />
      </label>

      {/* The same two boxes the profile was made in: what belongs to git, and what belongs
          to Claude. */}
      <fieldset className="field-group">
        <legend>Git</legend>
        <label>
          Author name
          <input
            value={identity.gitAuthor.name}
            onChange={(event) =>
              setIdentity({
                ...identity,
                gitAuthor: { ...identity.gitAuthor, name: event.target.value },
              })
            }
          />
        </label>

        <label>
          Author email
          <input
            value={identity.gitAuthor.email}
            onChange={(event) =>
              setIdentity({
                ...identity,
                gitAuthor: { ...identity.gitAuthor, email: event.target.value },
              })
            }
          />
        </label>

        <label>
          SSH key
          <input
            value={identity.sshKeyPath ?? ''}
            placeholder="~/.ssh/id_ed25519"
            onChange={(event) =>
              setIdentity({ ...identity, sshKeyPath: event.target.value || null })
            }
          />
        </label>

        <p className="hint">
          A key named here is used <em>as well as</em> the ones ssh already has, not
          instead of them. Most people can leave it empty.
        </p>
      </fieldset>

      <fieldset className="field-group">
        <legend>Claude</legend>
        <label>
          Config directory
          <input
            value={identity.claudeCfgDir ?? ''}
            placeholder="~/.claude"
            onChange={(event) =>
              setIdentity({ ...identity, claudeCfgDir: event.target.value || null })
            }
          />
        </label>

        <p className="hint">The Claude login this profile&rsquo;s terminals run as.</p>

        {/* Markdown, and edited as markdown: what goes in it is a page about a person,
            not a line of configuration. */}
        <div className="field">
          Soul
          <InlineEditor
            label="Soul"
            markdown={identity.soul ?? ''}
            onChange={(soul) => setIdentity({ ...identity, soul })}
          />
        </div>

        <p className="hint">
          Appended to the system prompt of every claude shell this profile opens, after
          what broodmother tells it about the vault. Empty says nothing extra.
        </p>
      </fieldset>

      {/* A soul of nothing but whitespace is no soul, and it is read that way here rather
          than while it is being typed — trimming a field under the caret takes the space
          back out of every word as it is written. */}
      <Button
        onClick={() =>
          void app.saveIdentity({ ...identity, soul: identity.soul?.trim() || null })
        }
      >
        save profile
      </Button>

      <GithubAccount />
      <ProfileKey />
      <DangerZone />
    </Panel>
  )
}
