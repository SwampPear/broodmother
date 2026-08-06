'use client'

import { useEffect, useRef } from 'react'

export interface Timer {
  /** Whether one is waiting, which is what a debounce means by "still being typed". */
  pending(): boolean
  /** One timer, set as many times as you like: whatever was waiting is dropped first. */
  set(run: () => void, ms: number): void
  clear(): void
}

/**
 * A timer that cannot outlive the component that set it. One firing into a tree that has
 * gone is a warning in the console at best, and a write nobody is reading at worst.
 */
export function useTimer(): Timer {
  const waiting = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clear() {
    if (waiting.current) clearTimeout(waiting.current)
    waiting.current = null
  }

  // Made once. A timer read inside an effect has to be the same one on the next render, or
  // the effect runs again and resets what it was waiting for.
  const timer = useRef<Timer>({
    pending: () => waiting.current !== null,
    clear,
    set(run, ms) {
      clear()
      waiting.current = setTimeout(() => {
        waiting.current = null
        run()
      }, ms)
    },
  })

  useEffect(() => timer.current.clear, [])

  return timer.current
}
