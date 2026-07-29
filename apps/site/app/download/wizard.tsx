'use client'

import { useEffect, useState } from 'react'
import { Apple } from '../apple'

/**
 * Four steps because the first launch of an unsigned app is genuinely four steps, and the
 * one that trips people — Gatekeeper refusing an app it cannot check — is the one nobody
 * warns them about until they are already staring at the dialog.
 */
const STEPS = [
  {
    title: 'Download',
    body: 'A disk image with everything broodmother needs inside it — no Node, no npm, no terminal.',
  },
  {
    title: 'Drag it to Applications',
    body: 'Open the downloaded .dmg and drag broodmother onto the Applications folder beside it, then eject the disk image.',
  },
  {
    title: 'Open it the first time',
    body: 'broodmother is not signed by Apple yet, so double-clicking it gets you a warning and nothing else. Right-click the app in Applications and choose Open — the same warning now has an Open button on it. Once only.',
  },
  {
    title: 'Point it at a vault',
    body: 'broodmother asks who you are, then where you want to work. A vault is a folder of markdown files: pick one you already have, or let broodmother make you a new one.',
  },
]

type Platform = 'mac' | 'other'

function detect(): Platform {
  const hints = `${navigator.userAgent} ${navigator.platform ?? ''}`
  return /mac/i.test(hints) ? 'mac' : 'other'
}

export function Wizard({
  file,
  version,
  size,
}: {
  file: string
  version: string
  size: string
}) {
  // Rendered on the server too, where there is no navigator: nobody is told they are on
  // the wrong machine until we have actually looked at the machine.
  const [platform, setPlatform] = useState<Platform | null>(null)
  const [step, setStep] = useState(0)

  useEffect(() => setPlatform(detect()), [])

  return (
    <div className="wizard">
      <ol className="steps">
        {STEPS.map((entry, index) => (
          <li key={entry.title} className={index === step ? 'step current' : 'step'}>
            <button className="step-head" onClick={() => setStep(index)} type="button">
              <span className="step-number">{index + 1}</span>
              <span className="step-title">{entry.title}</span>
            </button>
            {index === step && (
              <div className="step-body">
                <p>{entry.body}</p>
                {index === 0 && (
                  <a className="button" href={file} download onClick={() => setStep(1)}>
                    <Apple />
                    Download
                  </a>
                )}
                {index === 0 && platform === 'other' && (
                  <p className="warn">
                    This looks like it is not a Mac. macOS is the only build so far — on
                    anything else, run broodmother from a checkout.
                  </p>
                )}
                {index < STEPS.length - 1 && index > 0 && (
                  <button
                    className="button"
                    onClick={() => setStep(index + 1)}
                    type="button"
                  >
                    Next
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
      <p className="fine">
        broodmother {version} · {size} · Apple silicon · requires macOS 11 or newer
      </p>
    </div>
  )
}
