'use client'

import { useState } from 'react'
import { tilde } from '@broodmother/shared'
import { useApp } from '../../state'
import { Button, Confirm } from '../ui'
import { Section } from './layout'

/** The foot of the profile: everything this machine holds is one profile's doing, so the
 *  gesture that removes all of it is asked for where the profile is. */
export function DangerZone() {
  const app = useApp()
  const [wiping, setWiping] = useState(false)
  const home = app.home ? tilde(app.home) : 'the broodmother home'

  return (
    <Section title="Danger zone" danger>
      <p className="hint">
        Every vault, every profile and this machine's config are files in {home}. Deleting
        them empties that folder and leaves broodmother the way it was before you first
        opened it.
      </p>
      <Button danger onClick={() => setWiping(true)}>
        delete all data…
      </Button>

      {wiping && (
        <Confirm
          title="Delete all data?"
          description={`Everything in ${home} is removed from disk: every vault, every profile, and this machine's config.`}
          action="delete all data"
          onConfirm={() => void app.deleteAllData()}
          onClose={() => setWiping(false)}
        >
          There is no undo, and nothing is kept anywhere else. A vault you pushed is still
          on its remote, so cloning it makes the vault again. Anything you never pushed
          goes with the folder.
        </Confirm>
      )}
    </Section>
  )
}
