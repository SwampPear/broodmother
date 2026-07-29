'use client'

import { useEffect, useRef, useState } from 'react'
import { isImage, type VaultEvent } from '@broodmother/shared'
import { Editor } from '../editor'
import { useApp } from '../state'
import { ImageView } from './image-view'

const saveDebounceMs = 500

const touches = (event: VaultEvent, path: string) =>
  event.type === 'moved' ? event.from === path : event.path === path

export function DocView({ path }: { path: string }) {
  const app = useApp()
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // An image has no text to read, and reading its bytes as text is how you corrupt it.
  const picture = isImage(path)

  useEffect(() => {
    if (picture) return
    setMarkdown(null)
    setError(null)
    app.client
      .request('GET /api/doc', { path })
      .then((result) => setMarkdown(result.markdown))
      .catch((cause: Error) => setError(cause.message))
  }, [app.client, path, picture])

  // A write broodmother did not make — Obsidian, a shell, a sync pull — is the truth about the
  // file, so the open copy follows it. Typing that has not reached disk yet wins, because
  // adopting mid-keystroke throws away what is being typed; that edit lands on top a moment
  // later, which is the last-write-wins the app already had.
  const event = app.vaultEvent
  useEffect(() => {
    if (!event || !touches(event, path) || timer.current) return
    // A picture is refetched by the browser, not by this client: bumping the revision is
    // what changes the `src` it was told to cache.
    if (picture) return setRevision((was) => was + 1)
    app.client
      .request('GET /api/doc', { path })
      .then((result) => setMarkdown(result.markdown))
      // A read that fails once the file has been moved or deleted says so, which is the
      // truth about what is on screen.
      .catch((cause: Error) => setError(cause.message))
  }, [app.client, event, path, picture])

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

  if (picture)
    return (
      <article className="doc">
        <div className="doc-body">
          <ImageView path={path} revision={revision} />
        </div>
      </article>
    )

  if (error) return <div className="empty">{error}</div>
  // Blank, not "loading …": the read lands in a frame or two and the word only ever showed
  // up as a flash.
  if (markdown === null) return <div className="empty" />

  // No header: the tab strip already says which document this is, and saying it twice cost
  // a band of chrome across the top of every note.
  return (
    <article className="doc">
      <div className="doc-body">
        <Editor markdown={markdown} onChange={onChange} path={path} />
      </div>
    </article>
  )
}
