import { describe, expect, it } from 'vitest'
import type * as Monaco from 'monaco-editor'
import { toggleWrap, triggerAt } from '../commands'

const at = (doc: string, cursor = doc.length) => triggerAt(doc, cursor)

describe('slash commands', () => {
  it('opens on / at the start of a line', () => {
    expect(at('/')?.items.map((item) => item.title)).toEqual(['Equation', 'Table'])
  })

  it('filters on the query', () => {
    expect(at('/equ')?.items.map((item) => item.title)).toEqual(['Equation'])
    expect(at('/zzz')).toBeNull()
  })

  it('stays shut mid-sentence', () => {
    expect(at('a note / here')).toBeNull()
  })

  it('opens on an indented line', () => {
    expect(at('  /eq')?.from).toBe(2)
  })

  it('reports the range the command replaces', () => {
    expect(at('/eq')).toMatchObject({ from: 0, to: 3, query: 'eq' })
  })

  it('opens on a line that is not the first', () => {
    const doc = 'a note\n/eq'
    expect(at(doc)).toMatchObject({ from: 7, to: 10 })
  })
})

/**
 * Monaco's model and editor, cut down to what `toggleWrap` actually calls. The real one
 * needs a DOM that jsdom does not have; the arithmetic being tested needs neither.
 */
function fake(text: string, from: number, to: number) {
  let value = text
  let selection = { from, to }

  const positionAt = (offset: number) => {
    const before = value.slice(0, offset)
    const line = before.split('\n')
    return { lineNumber: line.length, column: line[line.length - 1]!.length + 1 }
  }
  const offsetAt = (position: { lineNumber: number; column: number }) => {
    const lines = value.split('\n')
    let offset = 0
    for (let index = 0; index < position.lineNumber - 1; index++)
      offset += lines[index]!.length + 1
    return offset + position.column - 1
  }
  const rangeToOffsets = (range: Monaco.IRange) => ({
    from: offsetAt({
      lineNumber: range.startLineNumber,
      column: range.startColumn,
    }),
    to: offsetAt({ lineNumber: range.endLineNumber, column: range.endColumn }),
  })

  const model = {
    getValue: () => value,
    getPositionAt: positionAt,
    getOffsetAt: offsetAt,
  } as unknown as Monaco.editor.ITextModel

  const editor = {
    getModel: () => model,
    getSelections: () => [
      {
        getStartPosition: () => positionAt(selection.from),
        getEndPosition: () => positionAt(selection.to),
      },
    ],
    // Applied back to front so an earlier edit never moves a later one's offsets.
    executeEdits: (
      _source: string,
      edits: Monaco.editor.IIdentifiedSingleEditOperation[],
    ) => {
      const applied = edits
        .map((edit) => ({ ...rangeToOffsets(edit.range), text: edit.text ?? '' }))
        .sort((a, b) => b.from - a.from)
      for (const edit of applied)
        value = value.slice(0, edit.from) + edit.text + value.slice(edit.to)
      return true
    },
    setSelections: (next: Monaco.Selection[]) => {
      const one = next[0]!
      selection = {
        from: offsetAt({
          lineNumber: one.selectionStartLineNumber,
          column: one.selectionStartColumn,
        }),
        to: offsetAt({
          lineNumber: one.positionLineNumber,
          column: one.positionColumn,
        }),
      }
    },
  } as unknown as Monaco.editor.IStandaloneCodeEditor

  return {
    editor,
    result: () => {
      const { from: start, to: end } = selection
      return start === end
        ? `${value.slice(0, start)}|${value.slice(start)}`
        : `${value.slice(0, start)}|${value.slice(start, end)}|${value.slice(end)}`
    },
  }
}

/** Runs the command against a doc, `|` marking the cursor or the selection ends. */
function run(marker: string, doc: string): string {
  const ends = [...doc].reduce<number[]>(
    (found, char, index) => (char === '|' ? [...found, index - found.length] : found),
    [],
  )
  const { editor, result } = fake(doc.replaceAll('|', ''), ends[0]!, ends[1] ?? ends[0]!)
  toggleWrap(editor, marker)
  return result()
}

describe('bold and italic', () => {
  it('wraps what is selected', () => {
    expect(run('**', 'a |word| here')).toBe('a **|word|** here')
    expect(run('*', 'a |word| here')).toBe('a *|word|* here')
  })

  it('unwraps when the markers are inside the selection', () => {
    expect(run('**', 'a |**word**| here')).toBe('a |word| here')
  })

  it('unwraps when the selection sits inside the markers', () => {
    expect(run('**', 'a **|word|** here')).toBe('a |word| here')
  })

  it('leaves the cursor between a fresh pair when nothing is selected', () => {
    expect(run('**', 'a |')).toBe('a **|**')
  })

  it('does not mistake bold for italic', () => {
    expect(run('*', 'a |**word**| here')).toBe('a *|**word**|* here')
  })
})
