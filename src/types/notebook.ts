// One thing a cell said when it ran, lifted out of nbformat's four output types: both
// `execute_result` and `display_data` are a MIME bundle, and which one a bundle was is
// carried by `executionCount` — a result has the count of the run that produced it.
export type CellOutput =
  | { kind: 'stream'; name: 'stdout' | 'stderr'; text: string }
  | { kind: 'error'; ename: string; evalue: string; traceback: string[] }
  | { kind: 'display'; data: Record<string, unknown>; executionCount: number | null }

export interface NotebookCell {
  id: string
  type: 'code' | 'markdown' | 'raw'
  source: string
  outputs: CellOutput[]
  executionCount: number | null // null until the cell has run
}

export interface Notebook {
  cells: NotebookCell[]
  language: string // from the file's kernelspec, 'python' when it names none
}
