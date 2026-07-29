'use client'

import { useState, type CSSProperties, type FormEvent } from 'react'
import type { Worktree } from '@broodmother/shared'
import { Modal } from './modal'

/** A branch name git will take: no spaces, no `..`, and not ending in `.lock`. */
const BRANCH = /^(?!\/|.*(\.\.|@\{|\/\/|\.lock$|\/$))[\w./-]+$/

/**
 * A worktree is a second checkout of the same repository, on its own branch, in its own
 * folder. Making one asks for both halves: what the folder is called, and what branch it
 * sits on — either a new one cut from where you are, or one that already exists.
 */
export function AddWorktree({
  existing,
  accent,
  onCreate,
  onClose,
}: {
  existing: Worktree[]
  accent?: string
  /** Resolves to the reason it failed, or null. Adding a worktree is a git command that
   *  can be refused — a branch already checked out, a remote that will not answer. */
  onCreate: (input: {
    name: string
    branch: string
    create: boolean
  }) => Promise<string | null>
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [branch, setBranch] = useState('')
  const [create, setCreate] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  // The folder is usually named after the branch, so typing one fills the other in until
  // you say otherwise.
  const [linked, setLinked] = useState(true)
  const folderOf = (value: string) => value.replaceAll('/', '-')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const folder = name.trim()
    const target = branch.trim()

    if (existing.some((one) => one.name.toLowerCase() === folder.toLowerCase()))
      return setError(`A worktree called ${folder} is already here.`)
    if (folder.startsWith('.') || /[/\\]/.test(folder))
      return setError(
        'The name becomes a folder, so it cannot be a path or start with a dot.',
      )
    if (!BRANCH.test(target))
      return setError('That is not a name git will take for a branch.')

    void submitTo({ name: folder, branch: target, create })
  }

  // `git worktree add` clones a checkout and may fetch first, which is not instant and is
  // not guaranteed. The button says which of those is happening.
  const submitTo = async (input: { name: string; branch: string; create: boolean }) => {
    setBusy(true)
    setError('')
    const reason = await onCreate(input)
    setBusy(false)
    if (reason) setError(reason)
  }

  return (
    <Modal
      title="New worktree"
      description="A second checkout of this vault, on its own branch, in its own folder beside the others."
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose}>
            cancel
          </button>
          <button
            type="submit"
            form="add-worktree"
            style={accent ? ({ '--accent': accent } as CSSProperties) : undefined}
            disabled={!name.trim() || !branch.trim() || busy}
          >
            {busy ? 'creating…' : 'create worktree'}
          </button>
        </>
      }
    >
      <form id="add-worktree" className="fields" onSubmit={submit}>
        <label>
          Branch
          <input
            value={branch}
            autoFocus
            onChange={(event) => {
              setBranch(event.target.value)
              if (linked) setName(folderOf(event.target.value))
              setError('')
            }}
            placeholder="fix-login"
            required
          />
        </label>

        <div className="row choices">
          <label className="check">
            <input
              type="radio"
              name="branch-kind"
              checked={create}
              onChange={() => setCreate(true)}
            />
            New branch
          </label>
          <label className="check">
            <input
              type="radio"
              name="branch-kind"
              checked={!create}
              onChange={() => setCreate(false)}
            />
            Branch that exists
          </label>
        </div>

        <label>
          Folder
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setLinked(false)
              setError('')
            }}
            placeholder="fix-login"
            required
          />
        </label>

        <p className="hint">
          {create
            ? 'The branch is cut from where local is now, and the folder is checked out on it.'
            : 'The branch is fetched if this machine has not seen it, then checked out here.'}{' '}
          Your other checkouts are untouched — that is what a worktree is for.
        </p>

        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </Modal>
  )
}
