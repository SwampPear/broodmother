'use client'

import { useEffect, useRef, useState } from 'react'
import { Editor } from '../editor'
import { useApp } from '../state'

const saveDebounceMs = 500

export function DocView({ path }: { path: string }) {
  const app = useApp()
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMarkdown(null)
    setError(null)
    app.client
      .request('GET /api/doc', { path })
      .then((result) => setMarkdown(result.markdown))
      .catch((cause: Error) => setError(cause.message))
  }, [app.client, path])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const onChange = (next: string) => {
    setMarkdown(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void app.save(path, next), saveDebounceMs)
  }

  if (error) return <div className="empty">{error}</div>
  if (markdown === null) return <div className="empty">loading {path}…</div>

  return (
    <article className="doc">
      <h1>{path}</h1>
      <Editor markdown={markdown} onChange={onChange} />
    </article>
  )
}
