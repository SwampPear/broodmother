'use client'

import { useState } from 'react'
import { tilde } from '@/core'
import { useAttempt, useLoad, useTimer } from '../../hooks'
import { useApp } from '../../state'
import { Button, LinkButton } from '../ui'
import { Section } from './layout'

/** Where the key goes once you have copied it, for the host most people are pasting into.
 *  A link beats a description of where to look. */
const GITHUB_KEYS = 'https://github.com/settings/ssh/new'

/** Long enough to be read as an answer, short enough that the button is a button again by
 *  the time you look back at it. */
const COPIED_MS = 1500

/**
 * The key a profile offers, and the one gesture that makes one. broodmother already uses
 * whatever ssh and git have — an agent, a key in `~/.ssh`, a credential helper — so this is
 * for the person who has none of that yet, and it does in one click the two steps that
 * otherwise mean a terminal.
 *
 * Only the public half is ever shown, because only the public half goes anywhere.
 */
export function ProfileKey() {
  const app = useApp()
  const attempt = useAttempt()
  const flash = useTimer()
  const [copied, setCopied] = useState(false)

  const profile = app.profile?.name ?? null

  const key = useLoad(
    profile
      ? () =>
          app.client
            .request('GET /api/profiles/key', null)
            .then((result) => result.publicKey)
      : null,
    [app.client, profile],
  )

  if (!app.profile) return null

  async function generate() {
    await attempt.run(async () => {
      const result = await app.client.request('POST /api/profiles/key', null)
      key.set(result.publicKey)
      return null
    })
  }

  async function copy() {
    if (!key.value) return
    await navigator.clipboard.writeText(key.value)
    setCopied(true)
    flash.set(() => setCopied(false), COPIED_MS)
  }

  return (
    <Section title="Key">
      {key.value ? (
        <>
          <p className="hint">
            The public half. Paste it into your git host and this profile can push. The
            private half stays in {tilde(app.home || '~/.broodmother')}.
          </p>
          <output className="public-key">{key.value}</output>
          <div className="row">
            <Button onClick={() => void copy()}>{copied ? 'copied' : 'copy key'}</Button>
            <LinkButton href={GITHUB_KEYS}>add to GitHub</LinkButton>
          </div>
        </>
      ) : (
        <>
          <p className="hint">
            broodmother already uses whatever ssh and git have on this machine — your
            agent, the keys in <code>~/.ssh</code>, git&rsquo;s credential helper. Make
            one only if you have none, or want this profile to push with its own.
          </p>
          <div className="row">
            <Button onClick={() => void generate()} disabled={attempt.busy}>
              {attempt.busy ? 'generating…' : 'generate a key'}
            </Button>
          </div>
        </>
      )}

      {attempt.failed && (
        <p className="field-error" role="alert">
          {attempt.failed}
        </p>
      )}
    </Section>
  )
}
