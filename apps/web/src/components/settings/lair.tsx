'use client'

import { useEffect, useState } from 'react'
import type { LairCheck } from '@broodmother/shared'
import { useApp } from '../../state'
import { Button } from '../ui'
import { Panel, Section } from './layout'

/** What each answer is, in one word, so the line reads before it is read. */
const VERDICT: Record<LairCheck['state'], string> = {
  connected: 'connected',
  refused: 'refused',
  unreachable: 'unreachable',
}

export function LairPanel() {
  const app = useApp()
  const [url, setUrl] = useState(app.lair.url ?? '')
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [answer, setAnswer] = useState<LairCheck | string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)

  useEffect(() => setUrl(app.lair.url ?? ''), [app.lair.url])

  async function save() {
    setBusy(true)
    setAnswer(null)
    setFailed(await app.setLair(url.trim(), key.trim()))
    setKey('')
    setBusy(false)
  }

  /** Asked, rather than found out by a share failing in front of someone. */
  async function check() {
    setChecking(true)
    setAnswer(await app.checkLair())
    setChecking(false)
  }

  return (
    <Panel hint="A lair is broodmother away from home: a server that relays live editing between machines and runs dreams while every laptop is closed. Point this profile at one with a key its admin minted for you.">
      <Section title="Connection">
        <fieldset className="field-group">
          <legend>Where</legend>

          <label>
            URL
            <input
              value={url}
              placeholder="https://lair.example.com"
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>

          <label>
            Access key
            <input
              type="password"
              value={key}
              placeholder={
                app.lair.keyed ? 'a key is stored — paste one to replace it' : 'lk_…'
              }
              onChange={(event) => setKey(event.target.value)}
            />
          </label>

          <p className="hint">
            Keys are minted on the lair itself — <code>lair keys mint &lt;name&gt;</code>{' '}
            — and shown once. The key stays with this profile on this machine; the browser
            only ever sees the URL.
          </p>

          <div className="row">
            <Button
              onClick={() => void save()}
              disabled={busy || !url.trim() || !key.trim()}
            >
              {busy ? 'saving…' : 'save'}
            </Button>
            <Button onClick={() => void check()} disabled={checking || !app.lair.keyed}>
              {checking ? 'checking…' : 'check connection'}
            </Button>
            {app.lair.keyed && (
              <Button onClick={() => void app.clearLair()}>forget this lair</Button>
            )}
          </div>

          {failed && (
            <p className="field-error" role="alert">
              {failed}
            </p>
          )}
          {answer &&
            (typeof answer === 'string' ? (
              <p className="field-error" role="alert">
                {answer}
              </p>
            ) : (
              <p className="hint" data-state={answer.state}>
                <strong>{VERDICT[answer.state]}</strong> · {answer.message}
              </p>
            ))}
        </fieldset>
      </Section>

      <Section title="Repositories">
        <p className="hint">
          Dreams on the lair run against clones it pulls itself, with its own deploy key.
          Print that key with <code>lair key</code>, add it wherever the repositories
          live, then register each one:{' '}
          <code>lair sites add &lt;name&gt; &lt;remote&gt;</code>.
        </p>
      </Section>
    </Panel>
  )
}
