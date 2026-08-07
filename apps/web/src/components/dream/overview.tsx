'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  basename,
  projectOf,
  serializeDream,
  starterDreams,
  type DocRoot,
  type DreamRun,
  type DreamSummary,
  type HostedDream,
  type StarterDream,
} from '@broodmother/shared'
import { useApp } from '../../state'
import { docRoute } from '../shell'
import { Icon } from '../ui'

const POLL_MS = 2000

function whereOf(root: DocRoot): string {
  return projectOf(root) ?? 'vault'
}

function nameOf(run: DreamRun): string {
  return basename(run.ref.path).replace(/\.dream$/, '')
}

function ago(at: number, now: number): string {
  const minutes = Math.floor(Math.max(0, now - at) / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
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

  /** A starter lands in the vault under its own name — beside it, not over it, when one
   *  of that name is already there — and opens in the editor to be made your own. */
  async function install(starter: StarterDream) {
    let path = `${starter.name}.dream`
    for (let n = 2; n < 20; n++) {
      const taken = await app.client
        .request('GET /api/doc', { root: 'vault', path })
        .then(
          () => true,
          () => false,
        )
      if (!taken) break
      path = `${starter.name} ${n}.dream`
    }
    await app.client.request('PUT /api/doc', {
      root: 'vault',
      path,
      markdown: serializeDream(starter.dream),
    })
    router.push(docRoute({ root: 'vault', path }))
  }

  return (
    <div className="dreams-page">
      <h1>Dreams</h1>

      <section aria-label="scheduled dreams">
        <h2>Scheduled</h2>
        {dreams?.length === 0 && (
          <p className="dreams-empty">
            No dreams yet — make one with “New dream” in the sidebar.
          </p>
        )}
        {dreams !== null && dreams.length > 0 && (
          <table className="dreams-table">
            <thead>
              <tr>
                <th>Dream</th>
                <th>Where</th>
                <th>Fires</th>
                <th>Last run</th>
              </tr>
            </thead>
            <tbody>
              {dreams.map((dream) => (
                <tr key={`${dream.ref.root}:${dream.ref.path}`}>
                  <td>
                    <button
                      type="button"
                      className="dreams-open"
                      onClick={() => router.push(docRoute(dream.ref))}
                    >
                      <Icon name="moon-star" />
                      {dream.name}
                    </button>
                  </td>
                  <td className="dreams-dim">{whereOf(dream.ref.root)}</td>
                  <td>
                    {dream.triggers.length > 0
                      ? dream.triggers.map((trigger) => trigger.label).join(', ')
                      : 'nothing wired'}
                  </td>
                  <td>
                    {dream.lastRun ? (
                      <>
                        <span className="dream-state" data-state={dream.lastRun.state}>
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {keyed && hosted !== null && (
        <section aria-label="dreams on the lair">
          <h2>On the lair</h2>
          {hosted.length === 0 && (
            <p className="dreams-empty">
              Nothing hosted yet — open a dream and send it with the antenna button.
            </p>
          )}
          {hosted.length > 0 && (
            <table className="dreams-table">
              <thead>
                <tr>
                  <th>Dream</th>
                  <th>Site</th>
                  <th>Fires</th>
                  <th>Last run</th>
                </tr>
              </thead>
              <tbody>
                {hosted.map((dream) => (
                  <tr key={`${dream.site}:${dream.path}`}>
                    <td>
                      <Icon name="antenna" /> {dream.name}
                    </td>
                    <td className="dreams-dim">{dream.site}</td>
                    <td>
                      {dream.triggers.length > 0
                        ? dream.triggers.map((trigger) => trigger.label).join(', ')
                        : 'nothing wired'}
                    </td>
                    <td>
                      {dream.lastRun ? (
                        <>
                          <span className="dream-state" data-state={dream.lastRun.state}>
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
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <section aria-label="starter dreams">
        <h2>Starters</h2>
        <ul className="dreams-starters">
          {starterDreams().map((starter) => (
            <li key={starter.name}>
              <div>
                <span className="dreams-run-name">{starter.name}</span>
                <p className="dreams-empty">{starter.description}</p>
              </div>
              <button type="button" onClick={() => void install(starter)}>
                Add
              </button>
            </li>
          ))}
        </ul>
      </section>

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
