'use client'

import { useState, type FormEvent } from 'react'
import { formatInvite, parseInvite } from '@/collab'
import type { Invite } from '@/types'
import { Button, Modal } from '../ui'

/**
 * The link, and the one thing worth saying about it: it is the document. Whoever holds it can
 * read and edit until the room empties, and the key rides in the fragment — so the relay never
 * receives it, and neither can it be recovered from the relay once it is lost.
 */
export function ShareCard({
  invite,
  peers,
  onLeave,
  onClose,
}: {
  invite: Invite
  peers: number
  onLeave: () => void
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const link = formatInvite(invite)

  const copy = () => {
    void navigator.clipboard.writeText(link).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <Modal
      title="sharing this document"
      description={
        peers === 0
          ? 'Nobody else has joined yet. Send them the link.'
          : `${peers} other ${peers === 1 ? 'person is' : 'people are'} in here.`
      }
      onClose={onClose}
      footer={
        <>
          <Button danger onClick={onLeave}>
            stop sharing
          </Button>
          <Button onClick={copy}>{copied ? 'copied' : 'copy link'}</Button>
        </>
      }
    >
      <p className="share-link">
        <code>{link}</code>
      </p>
      <p className="share-note">
        Anyone holding this link can edit the document until everyone leaves. Send it over
        something private: the part after the <code>#</code> is the key that opens it, and
        the relay never receives that part.
      </p>
    </Modal>
  )
}

/** An invite, pasted. It joins into whatever document is open — which is why the modal says
 *  so rather than asking you to pick one. */
export function JoinModal({
  into,
  onJoin,
  onClose,
}: {
  into: string
  onJoin: (invite: Invite) => void
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const invite = parseInvite(text)
  const wrong = text.trim().length > 0 && !invite

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (invite) onJoin(invite)
  }

  return (
    <Modal
      title="join a shared document"
      description={`The document joins into ${into}. If that file already says something else, you will be asked which version to keep — nothing is merged.`}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>cancel</Button>
          <Button form="join-shared" disabled={!invite}>
            join
          </Button>
        </>
      }
    >
      <form id="join-shared" className="fields" onSubmit={submit}>
        <label>
          Invite link
          <input
            value={text}
            autoFocus
            placeholder="https://…/j/…#…"
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        {wrong && <p className="field-error">That is not an invite link.</p>}
      </form>
    </Modal>
  )
}

/**
 * Two documents that were edited apart. There is no third one that is both of them, so this
 * asks — a CRDT handed both would interleave them and produce a version nobody wrote.
 */
export function DivergenceModal({
  mine,
  theirs,
  onTake,
  onKeep,
}: {
  mine: string
  theirs: string
  onTake: () => void
  onKeep: () => void
}) {
  return (
    <Modal
      title="this file is not the one being shared"
      description="Your copy and the room's copy have both been written since they were last the same. Nothing has been changed yet."
      size="large"
      footer={
        <>
          <Button onClick={onKeep}>keep mine and leave</Button>
          <Button onClick={onTake}>take the shared one</Button>
        </>
      }
    >
      <div className="divergence">
        <section>
          <h3>yours</h3>
          <pre>{mine}</pre>
        </section>
        <section>
          <h3>the room&rsquo;s</h3>
          <pre>{theirs}</pre>
        </section>
      </div>
    </Modal>
  )
}
