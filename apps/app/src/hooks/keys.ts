'use client'

import { useEffect, useRef } from 'react'

/**
 * A key pressed anywhere in the window. The handler is read when the key arrives rather
 * than when it was given, so a shortcut that closes over state does not have to take the
 * listener down and put it back every time that state moves.
 */
export function useKeyDown(handle: (event: KeyboardEvent) => void) {
  const latest = useRef(handle)
  latest.current = handle

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      latest.current(event)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
