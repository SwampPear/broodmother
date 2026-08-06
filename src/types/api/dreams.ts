import type { DreamKind } from '../dream'
import type { DocRef } from '../tree'

export type DreamStepState =
  | 'waiting'
  | 'running'
  | 'done'
  | 'error'
  | 'skipped'
  // The step chose to end the flow — a deliberate halt, not a failure.
  | 'stopped'

export interface DreamStep {
  node: string
  name: string
  kind: DreamKind
  state: DreamStepState
  output?: string
  error?: string
  // Why a stopped step stopped, in the step's own words.
  halted?: string
}

export interface DreamRun {
  id: string
  ref: DocRef
  startedAt: number
  finishedAt?: number
  state: 'running' | 'done' | 'error'
  error?: string
  steps: DreamStep[]
  // The run's folder of hand-off files — what each step read and wrote.
  scratch?: string
}

// Starts a run and answers with it already underway; the steps land as they finish.
export interface PostDreamRun {
  request: DocRef
  response: { run: DreamRun }
}

// The runs the server remembers for one dream, newest first.
export interface GetDreamRuns {
  request: DocRef
  response: { runs: DreamRun[] }
}

export interface DreamTrigger {
  kind: DreamKind
  // The trigger read as a sentence — "every 5 minutes", "when in.md changes".
  label: string
}

// One row of the dreams page: a dream, what fires it, and how its last run went.
export interface DreamSummary {
  ref: DocRef
  name: string
  // Only the wired triggers — the ones that will actually fire it.
  triggers: DreamTrigger[]
  lastRun: DreamRun | null
}

// Every dream across the open vault and projects, in tree order.
export interface GetDreams {
  request: null
  response: { dreams: DreamSummary[] }
}

// Every dream's runs together, newest first — the page's log.
export interface GetDreamLog {
  request: null
  response: { runs: DreamRun[] }
}
