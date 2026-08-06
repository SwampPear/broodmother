'use client'

import { useState, type FormEvent } from 'react'
import type { Branch } from '@/types'
import { useAttempt } from '../../hooks'
import { Button, Confirm, Icon, Menu, type MenuSection, Modal } from '../ui'

/** A branch name git will take: no spaces, no `..`, and not ending in `.lock`. */
const NAME = /^(?!\/|.*(\.\.|@\{|\/\/|\.lock$|\/$))[\w./-]+$/

/** Under this the whole list is on the surface already, and a field over it is chrome. */
const SEARCHABLE = 8

/**
 * Which branch you are working on, of the one repository you are working in. It sits at the
 * end of the tab bar because switching it is what changes the tabs beside it, and a control
 * that changes the row it is in belongs in that row. There is no second one over the tree.
 *
 * The scope decides whose branches these are — the vault's, or the project you clicked into.
 * No other root's are here: a menu holding two repositories asks you to read which is which
 * before you can pick, and the app already knows the answer.
 *
 * Every branch the repository knows is offered, the ones only on the remote included.
 * Picking one is the whole gesture — the checkout it needs is made on the way in, and a
 * branch that already has one is simply moved into.
 */
export function BranchMenu({
  label,
  branches,
  active,
  onSelect,
  onCreate,
  onDelete,
}: {
  /** The vault's name, or the project's — whichever the scope is standing in. */
  label: string
  branches: Branch[]
  active: string | null
  onSelect: (name: string) => void
  /** Resolves to the reason it failed, or null. */
  onCreate: (name: string) => Promise<string | null>
  onDelete: (name: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [dropping, setDropping] = useState<Branch | null>(null)

  const close = () => setOpen(false)

  const sections: MenuSection[] = [
    {
      heading: label,
      search: branches.length > SEARCHABLE ? 'search branches' : undefined,
      actions: branches.map((branch) => ({
        id: branch.name,
        label: branch.name,
        // What picking it will do, which is the one thing the name does not say.
        selected: branch.name === active,
        onSelect: () => {
          close()
          if (branch.name !== active) onSelect(branch.name)
        },
        // The repository itself is the one every other checkout points into, so it has
        // nothing to drop — and neither has a branch whose checkout was never made.
        onSecondClick:
          branch.primary || !branch.checkedOut ? undefined : () => setDropping(branch),
      })),
    },
    {
      actions: [
        {
          id: 'add',
          label: 'New branch…',
          icon: 'plus' as const,
          onSelect: () => {
            close()
            setAdding(true)
          },
        },
      ],
    },
  ]

  return (
    <div className="branch-menu">
      <Menu
        label="Branch"
        anchorLabel="Branch"
        sections={sections}
        anchorClass="branch-anchor"
        open={open}
        onOpenChange={setOpen}
      >
        <Icon name="branch" />
        <span className="name">{active ?? 'no branch'}</span>
        <Icon name="chevrons-up-down" />
      </Menu>

      {adding && (
        <NewBranch
          label={label}
          from={active}
          branches={branches}
          onCreate={onCreate}
          onClose={() => setAdding(false)}
        />
      )}

      {dropping && (
        <Confirm
          title={`Remove ${dropping.name}?`}
          description={`${dropping.path} is removed from disk and from git's list of worktrees.`}
          action="remove checkout"
          onConfirm={() => onDelete(dropping.name)}
          onClose={() => setDropping(null)}
        >
          The branch itself is not deleted. It stays in the repository, and opening it
          again gives it a checkout again. Work that has not been committed in this folder
          is not anywhere else, and git will refuse rather than throw it away.
        </Confirm>
      )}
    </div>
  )
}

/** One field, because a branch is one name: where it lives on disk follows from it. */
function NewBranch({
  label,
  from,
  branches,
  onCreate,
  onClose,
}: {
  label: string
  /** The branch it is cut off, which is the one you are on. */
  from: string | null
  branches: Branch[]
  onCreate: (name: string) => Promise<string | null>
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const attempt = useAttempt()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const target = name.trim()

    if (branches.some((one) => one.name.toLowerCase() === target.toLowerCase()))
      return attempt.say(`${target} is already a branch here.`)
    if (!NAME.test(target)) return attempt.say('git will not take that as a branch name.')

    void attempt.run(() => onCreate(target)).then((made) => made && onClose())
  }

  return (
    <Modal
      title="New branch"
      description={
        from
          ? `Cut from ${from}, the branch you are on, with a folder of its own.`
          : `Cut from where ${label}'s own checkout is now, with a folder of its own.`
      }
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>cancel</Button>
          <Button form="new-branch" disabled={attempt.busy || !name.trim()}>
            {attempt.busy ? 'creating…' : 'create branch'}
          </Button>
        </>
      }
    >
      <form id="new-branch" className="fields" onSubmit={submit}>
        <label>
          Name
          <input
            value={name}
            autoFocus
            placeholder="fix/login"
            onChange={(event) => {
              setName(event.target.value)
              attempt.say(null)
            }}
            required
          />
        </label>
        <p className="hint">
          The branch is checked out into a folder of its own beside the others, so nothing
          is stashed and nothing is swapped.
        </p>
        {attempt.failed && (
          <p className="field-error" role="alert">
            {attempt.failed}
          </p>
        )}
      </form>
    </Modal>
  )
}
