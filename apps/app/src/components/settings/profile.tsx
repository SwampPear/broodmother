'use client'

import { useEffect, useState } from 'react'
import type { Identity } from '@/types'
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
        cursorCfgDir: app.profile.cursorCfgDir,
        soul: app.profile.soul,
      })
  }, [app.profile])

  if (!identity) return null

  return (
    <Panel hint="Who you commit and show up as. It lives in the profile, so changing it here changes every vault that uses it.">
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
          Used <em>as well as</em> the keys ssh already has, not instead. Most people
          leave it empty.
        </p>

        {/* The key this profile pushes with is what the SSH key field above points at when
            broodmother made it, so it belongs in the same box rather than under the form. */}
        <ProfileKey />
      </fieldset>

      {/* The box's legend says whose it is; the aria name repeats it because two fields
          reading "Config directory" alone cannot be told apart by ear. */}
      <fieldset className="field-group">
        <legend>Claude</legend>
        <label>
          Config directory
          <input
            value={identity.claudeCfgDir ?? ''}
            placeholder="~/.claude"
            aria-label="Claude config directory"
            onChange={(event) =>
              setIdentity({ ...identity, claudeCfgDir: event.target.value || null })
            }
          />
        </label>

        <p className="hint">The Claude login this profile&rsquo;s terminals run as.</p>
      </fieldset>

      <fieldset className="field-group">
        <legend>Cursor</legend>
        <label>
          Config directory
          <input
            value={identity.cursorCfgDir ?? ''}
            placeholder="~/.cursor"
            aria-label="Cursor config directory"
            onChange={(event) =>
              setIdentity({ ...identity, cursorCfgDir: event.target.value || null })
            }
          />
        </label>

        <p className="hint">The Cursor login this profile&rsquo;s terminals run as.</p>
      </fieldset>

      {/* Markdown, and edited as markdown: what goes in it is a page about a person, not a
          line of configuration — so it stands on its own rather than sitting in the box of
          settings above it. */}
      <div className="field">
        Soul
        <InlineEditor
          label="Soul"
          markdown={identity.soul ?? ''}
          onChange={(soul) => setIdentity({ ...identity, soul })}
        />
      </div>

      <p className="hint">
        Added to the system prompt of every claude shell this profile opens, after what
        broodmother tells it about the vault. It starts as broodmother's own, which asks
        for precedent over memory and verified claims over confident ones — edit it
        freely, and clear it to have it back.
      </p>

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
      <DangerZone />
    </Panel>
  )
}
