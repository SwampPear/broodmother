'use client'

import { useEffect, useState } from 'react'
import { siteNameOk, type LairCheck, type LairSitesView } from '@broodmother/shared'
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
  const [repos, setRepos] = useState<LairSitesView | null>(null)
  const [repoFailed, setRepoFailed] = useState<string | null>(null)
  const [cloning, setCloning] = useState(false)
  const [copied, setCopied] = useState(false)

  const keyed = app.lair.keyed

  useEffect(() => setUrl(app.lair.url ?? ''), [app.lair.url])

  useEffect(() => {
    if (!keyed) return setRepos(null)
    void app.lairSites().then((view) => {
      if (typeof view === 'string') setRepoFailed(view)
      else setRepos(view)
    })
  }, [app, keyed])

  async function save() {
    setBusy(true)
    setAnswer(null)
    setFailed(await app.setLair(url.trim(), key.trim()))
    setKey('')
    setBusy(false)
  }

  /** Registers, then asks again: the list the panel shows is always the lair's answer. */
  async function register() {
    setCloning(true)
    const lost = await app.registerSite()
    setRepoFailed(lost)
    if (!lost) {
      const view = await app.lairSites()
      if (typeof view !== 'string') setRepos(view)
    }
    setCloning(false)
  }

  async function copyDeployKey() {
    if (!repos) return
    await navigator.clipboard.writeText(repos.publicKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  /** Asked, rather than found out by a share failing in front of someone. */
  async function check() {
    setChecking(true)
    setAnswer(await app.checkLair())
    setChecking(false)
  }

  /** The one button, or the sentence explaining why there is nothing to press. */
  function registration() {
    if (!repos) return null
    const vault = repos.vault
    if (!vault) return <p className="hint">No vault is open — nothing to register.</p>
    const registered = vault.remote
      ? repos.sites.find((site) => site.remote === vault.remote)
      : undefined
    if (registered)
      return (
        <p className="hint">
          This vault is registered as <strong>{registered.name}</strong>.
        </p>
      )
    if (!vault.remote)
      return (
        <p className="hint">
          This vault has no remote — the lair clones over git, so there is nothing for it
          to pull from yet.
        </p>
      )
    if (!siteNameOk(vault.name))
      return (
        <p className="hint">&ldquo;{vault.name}&rdquo; is not a name a site can have.</p>
      )
    return (
      <div className="row">
        <Button onClick={() => void register()} disabled={cloning}>
          {cloning ? 'cloning…' : 'register this vault'}
        </Button>
        <span className="hint">
          {vault.name} ← {vault.remote}
        </span>
      </div>
    )
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
        {!repos ? (
          <p className="hint">
            Dreams on the lair run against clones it pulls itself. Connect a lair above
            and its repositories appear here.
          </p>
        ) : (
          <fieldset className="field-group">
            <legend>Sites</legend>

            {repos.sites.map((site) => (
              <p className="hint" key={site.name}>
                <strong>{site.name}</strong> · {site.remote} · pull {site.pull}
                {site.message ? ` — ${site.message}` : ''}
              </p>
            ))}

            {registration()}

            <p className="hint">
              The lair clones with its own key. Add it wherever the repositories live — a
              deploy key on the forge — before registering anything private.
            </p>
            <output className="public-key">{repos.publicKey}</output>
            <div className="row">
              <Button onClick={() => void copyDeployKey()}>
                {copied ? 'copied' : 'copy deploy key'}
              </Button>
            </div>

            {repoFailed && (
              <p className="field-error" role="alert">
                {repoFailed}
              </p>
            )}
          </fieldset>
        )}
      </Section>
    </Panel>
  )
}
