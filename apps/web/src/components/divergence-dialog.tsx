'use client'

import type { DivergenceChoice, DivergenceReport } from '@mother/shared'
import { Modal } from './modal'

/** No `onClose`: one of the two versions has to win before the session can go on. */
export function DivergenceDialog({
  report,
  onChoose,
}: {
  report: DivergenceReport
  onChoose: (choice: DivergenceChoice) => void
}) {
  return (
    <Modal
      title={`${report.path} differs from the room`}
      description="Nothing is merged. Pick one version; the other is discarded."
      size="large"
      footer={
        <div className="stacked">
          <button type="button" autoFocus onClick={() => onChoose('adoptRoom')}>
            Adopt the room — overwrites {report.path} on disk. Everything in your version
            that is not in the room&apos;s is lost.
          </button>
          <button type="button" onClick={() => onChoose('keepLocal')}>
            Keep my file — leaves the session. Your file is untouched and the room&apos;s
            edits never reach this machine.
          </button>
        </div>
      }
    >
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
    </Modal>
  )
}
