'use client'

import { useEffect, useRef, useState } from 'react'
import type { VaultEvent } from '@broodmother/shared'
import { Editor } from '../editor'
import { useApp } from '../state'

const saveDebounceMs = 500

const touches = (event: VaultEvent, path: string) =>
  event.type === 'moved' ? event.from === path : event.path === path

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

  // A write broodmother did not make — Obsidian, a shell, a sync pull — is the truth about the
  // file, so the open copy follows it. Typing that has not reached disk yet wins, because
  // adopting mid-keystroke throws away what is being typed; that edit lands on top a moment
  // later, which is the last-write-wins the app already had.
  const event = app.vaultEvent
  useEffect(() => {
    if (!event || !touches(event, path) || timer.current) return
    app.client
      .request('GET /api/doc', { path })
      .then((result) => setMarkdown(result.markdown))
      // A read that fails once the file has been moved or deleted says so, which is the
      // truth about what is on screen.
      .catch((cause: Error) => setError(cause.message))
  }, [app.client, event, path])

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const onChange = (next: string) => {
    setMarkdown(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      void app.save(path, next)
    }, saveDebounceMs)
  }

  if (error) return <div className="empty">{error}</div>
  // Blank, not "loading …": the read lands in a frame or two and the word only ever showed
  // up as a flash.
  if (markdown === null) return <div className="empty" />

  // No header: the tab strip already says which document this is, and saying it twice cost
  // a band of chrome across the top of every note.
  return (
    <article className="doc">
      <div className="doc-body">
        <Editor markdown={markdown} onChange={onChange} />
      </div>
    </article>
  )
}
