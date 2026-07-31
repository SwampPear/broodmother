'use client'

import { useEffect, useRef, useState } from 'react'
import type { GithubDevice } from '@broodmother/shared'
import { useApp } from '../../state'
import { Button, LinkButton } from '../ui'
import { Section } from './layout'

type Step = { device: GithubDevice; failed: string | null } | null

/**
 * Signing in without a password, a key, or anything to paste back: GitHub shows the app a
 * short code, you type it into a page in the browser you are already signed in to, and the
 * app collects the answer.
 *
 * What it is for is the two walls a repository puts in front of someone who has never used
 * git from a terminal — having to make the repository on the web first, and having to add a
 * key before anything can be pushed. Connected, both are gone.
 */
export function GithubAccount() {
  const app = useApp()
  const [step, setStep] = useState<Step>(null)
  const [busy, setBusy] = useState(false)
  const waiting = useRef<ReturnType<typeof setTimeout> | null>(null)

  const login = app.profile?.github ?? null

  // The poll outlives nothing: a panel that is gone has nobody to tell, and a timer that
  // fires into an unmounted tree is a warning in the console at best.
  useEffect(() => {
    return () => {
      if (waiting.current) clearTimeout(waiting.current)
    }
  }, [])

  if (!app.githubReady || !app.profile) return null

  /** Asks once, then again on GitHub's own interval until the browser has been answered. */
  function collect(device: GithubDevice) {
    waiting.current = setTimeout(() => {
      void app.connectGithub(device.deviceCode).then((answer) => {
        if (answer === true) return setStep(null)
        if (typeof answer === 'string') return setStep({ device, failed: answer })
        collect(device)
      })
    }, device.intervalMs)
  }

  async function connect() {
    setBusy(true)
    const device = await app.startGithub()
    setBusy(false)
    if (typeof device === 'string') return setStep(null)
    setStep({ device, failed: null })
    collect(device)
  }

  function stop() {
    if (waiting.current) clearTimeout(waiting.current)
    setStep(null)
  }

  return (
    <Section title="GitHub">
      {login ? (
        <>
          <p className="hint">
            Connected as <strong>{login}</strong>. New vaults and projects can pick from
            your repositories instead of asking for a URL, and pushing works without a
            key.
          </p>
          <Button onClick={() => void app.disconnectGithub()}>disconnect</Button>
        </>
      ) : step ? (
        <>
          <p className="hint">Type this into GitHub. This page finishes on its own.</p>
          <output className="device-code">{step.device.userCode}</output>
          <div className="row">
            <LinkButton href={step.device.verificationUri}>open GitHub</LinkButton>
            <Button onClick={stop}>cancel</Button>
          </div>
          {step.failed && (
            <p className="field-error" role="alert">
              {step.failed}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="hint">
            Lets broodmother make repositories for you and push to them without a key. The
            connection belongs to this profile, and you can drop it here at any time.
          </p>
          <Button onClick={() => void connect()} disabled={busy}>
            {busy ? 'connecting…' : 'connect GitHub'}
          </Button>
        </>
      )}
    </Section>
  )
}
