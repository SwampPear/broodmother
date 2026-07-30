'use client'

import { useEffect, useState } from 'react'
import type { GitSettings, Identity, BroodmotherConfig } from '@broodmother/shared'
import { opalFrom } from '../colors'
import { useApp } from '../state'

type TestResult = { ok: boolean; message: string } | null

/** Each switch, and the one sentence that says what turning it off costs you. */
const SYNC_SWITCHES: { key: keyof GitSettings; label: string; hint: string }[] = [
  {
    key: 'autoCommit',
    label: 'Commit automatically',
    hint: 'Off leaves committing to you. The loop still moves the commits you make.',
  },
  {
    key: 'pull',
    label: 'Pull before pushing',
    hint: 'Off never rebases onto the remote, so anything pushed from elsewhere stays there.',
  },
  {
    key: 'push',
    label: 'Push after committing',
    hint: 'Off keeps the history in this vault. Nothing leaves the machine.',
  },
]

/**
 * The settings said back as the behaviour they add up to. Four switches is enough
 * combinations that reading them off one at a time is not the same as knowing what happens.
 */
function describeSync(git: GitSettings, repo: boolean, remote: boolean): string {
  if (!repo) return 'Nothing syncs: this vault has no repository.'
  if (!git.enabled) return 'Nothing syncs: sync is off for this vault.'

  const steps = [
    git.autoCommit && 'commits what changed',
    git.pull && remote && 'pulls',
    git.push && remote && 'pushes',
  ].filter(Boolean) as string[]

  if (!steps.length) return 'Sync is on but every step is off, so nothing happens.'
  const seconds = Math.round(git.idleMs / 1000)
  const tail =
    (git.pull || git.push) && !remote
      ? ' There is no remote, so the history stays in this vault.'
      : ''
  return `After ${seconds}s of quiet, broodmother ${steps.join(', then ')}.${tail}`
}

export function SettingsView() {
  const app = useApp()
  const [draft, setDraft] = useState<BroodmotherConfig | null>(null)
  const [git, setGit] = useState<GitSettings>(app.gitSettings)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [remoteResult, setRemoteResult] = useState<TestResult>(null)

  useEffect(() => setDraft(app.config), [app.config])
  useEffect(() => setGit(app.gitSettings), [app.gitSettings])
  useEffect(() => {
    if (app.profile)
      setIdentity({
        color: app.profile.color,
        gitAuthor: app.profile.gitAuthor,
        sshKeyPath: app.profile.sshKeyPath,
        claudeCfgDir: app.profile.claudeCfgDir,
      })
  }, [app.profile])

  if (!draft) return <div className="empty" />

  const { gitState } = app
  const setGitField = <K extends keyof GitSettings>(key: K, value: GitSettings[K]) =>
    setGit({ ...git, [key]: value })

  const testRemote = async () =>
    setRemoteResult(
      await app.client.request('POST /api/config/test-remote', {
        remoteUrl: gitState.remoteUrl ?? '',
        branch: gitState.branch ?? 'main',
      }),
    )

  return (
    <form
      className="settings"
      onSubmit={(event) => {
        event.preventDefault()
        void app.saveConfig(draft)
      }}
    >
      <h1>Settings</h1>

      {app.configReset.length > 0 && (
        <p className="reset" role="alert">
          The config file was malformed. These fields were reset to defaults:{' '}
          {app.configReset.join(', ')}
        </p>
      )}

      {/* Settled when the vault is created and read from it afterwards: retyping it here
          would point broodmother at a folder it never made. */}
      <label>
        Vault path
        <input value={draft.vaultPath ?? ''} readOnly />
      </label>

      <p className="hint">
        The vault folder belongs to the vault. To work somewhere else, make another vault —
        every folder in your broodmother home is one.
      </p>

      <fieldset className="git-settings">
        <legend>Git sync{app.vault ? ` · ${app.vault.name}` : ''}</legend>

        {/* Read off the checkout rather than stored, so a repository started or repointed
            in a terminal is reported the way it actually is. */}
        <label>
          Repository
          <input
            value={
              gitState.repo
                ? (gitState.remoteUrl ?? 'local only — no remote')
                : 'none — this vault is a plain folder'
            }
            readOnly
          />
        </label>

        {gitState.repo ? (
          <p className="hint">
            {gitState.branch
              ? `On ${gitState.branch}. Syncing follows the checkout you are in, so a worktree syncs its own branch.`
              : 'This checkout is not on a branch, so nothing can be pulled or pushed until it is.'}
          </p>
        ) : (
          <p className="hint">
            Git is optional. This vault keeps its markdown on disk and nothing else — turn
            it into a repository from a terminal and these settings start applying.
          </p>
        )}

        <label className="check">
          <input
            type="checkbox"
            checked={git.enabled}
            disabled={!gitState.repo}
            onChange={(event) => setGitField('enabled', event.target.checked)}
          />
          Sync this vault
        </label>

        {/* Nested under the switch that governs them: with sync off they change nothing,
            and offering them as live choices would say otherwise. */}
        <div className="sub" data-disabled={!git.enabled || !gitState.repo}>
          {SYNC_SWITCHES.map((row) => (
            <label key={row.key} className="check" title={row.hint}>
              <input
                type="checkbox"
                checked={Boolean(git[row.key])}
                disabled={!git.enabled || !gitState.repo}
                onChange={(event) => setGitField(row.key, event.target.checked)}
              />
              {row.label}
            </label>
          ))}

          <label>
            Idle before sync (ms)
            <input
              type="number"
              min={1000}
              step={1000}
              value={git.idleMs}
              disabled={!git.enabled || !gitState.repo}
              onChange={(event) => setGitField('idleMs', Number(event.target.value))}
            />
          </label>
        </div>

        <p className="hint">
          {describeSync(git, gitState.repo, Boolean(gitState.remoteUrl))}
        </p>

        <div className="row">
          <button
            type="button"
            onClick={() => void testRemote()}
            disabled={!gitState.remoteUrl}
          >
            test remote
          </button>
          <button type="button" onClick={() => void app.saveGitSettings(git)}>
            save sync settings
          </button>
          {remoteResult && (
            <span className="result" data-ok={remoteResult.ok}>
              {remoteResult.ok ? 'ok' : 'failed'} · {remoteResult.message}
            </span>
          )}
        </div>
      </fieldset>

      <button type="submit">save</button>

      {identity && (
        <fieldset className="profile-settings">
          <legend>
            Profile · {app.profile?.name}
            {app.vault ? ` · ${app.vault.name}` : ''}
          </legend>
          <p className="hint">
            Who you commit and show up as in this vault, and the credentials you do it
            with. It is stored in the profile's own file rather than in this machine's
            config, so editing it here changes it for every vault that picked it.
          </p>

          <label>
            Presence color
            <select
              value={identity.color}
              onChange={(event) =>
                setIdentity({ ...identity, color: event.target.value })
              }
            >
              {opalFrom(app.profile?.color).map((color) => (
                <option key={color.hex} value={color.hex}>
                  opal {color.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Git author name
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
            Git author email
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

          <label>
            Claude config directory
            <input
              value={identity.claudeCfgDir ?? ''}
              placeholder="~/.claude"
              onChange={(event) =>
                setIdentity({ ...identity, claudeCfgDir: event.target.value || null })
              }
            />
          </label>

          <p className="hint">
            The key git offers in this profile's vaults, and the Claude login their
            terminals run as. Left empty, git and Claude use their own defaults.
          </p>

          <button type="button" onClick={() => void app.saveIdentity(identity)}>
            save profile
          </button>
        </fieldset>
      )}
    </form>
  )
}
