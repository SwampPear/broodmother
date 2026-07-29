import { EditorSelection, EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { toggleWrap, triggerAt } from '../commands'

const at = (doc: string, cursor = doc.length) =>
  triggerAt(EditorState.create({ doc, selection: { anchor: cursor } }))

describe('slash commands', () => {
  it('opens on / at the start of a line', () => {
    expect(at('/')?.items.map((item) => item.title)).toEqual(['Equation'])
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

  it('stays shut when text is selected', () => {
    const state = EditorState.create({ doc: '/', selection: { anchor: 0, head: 1 } })
    expect(triggerAt(state)).toBeNull()
  })
})

/** Runs the command against a doc, `|` marking the cursor or the selection ends. */
function run(marker: string, doc: string): string {
  const ends = [...doc].reduce<number[]>(
    (found, char, index) => (char === '|' ? [...found, index - found.length] : found),
    [],
  )
  let state = EditorState.create({
    doc: doc.replaceAll('|', ''),
    selection: EditorSelection.single(ends[0], ends[1] ?? ends[0]),
  })
  toggleWrap(marker)({
    state,
    dispatch: (transaction) => (state = transaction.state),
  })
  const { from, to } = state.selection.main
  const text = state.doc.toString()
  return from === to
    ? `${text.slice(0, from)}|${text.slice(from)}`
    : `${text.slice(0, from)}|${text.slice(from, to)}|${text.slice(to)}`
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
