'use client'

import type { DivergenceChoice, DivergenceReport } from '@mother/shared'

export function DivergenceDialog({
  report,
  onChoose,
}: {
  report: DivergenceReport
  onChoose: (choice: DivergenceChoice) => void
}) {
  return (
    <div className="palette-backdrop">
      <div className="divergence" role="dialog" aria-modal="true" aria-label="Divergence">
        <h2>{report.path} differs from the room</h2>
        <p>Nothing is merged. Pick one version; the other is discarded.</p>
        <div className="versions">
          <section>
            <h3>Your file</h3>
            <pre>{report.local}</pre>
          </section>
          <section>
            <h3>The room</h3>
            <pre>{report.remote}</pre>
          </section>
        </div>
        <div className="palette-actions">
          <button type="button" autoFocus onClick={() => onChoose('adoptRoom')}>
            Adopt the room — overwrites {report.path} on disk. Everything in your version
            that is not in the room&apos;s is lost.
          </button>
          <button type="button" onClick={() => onChoose('keepLocal')}>
            Keep my file — leaves the session. Your file is untouched and the room&apos;s
            edits never reach this machine.
          </button>
        </div>
      </div>
    </div>
  )
}
