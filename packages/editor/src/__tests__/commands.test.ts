import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { triggerAt } from '../commands'

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
