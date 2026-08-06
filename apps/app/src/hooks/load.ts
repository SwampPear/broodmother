'use client'

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'

export interface Load<T> {
  /** Null while the read is in flight, and null for one that came back a failure. */
  value: T | null
  error: string | null
  /** What the caller knows and the server has not been asked about — a repository it has
   *  just made, a key it has just generated. */
  set: Dispatch<SetStateAction<T | null>>
}

/**
 * A read that lands in state, and never lands late: when the question moves on, the answer
 * to the one before it is dropped rather than painted over the new one.
 *
 * `read` is null where there is nothing to ask — a picture has no lines to compare, a
 * profile with no GitHub has no repositories — and the value is null with it.
 */
export function useLoad<T>(
  read: (() => Promise<T>) | null,
  deps: unknown[],
  /** Asked again on this interval, for what changes while you are watching it. */
  every?: number,
): Load<T> {
  const [value, setValue] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setValue(null)
    setError(null)
    if (!read) return
    const ask = read
    let alive = true
    function once() {
      ask()
        .then((result) => alive && setValue(result))
        .catch((cause: Error) => alive && setError(cause.message))
    }
    once()
    if (every === undefined)
      return () => {
        alive = false
      }
    const timer = setInterval(once, every)
    return () => {
      alive = false
      clearInterval(timer)
    }
    // The read is a fresh closure every render, so what makes it a different question is
    // said here rather than read off it.
  }, deps)

  return { value, error, set: setValue }
}
