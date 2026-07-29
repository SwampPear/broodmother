import type { EditorState } from '@codemirror/state'
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
