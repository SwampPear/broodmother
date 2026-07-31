'use client'

import { useState } from 'react'
import { useApp } from '../../state'
import { Button, Confirm } from '../ui'
import { Panel, Section } from './layout'

/**
 * The project open inside the vault. The repository is yours and is only ever read from
 * here, so what there is to say about it is where it is and what state it is in — and the
 * one thing that can be done to it, which is to stop pointing at it.
 */
export function ProjectPanel() {
  const app = useApp()
  const [unlinking, setUnlinking] = useState(false)
  const project = app.project

  if (!project) return null

  return (
    <Panel hint="A repository these documents are about. broodmother reads it, opens branches of it in the vault, and runs your terminals in it. The repository stays yours.">
      {/* Read off the link, and not typed over: a project that has moved is relinked where
          it went rather than repointed from here. */}
      <label>
        Repository
        <input value={project.repo} readOnly />
      </label>

      <label>
        Branch
        <input value={app.branch ?? 'not on a branch'} readOnly />
      </label>

      {project.missing && (
        <p className="field-error" role="alert">
          The folder is not there any more. Unlink it, or put it back where it was.
        </p>
      )}

      <Section title="Unlink" danger>
        <p className="hint">
          This removes the link and the branch checkouts broodmother made in the vault.
          The repository itself stays where it is, with every branch inside it untouched.
        </p>
        <Button danger onClick={() => setUnlinking(true)}>
          unlink project…
        </Button>
      </Section>

      {unlinking && (
        <Confirm
          title={`Unlink ${project.name}?`}
          description={`${project.repo} stays where it is. What goes is the link and the branch checkouts made for it in the vault.`}
          action="unlink project"
          onConfirm={() => void app.removeProject(project.name)}
          onClose={() => setUnlinking(false)}
        >
          Adding it again is the same as making it. Name the folder, and the branches you
          had open here are checked out again when you open them.
        </Confirm>
      )}
    </Panel>
  )
}
