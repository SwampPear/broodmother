import { EditorSelection, type EditorState, type StateCommand } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

export interface Command {
  title: string
  hint: string
  run: (view: EditorView, from: number, to: number) => void
}

/**
 * Commands, not a block menu — anything markdown can spell is typed, the way Obsidian
 * does it. What earns a command is what has no comfortable spelling.
 */
export const COMMANDS: Command[] = [
  {
    title: 'Equation',
    hint: 'LaTeX, rendered when the cursor leaves',
    run: (view, from, to) => {
      view.dispatch({
        changes: { from, to, insert: '$$\n\n$$' },
        selection: { anchor: from + 3 },
        scrollIntoView: true,
      })
      view.focus()
    },
  },
]

/**
 * ⌘B and ⌘I. Markdown has no bold, only asterisks, so the command is the typing you would
 * have done: wrap the selection, unwrap it when it is already wrapped — whether the
 * markers are inside the selection or just outside it — and leave the cursor between a
 * fresh pair when there is nothing selected.
 */
export function toggleWrap(marker: string): StateCommand {
  const width = marker.length
  const char = marker[0]!

  /** Asterisks come in runs: one is italic, two is bold, three is both. Italic is on when
   *  the run is odd, bold when there are at least two — so ⌘I over `**word**` adds one
   *  rather than tearing a marker off the bold. */
  const already = (run: number) => (width === 1 ? run % 2 === 1 : run >= width)

  const runFrom = (state: EditorState, at: number, step: 1 | -1) => {
    let run = 0
    for (
      let index = step === 1 ? at : at - 1;
      index >= 0 && index < state.doc.length && state.sliceDoc(index, index + 1) === char;
      index += step
    )
      run += 1
    return run
  }

  return ({ state, dispatch }) => {
    dispatch(
      state.update(
        state.changeByRange((range) => {
          const inside = range.to - range.from
          const within = Math.min(
            runFrom(state, range.from, 1),
            runFrom(state, range.to, -1),
          )
          if (inside >= width * 2 && already(Math.min(within, inside / 2)))
            return {
              changes: [
                { from: range.from, to: range.from + width },
                { from: range.to - width, to: range.to },
              ],
              range: EditorSelection.range(range.from, range.to - width * 2),
            }

          const around = Math.min(
            runFrom(state, range.from, -1),
            runFrom(state, range.to, 1),
          )
          if (already(around))
            return {
              changes: [
                { from: range.from - width, to: range.from },
                { from: range.to, to: range.to + width },
              ],
              range: EditorSelection.range(range.from - width, range.to - width),
            }

          return {
            changes: [
              { from: range.from, insert: marker },
              { from: range.to, insert: marker },
            ],
            range: EditorSelection.range(range.from + width, range.to + width),
          }
        }),
        { scrollIntoView: true, userEvent: 'input' },
      ),
    )
    return true
  }
}

export interface Trigger {
  from: number
  to: number
  query: string
  items: Command[]
}

/** `/` as the first thing on a line, the way the old block menu opened. */
export function triggerAt(state: EditorState): Trigger | null {
  const range = state.selection.main
  if (!range.empty) return null

  const line = state.doc.lineAt(range.head)
  const before = line.text.slice(0, range.head - line.from)
  const match = /^\s*\/(\w*)$/.exec(before)
  if (!match) return null

  const query = match[1].toLowerCase()
  const items = COMMANDS.filter((command) => command.title.toLowerCase().includes(query))
  if (!items.length) return null

  return { from: line.from + before.indexOf('/'), to: range.head, query, items }
}
