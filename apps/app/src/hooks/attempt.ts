'use client'

import { useState } from 'react'

export interface Attempt {
  /** In flight, which is what the control that started it says while it waits. */
  busy: boolean
  /** Why it was refused, said where it was asked rather than only in the status line. */
  failed: string | null
  /** A refusal the form worked out for itself, and — with null — the keystroke that might
   *  fix one. */
  say(reason: string | null): void
  /** Resolves to whether it worked, so the caller can close on the way out. */
  run(attempt: () => Promise<string | null>): Promise<boolean>
}

/**
 * Something that touches disk and can be refused. Every one of them is the same three
 * beats — say so while it is in flight, say why when it comes back, and hand the caller
 * whether it worked — so they are here rather than written out again at each of them.
 */
export function useAttempt(): Attempt {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)

  return {
    busy,
    failed,
    say: setFailed,

    async run(attempt) {
      setBusy(true)
      setFailed(null)
      try {
        const reason = await attempt()
        if (reason) setFailed(reason)
        return !reason
      } catch (cause) {
        setFailed(cause instanceof Error ? cause.message : String(cause))
        return false
      } finally {
        setBusy(false)
      }
    },
  }
}
