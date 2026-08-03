import { extensionOf } from '../path'

export const NOTEBOOK_EXTENSION = '.ipynb'

export function isNotebookPath(path: string): boolean {
  return extensionOf(path) === 'ipynb'
}

/**
 * One thing a cell said when it ran, lifted out of nbformat's four output types: both
 * `execute_result` and `display_data` are a MIME bundle, and which one a bundle was is
 * carried by `executionCount` — a result has the count of the run that produced it.
 */
export type CellOutput =
  | { kind: 'stream'; name: 'stdout' | 'stderr'; text: string }
  | { kind: 'error'; ename: string; evalue: string; traceback: string[] }
  | { kind: 'display'; data: Record<string, unknown>; executionCount: number | null }
