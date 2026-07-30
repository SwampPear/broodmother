'use client'

import { useEffect, useState } from 'react'
import type { GitSettings, GitState } from '@broodmother/shared'
import { useApp } from '../../state'

type TestResult = { ok: boolean; message: string } | null

const SWITCHES: { key: 'autoCommit' | 'pull' | 'push'; label: string; hint: string }[] = [
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

/** The switches said back as the behaviour they add up to. */
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

function repositoryLabel(state: GitState): string {
  if (!state.repo) return 'none — this vault is a plain folder'
  return state.remoteUrl ?? 'local only — no remote'
}

export function GitSettingsFields() {
  const app = useApp()
  const { gitState } = app
  const [git, setGit] = useState<GitSettings>(app.gitSettings)
  const [remoteResult, setRemoteResult] = useState<TestResult>(null)

  useEffect(() => setGit(app.gitSettings), [app.gitSettings])

  const locked = !gitState.repo || !git.enabled

  function set<K extends keyof GitSettings>(key: K, value: GitSettings[K]) {
    setGit({ ...git, [key]: value })
  }

  async function testRemote() {
    setRemoteResult(
      await app.client.request('POST /api/config/test-remote', {
        remoteUrl: gitState.remoteUrl ?? '',
        branch: gitState.branch ?? 'main',
      }),
    )
  }

  return (
    <fieldset className="git-settings">
      <legend>Git sync{app.vault ? ` · ${app.vault.name}` : ''}</legend>

      {/* Read off the checkout, so a repo started or repointed in a terminal shows up. */}
      <label>
        Repository
        <input value={repositoryLabel(gitState)} readOnly />
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
          onChange={(event) => set('enabled', event.target.checked)}
        />
        Sync this vault
      </label>

      <div className="sub" data-disabled={locked}>
        {SWITCHES.map((row) => (
          <label key={row.key} className="check" title={row.hint}>
            <input
              type="checkbox"
              checked={git[row.key]}
              disabled={locked}
              onChange={(event) => set(row.key, event.target.checked)}
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
            disabled={locked}
            onChange={(event) => set('idleMs', Number(event.target.value))}
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
  )
}
