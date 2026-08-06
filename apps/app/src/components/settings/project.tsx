'use client'

import { useState } from 'react'
import { tilde } from '@/core'
import { useApp } from '../../state'
import { Button, Confirm } from '../ui'
import { Panel, Section } from './layout'

/**
 * The project open inside the vault. Where it sits is settled by the vault holding it, so
 * what there is to say about it is where that is and which branch you are on — and the one
 * thing that can be done to it, which is to delete it.
 */
export function ProjectPanel() {
  const app = useApp()
  const [deleting, setDeleting] = useState(false)
  const project = app.project

  if (!project) return null

  return (
    <Panel hint="A repository these documents are about. It lives in the vault, and broodmother opens branches of it and runs your terminals in it.">
      {/* Settled when the project is made: it is a folder in the vault, and retyping it
          here would point broodmother at one it never made. */}
      <label>
        Repository
        <input value={tilde(project.repo)} readOnly />
      </label>

      <label>
        Branch
        <input value={app.branch ?? 'not on a branch'} readOnly />
      </label>

      <Section title="Delete" danger>
        <p className="hint">
          The repository lives in the vault, so this is the last copy of it. Everything in
          it goes, along with the checkouts its branches were given.
        </p>
        <Button danger onClick={() => setDeleting(true)}>
          delete project…
        </Button>
      </Section>

      {deleting && (
        <Confirm
          title={`Delete ${project.name}?`}
          description={`${tilde(project.repo)} and everything in it, including every branch and all of its history.`}
          action="delete project"
          onConfirm={() => void app.removeProject(project.name)}
          onClose={() => setDeleting(false)}
        >
          Anything you have not pushed to a remote is gone for good.
        </Confirm>
      )}
    </Panel>
  )
}
