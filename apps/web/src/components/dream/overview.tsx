'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  basename,
  projectOf,
  type DocRoot,
  type DreamRun,
  type DreamSummary,
  type HostedDream,
} from '@broodmother/shared'
import { useApp } from '../../state'
import { docRoute } from '../shell'
import { Icon } from '../ui'
import { ago, DreamTree } from './tree'

const POLL_MS = 2000

function whereOf(root: DocRoot): string {
  return projectOf(root) ?? 'vault'
}

function nameOf(run: DreamRun): string {
  return basename(run.ref.path).replace(/\.dream$/, '')
}

function tookOf(run: DreamRun): string | null {
  if (run.finishedAt === undefined) return null
  const seconds = Math.max(1, Math.round((run.finishedAt - run.startedAt) / 1000))
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

/** The dreams page: what is set to run, and what running has looked like lately. Both
 *  halves are polled while the page is up, so a run underway moves as it walks. */
export function DreamsView() {
  const app = useApp()
  const router = useRouter()
  const [dreams, setDreams] = useState<DreamSummary[] | null>(null)
  const [runs, setRuns] = useState<DreamRun[] | null>(null)
  const [hosted, setHosted] = useState<HostedDream[] | null>(null)
  const [opened, setOpened] = useState<string | null>(null)
  const keyed = app.lair.keyed

  useEffect(() => {
    let alive = true
    const ask = () => {
      void app.client
        .request('GET /api/dreams', null)
        .then((result) => alive && setDreams(result.dreams))
        .catch(() => null)
      void app.client
        .request('GET /api/dream/log', null)
        .then((result) => alive && setRuns(result.runs))
        .catch(() => null)
      // The lair's, through the proxy, the same way local runs poll — but only when a
      // lair is connected, so a laptop without one asks nothing on every beat.
      if (keyed)
        void app.client
          .request('GET /api/lair/dreams', null)
          .then((result) => alive && setHosted(result.dreams))
          .catch(() => null)
    }
    ask()
    const timer = setInterval(ask, POLL_MS)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [app.client, keyed])

  const now = Date.now()

  /** The lair answers with what remains hosted, so the table wears the removal at once
   *  rather than on the next poll. */
  async function removeHosted(dream: HostedDream) {
    const result = await app.client
      .request('DELETE /api/lair/dream', { site: dream.site, path: dream.path })
      .catch(() => null)
    if (result) setHosted(result.dreams)
  }

  return (
    <div className="dreams-page">
      <section aria-label="dreams">
        <h2>Dreams</h2>
        {dreams?.length === 0 && (
          <p className="dreams-empty">
            No dreams yet — make one with “New dream” in the sidebar.
          </p>
        )}
        {dreams !== null && dreams.length > 0 && (
          <DreamTree
            dreams={dreams}
            now={now}
            vault={app.vault?.name ?? 'vault'}
            onOpen={(ref) => router.push(docRoute(ref))}
          />
        )}
      </section>

      {keyed && hosted !== null && (
        <section aria-label="dreams on the lair">
          <h2>Lair</h2>
          {hosted.length === 0 && (
            <p className="dreams-empty">
              Nothing hosted yet — open a dream and send it with the antenna button.
            </p>
          )}
          {hosted.length > 0 && (
            <table className="dreams-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Dream</th>
                  <th>Site</th>
                  <th>Fires</th>
                  <th>Last run</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {hosted.map((dream) => {
                  const running = dream.lastRun?.state === 'running'
                  return (
                    <tr key={`${dream.site}:${dream.path}`}>
                      <td className="lair-run-cell">
                        <button
                          type="button"
                          className="lair-run"
                          data-running={running || undefined}
                          aria-label={`${running ? 'stop' : 'run'} ${dream.name} on ${dream.site}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            const route = running
                              ? 'POST /api/lair/dream/stop'
                              : 'POST /api/lair/dream/run'
                            void app.client
                              .request(
                                route as never,
                                { site: dream.site, path: dream.path } as never,
                              )
                              .catch(() => null)
                          }}
                        >
                          <Icon name={running ? 'square' : 'play'} />
                        </button>
                      </td>
                      <td>{dream.name}</td>
                      <td className="dreams-dim">{dream.site}</td>
                      <td>
                        {dream.triggers.length > 0
                          ? dream.triggers.map((trigger) => trigger.label).join(', ')
                          : 'nothing wired'}
                      </td>
                      <td>
                        {dream.lastRun ? (
                          <>
                            <span
                              className="dream-state"
                              data-state={dream.lastRun.state}
                            >
                              {dream.lastRun.state}
                            </span>
                            <span className="dreams-dim">
                              {ago(dream.lastRun.startedAt, now)}
                            </span>
                          </>
                        ) : (
                          <span className="dreams-dim">never</span>
                        )}
                      </td>
                      <td className="lair-stop-cell">
                        {running && (
                          <button
                            type="button"
                            className="lair-stop"
                            aria-label={`stop ${dream.name}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              void app.client
                                .request('POST /api/lair/dream/stop', {
                                  site: dream.site,
                                  path: dream.path,
                                })
                                .catch(() => null)
                            }}
                          >
                            Stop
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={`remove ${dream.name} from the lair`}
                          onClick={() => void removeHosted(dream)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      <section aria-label="dream runs">
        <h2>Runs</h2>
        {runs?.length === 0 && <p className="dreams-empty">Nothing has run yet.</p>}
        {runs !== null && runs.length > 0 && (
          <ol className="dreams-log">
            {runs.map((run) => (
              <li key={run.id}>
                <button
                  type="button"
                  aria-expanded={opened === run.id}
                  onClick={() => setOpened(opened === run.id ? null : run.id)}
                >
                  <span className="dream-state" data-state={run.state}>
                    {run.state}
                  </span>
                  <span className="dreams-run-name">{nameOf(run)}</span>
                  <span className="dreams-dim">
                    {whereOf(run.ref.root)} · {ago(run.startedAt, now)}
                    {tookOf(run) && ` · ${tookOf(run)}`}
                  </span>
                </button>
                {opened === run.id && (
                  <div className="dreams-run">
                    {run.error && <p className="dreams-run-error">{run.error}</p>}
                    {run.steps.map((step) => (
                      <div key={step.node} className="dream-step" data-state={step.state}>
                        <span>
                          {step.name} — {step.state}
                        </span>
                        {(step.error ?? step.output) && (
                          <pre>{step.error ?? step.output}</pre>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
